/* משוב על בניית הלוח (דירוג + הצעות לשיפור) וטופס פנייה. נשלח ל-/api/pricing?c=_contact, שמעביר במייל לבעל האתר ושומר לדף הניהול.
   MyLuachFeedback.mount(אלמנט, {page, compact})   — טופס משוב בתוך הדף
   MyLuachFeedback.open({page, title})             — אותו טופס בחלון
   MyLuachFeedback.contact(אלמנט, {page})          — טופס פנייה
   MyLuachFeedback.afterDownload({page})           — חלון משוב אחרי הורדה (לא יותר מפעם בכמה שבועות) */
(function () {
  'use strict';
  var EN = document.documentElement.lang === 'en';
  var T = EN ? {
    title: 'How was building your calendar?', sub: 'A few seconds, and it really helps us improve.',
    opt: 'Options', design: 'Designs', ease: 'Ease of use', sugg: 'Suggestions for improvement (optional)',
    ph: 'What was missing? What was hard? What would you add?', mail: 'Email, if you would like a reply (optional)',
    send: 'Send', sending: 'Sending…', thanks: 'Thank you! We read every response.', err: 'Could not send. Please try again.',
    need: 'Choose a rating or write a few words.', later: 'Not now',
    ctitle: 'We are happy to stay in touch and help', csub: 'A question, a request, a problem with an order or a calendar? Write to us and we will get back to you.',
    copen: 'Write to us', name: 'Name', contact: 'Phone or email', msg: 'How can we help?', cneed: 'Write a message and how to reach you.',
    cthanks: 'Thank you! Your message was received and we will get back to you soon.', stars: ' stars'
  } : {
    title: 'איך היה לבנות את הלוח?', sub: 'כמה שניות, וזה עוזר לנו מאוד לשפר.',
    opt: 'האפשרויות', design: 'העיצובים', ease: 'הנוחות', sugg: 'הצעות לשיפור (לא חובה)',
    ph: 'מה היה חסר? מה היה קשה? מה הייתם מוסיפים?', mail: 'מייל, אם תרצו שנחזור אליכם (לא חובה)',
    send: 'שליחה', sending: 'שולחים…', thanks: 'תודה רבה! אנחנו קוראים כל תגובה.', err: 'השליחה לא הצליחה. נסו שוב.',
    need: 'בחרו דירוג או כתבו כמה מילים.', later: 'לא עכשיו',
    ctitle: 'נשמח להיות בקשר ולתת שירות', csub: 'שאלה, בקשה, בעיה בהזמנה או בלוח? כתבו לנו ונחזור אליכם.',
    copen: 'לכתוב לנו', name: 'שם', contact: 'טלפון או מייל', msg: 'במה נוכל לעזור?', cneed: 'כתבו הודעה ואיך לחזור אליכם.',
    cthanks: 'תודה! הפנייה התקבלה ונחזור אליכם בהקדם.', stars: ' כוכבים'
  };
  var css = '.mlfb{background:var(--panel,#fff);border:1px solid var(--line,#d3dae0);border-radius:14px;padding:16px 18px;color:var(--ink,#1a232c);font-family:inherit;text-align:start}' +
    '.mlfb h3{margin:0 0 2px;font-size:19px}.mlfb .mlfb-sub{margin:0 0 12px;color:var(--mute,#5d6873);font-size:14px}' +
    '.mlfb-r{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:4px 0;flex-wrap:wrap}.mlfb-r>span{font-weight:700;font-size:15px}' +
    '.mlfb-st{display:flex;gap:2px;direction:ltr}.mlfb-st button{all:unset;cursor:pointer;font-size:26px;line-height:1;color:#c9ced3;padding:2px;transition:transform .1s}' +
    '.mlfb-st button.on{color:#f2a900}.mlfb-st button:hover{transform:scale(1.15)}.mlfb-st button:focus-visible{outline:2px solid var(--accent,#2a6169);border-radius:4px}' +
    '.mlfb label{display:flex;flex-direction:column;gap:4px;margin-top:10px;font-size:14px;font-weight:600}' +
    '.mlfb textarea,.mlfb input{font:inherit;font-weight:400;border:1px solid var(--line,#d3dae0);border-radius:8px;padding:8px 10px;background:var(--bg,#fff);color:inherit;width:100%;box-sizing:border-box}' +
    '.mlfb-row{display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap}.mlfb-row button{font:inherit;font-weight:700;border-radius:10px;padding:9px 18px;cursor:pointer;border:1px solid var(--line,#d3dae0);background:transparent;color:inherit}' +
    '.mlfb-row .mlfb-go{background:var(--accent,#2a6169);border-color:var(--accent,#2a6169);color:var(--accent-ink,#fff)}.mlfb-msg{font-size:14px;color:var(--mute,#5d6873)}.mlfb-msg.bad{color:#b3261e}' +
    '.mlfb-ok{font-weight:700;color:#2e7d5b;font-size:16px;padding:8px 0}.mlfb{position:relative}.mlfb .mlfb-hp{position:absolute;top:0;inset-inline-start:0;width:1px;height:1px;padding:0;border:0;opacity:0;clip-path:inset(50%);pointer-events:none}' +
    '.mlfb-back{position:fixed;inset:0;z-index:2147480000;background:rgb(0 0 0 / .45);display:flex;align-items:center;justify-content:center;padding:16px}.mlfb-back .mlfb{max-width:460px;width:100%;max-height:92vh;overflow:auto;box-shadow:0 20px 50px rgb(0 0 0 / .3)}' +
    '.mlfb-two{display:grid;grid-template-columns:1fr 1fr;gap:8px}@media (max-width:520px){.mlfb-two{grid-template-columns:1fr}}';
  function addCss() { if (document.getElementById('mlfbCss')) return; var s = document.createElement('style'); s.id = 'mlfbCss'; s.textContent = css; document.head.appendChild(s); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function post(body) {
    return fetch('/api/pricing?c=_contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  }
  function plan() { try { return (window.MyLuachPlans && window.MyLuachPlans.current && window.MyLuachPlans.current().id) || ''; } catch (e) { return ''; } }
  function stars(k) {
    var h = '<div class="mlfb-r"><span>' + T[k] + '</span><div class="mlfb-st" role="radiogroup" aria-label="' + esc(T[k]) + '">';
    for (var i = 1; i <= 5; i++) h += '<button type="button" role="radio" aria-checked="false" data-k="' + k + '" data-v="' + i + '" aria-label="' + i + T.stars + '">★</button>';
    return h + '</div></div>';
  }
  function build(el, o, onDone) {
    addCss(); o = o || {};
    var R = {};
    el.classList.add('mlfb');
    el.innerHTML = '<h3>' + esc(o.title || T.title) + '</h3><p class="mlfb-sub">' + T.sub + '</p>' + stars('opt') + stars('design') + stars('ease') +
      '<label>' + T.sugg + '<textarea rows="3" maxlength="2000" data-f="text" placeholder="' + esc(T.ph) + '"></textarea></label>' +
      '<label>' + T.mail + '<input type="email" maxlength="120" data-f="email" dir="ltr" autocomplete="email"></label>' +
      '<input class="mlfb-hp" tabindex="-1" autocomplete="off" aria-hidden="true" data-f="hp">' +
      '<div class="mlfb-row"><button type="button" class="mlfb-go">' + T.send + '</button>' + (o.later ? '<button type="button" class="mlfb-later">' + T.later + '</button>' : '') + '<span class="mlfb-msg" aria-live="polite"></span></div>';
    var q = function (s) { return el.querySelector(s); };
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-v]');
      if (b) { var k = b.dataset.k, v = +b.dataset.v; R[k] = v; el.querySelectorAll('[data-k="' + k + '"]').forEach(function (x) { x.classList.toggle('on', +x.dataset.v <= v); x.setAttribute('aria-checked', String(+x.dataset.v === v)); }); return; }
      if (e.target.closest('.mlfb-later')) { if (onDone) onDone(false); return; }
      if (!e.target.closest('.mlfb-go')) return;
      var text = q('[data-f=text]').value.trim(), msg = q('.mlfb-msg');
      if (!Object.keys(R).length && text.length < 2) { msg.className = 'mlfb-msg bad'; msg.textContent = T.need; return; }
      var go = q('.mlfb-go'); go.disabled = true; msg.className = 'mlfb-msg'; msg.textContent = T.sending;
      post({ kind: 'feedback', r: R, text: text, email: q('[data-f=email]').value.trim(), hp: q('[data-f=hp]').value, page: o.page || location.pathname, plan: plan() })
        .then(function () { ls('ml-fb-sent', String(Date.now())); el.innerHTML = '<div class="mlfb-ok">' + T.thanks + '</div>'; if (onDone) setTimeout(function () { onDone(true); }, 1800); })
        .catch(function () { go.disabled = false; msg.className = 'mlfb-msg bad'; msg.textContent = T.err; });
    });
    return el;
  }
  function open(o) {
    var back = document.createElement('div'); back.className = 'mlfb-back'; var box = document.createElement('div'); back.appendChild(box); document.body.appendChild(back);
    var close = function () { back.remove(); };
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    build(box, Object.assign({ later: true }, o || {}), function () { close(); });
    setTimeout(function () { var b = box.querySelector('[data-v]'); if (b) b.focus(); }, 30);
  }
  /* אחרי הורדה: רק אם לא שלחו משוב ב-60 הימים האחרונים, ולא דחו ב-14 הימים האחרונים */
  function afterDownload(o) {
    var now = Date.now(), sent = +ls('ml-fb-sent') || 0, later = +ls('ml-fb-later') || 0;
    if (now - sent < 60 * 864e5 || now - later < 14 * 864e5) return;
    ls('ml-fb-later', String(now));
    setTimeout(function () { open(Object.assign({ title: EN ? 'Your calendar is ready! How was it?' : 'הלוח מוכן! איך היה?' }, o || {})); }, 1200);
  }
  function contact(el, o) {
    addCss(); o = o || {};
    el.classList.add('mlfb', 'mlfb-c');
    el.innerHTML = '<h3>' + T.ctitle + '</h3><p class="mlfb-sub">' + T.csub + '</p><div class="mlfb-row"><button type="button" class="mlfb-go mlfb-open">' + T.copen + '</button></div>';
    el.querySelector('.mlfb-open').onclick = function () {
      el.innerHTML = '<h3>' + T.ctitle + '</h3><p class="mlfb-sub">' + T.csub + '</p>' +
        '<div class="mlfb-two"><label>' + T.name + '<input maxlength="80" data-f="name" autocomplete="name"></label><label>' + T.contact + '<input maxlength="120" data-f="contact" autocomplete="email"></label></div>' +
        '<label>' + T.msg + '<textarea rows="4" maxlength="2000" data-f="text"></textarea></label>' +
        '<input class="mlfb-hp" tabindex="-1" autocomplete="off" aria-hidden="true" data-f="hp">' +
        '<div class="mlfb-row"><button type="button" class="mlfb-go mlfb-send">' + T.send + '</button><span class="mlfb-msg" aria-live="polite"></span></div>';
      var q = function (s) { return el.querySelector(s); };
      q('[data-f=name]').focus();
      q('.mlfb-send').onclick = function () {
        var text = q('[data-f=text]').value.trim(), c = q('[data-f=contact]').value.trim(), msg = q('.mlfb-msg');
        if (text.length < 3 || c.length < 5) { msg.className = 'mlfb-msg bad'; msg.textContent = T.cneed; return; }
        var em = /@/.test(c) ? c : '', ph = em ? '' : c, b = q('.mlfb-send'); b.disabled = true; msg.className = 'mlfb-msg'; msg.textContent = T.sending;
        post({ kind: 'contact', name: q('[data-f=name]').value.trim(), email: em, phone: ph, text: text, hp: q('[data-f=hp]').value, page: o.page || location.pathname, plan: plan() })
          .then(function () { el.innerHTML = '<h3>' + T.ctitle + '</h3><div class="mlfb-ok">' + T.cthanks + '</div>'; })
          .catch(function () { b.disabled = false; msg.className = 'mlfb-msg bad'; msg.textContent = T.err; });
      };
    };
    return el;
  }
  /* משובים שבעל האתר בחר להציג (בדף הניהול). אם אין, החלק נשאר מוסתר */
  function reviews(el) {
    addCss();
    fetch('/api/pricing?c=_reviews').then(function (r) { return r.json(); }).then(function (j) {
      var L = (j && j.items) || []; if (!L.length) return;
      var st = function (n) { var h = ''; for (var i = 1; i <= 5; i++) h += '<span class="' + (n >= i ? 'on' : n >= i - .5 ? 'half' : '') + '">★</span>'; return h; };
      el.innerHTML = '<h2>' + (EN ? 'What our customers say' : 'מה אומרים עלינו') + '</h2><div class="mlrv-g">' + L.map(function (x) {
        return '<figure class="mlrv">' + (x.stars ? '<div class="mlrv-s" aria-label="' + x.stars + T.stars + '">' + st(x.stars) + '</div>' : '') + (x.text ? '<blockquote>' + esc(x.text) + '</blockquote>' : '') + '<figcaption>' + esc(x.name || (EN ? 'A customer' : 'לקוח/ה')) + '</figcaption></figure>';
      }).join('') + '</div>';
      el.hidden = false;
    }).catch(function () {});
  }
  var css2 = '.mlrv-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}.mlrv{margin:0;background:var(--panel,#fff);border:1px solid var(--line,#d3dae0);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:8px}' +
    '.mlrv-s{direction:ltr;text-align:right;font-size:18px;color:#d5d9dd}.mlrv-s .on{color:#f2a900}.mlrv-s .half{background:linear-gradient(90deg,#d5d9dd 50%,#f2a900 50%);-webkit-background-clip:text;background-clip:text;color:transparent}' +
    '.mlrv blockquote{margin:0;line-height:1.55;white-space:pre-wrap}.mlrv figcaption{color:var(--mute,#5d6873);font-size:14px;font-weight:600}';
  css += css2;
  window.MyLuachFeedback = { mount: build, open: open, afterDownload: afterDownload, contact: contact, reviews: reviews };
})();
