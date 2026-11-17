/* דפי הארגון בדף המכירה הסינית ובדף הקמפיין: "על הארגון", "יצירת קשר", "הצטרפות לרשימה" (api/_orgpages.js).
   MLOrg.tabs(org) -> [[מפתח, כותרת]...] לדפים הפעילים; MLOrg.html(org, מפתח) -> HTML;
   MLOrg.wire(שורש, מפתח, send) מחבר את הטופס. send(אובייקט) מחזירה Promise עם {_st, message}. */
(function () {
  'use strict';
  var LAB = { about: 'על הארגון', contact: 'צור קשר', list: 'הצטרפות לרשימה' };
  var CSS = '.og{max-width:720px;display:flex;flex-direction:column;gap:14px}.og h2{margin:0;font-size:24px}.og p{margin:0}.og .ogt{white-space:pre-line;line-height:1.7}' +
    '.og .ogd{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border:1px solid rgb(128 128 128 / .35);border-radius:12px}.og .ogd a{color:inherit}' +
    '.og form{display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid rgb(128 128 128 / .35);border-radius:12px}.og label{display:flex;flex-direction:column;gap:4px;font-weight:600;font-size:15px}' +
    '.og label.ck{flex-direction:row;align-items:flex-start;gap:8px;font-weight:400}.og label.ck input{margin-top:4px;width:18px;height:18px;flex:none}' +
    '.og input:not([type=checkbox]),.og textarea{font:inherit;font-weight:400;padding:10px;border:1px solid rgb(128 128 128 / .5);border-radius:8px;background:#fff;color:#111;min-height:44px}.og textarea{min-height:110px}' +
    '.og .two{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.og .ogb{font:inherit;font-weight:700;font-size:17px;min-height:48px;padding:10px 24px;border:0;border-radius:999px;cursor:pointer;align-self:flex-start;background:var(--acc2,var(--navy,#16203A));color:var(--accInk,#fff)}' +
    '.og .ogb:disabled{opacity:.5}.og .ogm{min-height:1.4em;font-size:15px}.og .ogm.bad{color:#B3261E}.og .ogx{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}.og .ogok{text-align:center;padding:18px}.og .hint{font-size:14px;opacity:.75}' +
    '.onav{display:flex;flex-wrap:wrap;gap:8px;padding:12px 6%;border-bottom:1px solid rgb(128 128 128 / .3)}.onav a{padding:8px 16px;border-radius:999px;border:1.5px solid currentColor;text-decoration:none;color:inherit;font-weight:600;font-size:15px}.onav a[aria-current=page]{background:var(--acc2,var(--navy,#16203A));color:var(--accInk,#fff);border-color:transparent}';
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function css() { if (!document.getElementById('og-css')) { var st = document.createElement('style'); st.id = 'og-css'; st.textContent = CSS; document.head.appendChild(st); } }
  function tabs(o) { var r = []; if (!o) return r; ['about', 'contact', 'list'].forEach(function (k) { if (o[k]) r.push([k, LAB[k]]); }); return r; }
  function html(o, k) {
    css(); o = o || {}; var d = o[k]; if (!d) return '';
    if (k === 'about') {
      var det = []; if (d.phone) det.push('טלפון: <a href="tel:' + esc(d.phone.replace(/[^\d+]/g, '')) + '" dir="ltr">' + esc(d.phone) + '</a>'); if (d.email) det.push('מייל: <a href="mailto:' + esc(d.email) + '" dir="ltr">' + esc(d.email) + '</a>');
      if (d.address) det.push('כתובת: ' + esc(d.address)); if (d.site) det.push('אתר: <a href="' + esc(d.site) + '" target="_blank" rel="noopener" dir="ltr">' + esc(d.site.replace(/^https?:\/\//, '')) + '</a>');
      (d.links || []).forEach(function (l) { det.push('<a href="' + esc(l.u) + '" target="_blank" rel="noopener">' + esc(l.t) + '</a>'); });
      return '<div class="og"><h2>' + LAB.about + '</h2>' + (d.text ? '<div class="ogt">' + esc(d.text) + '</div>' : '') + (det.length ? '<div class="ogd">' + det.map(function (x) { return '<div>' + x + '</div>'; }).join('') + '</div>' : '') + '</div>';
    }
    var hp = '<input name="website" class="ogx" tabindex="-1" autocomplete="off" aria-hidden="true">';
    if (k === 'contact') return '<div class="og"><h2>' + LAB.contact + '</h2>' + (d.intro ? '<p class="ogt">' + esc(d.intro) + '</p>' : '') + '<form data-og="contact" novalidate><div class="two"><label>שם<input name="name" required autocomplete="name"></label><label>טלפון<input name="phone" type="tel" dir="ltr" autocomplete="tel"></label><label>מייל<input name="email" type="email" dir="ltr" autocomplete="email"></label></div><label>ההודעה<textarea name="msg" required></textarea></label>' + hp + '<p class="hint">מלאו מייל או טלפון, כדי שנוכל לחזור אליכם.</p><button class="ogb" type="submit">שליחה</button><p class="ogm" role="status"></p></form></div>';
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
  window.MLOrg = { tabs: tabs, html: html, wire: wire, css: css };
})();
