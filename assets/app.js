/* aulauniversitaria course finder
 *
 * Built by Nadia Kaufman.
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
  var LANG = 'es';

  /* ------------------------------------------------------ display mapping */
  /* The sheet stores its enum values in English. These maps translate them for
     display only. They never replace or invent course data. */
  var DAY_ES = {
    Monday: 'Lunes', Tuesday: 'Martes', Wednesday: 'Miércoles',
    Thursday: 'Jueves', Friday: 'Viernes', Saturday: 'Sábado',
    Sunday: 'Domingo', 'Saturday-Sunday': 'Sábado y domingo'
  };
  var DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Saturday-Sunday','Sunday'];

  var CAT_ES = {
    'Art and Creativity': 'Arte y creatividad',
    'Humanities and Personal Development': 'Humanidades y desarrollo personal',
    'Technology': 'Tecnología',
    'Physical Activities': 'Actividades corporales',
    'Games and Play': 'Actividades lúdicas',
    'Languages': 'Idiomas',
    'New workshop (Aug 2026)': 'Taller nuevo (agosto 2026)'
  };

  var FMT_ES = { 'In person': 'Presencial', 'Online': 'Virtual' };

  /* The sheet now carries Spanish course names in course_name_es, so a search
     for "italiano" matches the title directly. This map stays because it also
     covers words that are in nobody's title: "cartas" finds bridge, "memoria"
     finds the cognitive workshop, "deporte" finds golf. It only widens the
     search. It never renames a course or invents one. */
  var SEARCH_ES = {
    'italiano': 'italian', 'ingles': 'english', 'inglés': 'english',
    'frances': 'french', 'francés': 'french', 'portugues': 'portuguese',
    'portugués': 'portuguese', 'japones': 'japanese', 'japonés': 'japanese',
    'idioma': 'language', 'idiomas': 'language',
    'pintura': 'painting', 'pintar': 'painting', 'dibujo': 'drawing',
    'arte': 'art', 'cine': 'film', 'pelicula': 'film', 'película': 'film',
    'musica': 'music', 'música': 'music', 'canto': 'singing', 'cantar': 'singing',
    'literatura': 'literary', 'lectura': 'reading', 'leer': 'reading',
    'escritura': 'writing', 'escribir': 'writing', 'libro': 'book',
    'filosofia': 'philosoph', 'filosofía': 'philosoph', 'historia': 'history',
    'arteh': 'art history', 'memoria': 'mind', 'mente': 'mind',
    'meditacion': 'mindfulness', 'meditación': 'mindfulness',
    'emociones': 'emotional', 'emocional': 'emotional',
    'computacion': 'computer', 'computación': 'computer', 'computadora': 'computer',
    'informatica': 'computer', 'informática': 'computer', 'celular': 'mobile',
    'telefono': 'mobile', 'teléfono': 'mobile', 'tablet': 'tablet',
    'tecnologia': 'technology', 'tecnología': 'technology',
    'inteligencia artificial': 'artificial intelligence', 'ia': 'artificial intelligence',
    'tejido': 'weave', 'tejer': 'weave', 'telar': 'weave', 'crochet': 'weave',
    'gimnasia': 'physical', 'deporte': 'physical', 'cuerpo': 'physical',
    'juego': 'games', 'juegos': 'games', 'cartas': 'bridge',
    'viaje': 'travel', 'viajar': 'travel', 'viajeros': 'travellers',
    'presencial': 'in person', 'virtual': 'online', 'online': 'online'
  };

  function expandQuery(q) {
    var terms = [q];
    Object.keys(SEARCH_ES).forEach(function (key) {
      if (key.indexOf(q) === 0 || q.indexOf(key) === 0) terms.push(SEARCH_ES[key]);
    });
    return terms;
  }

  var FREQ_ES = {
    Weekly: 'Semanal', Fortnightly: 'Quincenal', 'One-off': 'Encuentro único',
    'Fixed dates': 'Fechas fijas', 'Monthly (fixed dates)': 'Mensual, fechas fijas',
    'Residential weekend': 'Fin de semana'
  };

  var LEVEL_ES = {
    'Beginner': 'Inicial', 'Beginner 2': 'Inicial 2', 'Elementary': 'Elemental',
    'Pre-Intermediate': 'Pre intermedio', 'Pre-Intermediate 2': 'Pre intermedio 2',
    'Intermediate': 'Intermedio', 'Intermediate/Advanced': 'Intermedio y avanzado',
    'Advanced': 'Avanzado', 'Level 1': 'Nivel 1', 'Level 2': 'Nivel 2', 'Level 3': 'Nivel 3',
    'Beginner to experienced': 'Desde cero o con experiencia',
    'No prior experience required': 'No hace falta experiencia previa'
  };

  /* Months and the handful of period phrases the sheet uses. Anything not
     listed falls through unchanged rather than being guessed at. */
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

  function tr(map, value) {
    if (!value) return '';
    if (LANG === 'en') return value;
    return map[value] || value;
  }

  /* ------------------------------------------------------------------ i18n */
  var STRINGS = {
    en: {
      'nav.courses': 'Courses', 'nav.week': 'The week', 'nav.how': 'How to start', 'nav.contact': 'Contact',
      'nav.teachers': 'Teachers',
      'teach.title': 'Who teaches the classes',
      'teach.lead': 'Every workshop is taught by someone with a career of their own. These are their names and their background.',
      'tool.bigger': 'Make the text bigger', 'tool.lang': 'ES',
      'tool.themeDark': 'Switch to a dark background',
      'tool.themeLight': 'Switch to a light background',
      'hero.kicker': 'Asociación Civil Promover and Universidad Blas Pascal',
      'hero.title': 'Pick a course. The first class is free.',
      'hero.lead': 'Languages, art, philosophy, technology, bridge and golf. Forty-seven offerings on the Universidad Blas Pascal campus in Argüello, and online too. You can try any workshop without paying anything before you decide.',
      'hero.cta1': 'I want to try a class', 'hero.cta2': 'See the courses',
      'hero.fact1': 'offerings in 2026', 'hero.fact2': 'teachers',
      'hero.fact3v': '2 March', 'hero.fact3': 'classes begin',
      'hero.fact4v': 'All year', 'hero.fact4': 'enrolment open',
      'find.title': 'Find your course',
      'find.lead': 'Type what interests you or filter by day. This list is read live from the coordination team’s spreadsheet every time you open this page.',
      'find.search': 'Search by name, subject or teacher', 'find.day': 'Day', 'find.cat': 'Area',
      'find.fmt': 'Format', 'find.any': 'Any', 'find.clear': 'Clear',
      'week.title': 'The week at a glance',
      'week.lead': 'Everything that happens each day, ordered by time. Useful if you already know which afternoon you have free.',
      'how.title': 'How to start, in three steps',
      'how.s1t': 'Choose a course you like', 'how.s1b': 'Use the finder above. Check the day and time that suit you.',
      'how.s2t': 'Call or send a WhatsApp', 'how.s2b': 'Tell us which one interests you and we will keep you a place in the next class. A person answers, not a machine.',
      'how.wa': 'Message on WhatsApp',
      'how.s3t': 'Come and try it. That class is free.',
      'how.s3b': 'You sit in, watch how the group works, and then decide. If you like it, you enrol. If not, you try another workshop.',
      'how.feeT': 'What does it cost?',
      'how.feeB': 'The fee is paid monthly, between the 1st and the 15th, at a discounted rate within those dates. We do not publish the amount on this page because it changes during the year: ask us by phone or WhatsApp and we will tell you straight away, with no obligation.',
      'info.title': 'Worth knowing',
      'info.i1t': 'A Universidad Blas Pascal certificate',
      'info.i1b': 'When you finish the full course you receive a certificate issued by UBP. The only requirement is attending 80 per cent of classes.',
      'info.i2t': 'In person, online, or both',
      'info.i2b': 'The campus classrooms are hybrid: the same workshop can run in the room and on a video call at the same time.',
      'info.i3t': 'Small groups',
      'info.i3b': 'A workshop opens with a minimum of ten students. Below that number, the teacher and the coordination team decide whether it runs.',
      'info.i4t': 'The calendar',
      'info.i4b': 'Classes run from 2 March to 30 November. Enrolment is open all year: you can join in any month.',
      'info.i5t': 'If you miss a class',
      'info.i5b': 'If the teacher is absent, a day and time is agreed to make the class up. If you miss for a personal reason, the month is still payable, because the teacher has held that hour for you.',
      'info.i6t': 'If you want to leave',
      'info.i6b': 'Let us know in advance by WhatsApp, email or in person. There is no contract and no minimum term.',
      'contact.title': 'Where we are and how to reach us',
      'contact.h1': 'Talk to a person', 'contact.h2': 'Where the classes are',
      'contact.campus': 'Universidad Blas Pascal campus',
      'foot.org': 'A programme of Asociación Civil Promover and the Extension and International Relations Office of Universidad Blas Pascal.',
      'ui.results': 'course', 'ui.results_p': 'courses', 'ui.showing': 'Showing',
      'ui.none': 'Nothing matches that search. Try clearing the filters, or call us on ' + PHONE + ' and we will help you find something.',
      'ui.loading': 'Loading the courses', 'ui.loadingBody': 'Reading the current list from the coordination spreadsheet.',
      'ui.errT': 'We could not load the course list',
      'ui.errB': 'The connection to the course spreadsheet failed, so we are not showing you a list that might be out of date. Call or message us on ' + PHONE + ' and we will tell you what is running.',
      'ui.retry': 'Try again',
      'ui.teacher': 'Teacher', 'ui.period': 'Period', 'ui.also': 'Also', 'ui.book': 'Coursebook',
      'ui.level': 'Level', 'ui.places': 'Places', 'ui.sessions': 'Sessions',
      'ui.ask': 'Ask about this course',
      'ui.tbc': 'Date to be confirmed',
      'ui.src': 'Course data read live from the coordination team’s Google Sheet at ',
      'ui.src2': '. Nothing on this page is stored or hardcoded: reload and it queries the sheet again.',
      'ui.noday': 'Dates to be confirmed',
      'ui.teaches': 'Teaches', 'ui.more': 'Read more', 'ui.less': 'Show less',
      'ui.courseOne': 'workshop in 2026', 'ui.courseMany': 'workshops in 2026',
      'ui.seeCourses': 'See their workshops',
      'hol.title': 'Days with no classes',
      'hol.lead': 'These are national public holidays that fall on a day we teach. There are no classes on these dates.',
      'hol.one': 'workshop', 'hol.many': 'workshops',
      'hol.check': 'Any doubt, call us on ',
      'cal.add': 'Add to my calendar', 'cal.addDay': 'Add to calendar:',
      'cal.assumed': 'Approximate duration, two hours',
      'cal.ask': 'Questions:'
    },
    es: {
      'tool.lang': 'EN',
      'tool.themeDark': 'Cambiar a fondo oscuro',
      'tool.themeLight': 'Cambiar a fondo claro',
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
      'ui.src2': '. Nada de esta página está guardado ni escrito a mano: si recargás, vuelve a consultar la planilla.',
      'ui.noday': 'Fechas a confirmar',
      'ui.teaches': 'Dicta', 'ui.more': 'Leer más', 'ui.less': 'Mostrar menos',
      'ui.courseOne': 'taller en 2026', 'ui.courseMany': 'talleres en 2026',
      'ui.seeCourses': 'Ver sus talleres',
      'hol.title': 'Días sin clases',
      'hol.lead': 'Son feriados nacionales que caen en un día que dictamos. Esas fechas no hay clases.',
      'hol.one': 'taller', 'hol.many': 'talleres',
      'hol.check': 'Ante cualquier duda, llamanos al ',
      'cal.add': 'Agregar a mi calendario', 'cal.addDay': 'Agregar al calendario:',
      'cal.assumed': 'Duración aproximada, dos horas',
      'cal.ask': 'Consultas:'
    }
  };

  function t(key) {
    var d = STRINGS[LANG] || {};
    if (d[key] !== undefined) return d[key];
    if (LANG === 'es') {
      var node = document.querySelector('[data-i18n="' + key + '"]');
      if (node && node.dataset.es) return node.dataset.es;
    }
    return (STRINGS.en[key] !== undefined) ? STRINGS.en[key] : key;
  }

  /* -------------------------------------------------------------- helpers */
  function $(sel) { return document.querySelector(sel); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Google reads cells like "17:00" as a time and returns them as a
     timeofday array or a Date(...) construction string. Neither is readable.
     This turns any cell back into the text a person would see in the sheet. */
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
  /* One reader for every sheet on the page. A cache-busting parameter plus
     no-store: the browser must not serve a previous response. Every page load
     is a real query. */
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
        COURSES = rows.filter(function (o) { return o.course_name; });

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
        /* The hero counters are data too. If nothing was read, they must not
           keep showing a number the page did not actually load. */
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

  function fillSelect(sel, values, map, sorter) {
    var el = $(sel);
    var current = el.value;
    var keep = el.querySelector('option[value=""]');
    el.innerHTML = '';
    el.appendChild(keep);
    (sorter ? values.slice().sort(sorter) : values.slice().sort()).forEach(function (v) {
      var o = document.createElement('option');
      o.value = v;
      o.textContent = tr(map, v);
      el.appendChild(o);
    });
    el.value = current;
  }

  function buildFilters() {
    fillSelect('#f-day', uniq('day'), DAY_ES, function (a, b) {
      return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b);
    });
    fillSelect('#f-cat', uniq('category'), CAT_ES);
    fillSelect('#f-fmt', uniq('format'), FMT_ES);
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
      /* The haystack carries both the sheet's own English words and the
         Spanish labels shown on screen, so a search works in either language. */
      var hay = [c.course_name, c.course_name_es, c.teacher, c.category, c.language,
                 c.level, c.notes, c.notes_es, c.venue, c.coursebook,
                 tr(CAT_ES, c.category), tr(FMT_ES, c.format),
                 tr(DAY_ES, c.day), tr(DAY_ES, c.alt_day)]
        .filter(Boolean).join(' ').toLowerCase();
      return expandQuery(q).some(function (term) { return hay.indexOf(term) !== -1; });
    });
  }

  /* --------------------------------------------------------------- render */
  /* Any column may have an "_es" twin in the sheet. When the page is in
     Spanish and that twin has a value, it wins. When it does not, the English
     column shows rather than nothing. No text is invented here: the sheet is
     the only source. Add course_name_es or notes_es to the sheet and this
     picks them up with no code change. */
  function pick(c, field) {
    if (LANG === 'es' && c[field + '_es']) return c[field + '_es'];
    return c[field] || '';
  }

  function courseTitle(c) { return pick(c, 'course_name'); }

  /* The sheet gives the main slot a friendly time_display but the alternative
     only a raw 24h value, so the two sat next to each other as "4:00 p.m."
     and "09:00". Everything goes through this. */
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
    if (c.day) bits.push(tr(DAY_ES, c.day));
    if (c.time_display) bits.push(c.time_display);
    if (!bits.length) return t('ui.noday');
    return bits.join(', ');
  }

  function card(c) {
    var isWorkshop = /workshop/i.test(c.type || '');
    var online = /online/i.test(c.format || '');
    var out = [];
    out.push('<article class="card' + (isWorkshop ? ' is-workshop' : '') + '">');
    out.push('<h3>' + esc(courseTitle(c)) + '</h3>');

    out.push('<div class="card-meta">');
    out.push('<span class="chip chip-when">' + esc(whenLabel(c)) + '</span>');
    if (c.format) out.push('<span class="chip' + (online ? ' chip-online' : '') + '">' + esc(tr(FMT_ES, c.format)) + '</span>');
    if (c.category) out.push('<span class="chip' + (isWorkshop ? ' chip-new' : '') + '">' + esc(tr(CAT_ES, c.category)) + '</span>');
    if (c.frequency) out.push('<span class="chip">' + esc(tr(FREQ_ES, c.frequency)) + '</span>');
    out.push('</div>');

    if (c.alt_day) {
      out.push('<p class="card-line">' + esc(t('ui.also')) + ': <strong>' +
        esc(tr(DAY_ES, c.alt_day)) + (c.alt_time_24h ? ', ' + esc(prettyTime(c.alt_time_24h)) : '') + '</strong></p>');
    }
    if (c.teacher) out.push('<p class="card-line">' + esc(t('ui.teacher')) + ': <strong>' + esc(c.teacher) + '</strong></p>');
    if (c.level) out.push('<p class="card-line">' + esc(t('ui.level')) + ': <strong>' + esc(tr(LEVEL_ES, c.level)) + '</strong></p>');
    if (c.period) {
      out.push('<p class="card-line">' + esc(t('ui.period')) + ': <strong>' +
        esc(LANG === 'es' ? periodEs(c.period) : c.period) + '</strong></p>');
    }
    if (c.capacity) out.push('<p class="card-line">' + esc(t('ui.places')) + ': <strong>' + esc(c.capacity) + '</strong></p>');
    if (c.sessions) out.push('<p class="card-line">' + esc(t('ui.sessions')) + ': <strong>' + esc(c.sessions) + '</strong></p>');
    if (c.coursebook) out.push('<p class="card-line">' + esc(t('ui.book')) + ': <strong>' + esc(c.coursebook) + '</strong></p>');
    var note = pick(c, 'notes');
    if (note) out.push('<p class="card-note">' + esc(note) + '</p>');

    var ask = encodeURIComponent(
      (LANG === 'es' ? 'Hola, quiero consultar por el taller: ' : 'Hello, I would like to ask about: ') + courseTitle(c)
    );
    out.push('<p class="card-cta"><a href="' + WA + '?text=' + ask + '" rel="noopener">' + esc(t('ui.ask')) + '</a></p>');

    /* Only for a course the sheet describes as a real weekly slot. A course
       with fixed dates, a fortnightly rhythm or no time at all gets no button
       rather than a series I would have to invent. */
    if (exportable(c)) {
      if (c.alt_day) {
        /* Two slots is a choice, not two classes. Offer both, labelled. */
        out.push('<p class="card-cal"><span class="card-cal-label">' + esc(t('cal.addDay')) + '</span>' +
          '<button type="button" class="card-cal-btn" data-cal="' + esc(c.id) + '">' +
            esc(tr(DAY_ES, c.day)) + (c.time_display ? ' ' + esc(c.time_display) : '') + '</button>' +
          '<button type="button" class="card-cal-btn" data-cal="' + esc(c.id) + '" data-alt="1">' +
            esc(tr(DAY_ES, c.alt_day)) + (c.alt_time_24h ? ' ' + esc(prettyTime(c.alt_time_24h)) : '') + '</button></p>');
      } else {
        out.push('<p class="card-cal"><button type="button" class="card-cal-btn wide" data-cal="' +
          esc(c.id) + '">' + esc(t('cal.add')) + '</button></p>');
      }
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

    $('#results').querySelectorAll('.card-cal-btn').forEach(function (btn) {
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
      return '<div class="day"><h3>' + esc(tr(DAY_ES, d)) + '</h3><ul>' +
        items.map(function (i) {
          return '<li><time>' + esc(i.label || '--') + '</time> ' + esc(i.name) + '</li>';
        }).join('') + '</ul></div>';
    }).join('');
  }

  function stampSource() {
    if (!FETCHED_AT) return;
    var time = FETCHED_AT.toLocaleString(LANG === 'es' ? 'es-AR' : 'en-IE');
    $('#datasource').innerHTML =
      esc(t('ui.src')) + '<strong>' + esc(time) + '</strong>' + esc(t('ui.src2')) +
      ' <a href="https://docs.google.com/spreadsheets/d/' + SHEET_ID + '" rel="noopener">Google Sheet</a>.';
  }


  /* -------------------------------------------------------------- teachers */
  /* A second sheet, read the same way as the first. If the id is not set, or
     the sheet cannot be read, the section and its nav link stay hidden. A
     missing biography is left blank rather than filled with something
     plausible: six people in the 2026 programme have no bio in any source. */
  function loadTeachers() {
    if (!TEACHERS_SHEET_ID) return Promise.resolve();
    return readSheet(TEACHERS_SHEET_ID)
      .then(function (rows) {
        TEACHERS = rows
          .filter(function (r) { return r.name && String(r.active || 'yes').toLowerCase() !== 'no'; })
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
        /* Silent by design. A teacher sheet that cannot be read should not
           put an error on a page whose main job is the timetable. */
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
      var bio = (LANG === 'es' ? p.bio_es : p.bio_en) || p.bio_es || p.bio_en || '';
      var teaches = (LANG === 'es' ? p.teaches_es : p.teaches_en) || p.teaches_es || p.teaches_en || '';
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

    /* Sends the visitor to the finder with that teacher already searched. */
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
  /* The practical cards used to be hand-written in the HTML. They are policy
     text that coordination should be able to change without touching code,
     so they now come from a sheet like everything else. */
  function loadInfo() {
    if (!INFO_SHEET_ID) return Promise.resolve();
    return readSheet(INFO_SHEET_ID)
      .then(function (rows) {
        INFO = rows
          .filter(function (r) {
            return (r.title_es || r.title_en) &&
                   String(r.active || 'yes').toLowerCase() !== 'no';
          })
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
      var title = (LANG === 'es' ? r.title_es : r.title_en) || r.title_es || r.title_en || '';
      var body = (LANG === 'es' ? r.body_es : r.body_en) || r.body_es || r.body_en || '';
      return '<div class="info"><h3>' + esc(title) + '</h3>' +
             (body ? '<p>' + esc(body) + '</p>' : '') + '</div>';
    }).join('');
  }


  /* ------------------------------------------------------------- holidays */
  /* Local-date parsing on purpose. new Date('2026-07-09') is parsed as UTC
     midnight, which in Argentina is still the 8th, and a notice that names
     the wrong day is worse than no notice at all. */
  function parseISO(s) {
    var p = String(s || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return isNaN(d.getTime()) ? null : d;
  }

  var JS_DAY = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  function teachingDays() {
    var set = {};
    COURSES.forEach(function (c) {
      if (c.day) set[c.day] = true;
      if (c.alt_day) set[c.alt_day] = true;
    });
    return set;
  }

  function loadHolidays() {
    /* Nothing to cross-check against means nothing trustworthy to say. */
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

        /* Every holiday inside the term that lands on a day we teach. The
           calendar export needs all of them, including ones already past,
           because an exported series still covers the whole year. */
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

        /* The notice shows only what is still ahead, and only a few. */
        HOLIDAYS = HOLIDAYS_ALL.filter(function (h) { return h.date >= today; })
                               .slice(0, MAX_NOTICES);

        renderHolidays();
        render();   /* course cards can now carry a calendar button */
      })
      .catch(function () {
        /* Silence, by design. The export still works: a calendar without
           holiday exclusions is worse than one with them, but far better
           than no calendar, and it never states anything false. */
        HOLIDAYS = [];
        HOLIDAYS_ALL = [];
        $('#holidays').hidden = true;
        $('#holidays').innerHTML = '';
      });
  }

  function renderHolidays() {
    var box = $('#holidays');
    if (!HOLIDAYS.length) { box.hidden = true; box.innerHTML = ''; return; }

    var locale = LANG === 'es' ? 'es-AR' : 'en-IE';
    box.innerHTML =
      '<h3>' + esc(t('hol.title')) + '</h3>' +
      '<p class="holidays-lead">' + esc(t('hol.lead')) + '</p>' +
      '<ul>' + HOLIDAYS.map(function (h) {
        var when = h.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
        return '<li><strong>' + esc(when) + '</strong> <span class="holidays-name">' + esc(h.name) + '</span>' +
               ' <span class="holidays-count">' + h.courses + ' ' +
               esc(h.courses === 1 ? t('hol.one') : t('hol.many')) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="holidays-foot">' + esc(t('hol.check')) +
      '<a href="tel:+5493513261002">' + esc(PHONE) + '</a>.</p>';
    box.hidden = false;
  }


  /* ---------------------------------------------------------- calendar */
  /* iCalendar export. No API, no server, no request leaves the browser: the
     file is built from data the page already holds and handed straight to a
     download. RFC 5545, so Google Calendar, Apple Calendar and Outlook all
     open it.
     Only offered for courses the sheet can actually describe as a repeating
     weekly slot. Fortnightly, fixed-date and to-be-confirmed courses get no
     button rather than a guessed series. */

  var DEFAULT_MINUTES = 120;   /* the programme says classes are generally two
                                  hours. Used only when the sheet has no
                                  duration_min, and said out loud in the file. */
  var ICS_DAY = { Monday:'MO', Tuesday:'TU', Wednesday:'WE', Thursday:'TH',
                  Friday:'FR', Saturday:'SA', Sunday:'SU' };
  var MONTH_END = { january:'0131', february:'0228', march:'0331', april:'0430',
                    may:'0531', june:'0630', july:'0731', august:'0831',
                    september:'0930', october:'1031', november:'1130', december:'1231' };

  /* duration_min is meant to be a plain number of minutes, but parseInt alone
     turns "2 horas" into 2 and, worse, turns Google Sheets' own Duration
     format "02:00" into 2 as well. Both would put a two minute class in
     somebody's calendar and say nothing about it.
     So: accept a plain count of minutes, accept H:MM, and reject anything
     outside a plausible class length. A rejected value falls back to the
     default, which the file already labels as approximate. */
  var MIN_MINUTES = 20, MAX_MINUTES = 480;

  function durationMinutes(raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return null;

    var hm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);   /* 02:00, 1:30 */
    var mins = hm ? (+hm[1] * 60 + +hm[2]) : null;

    if (mins === null) {
      var n = s.match(/^(\d{1,4})(?:\s*(?:min|mins|minutos)?)?$/i);   /* 120, 120 min */
      if (!n) return null;
      mins = +n[1];
    }
    if (!(mins >= MIN_MINUTES && mins <= MAX_MINUTES)) return null;
    return mins;
  }

  function exportable(c) {
    return c.frequency === 'Weekly' && !!c.day && !!(c.time_24h || c.time_display);
  }

  /* "August - October" ends in October, not at the end of the year. Reads the
     last month named in the period and stops there, capped at the term end.
     A period with no month falls back to the term end rather than guessing. */
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
    /* fall back to the display string, e.g. "5:00 p.m." */
    var d = String(useAlt ? c.alt_time_24h : c.time_display).match(/(\d{1,2}):(\d{2})\s*([ap])/i);
    if (!d) return null;
    var h = +d[1] % 12; if (/p/i.test(d[3])) h += 12;
    return [ h, +d[2] ];
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* RFC 5545: escape the delimiters, and fold lines longer than 75 octets. */
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

  function buildICS(c, useAlt) {
    var day = useAlt ? c.alt_day : c.day;
    var time = hhmm(c, useAlt);
    if (!day || !time || !ICS_DAY[day]) return null;

    /* first occurrence on or after the term start */
    var d = parseISO(TERM_START);
    while (JS_DAY[d.getDay()] !== day) d.setDate(d.getDate() + 1);

    var mins = durationMinutes(c.duration_min);
    var assumed = mins === null;
    if (assumed) mins = DEFAULT_MINUTES;
    var endMin = time[0] * 60 + time[1] + mins;

    var startStamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
                     'T' + pad(time[0]) + pad(time[1]) + '00';
    var endStamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
                   'T' + pad(Math.floor(endMin / 60) % 24) + pad(endMin % 60) + '00';

    var TZ = 'America/Argentina/Cordoba';
    var lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//aulauniversitaria//ES', 'CALSCALE:GREGORIAN',
      'BEGIN:VTIMEZONE', 'TZID:' + TZ, 'BEGIN:STANDARD', 'DTSTART:19700101T000000',
      'TZOFFSETFROM:-0300', 'TZOFFSETTO:-0300', 'TZNAME:-03', 'END:STANDARD', 'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:' + c.id + (useAlt ? '-alt' : '') + '@aulauniversitaria',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, ''),
      'DTSTART;TZID=' + TZ + ':' + startStamp,
      'DTEND;TZID=' + TZ + ':' + endStamp,
      'RRULE:FREQ=WEEKLY;BYDAY=' + ICS_DAY[day] + ';UNTIL=' + seriesEnd(c.period) + 'T235900Z'
    ];

    /* Skip the national holidays that land on this weekday. If the holidays
       API was unreachable this list is empty, which yields a calendar with no
       exclusions rather than one with wrong ones. */
    HOLIDAYS_ALL.forEach(function (h) {
      if (h.day !== day) return;
      lines.push('EXDATE;TZID=' + TZ + ':' + h.date.getFullYear() + pad(h.date.getMonth() + 1) +
                 pad(h.date.getDate()) + 'T' + pad(time[0]) + pad(time[1]) + '00');
    });

    var desc = [];
    if (c.teacher) desc.push(t('ui.teacher') + ': ' + c.teacher);
    if (c.period) desc.push(t('ui.period') + ': ' + (LANG === 'es' ? periodEs(c.period) : c.period));
    if (assumed) desc.push(t('cal.assumed'));
    desc.push(t('cal.ask') + ' ' + PHONE);

    lines.push('SUMMARY:' + icsText(courseTitle(c)));
    if (c.venue) lines.push('LOCATION:' + icsText(c.venue));
    lines.push('DESCRIPTION:' + icsText(desc.join('. ')));
    lines.push('END:VEVENT', 'END:VCALENDAR');

    return lines.map(fold).join('\r\n') + '\r\n';
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

  /* ------------------------------------------------------------ language */
  function captureSpanish() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.dataset.es = el.textContent;
    });
  }

  function applyLang() {
    document.documentElement.lang = LANG;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.dataset.i18n;
      el.textContent = (LANG === 'es') ? el.dataset.es : t(key);
    });
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');
    $('#lang').textContent = (LANG === 'es') ? 'EN' : 'ES';
    $('#lang').setAttribute('aria-label', LANG === 'es' ? 'Switch to English' : 'Cambiar a español');
    if (COURSES.length) { buildFilters(); render(); renderWeek(); stampSource(); }
    if (TEACHERS.length) renderTeachers();
    if (INFO.length) renderInfo();
    if (HOLIDAYS.length) renderHolidays();
  }

  /* --------------------------------------------------------------- start */
  document.addEventListener('DOMContentLoaded', function () {
    captureSpanish();

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

    /* Light is the default. Dark is a choice the visitor makes and we
       remember, so they do not have to make it again on every visit. The only
       thing stored is the word "dark", and it never leaves the browser. */
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark');
    $('#theme').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') !== 'dark');
    });

    $('#lang').addEventListener('click', function () {
      LANG = (LANG === 'es') ? 'en' : 'es';
      applyLang();
    });

    loadCourses().then(loadTeachers).then(loadInfo).then(loadHolidays);
  });
})();
