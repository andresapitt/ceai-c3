/* aulauniversitaria assistant, Vercel serverless function.
 *
 * Built by Nadia Kaufman to Tomás's 23 criteria.
 *
 * Knowledge is NOT in this file. Both sources are fetched over the network on
 * every request: the course sheet and the FAQ sheet. Nothing is cached, and
 * there is no fallback copy. If a source is unreachable the assistant says so
 * and gives the phone number.
 *
 * The API key lives in the GEMINI_API_KEY environment variable on Vercel.
 * It is never in this repository and never reaches the browser.
 *
 * Nothing about a conversation is logged or stored. See criterion 21.
 */

import { createHash, randomBytes } from 'node:crypto';

const COURSES_SHEET = '1LN4OD7dwwSkjaJGJJknTKnxD3B2a71bdr5ktWFrZJtM';
const FAQ_SHEET = process.env.FAQ_SHEET_ID || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const PHONE = '351 3 261002';
const WA = 'https://wa.me/5493513261002';

/* ------------------------------------------------------------ rate limit
 *
 * Best effort, and worth being precise about what that means. Vercel runs
 * several independent instances, each with its own memory, and a cold start
 * wipes the counters. So a determined attacker spread across instances gets
 * more than the numbers below. What this reliably stops is the realistic
 * case: one script, one browser tab, or one person hammering the box, which
 * is what would quietly drain the Gemini quota.
 *
 * A shared store (Vercel KV or Upstash) would make the limit exact. It also
 * adds a paid service and another credential for an organisation with no
 * engineer, which is a poor trade until the traffic justifies it.
 *
 * Privacy: the raw IP is never stored. It is hashed with a salt generated
 * fresh in memory at instance start and never written down, so the stored
 * value cannot be reversed to an address and does not survive a restart.
 */
const SALT = randomBytes(16).toString('hex');
const LIMITS = [
  { windowMs: 60 * 1000, max: 10, name: 'minute' },
  { windowMs: 60 * 60 * 1000, max: 50, name: 'hour' }
];
const GLOBAL_PER_MINUTE = 150;
const MAX_TRACKED = 5000;

const BUCKETS = new Map();
let globalHits = [];

function clientKey(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.headers['x-real-ip'] || 'unknown';
  return createHash('sha256').update(SALT + ip).digest('hex').slice(0, 16);
}

function rateLimit(req) {
  const now = Date.now();

  globalHits = globalHits.filter((t) => now - t < 60 * 1000);
  if (globalHits.length >= GLOBAL_PER_MINUTE) {
    return { limited: true, retryAfter: 60, scope: 'global' };
  }

  const key = clientKey(req);
  const longest = LIMITS[LIMITS.length - 1].windowMs;
  const hits = (BUCKETS.get(key) || []).filter((t) => now - t < longest);

  for (const l of LIMITS) {
    if (hits.filter((t) => now - t < l.windowMs).length >= l.max) {
      BUCKETS.set(key, hits);
      return { limited: true, retryAfter: Math.ceil(l.windowMs / 1000), scope: l.name };
    }
  }

  hits.push(now);
  BUCKETS.set(key, hits);
  globalHits.push(now);

  /* Drop keys that have gone quiet, so a long-running instance cannot grow
     its memory without bound. */
  if (BUCKETS.size > MAX_TRACKED) {
    for (const [k, v] of BUCKETS) {
      if (!v.length || now - v[v.length - 1] > longest) BUCKETS.delete(k);
      if (BUCKETS.size <= MAX_TRACKED * 0.8) break;
    }
  }
  return { limited: false };
}

/* Any shape a fee amount could take, in Spanish or English. Deliberately
   broad: a false positive costs one replaced answer, a false negative
   publishes a price the organisation never agreed to. */
