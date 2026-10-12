/* aulauniversitaria course finder
 *
 * The course catalogue is NOT stored in this file. It is read from the
 * coordination team's Google Sheet with a fresh HTTP request every time the
 * page loads. Nothing here is cached, hardcoded, or copy-pasted. If the sheet
 * is unreachable the page says so and shows the phone number: it never falls
 * back to a stale copy.
 *
 * Source of truth:
 * https://docs.google.com/spreadsheets/d/1LN4OD7dwwSkjaJGJJknTKnxD3B2a71bdr5ktWFrZJtM
 */

(function () {
  'use strict';

  var SHEET_ID = '1LN4OD7dwwSkjaJGJJknTKnxD3B2a71bdr5ktWFrZJtM';

  /* The teacher sheet. Paste the id between the quotes once the sheet is
     uploaded and shared as "anyone with the link can view". While it is
     empty, or if the sheet cannot be read, the teachers section and its nav
     link stay hidden rather than showing an empty heading. */
  var TEACHERS_SHEET_ID = '1lVxincu--PI9M_WPri5c1gdf4A8f2ezIWWbrn4wexwA';

  /* The "Lo que conviene saber" cards. Same rule as the teacher sheet: while
     this id is empty, or if the sheet cannot be read, the section stays
     hidden rather than showing an empty heading. */
  var INFO_SHEET_ID = '1x4Gf8OEYduZuh1lofeh_xxXeGVrlWZEie4FVHcDFnE4';

  /* Argentine national public holidays. Free, no key, CORS open.
     Valentina's caveat, and the rule this whole feature is built on:
     argentinadatos.com is a community project with no uptime guarantee, so
     this must degrade to SILENCE. It may say "there is no class on this
     date". It must never say "there is a class", and if the API is
     unreachable or returns anything unexpected, the notice simply does not
     appear. A missing notice costs nothing. A wrong one sends a 70 year old
     to Argüello for a locked classroom. */
  var HOLIDAYS_API = 'https://api.argentinadatos.com/v1/feriados/';

  /* The teaching year, from the programme document. Only a guard: the real
     filter is whether the date falls on a day the live sheet says we teach. */
  var TERM_START = '2026-03-02';
  var TERM_END   = '2026-11-30';
  var MAX_NOTICES = 3;

  var gviz = function (id) {
    return 'https://docs.google.com/spreadsheets/d/' + id + '/gviz/tq?tqx=out:json&headers=1';
  };
  var SHEET_URL = gviz(SHEET_ID);
  var PHONE = '351 3 261002';
  var WA = 'https://wa.me/5493513261002';

  /* ---------------------------------------------------------------- state */
  var COURSES = [];
  var TEACHERS = [];
  var INFO = [];
  var HOLIDAYS = [];      /* upcoming, for the notice */
  var HOLIDAYS_ALL = [];  /* every in-term holiday, for calendar exclusions */
  var FETCHED_AT = null;

  /* ------------------------------------------------------ display mapping */
  var DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Sábado y domingo', 'Domingo'];

  var EN_TO_ES_DAY = {
    Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
    Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado',
    Sunday: 'Domingo', 'Saturday-Sunday': 'Sábado y domingo',
    lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', miércoles: 'Miércoles',
    jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', sábado: 'Sábado',
    domingo: 'Domingo'
  };

  function normDay(d) {
    if (!d) return '';
    return EN_TO_ES_DAY[d] || d;
  }

  var CAT_NORM = {
    'Art and Creativity': 'Arte y creatividad',
    'Humanities and Personal Development': 'Humanidades y desarrollo personal',
    'Technology': 'Tecnología',
    'Physical Activities': 'Actividades corporales',
    'Games and Play': 'Actividades lúdicas',
    'Languages': 'Idiomas',
    'New workshop (Aug 2026)': 'Taller nuevo (agosto 2026)'
  };

  function normCat(c) {
    if (!c) return '';
    return CAT_NORM[c] || c;
  }

  var FMT_NORM = {
    'In person': 'Presencial',
    'Online': 'Virtual'
  };

  function normFmt(f) {
    if (!f) return '';
    return FMT_NORM[f] || f;
  }

  var FREQ_NORM = {
    Weekly: 'Semanal', Fortnightly: 'Quincenal', 'One-off': 'Encuentro único',
    'Fixed dates': 'Fechas fijas', 'Monthly (fixed dates)': 'Mensual (fechas fijas)',
    'Residential weekend': 'Fin de semana'
  };

  function normFreq(f) {
    if (!f) return '';
    return FREQ_NORM[f] || f;
  }

  var LEVEL_NORM = {
    'Beginner': 'Inicial', 'Beginner 2': 'Inicial 2', 'Elementary': 'Elemental',
    'Pre-Intermediate': 'Pre intermedio', 'Pre-Intermediate 2': 'Pre intermedio 2',
    'Intermediate': 'Intermedio', 'Intermediate/Advanced': 'Intermedio y avanzado',
    'Advanced': 'Avanzado', 'Level 1': 'Nivel 1', 'Level 2': 'Nivel 2', 'Level 3': 'Nivel 3',
    'Beginner to experienced': 'Desde cero o con experiencia',
    'No prior experience required': 'No hace falta experiencia previa',
    'A1 (CEFR)': 'A1 (MCER)'
  };

  function normLevel(l) {
    if (!l) return '';
    return LEVEL_NORM[l] || l;
  }

  var LANG_NORM = {
    English: 'Inglés', French: 'Francés', Italian: 'Italiano', Portuguese: 'Portugués', Spanish: 'Español'
  };

  function normLang(l) {
    if (!l) return '';
    return LANG_NORM[l] || l;
  }

  /* Expanded search terms for synonyms and related words */
  var SEARCH_SYNONYMS = {
    'italiano': ['italiano', 'italia', 'palmaghini', 'malinverno'],
    'ingles': ['ingles', 'inglés', 'english', 'bancalari', 'borgogno', 'novillo', 'carina'],
    'inglés': ['ingles', 'inglés', 'english', 'bancalari', 'borgogno', 'novillo', 'carina'],
    'frances': ['frances', 'francés', 'french', 'rufail'],
    'francés': ['frances', 'francés', 'french', 'rufail'],
    'portugues': ['portugues', 'portugués', 'carreras'],
    'portugués': ['portugues', 'portugués', 'carreras'],
    'idioma': ['idioma', 'idiomas', 'italiano', 'ingles', 'frances', 'portugues'],
    'idiomas': ['idioma', 'idiomas', 'italiano', 'ingles', 'frances', 'portugues'],
    'pintura': ['pintura', 'pintar', 'dibujo', 'macedo'],
    'arte': ['arte', 'pintura', 'cine', 'visuales', 'artesanias', 'tejido'],
    'cine': ['cine', 'pelicula', 'película', 'audiovisual', 'arevalo', 'arévalo'],
    'musica': ['musica', 'música', 'canto', 'cantar', 'cocimano'],
    'música': ['musica', 'música', 'canto', 'cantar', 'cocimano'],
    'literatura': ['literatura', 'lectura', 'escribir', 'escritura', 'libro', 'trossero', 'camio', 'nobel', 'quiroga', 'schweblin'],
    'lectura': ['lectura', 'leer', 'libro', 'literario', 'trossero', 'camio'],
    'filosofia': ['filosofia', 'filosofía', 'stanis'],
    'filosofía': ['filosofia', 'filosofía', 'stanis'],
    'historia': ['historia', 'achaval', 'achával'],
    'memoria': ['memoria', 'mente', 'cognitivo', 'premolo', 'prémolo'],
    'mente': ['mente', 'memoria', 'atencion', 'atención', 'premolo', 'prémolo'],
    'meditacion': ['meditacion', 'meditación', 'mindfulness', 'atencion plena', 'hernandez', 'hernández'],
    'meditación': ['meditacion', 'meditación', 'mindfulness', 'atencion plena', 'hernandez', 'hernández'],
    'emociones': ['emociones', 'emocional', 'gestion emocional', 'hernandez'],
    'computacion': ['computacion', 'computación', 'computadora', 'informatica', 'informática', 'celular', 'tablet', 'pedano', 'perez', 'pérez'],
    'computación': ['computacion', 'computación', 'computadora', 'informatica', 'informática', 'celular', 'tablet', 'pedano', 'perez', 'pérez'],
    'informatica': ['informatica', 'informática', 'computacion', 'computadora', 'ia', 'inteligencia artificial'],
    'informática': ['informatica', 'informática', 'computacion', 'computadora', 'ia', 'inteligencia artificial'],
    'celular': ['celular', 'tablet', 'telefono', 'teléfono', 'pedano'],
    'tecnologia': ['tecnologia', 'tecnología', 'celular', 'computadora', 'ia'],
    'tecnología': ['tecnologia', 'tecnología', 'celular', 'computadora', 'ia'],
    'inteligencia artificial': ['inteligencia artificial', 'ia', 'ai'],
    'ia': ['inteligencia artificial', 'ia', 'ai'],
    'tejido': ['tejido', 'tejer', 'telar', 'trama', 'crochet', 'induni'],
    'golf': ['golf', 'castillo', 'villa allende', 'deporte'],
    'bridge': ['bridge', 'cartas', 'juego', 'rodriguez tagle'],
    'cartas': ['bridge', 'cartas'],
    'viaje': ['viaje', 'viajar', 'viajeros', 'turismo', 'historia', 'portugues', 'italiano'],
    'presencial': ['presencial', 'campus'],
    'virtual': ['virtual', 'online', 'zoom', 'meet']
  };

  function expandQuery(q) {
    var terms = [q];
    Object.keys(SEARCH_SYNONYMS).forEach(function (key) {
      if (key.indexOf(q) === 0 || q.indexOf(key) === 0) {
        SEARCH_SYNONYMS[key].forEach(function (t) {
          if (terms.indexOf(t) === -1) terms.push(t);
        });
      }
    });
    return terms;
  }

  var MONTH_ES = {
    January: 'enero', February: 'febrero', March: 'marzo', April: 'abril',
    May: 'mayo', June: 'junio', July: 'julio', August: 'agosto',
    September: 'septiembre', October: 'octubre', November: 'noviembre',
    December: 'diciembre', Jan: 'ene', Feb: 'feb', Mar: 'mar', Apr: 'abr',
    Jun: 'jun', Jul: 'jul', Aug: 'ago', Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dic'
  };

  function periodEs(value) {
    if (!value) return '';
    var out = value
      .replace(/^Full year/i, 'Todo el año')
      .replace(/Date to be confirmed/i, 'Fecha a confirmar')
      .replace(/\b(\d+)\s*months?\b/i, '$1 meses')
      .replace(/\band\b/g, 'y')
      .replace(/\s+-\s+/g, ' a ');
    Object.keys(MONTH_ES).forEach(function (en) {
      out = out.replace(new RegExp('\\b' + en + '\\b', 'g'), MONTH_ES[en]);
    });
    return out;
  }

  /* ------------------------------------------------------------------ strings */
  var STRINGS = {
    'nav.courses': 'Talleres', 'nav.week': 'La semana', 'nav.how': 'Cómo empezar', 'nav.contact': 'Contacto',
    'nav.teachers': 'Profesores', 'nav.menu': 'Menú', 'nav.menuClose': 'Cerrar',
    'skip': 'Ir al buscador de talleres',
    'ig.label': 'Instagram de aulauniversitaria, se abre en una pestaña nueva',
    'doc.title': 'aulauniversitaria | Actividades para mayores de 50 años en Córdoba',
    'find.placeholder': 'italiano, pintura, bridge...',
    'contact.p1': 'Teléfono 351 3 261002', 'contact.p2': 'Teléfono 3543 536010',
    'teach.title': 'Quiénes dan las clases',
    'teach.lead': 'Cada taller lo dicta alguien con una trayectoria propia. Estos son sus nombres y su recorrido.',
    'tool.bigger': 'Agrandar el texto',
    'tool.themeDark': 'Cambiar a fondo oscuro',
    'tool.themeLight': 'Cambiar a fondo claro',
    'hero.kicker': 'Asociación Civil Promover + Universidad Blas Pascal',
    'hero.title': 'Elegí un taller. La primera clase es gratis.',
    'hero.lead': 'Idiomas, arte, filosofía, tecnología, bridge y golf. Cuarenta y siete propuestas en el campus de la Universidad Blas Pascal, en Argüello, y también por videollamada. Podés probar cualquier taller sin pagar nada antes de decidir.',
    'hero.cta1': 'Quiero probar una clase', 'hero.cta2': 'Ver los talleres',
    'hero.fact1': 'propuestas 2026', 'hero.fact2': 'profesores',
    'hero.fact3v': '2 de marzo', 'hero.fact3': 'empiezan las clases',
    'hero.fact4v': 'Todo el año', 'hero.fact4': 'inscripción abierta',
    'find.title': 'Buscá tu taller',
    'find.lead': 'Escribí lo que te interesa o filtrá por día. Los datos se leen en vivo de la planilla de la coordinación cada vez que abrís esta página.',
    'find.search': 'Buscar por nombre, tema o profesor', 'find.day': 'Día', 'find.cat': 'Área',
    'find.fmt': 'Modalidad', 'find.any': 'Cualquiera', 'find.clear': 'Limpiar',
    'week.title': 'La semana de un vistazo',
    'week.lead': 'Todo lo que pasa cada día, ordenado por hora. Útil si ya sabés qué tarde tenés libre.',
    'how.title': 'Cómo empezar, en tres pasos',
    'how.s1t': 'Elegí un taller que te guste', 'how.s1b': 'Usá el buscador de arriba. Fijate el día y la hora que te queden cómodos.',
    'how.s2t': 'Llamá o escribí por WhatsApp', 'how.s2b': 'Decinos cuál te interesa y te reservamos un lugar en la próxima clase. Te atiende una persona, no un contestador.',
    'how.wa': 'Escribir por WhatsApp',
    'how.s3t': 'Vení a probar. Esa clase no se paga.',
    'how.s3b': 'Te sentás, mirás cómo trabaja el grupo y después decidís. Si te gusta, te inscribís. Si no, probás otro taller.',
    'how.feeT': '¿Cuánto cuesta?',
    'how.feeB': 'El arancel se paga por mes, del 1 al 15, con un valor bonificado dentro de esa fecha. No publicamos el importe en esta página porque cambia durante el año: preguntanos por teléfono o por WhatsApp y te lo decimos en el momento, sin compromiso.',
    'info.title': 'Lo que conviene saber',
    'contact.title': 'Dónde estamos y cómo escribirnos',
    'contact.h1': 'Hablá con una persona', 'contact.h2': 'Dónde son las clases',
    'contact.campus': 'Campus de la Universidad Blas Pascal',
    'foot.org': 'Programa de la Asociación Civil Promover y la Secretaría de Extensión y Relaciones Internacionales de la Universidad Blas Pascal.',
    'ui.results': 'taller', 'ui.results_p': 'talleres', 'ui.showing': 'Mostrando',
    'ui.none': 'No hay nada con esa búsqueda. Probá limpiar los filtros, o llamanos al ' + PHONE + ' y te ayudamos a encontrar algo.',
    'ui.loading': 'Cargando los talleres', 'ui.loadingBody': 'Leyendo la lista actual de la planilla de coordinación.',
    'ui.errT': 'No pudimos cargar la lista de talleres',
    'ui.errB': 'Falló la conexión con la planilla, así que preferimos no mostrarte una lista que puede estar vieja. Llamanos o escribinos al ' + PHONE + ' y te contamos qué se está dictando.',
    'ui.retry': 'Reintentar',
    'ui.teacher': 'Profesor', 'ui.period': 'Período', 'ui.also': 'También', 'ui.book': 'Libro',
    'ui.level': 'Nivel', 'ui.places': 'Cupo', 'ui.sessions': 'Encuentros',
    'ui.ask': 'Consultar por este taller',
    'ui.tbc': 'Fecha a confirmar',
    'ui.src': 'Datos de los talleres leídos en vivo de la planilla de coordinación a las ',
    'ui.noday': 'Fechas a confirmar',
    'ui.teaches': 'Dicta', 'ui.more': 'Leer más', 'ui.less': 'Mostrar menos',
    'ui.courseOne': 'taller en 2026', 'ui.courseMany': 'talleres en 2026',
    'ui.seeCourses': 'Ver sus talleres',
    'hol.title': 'Días sin clases',
    'hol.lead': 'Son feriados nacionales que caen en un día que dictamos. Esas fechas no hay clases.',
    'hol.one': 'taller', 'hol.many': 'talleres',
    'hol.check': 'Ante cualquier duda, llamanos al ',
    'cal.add': 'Agregar al calendario:', 'cal.addDay': 'Agregar al calendario:',
    'cal.google': 'Google Calendar', 'cal.ics': 'Descargar (.ics)',
    'cal.skips': 'Sin clases el:',
    'cal.assumed': 'Duración aproximada, dos horas',
    'cal.ask': 'Consultas:'
  };

  function t(key) {
    return STRINGS[key] !== undefined ? STRINGS[key] : key;
  }

  /* -------------------------------------------------------------- helpers */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function cellText(cell, type) {
    if (!cell || cell.v == null || cell.v === '') return '';

    if (type === 'timeofday' && Array.isArray(cell.v)) {
      return pad2(cell.v[0]) + ':' + pad2(cell.v[1] || 0);
    }
    if (type === 'datetime' || type === 'date') {
      if (cell.f) return String(cell.f).trim();
      var m = /^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+))?/.exec(String(cell.v));
      if (m && m[4] !== undefined) return pad2(+m[4]) + ':' + pad2(+m[5]);
      if (m) return m[3] + '/' + (+m[2] + 1) + '/' + m[1];
    }
    var raw = String(cell.v).trim();
    if (/^Date\(/.test(raw) && cell.f) return String(cell.f).trim();
    return raw;
  }

  /* ------------------------------------------------------- the live fetch */
  function readSheet(id) {
    return fetch(gviz(id) + '&nocache=' + Date.now(), { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var open = text.indexOf('{');
        var close = text.lastIndexOf('}');
        if (open === -1 || close === -1) throw new Error('Unexpected response shape');
        var payload = JSON.parse(text.substring(open, close + 1));
        if (!payload.table || !payload.table.cols) throw new Error('No table in response');

        var labels = payload.table.cols.map(function (c) { return (c.label || '').trim(); });
        var types = payload.table.cols.map(function (c) { return c.type || 'string'; });
        var rows = payload.table.rows || [];

        /* If headers=1 were ever ignored, row 1 really is the header. */
        if (!labels.some(Boolean) && rows.length) {
          labels = (rows[0].c || []).map(function (c, i) {
            return (c && c.v) ? String(c.v).trim() : 'col' + i;
          });
          rows = rows.slice(1);
        }

        return rows.map(function (row) {
          var obj = {};
          labels.forEach(function (label, i) {
            if (label) obj[label] = cellText(row.c && row.c[i], types[i]);
          });
          return obj;
        });
      });
  }

  function loadCourses() {
    showState('loading');

    return readSheet(SHEET_ID)
      .then(function (rows) {
        COURSES = rows.map(function (r) {
          var day = normDay(r.dia || r.day || '');
          var altDay = normDay(r.dia_alternativo || r.alt_day || '');
          return {
            id: r.id || r.ID || '',
            type: r.tipo || r.type || '',
            category: normCat(r.area || r.categoria || r.category || ''),
            course_name: r.nombre || r.course_name_es || r.course_name || '',
            level: normLevel(r.nivel || r.level || ''),
            language: normLang(r.idioma || r.language || ''),
            format: normFmt(r.modalidad || r.format || ''),
            venue: r.lugar || r.venue || '',
            day: day,
            time_24h: r.horario_24h || r.time_24h || '',
            time_display: r.horario_display || r.time_display || '',
            alt_day: altDay,
            alt_time_24h: r.horario_alternativo_24h || r.alt_time_24h || '',
            frequency: normFreq(r.frecuencia || r.frequency || ''),
            sessions: r.encuentros || r.sessions || '',
            period: periodEs(r.periodo || r.period || ''),
            teacher: r.docente || r.profesor || r.teacher || '',
            capacity: r.cupo || r.capacity || '',
            coursebook: r.libro || r.coursebook || '',
            notes: r.notas || r.notes_es || r.notes || '',
            duration_min: r.duracion_min || r.duration_min || ''
          };
        }).filter(function (o) { return o.course_name; });

        FETCHED_AT = new Date();
        if (!COURSES.length) throw new Error('Sheet returned zero course rows');

        hideState();
        buildFilters();
        render();
        renderWeek();
        stampSource();
      })
      .catch(function (err) {
        COURSES = [];
        showState('error', err && err.message);
        $('#results').innerHTML = '';
        $('#week').innerHTML = '';
        $('#count').textContent = '';
        $('#fact-courses').textContent = '–';
        $('#fact-teachers').textContent = '–';
      });
  }

  function showState(kind, detail) {
    var box = $('#state');
    box.hidden = false;
    if (kind === 'loading') {
      box.className = 'state is-loading';
      box.innerHTML = '<h3>' + esc(t('ui.loading')) + '</h3><p>' + esc(t('ui.loadingBody')) + '</p>';
    } else {
      box.className = 'state';
      box.innerHTML =
        '<h3>' + esc(t('ui.errT')) + '</h3>' +
        '<p>' + esc(t('ui.errB')) + '</p>' +
        '<p><a class="btn btn-primary" href="' + WA + '" rel="noopener">WhatsApp ' + esc(PHONE) + '</a> ' +
        '<button type="button" class="btn btn-ghost" id="retry">' + esc(t('ui.retry')) + '</button></p>' +
        (detail ? '<p class="card-note">' + esc(detail) + '</p>' : '');
      var r = $('#retry');
      if (r) r.addEventListener('click', loadCourses);
    }
  }
  function hideState() { var b = $('#state'); b.hidden = true; b.innerHTML = ''; }

  /* ------------------------------------------------------------- filters */
  function uniq(field) {
    var seen = {};
    COURSES.forEach(function (c) { if (c[field]) seen[c[field]] = true; });
    return Object.keys(seen);
  }

  function fillSelect(sel, values, sorter) {
    var el = $(sel);
    var current = el.value;
    var keep = el.querySelector('option[value=""]');
    el.innerHTML = '';
    el.appendChild(keep);
    (sorter ? values.slice().sort(sorter) : values.slice().sort()).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = v;
      el.appendChild(o);
    });
    el.value = current;
  }

  function buildFilters() {
    fillSelect('#f-day', uniq('day'), function (a, b) {
      return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b);
    });
    fillSelect('#f-cat', uniq('category'));
    fillSelect('#f-fmt', uniq('format'));
    var n = $('#fact-courses'); if (n) n.textContent = COURSES.length;
    var teachers = {};
    COURSES.forEach(function (c) {
      String(c.teacher || '').split('/').forEach(function (name) {
        name = name.trim(); if (name) teachers[name] = true;
      });
    });
    var tEl = $('#fact-teachers'); if (tEl) tEl.textContent = Object.keys(teachers).length;
  }

  function filtered() {
    var q = $('#q').value.trim().toLowerCase();
    var day = $('#f-day').value, cat = $('#f-cat').value, fmt = $('#f-fmt').value;
    return COURSES.filter(function (c) {
      if (day && c.day !== day && c.alt_day !== day) return false;
      if (cat && c.category !== cat) return false;
      if (fmt && c.format !== fmt) return false;
      if (!q) return true;
      var hay = [c.course_name, c.teacher, c.category, c.language,
                 c.level, c.notes, c.venue, c.coursebook,
                 c.format, c.day, c.alt_day]
        .filter(Boolean).join(' ').toLowerCase();
      return expandQuery(q).some(function (term) { return hay.indexOf(term) !== -1; });
    });
  }

  /* --------------------------------------------------------------- render */
  function courseTitle(c) { return c.course_name || ''; }

  function prettyTime(raw) {
    var m = String(raw || '').match(/^(\d{1,2}):(\d{2})/);
    if (!m) return String(raw || '');
    var h = +m[1], mm = m[2];
    var suffix = h < 12 ? 'a.m.' : 'p.m.';
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ':' + mm + ' ' + suffix;
  }

  function whenLabel(c) {
    var bits = [];
    if (c.day) bits.push(c.day);
    if (c.time_display) bits.push(c.time_display);
    else if (c.time_24h) bits.push(c.time_24h);
    if (!bits.length) return t('ui.noday');
    return bits.join(', ');
  }

  function card(c) {
    var isWorkshop = /taller/i.test(c.type || '') || /workshop/i.test(c.type || '');
    var online = /virtual/i.test(c.format || '') || /online/i.test(c.format || '');
    var out = [];
    out.push('<article class="card' + (isWorkshop ? ' is-workshop' : '') + '">');
    out.push('<h3>' + esc(courseTitle(c)) + '</h3>');

    out.push('<div class="card-meta">');
    out.push('<span class="chip chip-when">' + esc(whenLabel(c)) + '</span>');
    if (c.format) out.push('<span class="chip' + (online ? ' chip-online' : '') + '">' + esc(c.format) + '</span>');
    if (c.category) out.push('<span class="chip' + (isWorkshop ? ' chip-new' : '') + '">' + esc(c.category) + '</span>');
    if (c.frequency) out.push('<span class="chip">' + esc(c.frequency) + '</span>');
    out.push('</div>');

    if (c.alt_day) {
      out.push('<p class="card-line">' + esc(t('ui.also')) + ': <strong>' +
        esc(c.alt_day) + (c.alt_time_24h ? ', ' + esc(prettyTime(c.alt_time_24h)) : '') + '</strong></p>');
    }
    if (c.teacher) out.push('<p class="card-line">' + esc(t('ui.teacher')) + ': <strong>' + esc(c.teacher) + '</strong></p>');
    if (c.level) out.push('<p class="card-line">' + esc(t('ui.level')) + ': <strong>' + esc(c.level) + '</strong></p>');
    if (c.period) {
      out.push('<p class="card-line">' + esc(t('ui.period')) + ': <strong>' + esc(c.period) + '</strong></p>');
    }
    if (c.capacity) out.push('<p class="card-line">' + esc(t('ui.places')) + ': <strong>' + esc(c.capacity) + '</strong></p>');
    if (c.sessions) out.push('<p class="card-line">' + esc(t('ui.sessions')) + ': <strong>' + esc(c.sessions) + '</strong></p>');
    if (c.coursebook) out.push('<p class="card-line">' + esc(t('ui.book')) + ': <strong>' + esc(c.coursebook) + '</strong></p>');
    if (c.notes) out.push('<p class="card-note">' + esc(c.notes) + '</p>');

    var ask = encodeURIComponent('Hola, quiero consultar por el taller: ' + courseTitle(c));
    out.push('<p class="card-cta"><a href="' + WA + '?text=' + ask + '" rel="noopener">' + esc(t('ui.ask')) + '</a></p>');

    if (exportable(c)) {
      function pair(alt, label) {
        var a = alt ? ' data-alt="1"' : '';
        var href = googleCalendarURL(c, alt);
        return (label ? '<span class="card-cal-when">' + esc(label) + '</span>' : '') +
          '<span class="card-cal-pair">' +
            (href
              ? '<a class="card-cal-btn" data-go="1" href="' + esc(href) +
                '" target="_blank" rel="noopener">' + esc(t('cal.google')) + '</a>'
              : '') +
            '<button type="button" class="card-cal-btn" data-cal="' + esc(c.id) + '"' + a + '>' +
              esc(t('cal.ics')) + '</button>' +
          '</span>';
      }
      out.push('<div class="card-cal"><span class="card-cal-label">' + esc(t('cal.add')) + '</span>' +
        (c.alt_day
          ? pair(false, c.day + (c.time_display ? ' ' + c.time_display : '')) +
            pair(true, c.alt_day + (c.alt_time_24h ? ' ' + prettyTime(c.alt_time_24h) : ''))
          : pair(false, '')) +
        '</div>');
    }
    out.push('</article>');
    return out.join('');
  }

  function render() {
    var list = filtered();
    $('#results').innerHTML = list.length
      ? list.map(card).join('')
      : '<p class="card-note">' + esc(t('ui.none')) + '</p>';
    $('#count').textContent = t('ui.showing') + ' ' + list.length + ' ' +
      (list.length === 1 ? t('ui.results') : t('ui.results_p'));

    $('#results').querySelectorAll('button.card-cal-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var c = COURSES.filter(function (x) { return x.id === btn.getAttribute('data-cal'); })[0];
        if (c) downloadICS(c, btn.hasAttribute('data-alt'));
      });
    });
  }

  function renderWeek() {
    var byDay = {};
    COURSES.forEach(function (c) {
      [[c.day, c.time_24h, c.time_display], [c.alt_day, c.alt_time_24h, c.alt_time_24h]]
        .forEach(function (slot) {
          if (!slot[0]) return;
          (byDay[slot[0]] = byDay[slot[0]] || []).push({
            name: courseTitle(c), sort: slot[1] || '', label: slot[2] || slot[1] || ''
          });
        });
    });
    var days = Object.keys(byDay).sort(function (a, b) {
      return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b);
    });
    $('#week').innerHTML = days.map(function (d) {
      var items = byDay[d].sort(function (a, b) { return a.sort.localeCompare(b.sort); });
      return '<div class="day"><h3>' + esc(d) + '</h3><ul>' +
        items.map(function (i) {
          return '<li><time>' + esc(i.label || '--') + '</time> ' + esc(i.name) + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  function stampSource() {
    if (!FETCHED_AT) return;
    var el = $('#datasource');
    if (!el) return;
    var time = FETCHED_AT.toLocaleString('es-AR');
    el.innerHTML =
      esc(t('ui.src')) + '<strong>' + esc(time) + '</strong>.';
  }

  /* -------------------------------------------------------------- teachers */
  function loadTeachers() {
    if (!TEACHERS_SHEET_ID) return Promise.resolve();
    return readSheet(TEACHERS_SHEET_ID)
      .then(function (rows) {
        TEACHERS = rows
          .map(function (r) {
            var act = r.activo !== undefined ? r.activo : (r.active !== undefined ? r.active : 'si');
            return {
              id: r.id || r.ID || '',
              name: r.nombre || r.name || '',
              teaches: r.dicta || r.teaches_es || r.teaches || r.teaches_en || '',
              bio: r.bio || r.bio_es || r.biografia || r.bio_en || '',
              photo_url: r.foto_url || r.photo_url || '',
              active: String(act).toLowerCase() !== 'no',
              sort_order: r.orden !== undefined ? r.orden : r.sort_order
            };
          })
          .filter(function (r) { return r.name && r.active; })
          .sort(function (a, b) {
            var x = parseInt(a.sort_order, 10), y = parseInt(b.sort_order, 10);
            if (!isNaN(x) && !isNaN(y) && x !== y) return x - y;
            return String(a.name).localeCompare(String(b.name), 'es');
          });
        if (!TEACHERS.length) return;
        $('#profesores').hidden = false;
        $('#nav-teachers').hidden = false;
        renderTeachers();
      })
      .catch(function () {
        $('#profesores').hidden = true;
        $('#nav-teachers').hidden = true;
      });
  }

  function teacherCourses(name) {
    var n = String(name || '').trim().toLowerCase();
    if (!n) return [];
    return COURSES.filter(function (c) {
      return String(c.teacher || '').toLowerCase().split(/\s*\/\s*/)
        .map(function (s) { return s.trim(); }).indexOf(n) !== -1;
    });
  }

  function renderTeachers() {
    $('#teachers').innerHTML = TEACHERS.map(function (p, i) {
      var bio = p.bio || '';
      var teaches = p.teaches || '';
      var mine = teacherCourses(p.name);
      var count = mine.length
        ? '<p class="teacher-count">' + mine.length + ' ' +
          esc(mine.length === 1 ? t('ui.courseOne') : t('ui.courseMany')) + '</p>'
        : '';
      var initials = p.name.split(/\s+/).slice(0, 2)
        .map(function (w) { return w.charAt(0); }).join('').toUpperCase();

      var long = bio.length > 260;
      var bioHtml = bio
        ? '<div class="teacher-bio' + (long ? ' is-clamped' : '') + '" id="bio-' + i + '"><p>' + esc(bio) + '</p></div>' +
          (long ? '<button type="button" class="teacher-more" aria-expanded="false" aria-controls="bio-' + i + '">' +
                  esc(t('ui.more')) + '</button>' : '')
        : '';

      return '<article class="teacher">' +
        '<div class="teacher-head">' +
          (p.photo_url
            ? '<img class="teacher-photo" src="' + esc(p.photo_url) + '" alt="" width="64" height="64" loading="lazy">'
            : '<span class="teacher-initials" aria-hidden="true">' + esc(initials) + '</span>') +
          '<div><h3>' + esc(p.name) + '</h3>' +
          (teaches ? '<p class="teacher-teaches">' + esc(teaches) + '</p>' : '') + '</div>' +
        '</div>' + count + bioHtml +
        (mine.length ? '<button type="button" class="teacher-link" data-teacher="' + esc(p.name) + '">' +
                       esc(t('ui.seeCourses')) + '</button>' : '') +
      '</article>';
    }).join('');

    $('#teachers').querySelectorAll('.teacher-more').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var box = document.getElementById(btn.getAttribute('aria-controls'));
        var open = box.classList.toggle('is-clamped') === false;
        btn.setAttribute('aria-expanded', String(open));
        btn.textContent = open ? t('ui.less') : t('ui.more');
      });
    });

    $('#teachers').querySelectorAll('.teacher-link').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $('#q').value = btn.getAttribute('data-teacher');
        $('#f-day').value = ''; $('#f-cat').value = ''; $('#f-fmt').value = '';
        render();
        $('#buscador').scrollIntoView();
        $('#q').focus();
      });
    });
  }

  /* ------------------------------------------------------------------ info */
  function loadInfo() {
    if (!INFO_SHEET_ID) return Promise.resolve();
    return readSheet(INFO_SHEET_ID)
      .then(function (rows) {
        INFO = rows
          .map(function (r) {
            var act = r.activo !== undefined ? r.activo : (r.active !== undefined ? r.active : 'si');
            return {
              id: r.id || r.ID || '',
              title: r.titulo || r.title_es || r.title || r.title_en || '',
              body: r.texto || r.body_es || r.cuerpo || r.body || r.body_en || '',
              active: String(act).toLowerCase() !== 'no',
              sort_order: r.orden !== undefined ? r.orden : r.sort_order
            };
          })
          .filter(function (r) { return r.title && r.active; })
          .sort(function (a, b) {
            var x = parseInt(a.sort_order, 10), y = parseInt(b.sort_order, 10);
            if (!isNaN(x) && !isNaN(y) && x !== y) return x - y;
            return 0;
          });
        if (!INFO.length) return;
        $('#info').hidden = false;
        renderInfo();
      })
      .catch(function () {
        $('#info').hidden = true;
      });
  }

  function renderInfo() {
    $('#info-grid').innerHTML = INFO.map(function (r) {
      return '<div class="info"><h3>' + esc(r.title) + '</h3>' +
             (r.body ? '<p>' + esc(r.body) + '</p>' : '') + '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------- holidays */
  function parseISO(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  var JS_DAY = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  function teachingDays() {
    var set = {};
    COURSES.forEach(function (c) {
      if (c.day) set[c.day] = true;
      if (c.alt_day) set[c.alt_day] = true;
    });
    return set;
  }

  function loadHolidays() {
    if (!COURSES.length) return Promise.resolve();

    var year = new Date().getFullYear();
    return fetch(HOLIDAYS_API + year, { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (list) {
        if (!Array.isArray(list)) throw new Error('unexpected shape');

        var today = new Date(); today.setHours(0, 0, 0, 0);
        var start = parseISO(TERM_START), end = parseISO(TERM_END);
        var teach = teachingDays();

        HOLIDAYS_ALL = list.map(function (h) {
          var d = parseISO(h && h.fecha);
          if (!d || !h.nombre || d < start || d > end) return null;
          var dayName = JS_DAY[d.getDay()];
          if (!teach[dayName]) return null;
          var affected = COURSES.filter(function (c) {
            return c.day === dayName || c.alt_day === dayName;
          }).length;
          if (!affected) return null;
          return { date: d, name: String(h.nombre), day: dayName, courses: affected };
        }).filter(Boolean).sort(function (a, b) { return a.date - b.date; });

        HOLIDAYS = HOLIDAYS_ALL.filter(function (h) { return h.date >= today; })
                               .slice(0, MAX_NOTICES);

        renderHolidays();
        render();
      })
      .catch(function () {
        HOLIDAYS = [];
        HOLIDAYS_ALL = [];
        $('#holidays').hidden = true;
        $('#holidays').innerHTML = '';
      });
  }

  function renderHolidays() {
    var box = $('#holidays');
    if (!HOLIDAYS.length) { box.hidden = true; box.innerHTML = ''; return; }

    box.innerHTML =
      '<h3>' + esc(t('hol.title')) + '</h3>' +
      '<p class="holidays-lead">' + esc(t('hol.lead')) + '</p>' +
      '<ul>' + HOLIDAYS.map(function (h) {
        var when = h.date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
        return '<li><strong>' + esc(when) + '</strong> <span class="holidays-name">' + esc(h.name) + '</span>' +
               ' <span class="holidays-count">' + h.courses + ' ' +
               esc(h.courses === 1 ? t('hol.one') : t('hol.many')) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="holidays-foot">' + esc(t('hol.check')) +
      '<a href="tel:+5493513261002">' + esc(PHONE) + '</a>.</p>';
    box.hidden = false;
  }

  /* ---------------------------------------------------------- calendar */
  var DEFAULT_MINUTES = 120;
  var ICS_DAY = {
    Lunes: 'MO', Martes: 'TU', Miércoles: 'WE', Jueves: 'TH',
    Viernes: 'FR', Sábado: 'SA', Domingo: 'SU',
    Monday: 'MO', Tuesday: 'TU', Wednesday: 'WE', Thursday: 'TH',
    Friday: 'FR', Saturday: 'SA', Sunday: 'SU'
  };
  var MONTH_END = {
    enero: '0131', febrero: '0228', marzo: '0331', abril: '0430',
    mayo: '0531', junio: '0630', julio: '0731', agosto: '0831',
    septiembre: '0930', octubre: '1031', noviembre: '1130', diciembre: '1231',
    january: '0131', february: '0228', march: '0331', april: '0430',
    may: '0531', june: '0630', july: '0731', august: '0831',
    september: '0930', october: '1031', november: '1130', december: '1231'
  };

  var MIN_MINUTES = 20, MAX_MINUTES = 480;

  function durationMinutes(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return null;

    var hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    var mins = hm ? (+hm[1] * 60 + +hm[2]) : null;

    if (mins === null) {
      var n = s.match(/^(\d{1,4})(?:\s*(?:min|mins|minutos)?)?$/i);
      if (!n) return null;
      mins = +n[1];
    }
    if (!(mins >= MIN_MINUTES && mins <= MAX_MINUTES)) return null;
    return mins;
  }

  function exportable(c) {
    return (c.frequency === 'Semanal' || c.frequency === 'Weekly') && !!c.day && !!(c.time_24h || c.time_display);
  }

  function seriesEnd(period) {
    var last = null, low = String(period || '').toLowerCase();
    Object.keys(MONTH_END).forEach(function (m) {
      var i = low.lastIndexOf(m.slice(0, 3));
      if (i !== -1) { if (last === null || i > last.at) last = { at: i, key: m }; }
    });
    var end = last ? '2026' + MONTH_END[last.key] : TERM_END.replace(/-/g, '');
    var termEnd = TERM_END.replace(/-/g, '');
    return end > termEnd ? termEnd : end;
  }

  function hhmm(c, useAlt) {
    var raw = useAlt ? (c.alt_time_24h || '') : (c.time_24h || '');
    var m = String(raw).match(/(\d{1,2}):(\d{2})/);
    if (m) return [ +m[1], +m[2] ];
    var d = String(useAlt ? c.alt_time_24h : c.time_display).match(/(\d{1,2}):(\d{2})\s*([ap])/i);
    if (!d) return null;
    var h = +d[1] % 12; if (/p/i.test(d[3])) h += 12;
    return [ h, +d[2] ];
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function icsText(s) {
    return String(s == null ? '' : s)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }
  function fold(line) {
    if (line.length <= 73) return line;
    var out = line.slice(0, 73), rest = line.slice(73);
    while (rest.length > 72) { out += '\r\n ' + rest.slice(0, 72); rest = rest.slice(72); }
    return out + '\r\n ' + rest;
  }

  var TZ = 'America/Argentina/Cordoba';

  function eventFor(c, useAlt) {
    var day = useAlt ? c.alt_day : c.day;
    var time = hhmm(c, useAlt);
    if (!day || !time || !ICS_DAY[day]) return null;

    var d = parseISO(TERM_START);
    while (JS_DAY[d.getDay()] !== day) d.setDate(d.getDate() + 1);

    var mins = durationMinutes(c.duration_min);
    var assumed = mins === null;
    if (assumed) mins = DEFAULT_MINUTES;
    var endMin = time[0] * 60 + time[1] + mins;

    var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var skipped = HOLIDAYS_ALL.filter(function (h) { return h.day === day; });

    return {
      day: day,
      title: courseTitle(c),
      venue: c.venue || '',
      start: ymd + 'T' + pad(time[0]) + pad(time[1]) + '00',
      end: ymd + 'T' + pad(Math.floor(endMin / 60) % 24) + pad(endMin % 60) + '00',
      rrule: 'FREQ=WEEKLY;BYDAY=' + ICS_DAY[day] + ';UNTIL=' + seriesEnd(c.period) + 'T235900Z',
      exdates: skipped.map(function (h) {
        return h.date.getFullYear() + pad(h.date.getMonth() + 1) + pad(h.date.getDate()) +
               'T' + pad(time[0]) + pad(time[1]) + '00';
      }),
      skipped: skipped,
      assumed: assumed,
      uid: c.id + (useAlt ? '-alt' : '') + '@aulauniversitaria',
      description: (function () {
        var out = [];
        if (c.teacher) out.push(t('ui.teacher') + ': ' + c.teacher);
        if (c.period) out.push(t('ui.period') + ': ' + c.period);
        if (assumed) out.push(t('cal.assumed'));
        return out;
      })()
    };
  }

  function buildICS(c, useAlt) {
    var e = eventFor(c, useAlt);
    if (!e) return null;

    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//aulauniversitaria//ES', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:' + TZ, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + e.uid,
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
      'DTSTART;TZID=' + TZ + ':' + e.start,
      'DTEND;TZID=' + TZ + ':' + e.end,
      'RRULE:' + e.rrule
    ];
    e.exdates.forEach(function (x) { lines.push('EXDATE;TZID=' + TZ + ':' + x); });

    var desc = e.description.concat([t('cal.ask') + ' ' + PHONE]);
    lines.push('SUMMARY:' + icsText(e.title));
    if (e.venue) lines.push('LOCATION:' + icsText(e.venue));
    lines.push('DESCRIPTION:' + icsText(desc.join('. ')));
    lines.push('END:VEVENT', 'END:VCALENDAR');

    return lines.map(fold).join('\r\n') + '\r\n';
  }

  function googleCalendarURL(c, useAlt) {
    var e = eventFor(c, useAlt);
    if (!e) return null;

    var recur = ['RRULE:' + e.rrule];
    e.exdates.forEach(function (x) { recur.push('EXDATE;TZID=' + TZ + ':' + x); });

    var desc = e.description.slice();
    if (e.skipped.length) {
      desc.push(t('cal.skips') + ' ' + e.skipped.map(function (h) {
        return h.date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
      }).join(', '));
    }
    desc.push(t('cal.ask') + ' ' + PHONE);

    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(e.title) +
      '&dates=' + e.start + '/' + e.end +
      '&ctz=' + encodeURIComponent(TZ) +
      '&recur=' + encodeURIComponent(recur.join('\n')) +
      (e.venue ? '&location=' + encodeURIComponent(e.venue) : '') +
      '&details=' + encodeURIComponent(desc.join('. '));
  }

  function downloadICS(c, useAlt) {
    var ics = buildICS(c, useAlt);
    if (!ics) return;
    var name = String(courseTitle(c)).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'taller';
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name + '.ics';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  /* --------------------------------------------------------------- theme */
  function applyTheme(dark) {
    var root = document.documentElement;
    if (dark) root.setAttribute('data-theme', 'dark');
    else root.removeAttribute('data-theme');
    try { localStorage.setItem('au-theme', dark ? 'dark' : 'light'); } catch (e) {}

    var btn = $('#theme');
    if (!btn) return;
    btn.setAttribute('aria-pressed', String(dark));
    btn.querySelector('.theme-icon').textContent = dark ? '☀' : '☾';
    var label = dark ? t('tool.themeLight') : t('tool.themeDark');
    btn.querySelector('.sr-only').textContent = label;
    btn.setAttribute('title', label);
  }

  /* ---------------------------------------------------------- small-screen menu */
  var NARROW = window.matchMedia('(max-width:760px)');
  var menuOpen = false;

  function syncNav() {
    var nav = $('#site-nav'), btn = $('#nav-toggle');
    if (!nav || !btn) return;

    if (!NARROW.matches) {
      menuOpen = false;
      btn.hidden = true;
      nav.hidden = false;
      btn.setAttribute('aria-expanded', 'false');
      return;
    }

    btn.hidden = false;
    nav.hidden = !menuOpen;
    btn.setAttribute('aria-expanded', String(menuOpen));
    btn.querySelector('.nav-toggle-text').textContent = t(menuOpen ? 'nav.menuClose' : 'nav.menu');
    btn.setAttribute('aria-label', t(menuOpen ? 'nav.menuClose' : 'nav.menu'));
  }

  function setMenu(open, restoreFocus) {
    menuOpen = open;
    syncNav();
    if (open) {
      var first = $('#site-nav').querySelector('a:not([hidden])');
      if (first) first.focus();
    } else if (restoreFocus) {
      $('#nav-toggle').focus();
    }
  }

  function wireNav() {
    var nav = $('#site-nav'), btn = $('#nav-toggle');

    btn.addEventListener('click', function () { setMenu(!menuOpen, !menuOpen ? false : true); });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a') && NARROW.matches) setMenu(false, false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuOpen) setMenu(false, true);
    });

    document.addEventListener('click', function (e) {
      if (!menuOpen) return;
      if (nav.contains(e.target) || btn.contains(e.target)) return;
      if (e.target.closest && e.target.closest('.header-tools')) return;
      setMenu(false, false);
    });

    if (NARROW.addEventListener) NARROW.addEventListener('change', syncNav);
    else if (NARROW.addListener) NARROW.addListener(syncNav);
    window.addEventListener('resize', syncNav);

    syncNav();
  }

  /* --------------------------------------------------------------- start */
  document.addEventListener('DOMContentLoaded', function () {
    wireNav();

    ['#q', '#f-day', '#f-cat', '#f-fmt'].forEach(function (sel) {
      $(sel).addEventListener('input', render);
      $(sel).addEventListener('change', render);
    });

    $('#clear').addEventListener('click', function () {
      $('#q').value = ''; $('#f-day').value = ''; $('#f-cat').value = ''; $('#f-fmt').value = '';
      render(); $('#q').focus();
    });

    $('#text-size').addEventListener('click', function () {
      var big = document.documentElement.getAttribute('data-textsize') === 'big';
      document.documentElement.setAttribute('data-textsize', big ? '' : 'big');
      this.setAttribute('aria-pressed', String(!big));
    });

    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');
    $('#theme').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
    });

    loadCourses().then(loadTeachers).then(loadInfo).then(loadHolidays);
  });
})();
