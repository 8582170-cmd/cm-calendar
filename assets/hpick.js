/* בחירת יום מלוח (חודש עברי, עם התאריך הלועזי), פתוח מיד על היום הנוכחי. בלי ספריות: לפי לוח השנה העברי של הדפדפן.
   MyLuachHPick.open(כפתור, {onPick(info), date}) → info = {date, hm, hd, hy} (מספרי חודשים כמו ב-hebcal: ניסן=1 … תשרי=7 … אדר=12, אדר ב׳=13) */
(function(){
  'use strict';
  var MN = { Tishri: 7, Heshvan: 8, Kislev: 9, Tevet: 10, Shevat: 11, Adar: 12, 'Adar I': 12, 'Adar II': 13, Nisan: 1, Iyar: 2, Sivan: 3, Tamuz: 4, Av: 5, Elul: 6 };
  var HE = { 1: 'ניסן', 2: 'אייר', 3: 'סיון', 4: 'תמוז', 5: 'אב', 6: 'אלול', 7: 'תשרי', 8: 'חשון', 9: 'כסלו', 10: 'טבת', 11: 'שבט', 12: 'אדר', 13: 'אדר ב׳' };
  var F = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long', year: 'numeric' });
  function heb(d) {
    var o = {}; F.formatToParts(d).forEach(function (p) { o[p.type] = p.value; });
    var hm = MN[o.month] || 0, leapAdarI = o.month === 'Adar I';
    return { hd: +o.day, hm: hm, hy: +o.year, adarI: leapAdarI };
  }
  function gem(n) {
    var s = '', T = [[400, 'ת'], [300, 'ש'], [200, 'ר'], [100, 'ק'], [90, 'צ'], [80, 'פ'], [70, 'ע'], [60, 'ס'], [50, 'נ'], [40, 'מ'], [30, 'ל'], [20, 'כ'], [10, 'י'], [9, 'ט'], [8, 'ח'], [7, 'ז'], [6, 'ו'], [5, 'ה'], [4, 'ד'], [3, 'ג'], [2, 'ב'], [1, 'א']];
    n = n % 1000;
    for (var i = 0; i < T.length; i++) while (n >= T[i][0]) { if (n === 15 || n === 16) { s += n === 15 ? 'טו' : 'טז'; n = 0; break; } s += T[i][1]; n -= T[i][0]; }
    return s.length > 1 ? s.slice(0, -1) + '״' + s.slice(-1) : s + '׳';
  }
  var noon = function (d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12); };
  var add = function (d, n) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12); };
  var same = function (a, b) { return a && b && a.toDateString() === b.toDateString(); };
  function monthOf(d) { /* כל הימים של החודש העברי שבו נמצא d */
    var h = heb(d), first = add(d, 1 - h.hd), days = [], x = first, k = heb(first);
    while (true) { var hx = heb(x); if (hx.hm !== k.hm || hx.hy !== k.hy || hx.adarI !== k.adarI) break; days.push(x); x = add(x, 1); }
    return { days: days, h: k };
  }
  function css() {
    if (document.getElementById('hpick-css')) return;
    var s = document.createElement('style'); s.id = 'hpick-css';
    s.textContent = '.hpk{position:absolute;z-index:100001;background:#fff;color:#1d2a2e;border:1px solid #c9d3d1;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:10px;width:300px;font:14px/1.3 Assistant,Arial,sans-serif;direction:rtl}' +
      '.hpk-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}.hpk-h b{font-size:16px}.hpk button{font:inherit;cursor:pointer;border:1px solid #d5dcda;background:#fff;border-radius:8px;padding:3px 9px;color:inherit}' +
      '.hpk-g{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}.hpk-w{text-align:center;font-size:11px;color:#6b7679;padding:2px 0}' +
      '.hpk-d{border:0!important;padding:4px 0!important;display:flex;flex-direction:column;align-items:center;border-radius:8px!important}.hpk-d b{font-size:14px}.hpk-d i{font-style:normal;font-size:10px;color:#6b7679}' +
      '.hpk-d:hover{background:#eef4f3!important}.hpk-d.t{box-shadow:inset 0 0 0 2px #1e5a63}.hpk-d.s{background:#1e5a63!important;color:#fff}.hpk-d.s i{color:#dfe9e8}.hpk-f{display:flex;justify-content:space-between;margin-top:8px}';
    document.head.appendChild(s);
  }
  var cur = null;
  function close() { if (cur) { cur.remove(); cur = null; document.removeEventListener('mousedown', outside, true); document.removeEventListener('keydown', esc, true); } }
  function outside(e) { if (cur && !cur.contains(e.target)) close(); }
  function esc(e) { if (e.key === 'Escape') close(); }
  function open(btn, opts) {
    opts = opts || {}; css(); close();
    var today = noon(new Date()), sel = opts.date ? noon(opts.date) : today, view = sel;
    var box = document.createElement('div'); box.className = 'hpk'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'בחירת יום');
    function draw() {
      var M = monthOf(view), lead = M.days[0].getDay();
      var h = '<div class="hpk-h"><button type="button" data-n="prev" aria-label="החודש הקודם">›</button><b>' + HE[M.h.hm] + (M.h.adarI ? ' א׳' : '') + ' ' + gem(M.h.hy) + '</b><button type="button" data-n="next" aria-label="החודש הבא">‹</button></div><div class="hpk-g">' +
        ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'].map(function (w) { return '<div class="hpk-w">' + w + '</div>'; }).join('');
      for (var i = 0; i < lead; i++) h += '<div></div>';
      M.days.forEach(function (d, i) { h += '<button type="button" class="hpk-d' + (same(d, today) ? ' t' : '') + (same(d, sel) ? ' s' : '') + '" data-i="' + i + '"><b>' + gem(i + 1) + '</b><i>' + d.getDate() + '/' + (d.getMonth() + 1) + '</i></button>'; });
      box.innerHTML = h + '</div><div class="hpk-f"><button type="button" data-n="today">היום</button><button type="button" data-n="x">סגירה</button></div>';
      box._m = M;
    }
    function pick(d) { var x = heb(d); close(); if (opts.onPick) opts.onPick({ date: d, hm: x.hm, hd: x.hd, hy: x.hy }); }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return; e.preventDefault();
      if (b.dataset.i != null) return pick(box._m.days[+b.dataset.i]);
      var n = b.dataset.n;
      if (n === 'prev') { view = add(box._m.days[0], -1); draw(); }
      else if (n === 'next') { view = add(box._m.days[box._m.days.length - 1], 1); draw(); }
      else if (n === 'today') pick(today);
      else if (n === 'x') close();
    });
    draw(); document.body.appendChild(box); cur = box;
    var r = btn.getBoundingClientRect(), w = box.offsetWidth;
    box.style.top = (window.scrollY + r.bottom + 6) + 'px';
    box.style.left = Math.max(8, Math.min(window.scrollX + document.documentElement.clientWidth - w - 8, window.scrollX + r.right - w)) + 'px';
    setTimeout(function () { document.addEventListener('mousedown', outside, true); document.addEventListener('keydown', esc, true); var s = box.querySelector('.hpk-d.s') || box.querySelector('.hpk-d.t'); if (s) s.focus(); }, 0);
  }
  /* כפתור כללי: data-hpick="מזהה-חודש,מזהה-יום" ממלא את שתי הבחירות */
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hpick]'); if (!b) return; e.preventDefault();
    var ids = b.dataset.hpick.split(','), root = b.closest('.modal,.dlg,form,section,body') || document;
    var q = function (id) { return root.querySelector('#' + id) || document.getElementById(id); };
    var mS = q(ids[0]), dS = q(ids[1]), cd = null;
    open(b, { onPick: function (x) {
      [[mS, x.hm], [dS, x.hd]].forEach(function (p) { if (!p[0]) return; var v = String(p[1]); if (p[0].tagName === 'SELECT' && !Array.prototype.some.call(p[0].options, function (o) { return o.value === v; }) && p[1] === 13) v = '12'; p[0].value = v; p[0].dispatchEvent(new Event('input', { bubbles: true })); p[0].dispatchEvent(new Event('change', { bubbles: true })); });
    } });
  });
  window.MyLuachHPick = { open: open, heb: heb, gem: gem };
})();