const MONEY = new RegExp([
  '\\$\\s*\\d',
  '\\b\\d{1,3}(?:[.,]\\d{3})+\\b',
  '\\b(?:ars|pesos?|arg)\\s*\\$?\\s*\\d',
  '\\b\\d{3,}\\s*(?:pesos?|ars)\\b',
  '\\b(?:cuesta|cuestan|vale|valen|sale|salen|ronda|rondan)\\s+' +
    '(?:de\\s+|unos\\s+|unas\\s+|alrededor\\s+de\\s+|aproximadamente\\s+)?\\$?\\s*\\d',
  '\\barancel\\b(?:\\W+\\w+){0,4}?\\W+(?:de\\s+)?\\$?\\s*\\d{3,}',
  '\\b(?:costs?|price|fee)\\b(?:\\W+\\w+){0,3}?\\W+\\$?\\s*\\d{3,}'
].join('|'), 'i');

/* headers=1 is not optional. gviz guesses whether row 1 is a header by
   comparing column types, so a sheet whose columns are ALL text (the FAQ
   sheet) gets no header detected: the labels come back as A, B, C and every
   field reads as undefined. The bug is silent, because the row count still
   looks nearly right. Forcing headers=1 removes the guess. */
const gviz = (id) =>
  `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=1&nocache=${Date.now()}`;

/* Google returns times as a timeofday array or a Date(...) string. Turn any
   cell back into the text a person would see in the sheet. */
const pad2 = (n) => (n < 10 ? '0' : '') + n;
function cellText(cell, type) {
  if (!cell || cell.v == null || cell.v === '') return '';
  if (type === 'timeofday' && Array.isArray(cell.v)) return pad2(cell.v[0]) + ':' + pad2(cell.v[1] || 0);
  if (type === 'datetime' || type === 'date') {
    if (cell.f) return String(cell.f).trim();
    const m = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/.exec(String(cell.v));
    if (m && m[4] !== undefined) return pad2(+m[4]) + ':' + pad2(+m[5]);
  }
  const raw = String(cell.v).trim();
  if (/^Date\(/.test(raw) && cell.f) return String(cell.f).trim();
  return raw;
}

async function readSheet(id) {
  const res = await fetch(gviz(id), { cache: 'no-store' });
  if (!res.ok) throw new Error(`sheet ${id} returned HTTP ${res.status}`);
  const text = await res.text();
  const payload = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));

  let cols = payload.table.cols.map((c) => (c.label || '').trim());
  const types = payload.table.cols.map((c) => c.type || 'string');
  let rows = payload.table.rows || [];

  /* Belt and braces. If headers=1 was ignored for any reason, the labels come
     back empty and row 1 is really the header. Promote it rather than
     returning 47 objects keyed by nothing. */
  if (!cols.some(Boolean) && rows.length) {
    cols = (rows[0].c || []).map((c, i) => (c && c.v ? String(c.v).trim() : 'col' + i));
    rows = rows.slice(1);
  }

  return rows
    .map((row) => {
      const o = {};
      cols.forEach((label, i) => {
        if (label) o[label] = cellText(row.c && row.c[i], types[i]);
      });
      return o;
    })
    .filter((o) => Object.values(o).some(Boolean));
}

/* Both sheets become plain text the model reads. Compact, because a long
   prompt is a slow and expensive prompt, and this runs on every message. */
function coursesToText(rows) {
  return rows.map((c) => {
    const bits = [
      `ID ${c.id}`,
      `NOMBRE: ${c.course_name_es || c.course_name}`,
      c.course_name_es && c.course_name ? `NAME (EN): ${c.course_name}` : '',
      `AREA: ${c.category}`,
      c.level ? `NIVEL: ${c.level}` : '',
      `MODALIDAD: ${c.format}`,
      c.day ? `DIA: ${c.day} ${c.time_display || c.time_24h || ''}` : '',
      c.alt_day ? `DIA ALTERNATIVO: ${c.alt_day} ${c.alt_time_24h || ''}` : '',
      c.frequency ? `FRECUENCIA: ${c.frequency}` : '',
      c.teacher ? `DOCENTE: ${c.teacher}` : 'DOCENTE: sin asignar',
      c.period ? `PERIODO: ${c.period}` : '',
      c.venue ? `LUGAR: ${c.venue}` : '',
      c.capacity ? `CUPO: ${c.capacity}` : '',
      c.coursebook ? `LIBRO: ${c.coursebook}` : '',
      (c.notes_es || c.notes) ? `NOTAS: ${c.notes_es || c.notes}` : ''
    ].filter(Boolean);
    return bits.join(' | ');
  }).join('\n');
}

