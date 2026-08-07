/* aulauniversitaria assistant, browser side.
 *
 * Built by Nadia Kaufman to Tomás's 23 criteria.
 *
 * Nothing is stored. No cookie, no localStorage, no analytics. The
 * conversation lives in a variable and dies when the tab closes.
 * If /api/chat is not reachable, the panel shows the phone number rather
 * than an error code. That is the degraded state on a static host with no
 * serverless function behind it.
 */

(function () {
  'use strict';

  var PHONE = '351 3 261002';
  var WA = 'https://wa.me/5493513261002';
  /* GitHub Pages serves static files only: it cannot run the serverless
     function, so /api/chat would 404 there and the assistant would sit in
     its offline state. When the page is served from anywhere that has no
     function of its own, it talks to the Vercel deployment instead, which
     allows that origin explicitly. Same code, both hosts, one API. */
  var API_ORIGIN = 'https://ceai-c3.vercel.app';
  var ENDPOINT = (function () {
    var h = location.hostname || '';
    var noFunctions = h.indexOf('github.io') !== -1 || location.protocol === 'file:';
    return noFunctions ? API_ORIGIN + '/api/chat' : '/api/chat';
  })();

  var history = [];
  var busy = false;
  var lastFocus = null;

  var TXT = {
    es: {
      launch: 'Preguntá lo que quieras',
      title: 'Asistente de aulauniversitaria',
      close: 'Cerrar el asistente',
      disclosure: 'Hola. Soy un asistente automático, no una persona. Respondo con la información de los talleres y las preguntas frecuentes de aulauniversitaria. Si necesitás algo que no sé, te paso con la coordinación.',
      privacy: 'Tus mensajes se envían a Google Gemini para generar la respuesta. No guardamos la conversación.',
      placeholder: 'Escribí tu pregunta',
      send: 'Enviar',
      label: 'Tu pregunta',
      thinking: 'Buscando en los talleres...',
      suggest: ['¿Cuánto cuesta?', '¿Puedo probar una clase antes?', '¿Qué talleres hay los martes?', '¿Dónde son las clases?'],
      offline: 'El asistente no está disponible en esta dirección. Escribinos por WhatsApp al ' + PHONE + ' y te respondemos.',
      wa: 'Escribir por WhatsApp',
      you: 'Vos', bot: 'Asistente',
      cAlso: 'También', cTeacher: 'Profesor', cLevel: 'Nivel',
      cPeriod: 'Período', cPlaces: 'Cupo', cAsk: 'Consultar por este taller'
    },
    en: {
      launch: 'Ask us anything',
      title: 'aulauniversitaria assistant',
      close: 'Close the assistant',
      disclosure: 'Hello. I am an automated assistant, not a person. I answer using the aulauniversitaria course list and frequently asked questions. If you need something I do not know, I will pass you to coordination.',
      privacy: 'Your messages are sent to Google Gemini to generate the reply. We do not store the conversation.',
      placeholder: 'Type your question',
      send: 'Send',
      label: 'Your question',
      thinking: 'Looking through the courses...',
      suggest: ['How much does it cost?', 'Can I try a class first?', 'What is on on Tuesdays?', 'Where are the classes?'],
      offline: 'The assistant is not available at this address. Message us on WhatsApp at ' + PHONE + ' and we will reply.',
      wa: 'Message on WhatsApp',
      you: 'You', bot: 'Assistant',
      cAlso: 'Also', cTeacher: 'Teacher', cLevel: 'Level',
      cPeriod: 'Period', cPlaces: 'Places', cAsk: 'Ask about this course'
    }
  };

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'es'; }
  function t(k) { return TXT[lang()][k]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Turns a plain-text reply into safe HTML: paragraphs, simple lists, and
     phone numbers made tappable. No markdown parser, no innerHTML of model
     output without escaping first. */
  /* The model is told to answer in plain text, but models drift back to
     markdown, and a visitor should never be shown a literal **asterisk**.
     Escaping happens first, so any markup here is ours, not the model's. */
  function inline(s) {
    return s
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])_([^_\n]+)_(?=[\s.,;:!?)]|$)/g, '$1<em>$2</em>')
      .replace(/\*\*/g, '');   // any unmatched pair left over
  }

  function format(text) {
    var safe = esc(text);
    safe = safe.replace(/(\+?54\s?9?\s?351\s?3?\s?261002|351 3 261002|3543 536010)/g,
      '<a href="tel:+5493513261002">$1</a>');
    safe = safe.replace(/(info@promover\.org\.ar|aulauniversitaria@ubp\.edu\.ar)/g,
      '<a href="mailto:$1">$1</a>');

    var blocks = safe.split(/\n{2,}/);
    return blocks.map(function (b) {
      var lines = b.split('\n').filter(function (l) { return l.trim(); });
      /* One bulleted line is still a list. The earlier rule needed two and
         left single-item lists rendering with a stray dash. */
      var bullets = lines.filter(function (l) { return /^\s*[-*•]\s+/.test(l); });
      if (bullets.length && bullets.length === lines.length) {
        return '<ul>' + lines.map(function (l) {
          return '<li>' + inline(l.replace(/^\s*[-*•]\s+/, '')) + '</li>';
        }).join('') + '</ul>';
      }
      return '<p>' + inline(lines.join('<br>')) + '</p>';
    }).join('');
  }

  /* ------------------------------------------------------------------ build */
  var launcher, panel, log, input, form, sendBtn;

  function build() {
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'chat-launch';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = '<span class="chat-launch-dot" aria-hidden="true"></span><span class="chat-launch-text"></span>';

    panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.hidden = true;
    panel.innerHTML =
      '<div class="chat-head">' +
        '<h2 class="chat-title"></h2>' +
        '<button type="button" class="chat-close" aria-label=""><span aria-hidden="true">&times;</span></button>' +
      '</div>' +
      '<div class="chat-log" role="log" aria-live="polite" aria-atomic="false"></div>' +
      '<form class="chat-form">' +
        '<label class="sr-only" for="chat-input"></label>' +
        '<input id="chat-input" type="text" autocomplete="off" class="chat-input">' +
        '<button type="submit" class="chat-send"></button>' +
      '</form>' +
      '<p class="chat-privacy"></p>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    log = panel.querySelector('.chat-log');
    input = panel.querySelector('.chat-input');
    form = panel.querySelector('.chat-form');
    sendBtn = panel.querySelector('.chat-send');

    launcher.addEventListener('click', toggle);
    panel.querySelector('.chat-close').addEventListener('click', close);
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    applyText();
  }

  function applyText() {
    launcher.querySelector('.chat-launch-text').textContent = t('launch');
    launcher.setAttribute('aria-label', t('launch'));
    panel.querySelector('.chat-title').textContent = t('title');
    panel.querySelector('.chat-close').setAttribute('aria-label', t('close'));
    panel.querySelector('label[for="chat-input"]').textContent = t('label');
    input.placeholder = t('placeholder');
    sendBtn.textContent = t('send');
    panel.querySelector('.chat-privacy').textContent = t('privacy');
  }

  /* -------------------------------------------------------------- messages */
  function bubble(role, html, extraClass) {
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg chat-' + role + (extraClass ? ' ' + extraClass : '');
    wrap.innerHTML = '<span class="chat-who">' + esc(role === 'user' ? t('you') : t('bot')) + '</span>' +
      '<div class="chat-body">' + html + '</div>';
    log.appendChild(wrap);
    log.scrollTop = log.scrollHeight;
    return wrap;
  }

  function suggestions() {
    var box = document.createElement('div');
    box.className = 'chat-suggest';
    t('suggest').forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-chip';
      b.textContent = s;
      b.addEventListener('click', function () {
        box.remove();
        send(s);
      });
      box.appendChild(b);
    });
    log.appendChild(box);
  }

  /* Course cards. Every value here arrives from the server already read out
     of the sheet, so nothing on a card is the model's wording. */
  function cardsBlock(cards) {
    var box = document.createElement('div');
    box.className = 'chat-cards';
    box.setAttribute('role', 'list');

    cards.forEach(function (c) {
      var el = document.createElement('article');
      el.className = 'chat-card' + (c.isWorkshop ? ' is-workshop' : '');
      el.setAttribute('role', 'listitem');

      var chips = [
        '<span class="chat-chip-tag when">' + esc(c.when) + '</span>',
        c.format ? '<span class="chat-chip-tag' + (c.online ? ' online' : '') + '">' + esc(c.format) + '</span>' : '',
        c.category ? '<span class="chat-chip-tag">' + esc(c.category) + '</span>' : ''
      ].filter(Boolean).join('');

      var lines = [
        c.altWhen ? row(t('cAlso'), c.altWhen) : '',
        c.teacher ? row(t('cTeacher'), c.teacher) : '',
        c.level ? row(t('cLevel'), c.level) : '',
        c.period ? row(t('cPeriod'), c.period) : '',
        c.capacity ? row(t('cPlaces'), c.capacity) : ''
      ].filter(Boolean).join('');

      var ask = encodeURIComponent(
        (lang() === 'es' ? 'Hola, quiero consultar por el taller: ' : 'Hello, I would like to ask about: ') + c.title
      );

      el.innerHTML =
        '<h3>' + esc(c.title) + '</h3>' +
        '<div class="chat-card-chips">' + chips + '</div>' +
        lines +
        '<a class="chat-card-ask" href="' + WA + '?text=' + ask + '" rel="noopener">' + esc(t('cAsk')) + '</a>';
      box.appendChild(el);
    });

    log.appendChild(box);
    log.scrollTop = log.scrollHeight;
  }

  function row(label, value) {
    return '<p class="chat-card-line"><span>' + esc(label) + ':</span> <strong>' + esc(value) + '</strong></p>';
  }

  function handoffBlock() {
    var p = document.createElement('p');
    p.className = 'chat-handoff';
    p.innerHTML = '<a class="btn btn-primary" href="' + WA + '" rel="noopener">' + esc(t('wa')) + '</a>' +
      '<a class="btn btn-ghost" href="tel:+5493513261002">' + esc(PHONE) + '</a>';
    log.appendChild(p);
    log.scrollTop = log.scrollHeight;
  }

  /* body is "active" whenever nothing else is, and body.focus() is a no-op,
     so restoring to it would strand keyboard users at the top of the page. */
  function focusable(el) {
    return el && el !== document.body && el.isConnected &&
           typeof el.focus === 'function' && !panel.contains(el);
  }

  function open() {
    lastFocus = focusable(document.activeElement) ? document.activeElement : launcher;
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!log.childNodes.length) {
      bubble('bot', '<p>' + esc(t('disclosure')) + '</p>', 'chat-disclosure');
      suggestions();
    }
    input.focus();
  }

  function close() {
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    /* The element that opened the panel may no longer exist: a suggestion chip
       removes itself when clicked. Focus must never land on nothing. */
    (focusable(lastFocus) ? lastFocus : launcher).focus();
  }

  function toggle() { panel.hidden ? open() : close(); }

  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    input.value = '';
    var sug = log.querySelector('.chat-suggest');
    if (sug) sug.remove();

    bubble('user', '<p>' + esc(text) + '</p>');
    history.push({ role: 'user', text: text });

    busy = true;
    sendBtn.disabled = true;
    var pending = bubble('bot', '<p class="chat-thinking">' + esc(t('thinking')) + '</p>');

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ message: text, history: history.slice(0, -1), lang: lang() })
    })
      .then(function (r) {
        if (r.status === 404 || r.status === 405) throw new Error('no_endpoint');
        return r.json().catch(function () { throw new Error('bad_json'); });
      })
      .then(function (data) {
        var reply = data && data.reply ? data.reply : t('offline');
        pending.querySelector('.chat-body').innerHTML = format(reply);
        history.push({ role: 'assistant', text: reply });
        var cards = (data && Array.isArray(data.cards)) ? data.cards : [];
        if (cards.length) cardsBlock(cards);
        /* Each card carries its own enquiry link, so the generic handoff
           buttons underneath would just be a third way to say the same thing. */
        if (data && data.handoff && !cards.length) handoffBlock();
      })
      .catch(function () {
        pending.querySelector('.chat-body').innerHTML = '<p>' + esc(t('offline')) + '</p>';
        handoffBlock();
      })
      .then(function () {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
        log.scrollTop = log.scrollHeight;
      });
  }

  /* Keep the assistant in the same language as the page. */
  function watchLanguage() {
    new MutationObserver(function () {
      applyText();
      if (log && !log.childNodes.length) return;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  document.addEventListener('DOMContentLoaded', function () {
    build();
    watchLanguage();
  });
})();
