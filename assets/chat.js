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
      privacy: 'Tus mensajes se envían a Google Gemini para generar la respuesta. Si dictás, la voz la convierte en texto tu propio navegador, Google o Apple según cuál uses, y a nosotros nos llega solo el texto. No guardamos la conversación ni el audio.',
      /* Shown when the browser cannot dictate. Explaining a feature that is
         not on the screen is not transparency, it is noise. */
      privacyPlain: 'Tus mensajes se envían a Google Gemini para generar la respuesta. No guardamos la conversación.',
      placeholder: 'Escribí tu pregunta',
      send: 'Enviar',
      label: 'Tu pregunta',
      mic: 'Dictar tu pregunta',
      micStop: 'Dejar de dictar',
      micOn: 'Escuchando. Hablá y después revisá el texto antes de enviar.',
      micDenied: 'No pudimos usar el micrófono. Revisá el permiso del navegador, o escribí tu pregunta.',
      micNoDevice: 'No encontramos un micrófono. Escribí tu pregunta y te respondemos igual.',
      micNoSpeech: 'No se escuchó nada. Probá de nuevo o escribí tu pregunta.',
      micFailed: 'No se pudo transcribir. Probá de nuevo o escribí tu pregunta.',
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
      privacy: 'Your messages are sent to Google Gemini to generate the reply. If you dictate, your own browser turns your voice into text, Google or Apple depending which you use, and only the text reaches us. We store neither the conversation nor the audio.',
      privacyPlain: 'Your messages are sent to Google Gemini to generate the reply. We do not store the conversation.',
      placeholder: 'Type your question',
      send: 'Send',
      label: 'Your question',
      mic: 'Dictate your question',
      micStop: 'Stop dictating',
      micOn: 'Listening. Speak, then check the text before you send.',
      micDenied: 'We could not use the microphone. Check your browser’s permission, or type your question.',
      micNoDevice: 'We could not find a microphone. Type your question and we will answer just the same.',
      micNoSpeech: 'We did not hear anything. Try again, or type your question.',
      micFailed: 'We could not transcribe that. Try again, or type your question.',
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
  var launcher, panel, log, input, form, sendBtn, micBtn, micStatus;

  var MIC_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M12 2.5a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0v-6a3 3 0 0 0-3-3z"/>' +
    '<path d="M19 11v.5a7 7 0 0 1-14 0V11"/>' +
    '<path d="M12 18.5V22"/><path d="M8.5 22h7"/></svg>';

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
        '<button type="button" class="chat-mic" aria-pressed="false" aria-label="" hidden>' + MIC_SVG + '</button>' +
        '<button type="submit" class="chat-send"></button>' +
      '</form>' +
      '<p class="chat-mic-status" role="status" hidden></p>' +
      '<p class="chat-privacy"></p>';

    document.body.appendChild(launcher);
    document.body.appendChild(panel);

    log = panel.querySelector('.chat-log');
    input = panel.querySelector('.chat-input');
    form = panel.querySelector('.chat-form');
    sendBtn = panel.querySelector('.chat-send');
    micBtn = panel.querySelector('.chat-mic');
    micStatus = panel.querySelector('.chat-mic-status');

    launcher.addEventListener('click', toggle);
    panel.querySelector('.chat-close').addEventListener('click', close);
    form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) close();
    });

    /* Criterion 2: absent, not disabled. The button only becomes visible
       when the API is genuinely there. */
    if (dictationAvailable()) {
      micBtn.hidden = false;
      micBtn.addEventListener('click', toggleDictation);
    }

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
    micBtn.setAttribute('aria-label', t(listening ? 'micStop' : 'mic'));
    micBtn.title = t(listening ? 'micStop' : 'mic');
    if (listening) micStatus.textContent = t('micOn');
    panel.querySelector('.chat-privacy').textContent =
      t(micBtn.hidden ? 'privacyPlain' : 'privacy');
  }

  /* ------------------------------------------------------------- dictation
   * Built to Tomás's nine criteria in pipeline/10-voice-design-spec.md.
   *
   * The Web Speech API hands back a string. No audio object is ever created
   * here, nothing is uploaded to /api/chat, and there is no MediaRecorder in
   * this file. The browser does the recognition over its own service, which
   * is why Rubén's privacy line names Google and Apple rather than us.
   *
   * Firefox has never shipped this, and the API is refused outside a secure
   * context, so both are checked before the button is allowed to exist.
   */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var rec = null;
  var listening = false;
  var dictated = '';      // the final text so far, interim results append to it
  var micTimer = null;

  /* Safari resolves the constructor but throws on start() over plain http,
     and the thrown error arrives too late to hide the button gracefully. */
  function dictationAvailable() {
    return !!SR && window.isSecureContext !== false;
  }

  function micState(on) {
    listening = on;
    micBtn.classList.toggle('is-listening', on);
    micBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    micBtn.setAttribute('aria-label', t(on ? 'micStop' : 'mic'));
    micBtn.title = t(on ? 'micStop' : 'mic');
  }

  /* One element carries the visible state and the screen reader
     announcement, so the two can never disagree (criterion 4). */
  function micSay(msg) {
    micStatus.textContent = msg || '';
    micStatus.hidden = !msg;
  }

  var MIC_ERRORS = {
    'not-allowed': 'micDenied',
    'service-not-allowed': 'micDenied',
    'audio-capture': 'micNoDevice',
    'no-speech': 'micNoSpeech'
  };

  /* stop() finalises what was heard and is what the button does. abort()
     throws it away and is what closing the panel does: someone who has just
     shut the assistant is not waiting for one more word to be transcribed. */
  function stopDictation(hard) {
    if (micTimer) { clearTimeout(micTimer); micTimer = null; }
    if (!rec) return;
    try { hard ? rec.abort() : rec.stop(); } catch (e) { /* already stopped */ }
  }

  function toggleDictation() {
    if (listening) { stopDictation(); return; }

    try {
      rec = new SR();
    } catch (e) {
      micSay(t('micFailed'));
      return;
    }

    /* es-AR rather than es: the regional model handles vos and che, which is
       most of how this audience actually speaks (criterion 7). */
    rec.lang = lang() === 'en' ? 'en-GB' : 'es-AR';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    /* Criterion 3: whatever they already typed survives. */
    var existing = input.value.replace(/\s+$/, '');
    dictated = existing ? existing + ' ' : '';

    rec.onstart = function () {
      micState(true);
      micSay(t('micOn'));
      /* Chrome ends on silence by itself. Some WebKit builds do not, and an
         open microphone that nobody closed is the failure that matters. */
      micTimer = setTimeout(stopDictation, 20000);
    };

    rec.onresult = function (e) {
      var interim = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) dictated += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      /* Criterion 1: it goes in the box. Nothing here calls send(). */
      input.value = (dictated + interim).replace(/^\s+/, '');
    };

    rec.onerror = function (e) {
      if (e.error === 'aborted') return;          // they pressed stop
      micSay(t(MIC_ERRORS[e.error] || 'micFailed'));
    };

    rec.onend = function () {
      if (micTimer) { clearTimeout(micTimer); micTimer = null; }
      micState(false);
      if (micStatus.textContent === t('micOn')) micSay('');
      rec = null;
      /* Focus deliberately stays on the microphone button. Moving it to the
         input would raise the on-screen keyboard over the panel, for the
         exact people who pressed this button to avoid the keyboard. Send is
         one tab away. */
    };

    try {
      rec.start();
    } catch (e) {
      micState(false);
      micSay(t('micFailed'));
      rec = null;
    }
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
    micSay('');   // an error from a previous session is stale on reopen
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    if (!log.childNodes.length) {
      bubble('bot', '<p>' + esc(t('disclosure')) + '</p>', 'chat-disclosure');
      suggestions();
    }
    input.focus();
  }

  function close() {
    /* Criterion 6. A hidden panel with an open microphone is not a feature
       with a bug in it, it is a listening device. */
    stopDictation(true);
    micState(false);
    micSay('');
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    /* The element that opened the panel may no longer exist: a suggestion chip
       removes itself when clicked. Focus must never land on nothing. */
    (focusable(lastFocus) ? lastFocus : launcher).focus();
  }

  function toggle() { panel.hidden ? open() : close(); }

  /* Where to leave the panel once an answer has landed.
     A course question can render eight cards, which is around 2400px of
     content in a panel 400px tall. Scrolling to the bottom, which is right
     while the answer is still arriving, leaves the visitor standing on the
     last card with the answer some two thousand pixels above them and no
     indication it is there. Put the top of the reply at the top of the log
     instead: the answer is read first and the cards are scrolled through
     rather than scrolled back from.
     Measured against the log rather than offsetTop, which would depend on
     which ancestor happens to be positioned. */
  function revealAnswer(el) {
    if (!el || !el.isConnected) { log.scrollTop = log.scrollHeight; return; }
    var delta = el.getBoundingClientRect().top - log.getBoundingClientRect().top;
    log.scrollTop = Math.max(0, log.scrollTop + delta - 8);
  }

  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    stopDictation(true);
    micState(false);
    micSay('');
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
        revealAnswer(pending);
      });
  }

  /* Keep the assistant in the same language as the page. */
  function watchLanguage() {
    new MutationObserver(function () {
      /* The recogniser was started with the old language and cannot be
         retuned in flight. End it rather than transcribe Spanish as English. */
      stopDictation(true);
      micState(false);
      micSay('');
      applyText();
      if (log && !log.childNodes.length) return;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  document.addEventListener('DOMContentLoaded', function () {
    build();
    watchLanguage();
  });
})();