/* Display maps for the cards. The model chooses WHICH courses to show, by id.
   It never supplies the contents of a card: every field below is copied from
   the sheet row. That way a card cannot contain an invented time or teacher
   even if the model hallucinates one in its prose. */
const DAY_ES = {
  Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles', Thursday: 'Jueves',
  Friday: 'Viernes', Saturday: 'Sábado', Sunday: 'Domingo',
  'Saturday-Sunday': 'Sábado y domingo'
};
const FMT_ES = { 'In person': 'Presencial', 'Online': 'Virtual' };
const CAT_ES = {
  'Art and Creativity': 'Arte y creatividad',
  'Humanities and Personal Development': 'Humanidades y desarrollo personal',
  'Technology': 'Tecnología', 'Physical Activities': 'Actividades corporales',
  'Games and Play': 'Actividades lúdicas', 'Languages': 'Idiomas',
  'New workshop (Aug 2026)': 'Taller nuevo (agosto 2026)'
};
const LEVEL_ES = {
  Beginner: 'Inicial', 'Beginner 2': 'Inicial 2', Elementary: 'Elemental',
  'Pre-Intermediate': 'Pre intermedio', 'Pre-Intermediate 2': 'Pre intermedio 2',
  Intermediate: 'Intermedio', 'Intermediate/Advanced': 'Intermedio y avanzado',
  Advanced: 'Avanzado', 'Level 1': 'Nivel 1', 'Level 2': 'Nivel 2', 'Level 3': 'Nivel 3',
  'Beginner to experienced': 'Desde cero o con experiencia',
  'No prior experience required': 'Sin experiencia previa'
};
const MONTH_ES = {
  January: 'enero', February: 'febrero', March: 'marzo', April: 'abril', May: 'mayo',
  June: 'junio', July: 'julio', August: 'agosto', September: 'septiembre',
  October: 'octubre', November: 'noviembre', December: 'diciembre',
  Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr', Jun: 'jun', Jul: 'jul',
  Aug: 'ago', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic'
};

const map = (m, v, lang) => (!v ? '' : lang === 'en' ? v : (m[v] || v));

function periodEs(v) {
  if (!v) return '';
  let out = v.replace(/^Full year/i, 'Todo el año')
             .replace(/Date to be confirmed/i, 'Fecha a confirmar')
             .replace(/\b(\d+)\s*months?\b/i, '$1 meses')
             .replace(/\band\b/g, 'y')
             .replace(/\s+-\s+/g, ' a ');
  Object.keys(MONTH_ES).forEach((en) => {
    out = out.replace(new RegExp('\\b' + en + '\\b', 'g'), MONTH_ES[en]);
  });
  return out;
}

function toCard(c, lang) {
  const when = [map(DAY_ES, c.day, lang), c.time_display || c.time_24h].filter(Boolean).join(', ');
  return {
    id: c.id,
    title: (lang === 'es' && c.course_name_es) ? c.course_name_es : c.course_name,
    when: when || (lang === 'en' ? 'Dates to be confirmed' : 'Fechas a confirmar'),
    altWhen: c.alt_day
      ? [map(DAY_ES, c.alt_day, lang), c.alt_time_24h].filter(Boolean).join(', ')
      : '',
    format: map(FMT_ES, c.format, lang),
    online: /online/i.test(c.format || ''),
    isWorkshop: /workshop/i.test(c.type || ''),
    category: map(CAT_ES, c.category, lang),
    teacher: c.teacher || '',
    level: map(LEVEL_ES, c.level, lang),
    period: lang === 'es' ? periodEs(c.period) : (c.period || ''),
    venue: c.venue || '',
    capacity: c.capacity || ''
  };
}

