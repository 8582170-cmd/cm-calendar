/* דפי הארגון בדף המכירה הסינית ובדף הקמפיין: "על הארגון", "יצירת קשר", "הצטרפות לרשימה" (api/_orgpages.js).
   MLOrg.tabs(org) -> [[מפתח, כותרת]...] לדפים הפעילים; MLOrg.html(org, מפתח) -> HTML;
   MLOrg.wire(שורש, מפתח, send) מחבר את הטופס. send(אובייקט) מחזירה Promise עם {_st, message}. */
(function () {
  'use strict';
  var LAB = { about: 'על הארגון', faq: 'שאלות ותשובות', terms: 'תקנון', contact: 'צור קשר', list: 'הצטרפות לרשימה' };
  var CSS = '.og{max-width:720px;display:flex;flex-direction:column;gap:14px}.og h2{margin:0;font-size:24px}.og p{margin:0}.og .ogt{white-space:pre-line;line-height:1.7}' +
    '.og .ogf{border:1px solid rgb(128 128 128 / .35);border-radius:10px;padding:10px 14px}.og .ogf summary{cursor:pointer;font-weight:700}.og .ogf p{margin-top:8px}.og .ogd{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border:1px solid rgb(128 128 128 / .35);border-radius:12px}.og .ogd a{color:inherit}' +
    '.og form{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid rgb(128 128 128 / .35);border-radius:12px}.og label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:15px}' +
    '.og label.ck{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400}.og label.ck input{margin-top:4px;width:18px;height:18px;flex:none}' +
    '.og input:not([type=checkbox]),.og textarea{font:inherit;font-weight:400;padding:10px;border:1px solid rgb(128 128 128 / .5);border-radius:8px;background:#fff;color:#111;min-height:44px}.og textarea{min-height:110px}' +
    '.og .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.og .ogb{font:inherit;font-weight:700;font-size:17px;min-height:48px;padding:10px 24px;border:0;border-radius:999px;cursor:pointer;align-self:flex-start;background:var(--acc2,var(--navy,#16203A));color:var(--accInk,#fff)}' +
    '.og .ogb:disabled{opacity:.5}.og .ogm{min-height:1.4em;font-size:15px}.og .ogm.bad{color:#B3261E}.og .ogx{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.og .ogok{text-align:center;padding:18px}.og .hint{font-size:14px;opacity:.75}' +
    '.ogback{position:fixed;inset:0;background:rgb(0 0 0 / .5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 12px}.ogpop{position:relative;background:#fff;color:#111;border-radius:16px;max-width:560px;width:100%;padding:24px;margin-top:5vh}.ogcl{position:absolute;top:8px;left:12px;border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer;color:#555;padding:4px 10px}.onav button{font:inherit;padding:8px 16px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:inherit;font-weight:600;font-size:15px;cursor:pointer}' +
    '.onav{display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px 6%;background:#fff;border-bottom:1px solid var(--line,#E3E6EE)}' +
    '.onav a,.onav button{font:inherit;font-weight:600;font-size:15px;line-height:1.2;padding:9px 18px;border-radius:999px;border:1.5px solid var(--line2,#C5CAD6);background:#fff;color:var(--ink,#1B2338);text-decoration:none;cursor:pointer;transition:transform .2s,border-color .2s,box-shadow .2s}' +
    '.onav a:hover,.onav button:hover{border-color:var(--navy,#15203B);transform:translateY(-1px);box-shadow:0 3px 0 var(--gold,#C9A24B)}' +
    '.onav a[aria-current=page]{background:var(--acc2,var(--navy,#15203B));color:var(--accInk,#fff);border-color:transparent;box-shadow:none;transform:none}' +
    '.onav [data-ogpop]{margin-inline-start:auto;background:var(--gold,#C9A24B);color:var(--navy,#15203B);border-color:transparent}' +
    '.onav [data-ogpop]:hover{border-color:transparent;box-shadow:0 3px 0 var(--navy,#15203B)}' +
    '.tabs [data-ogpop]{margin-inline-start:auto;margin-bottom:6px;background:var(--acc,#C9A24B);color:var(--accInk,#fff);border-radius:999px;padding:8px 18px;border-bottom:0}' +
    '.tabs .tablink{align-self:center}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() { if (!document.getElementById('og-css')) { var st = document.createElement('style'); st.id = 'og-css'; st.textContent = CSS; document.head.appendChild(st); } }
  /* דפים: על הארגון, צור קשר. ההצטרפות לרשימה היא או תיבת סימון בתוך "צור קשר" (mode=contact), או חלון קופץ (mode=popup, הערך השלישי 'pop') */
  function tabs(o) { var r = []; if (!o) return r; css(); ['about', 'faq', 'terms', 'contact'].forEach(function (k) { if (o[k]) r.push([k, LAB[k]]); }); (o.custom || []).forEach(function (p) { r.push(['pg_' + p.id, p.title]); }); if (o.cross) r.push(['cross', o.cross.label, 'link', o.cross.url]); if (o.list && o.list.mode === 'popup') r.push(['list', LAB.list, 'pop']); return r; }
  /* דף מותאם: טקסט רגיל, או HTML חופשי. ה-HTML מוצג במסגרת מבודדת בלי סקריפטים (sandbox + CSP), ונוקה גם בשרת */
  function custom(o, id) {
    var p = (o.custom || []).filter(function (x) { return x.id === id; })[0]; if (!p) return '';
    if (p.kind !== 'html') return '<div class="og"><h2>' + esc(p.title) + '</h2><div class="ogt">' + esc(p.body) + '</div></div>';
    var doc = '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src \'none\'; frame-src \'none\'; form-action \'none\'"><base target="_blank"><style>body{font:17px/1.7 Heebo,Arial,sans-serif;margin:14px;color:#1B2338}img{max-width:100%;height:auto}</style></head><body>' + p.body + '</body></html>';
    return '<div class="og" style="max-width:none"><h2>' + esc(p.title) + '</h2><iframe title="' + esc(p.title) + '" sandbox="allow-popups allow-popups-to-escape-sandbox" srcdoc="' + esc(doc) + '" style="width:100%;height:' + (+p.h || 600) + 'px;border:1px solid rgb(128 128 128 / .3);border-radius:10px;background:#fff"></iframe></div>';
  }
  function html(o, k) {
    css(); o = o || {}; if (/^pg_/.test(k)) return custom(o, k.slice(3)); var d = o[k]; if (!d) return '';
    if (k === 'about') {
      var det = []; if (d.phone) det.push('טלפון: <a href="tel:' + esc(d.phone.replace(/[^\d+]/g, '')) + '" dir="ltr">' + esc(d.phone) + '</a>'); if (d.email) det.push('מייל: <a href="mailto:' + esc(d.email) + '" dir="ltr">' + esc(d.email) + '</a>');
      if (d.address) det.push('כתובת: ' + esc(d.address)); if (d.site) det.push('אתר: <a href="' + esc(d.site) + '" target="_blank" rel="noopener" dir="ltr">' + esc(d.site.replace(/^https?:\/\//, '')) + '</a>');
      (d.links || []).forEach(function (l) { det.push('<a href="' + esc(l.u) + '" target="_blank" rel="noopener">' + esc(l.t) + '</a>'); });
      return '<div class="og"><h2>' + LAB.about + '</h2>' + (d.text ? '<div class="ogt">' + esc(d.text) + '</div>' : '') + (det.length ? '<div class="ogd">' + det.map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' : '') + '</div>';
    }
    if (k === 'faq') return '<div class="og"><h2>' + LAB.faq + '</h2>' + (d.items || []).map(function (f) { return '<details class="ogf"><summary>' + esc(f.q) + '</summary><p class="ogt">' + esc(f.a) + '</p></details>'; }).join('') + '</div>';
    if (k === 'terms') return '<div class="og"><h2>' + LAB.terms + '</h2><div class="ogt">' + esc(d.text) + '</div></div>';
    var hp = '<input name="website" class="ogx" tabindex="-1" autocomplete="off" aria-hidden="true">';
    if (k === 'contact') return '<div class="og"><h2>' + LAB.contact + '</h2>' + (d.intro ? '<p class="ogt">' + esc(d.intro) + '</p>' : '') + '<form data-og="contact" novalidate><div class="two"><label>שם<input name="name" required autocomplete="name"></label><label>טלפון<input name="phone" type="tel" dir="ltr" autocomplete="tel"></label><label>מייל<input name="email" type="email" dir="ltr" autocomplete="email"></label></div><label>ההודעה<textarea name="msg" required></textarea></label>' + hp + '<p class="hint">מלאו מייל או טלפון, כדי שנוכל לחזור אליכם.</p>' + (o.list && o.list.mode === 'contact' ? '<label class="ck"><input type="checkbox" name="consent"> <span>אני מסכים/ה להצטרף לרשימת התפוצה ולקבל עדכונים מהארגון. אפשר לבקש הסרה בכל עת.</span></label>' : '') + '<button class="ogb" type="submit">שליחה</button><p class="ogm" role="status"></p></form></div>';
    return '<div class="og"><h2>' + LAB.list + '</h2>' + (d.intro ? '<p class="ogt">' + esc(d.intro) + '</p>' : '<p class="ogt">השאירו פרטים ונעדכן אתכם.</p>') + '<form data-og="list" novalidate><div class="two"><label>שם (לא חובה)<input name="name" autocomplete="name"></label><label>מייל<input name="email" type="email" dir="ltr" autocomplete="email"></label><label>טלפון<input name="phone" type="tel" dir="ltr" autocomplete="tel"></label></div><label class="ck"><input type="checkbox" name="consent"> <span>אני מסכים/ה לקבל עדכונים מהארגון במייל או בטלפון שמסרתי. אפשר לבקש הסרה בכל עת.</span></label>' + hp + '<button class="ogb" type="submit">הצטרפות</button><p class="ogm" role="status"></p></form></div>';
  }
  function wire(root, k, send) {
    var f = root.querySelector('form[data-og]'); if (!f) return;
    f.onsubmit = function (e) {
      e.preventDefault(); var m = f.querySelector('.ogm'), b = f.querySelector('.ogb'), o = { kind: k }; m.className = 'ogm';
      [].forEach.call(f.elements, function (x) { if (x.name && x.type !== 'checkbox') o[x.name] = x.value; });
      var cb = f.elements.consent; if (cb) o.consent = !!cb.checked;
      if (k === 'contact' && (!String(o.name || '').trim() || !String(o.msg || '').trim() || !(String(o.email || '').trim() || String(o.phone || '').trim()))) { m.className = 'ogm bad'; m.textContent = 'צריך שם, הודעה, ומייל או טלפון'; return; }
      if (k === 'list' && (!(String(o.email || '').trim() || String(o.phone || '').trim()) || !o.consent)) { m.className = 'ogm bad'; m.textContent = 'צריך מייל או טלפון, ולסמן הסכמה'; return; }
      b.disabled = true; m.textContent = 'שולח…';
      send(o).then(function (r) {
        if (r && r._st === 200) f.outerHTML = '<div class="ogok" role="status"><h3>' + (k === 'list' ? 'נרשמתם, תודה!' : 'הפנייה נשלחה, תודה!') + '</h3><p>' + (k === 'list' ? (r.already ? 'הפרטים שלכם כבר ברשימה.' : 'נעדכן אתכם.') : 'נחזור אליכם בהקדם.') + '</p></div>';
        else { b.disabled = false; m.className = 'ogm bad'; m.textContent = (r && r.message) || 'לא נשלח, נסו שוב'; }
      }).catch(function () { b.disabled = false; m.className = 'ogm bad'; m.textContent = 'שגיאת רשת, נסו שוב'; });
    };
  }
  /* חלון קופץ להצטרפות לרשימה. bind נקראת פעם אחת: get() מחזירה את הדפים הנוכחיים, send שולחת */
  var BIND = null, last = null;
  function popup() {
    var o = BIND && BIND.get(); if (!o || !o.list) return; css(); last = document.activeElement;
    var back = document.createElement('div'); back.className = 'ogback'; back.innerHTML = '<div class="ogpop" role="dialog" aria-modal="true" aria-label="' + LAB.list + '"><button type="button" class="ogcl" aria-label="סגירה">×</button>' + html(o, 'list') + '</div>';
    var close = function () { document.removeEventListener('keydown', esc2); back.remove(); if (last && last.focus) last.focus(); };
    var esc2 = function (e) { if (e.key === 'Escape') close(); };
    back.addEventListener('click', function (e) { if (e.target === back || e.target.classList.contains('ogcl')) close(); });
    document.addEventListener('keydown', esc2); document.body.appendChild(back); wire(back, 'list', BIND.send);
    var f = back.querySelector('input:not([type=hidden]):not(.ogx)'); if (f) f.focus();
  }
  function bind(get, send) { BIND = { get: get, send: send }; if (!bind.on) { bind.on = true; document.addEventListener('click', function (e) { if (e.target.closest('[data-ogpop]')) { e.preventDefault(); popup(); } }); } }
  window.MLOrg = { tabs: tabs, html: html, wire: wire, css: css, bind: bind };
})();