function faqToText(rows) {
  return rows.map((f) =>
    `[${f.id} ${f.category}] P: ${f.question_es} R: ${f.answer_es}` +
    (f.question_en ? `\n   Q: ${f.question_en} A: ${f.answer_en}` : '')
  ).join('\n');
}

const SYSTEM = `Sos el asistente automático del sitio de aulauniversitaria, el programa de actividades para personas de más de 50 años de la Asociación Civil Promover y la Universidad Blas Pascal, en Argüello, Córdoba, Argentina.

REGLAS QUE NO PODÉS ROMPER:

1. Respondé SOLO con la información de los DATOS que te paso abajo (talleres y preguntas frecuentes). No uses conocimiento general sobre la institución.
2. Si la respuesta no está en los datos, decilo con franqueza y pasá el contacto: WhatsApp o teléfono ${PHONE}. Nunca deduzcas ni completes con algo verosímil.
3. NUNCA digas un precio, ni un monto, ni un rango, ni un "aproximadamente", ni compares con otra institución. El arancel NO está publicado en ninguna fuente. Si preguntan cuánto cuesta: explicá que se paga por mes del 1 al 15 con arancel bonificado dentro de esa fecha, que el valor se ajusta durante el año, y que lo dan en el momento por teléfono o WhatsApp al ${PHONE}.
4. Nunca inventes un taller, un docente, un día, un horario ni un cupo. Si no está en los datos, no existe.
5. No pidas datos personales: ni nombre, ni mail, ni teléfono, ni edad.
6. Respondé en el idioma en que te escriben. Si te escriben en español, usá el voseo de Córdoba (podés, tenés, fijate, escribinos).
7. Sé breve: dos o tres oraciones, o una lista corta. Nada de textos largos.
8. Cuando hables de un taller, nombralo tal como figura en los datos.
9. Pasá el contacto cuando quieran inscribirse, pregunten por plata, pregunten algo que no está en los datos, o parezcan trabados.
10. No prometas resultados ni vacantes. No uses urgencia falsa ni presión.
11. Escribí en texto plano. Nada de markdown: sin asteriscos, sin negritas, sin encabezados. Si necesitás una lista, poné cada ítem en su propia línea empezando con un guion.
12. TARJETAS DE TALLERES. Cuando tu respuesta se refiera a talleres concretos, terminá el mensaje con una línea sola con los IDs, en este formato exacto:
[[CURSOS: C030, C031]]
Reglas de las tarjetas:
- Máximo 8 IDs. Si hay más, elegí los más relevantes y decilo en el texto.
- Usá solo IDs que estén en los DATOS. No inventes un ID.
- En el texto NO repitas día, horario, docente ni modalidad: eso ya se muestra en las tarjetas. Escribí una o dos oraciones de contexto y nada más.
- Si la pregunta no es sobre talleres concretos (por ejemplo aranceles o certificados), no pongas la línea de IDs.

Sos un asistente automático, no una persona, y el visitante ya lo sabe porque se lo dijimos al abrir el chat.`;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  /* Applies to the selftest too. It reads two sheets and lists models, so it
     is not a free endpoint either. */
  const gate = rateLimit(req);
  if (gate.limited) {
    /* Answer in the visitor's language. Reading the body here is best effort:
       if it is malformed we fall back to Spanish rather than failing. */
    let lim = 'es';
    try {
      const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (b && b.lang === 'en') lim = 'en';
    } catch (e) { /* keep Spanish */ }

    const MSG = {
      es: {
        global: `Estamos recibiendo muchas consultas en este momento. Probá de nuevo en un minuto, o escribinos por WhatsApp al ${PHONE} y te respondemos.`,
        user: `Hiciste varias preguntas seguidas. Esperá un momento y volvé a intentar, o escribinos por WhatsApp al ${PHONE} y te atiende una persona.`
      },
      en: {
        global: `We are getting a lot of questions right now. Try again in a minute, or message us on WhatsApp at ${PHONE} and we will reply.`,
        user: `You have asked several questions in a row. Wait a moment and try again, or message us on WhatsApp at ${PHONE} and a person will help you.`
      }
    };

    res.setHeader('Retry-After', String(gate.retryAfter));
    return res.status(429).json({
      error: 'rate_limited',
      scope: gate.scope,
      retryAfter: gate.retryAfter,
      reply: MSG[lim][gate.scope === 'global' ? 'global' : 'user'],
      handoff: true
    });
  }

  /* Deployment check: confirms the key is present and lists the models it can
     actually reach. Never returns the key itself. */
  if (req.method === 'GET' && req.query && req.query.selftest === '1') {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    let models = null, sheets = null, error = null;
    try {
      const [courses, faq] = await Promise.all([
        readSheet(COURSES_SHEET),
        FAQ_SHEET ? readSheet(FAQ_SHEET) : Promise.resolve([])
      ]);
      /* The column names matter as much as the row count. A sheet can return
         the right number of rows and still be unusable if the header was not
         detected, which is exactly what happened to the FAQ sheet once. */
      sheets = {
        courses: courses.length,
        courseColumns: courses.length ? Object.keys(courses[0]) : [],
        faq: faq.length,
        faqColumns: faq.length ? Object.keys(faq[0]) : [],
        faqSheetConfigured: Boolean(FAQ_SHEET),
        faqUsable: faq.length > 0 && Boolean(faq[0].question_es && faq[0].answer_es),
        faqSample: faq.length ? String(faq[0].question_es || '(no question_es column)').slice(0, 80) : null
      };
    } catch (e) { error = String(e.message || e); }
    if (hasKey) {
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
          headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY }
        });
        const j = await r.json();
        models = (j.models || [])
          .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
          .map((m) => m.name.replace('models/', ''));
      } catch (e) { models = ['could not list models: ' + String(e.message || e)]; }
    }
    return res.status(200).json({
      keyPresent: hasKey, configuredModel: MODEL, availableModels: models, sheets, error,
      rateLimit: {
        perMinute: LIMITS[0].max,
        perHour: LIMITS[1].max,
        globalPerMinute: GLOBAL_PER_MINUTE,
        scope: 'per instance, in memory, best effort',
        tracked: BUCKETS.size
      }
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'not_configured',
      reply: `El asistente todavía no está configurado. Escribinos por WhatsApp al ${PHONE} y te respondemos.`
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = String(body.message || '').slice(0, 800).trim();
    const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const lang = body.lang === 'en' ? 'en' : 'es';
    if (!message) return res.status(400).json({ error: 'empty_message' });

    /* Live read of both sources. No cache, no stored copy. */
    const [courses, faq] = await Promise.all([
      readSheet(COURSES_SHEET),
      FAQ_SHEET ? readSheet(FAQ_SHEET) : Promise.resolve([])
    ]);

    const context =
      `=== PREGUNTAS FRECUENTES (${faq.length}) ===\n` +
      (faq.length ? faqToText(faq) : '(hoja de FAQ no configurada)') +
      `\n\n=== TALLERES 2026 (${courses.length}) ===\n` + coursesToText(courses) +
      `\n\n=== CONTACTO ===\nWhatsApp y teléfono ${PHONE}. Otro teléfono 3543 536010. ` +
      `Mail info@promover.org.ar y aulauniversitaria@ubp.edu.ar. ` +
      `Campus UBP, Avda. Donato Álvarez 380, Argüello, Córdoba. ` +
      `Clases del 2 de marzo al 30 de noviembre de 2026. Inscripción abierta todo el año.`;

    const contents = [];
    history.forEach((h) => {
      if (h && h.role && h.text) {
        contents.push({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(h.text).slice(0, 800) }] });
      }
    });
    contents.push({
      role: 'user',
      parts: [{ text: `DATOS ACTUALES:\n${context}\n\n=== PREGUNTA DEL VISITANTE (respondé en ${lang === 'en' ? 'inglés' : 'español'}) ===\n${message}` }]
    });

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents,
          systemInstruction: { parts: [{ text: SYSTEM }] },
          generationConfig: { temperature: 0.2, maxOutputTokens: 700, topP: 0.9 },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
          ]
        })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      /* The model name is the most likely thing to be wrong on a fresh
         deployment, so the message says how to check it. */
      return res.status(502).json({
        error: 'model_error',
        status: upstream.status,
        hint: `Comprobá el modelo con /api/chat?selftest=1 (configurado: ${MODEL}).`,
        detail: detail.slice(0, 400),
        reply: `Ahora mismo no puedo responderte. Escribinos por WhatsApp al ${PHONE} y te contestamos.`
      });
    }

    const data = await upstream.json();
    const cand = data.candidates && data.candidates[0];
    let reply = cand && cand.content && cand.content.parts
      ? cand.content.parts.map((p) => p.text || '').join('').trim()
      : '';

    /* The model picks which courses to show, by id. Everything a card then
       displays is read out of the sheet row, so a card cannot show a time or
       a teacher the model made up. An id that is not in the sheet is dropped
       silently rather than rendered as an empty card. */
    let cards = [];
    const tag = reply.match(/\[\[\s*CURSOS?\s*:\s*([^\]]*)\]\]/i);
    if (tag) {
      const ids = tag[1].split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean);
      const seen = new Set();
      cards = ids
        .filter((id) => (seen.has(id) ? false : seen.add(id)))
        .map((id) => courses.find((c) => String(c.id || '').toUpperCase() === id))
        .filter(Boolean)
        .slice(0, 8)
        .map((c) => toCard(c, lang));
      reply = reply.replace(tag[0], '').replace(/\n{3,}/g, '\n\n').trim();
    }

    if (!reply) {
      return res.status(200).json({
        reply: `No pude armar una respuesta para eso. Escribinos por WhatsApp al ${PHONE}.`,
        handoff: true
      });
    }

    /* Last line of defence on the rule that matters most. If a fee amount ever
       reaches this point, the answer is replaced rather than shown. The model
       is told not to quote a price; this is what catches it when it does.
       Tested against 24 cases in pipeline/07-chatbot-build-notes.md. */
    if (MONEY.test(reply)) {
      return res.status(200).json({
        reply: lang === 'en'
          ? `The fee is paid monthly, between the 1st and the 15th, at a discounted rate within those dates. The amount is adjusted during the year, so we give it to you directly: WhatsApp or call ${PHONE}.`
          : `El arancel se paga por mes, del 1 al 15, con un valor bonificado dentro de esa fecha. El importe se ajusta durante el año, así que te lo damos en el momento: WhatsApp o teléfono ${PHONE}.`,
        handoff: true, guardrail: 'fee_amount_blocked'
      });
    }

    /* If the model returned nothing but the id line, give the cards a caption
       rather than showing them under an empty bubble. */
    if (!reply && cards.length) {
      reply = lang === 'en' ? 'Here is what I found:' : 'Esto es lo que encontré:';
    }

    return res.status(200).json({
      reply,
      cards,
      handoff: /whatsapp|351 3 261002|3513 261002/i.test(reply),
      sources: { courses: courses.length, faq: faq.length, fetchedAt: new Date().toISOString() }
    });
  } catch (err) {
    return res.status(500).json({
      error: 'server_error',
      detail: String(err && err.message ? err.message : err).slice(0, 200),
      reply: `Tuvimos un problema técnico. Escribinos por WhatsApp al ${PHONE} y te respondemos.`
    });
  }
}

export const config = { runtime: 'nodejs' };
