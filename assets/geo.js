/* בחירת מיקום ללוח: המיקום הנוכחי (GPS של הדפדפן), או חיפוש לפי מיקוד, כתובת או שם יישוב.
   MyLuachGeo.open({en, near}) → Promise של {name, lat, lng, el, tz, il, cc} או null אם בוטל.
   near(lat,lng) לא חובה: מחזיר עיר קרובה מהרשימה של הדף, לגיבוי של אזור הזמן והגובה. */
(function(){
  'use strict';
  var IL_TZ = /^Asia\/(Jerusalem|Tel_Aviv|Hebron|Gaza)$/;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function css(){
    if (document.getElementById('mlgeo-css')) return;
    var s = document.createElement('style'); s.id = 'mlgeo-css';
    s.textContent = '.mlgeo-b{position:fixed;inset:0;background:rgba(20,30,35,.45);z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px}' +
      '.mlgeo{background:#fff;color:#1d2a2e;border-radius:14px;max-width:460px;width:100%;max-height:90vh;overflow:auto;padding:18px 18px 14px;box-shadow:0 12px 40px rgba(0,0,0,.25);font:16px/1.45 Assistant,Arial,sans-serif}' +
      '.mlgeo h3{margin:0 0 4px;font-size:20px}.mlgeo p{margin:4px 0 10px;color:#5c686c;font-size:14px}' +
      '.mlgeo button{font:inherit;cursor:pointer;border-radius:9px;border:1px solid #c9d3d1;background:#fff;color:#1d2a2e;padding:8px 12px}' +
      '.mlgeo .pri{background:#1e5a63;border-color:#1e5a63;color:#fff;font-weight:700}' +
      '.mlgeo .row{display:flex;gap:8px;margin:8px 0}.mlgeo input{flex:1;min-width:0;font:inherit;padding:8px 10px;border:1px solid #c9d3d1;border-radius:9px}' +
      '.mlgeo .res{display:flex;flex-direction:column;gap:6px;margin-top:8px}.mlgeo .res button{text-align:start;display:flex;flex-direction:column;gap:2px}.mlgeo .res small{color:#5c686c}' +
      '.mlgeo .msg{min-height:1.4em;font-size:14px}.mlgeo .bad{color:#b4231b}.mlgeo .sep{text-align:center;color:#8a9496;font-size:13px;margin:10px 0 2px}';
    document.head.appendChild(s);
  }
  function open(o){
    o = o || {}; var EN = !!o.en; css();
    return new Promise(function(done){
      var b = document.createElement('div'); b.className = 'mlgeo-b';
      b.innerHTML = '<div class="mlgeo" role="dialog" aria-modal="true" dir="' + (EN ? 'ltr' : 'rtl') + '">' +
        '<h3>' + (EN ? 'Location for the calendar' : 'מיקום ללוח') + '</h3><p>' + (EN ? 'Zmanim and Shabbat times will be calculated for this place.' : 'זמני היום והשבת יחושבו לפי המקום הזה.') + '</p>' +
        (navigator.geolocation ? '<button type="button" class="pri" data-g="me" style="width:100%">📍 ' + (EN ? 'Use my current location' : 'המיקום הנוכחי שלי') + '</button><div class="sep">' + (EN ? 'or search' : 'או חיפוש') + '</div>' : '') +
        '<div class="row"><input type="search" data-g="q" placeholder="' + (EN ? 'Zip / postal code, address or town' : 'מיקוד, כתובת או שם יישוב') + '" aria-label="' + (EN ? 'Search' : 'חיפוש') + '"><button type="button" data-g="go">' + (EN ? 'Search' : 'חיפוש') + '</button></div>' +
        '<div class="msg" aria-live="polite"></div><div class="res"></div>' +
        '<div class="row" style="justify-content:flex-end;margin-top:12px"><button type="button" data-g="x">' + (EN ? 'Cancel' : 'ביטול') + '</button></div></div>';
      document.body.appendChild(b);
      var $ = function(s){ return b.querySelector(s) }, msg = function(t, bad){ $('.msg').innerHTML = '<span class="' + (bad ? 'bad' : '') + '">' + esc(t) + '</span>' };
      var fin = function(v){ b.remove(); done(v) };
      b.addEventListener('click', function(e){ if (e.target === b) fin(null) });
      b.addEventListener('keydown', function(e){ if (e.key === 'Escape') fin(null) });
      $('[data-g="x"]').onclick = function(){ fin(null) };
      function finish(lat, lng, name, fromGps, alt){
        msg(EN ? 'Getting details…' : 'טוענים פרטים…');
        var nb = o.near ? o.near(lat, lng) : null;
        fetch('/api/pricing?c=_geo&lat=' + lat + '&lng=' + lng + (EN ? '&lang=en' : '')).then(function(r){ return r.ok ? r.json() : {} }).catch(function(){ return {} }).then(function(d){
          var tz = d.tz || (fromGps ? (Intl.DateTimeFormat().resolvedOptions().timeZone || '') : '') || (nb && nb.tz) || 'Asia/Jerusalem';
          var el = d.el != null && d.tz ? d.el : (alt != null ? Math.round(alt) : (nb && nb.km < 15 ? nb.el : 0));
          var p = { name: (name || d.name || (EN ? 'My location' : 'המיקום שלי')).slice(0, 60), lat: +(+lat).toFixed(5), lng: +(+lng).toFixed(5), el: Math.max(0, +el || 0), tz: tz, il: IL_TZ.test(tz) || d.cc === 'il', cc: d.cc || '' };
          if (fromGps) { try { localStorage.setItem('myluach-geo', JSON.stringify({ lat: p.lat, lng: p.lng, tz: p.tz, il: p.il })) } catch (e) {} }
          fin(p);
        });
      }
      var me = $('[data-g="me"]');
      if (me) me.onclick = function(){
        msg(EN ? 'Locating…' : 'מאתרים…');
        navigator.geolocation.getCurrentPosition(function(pos){ finish(pos.coords.latitude, pos.coords.longitude, '', true, pos.coords.altitude) },
          function(){ msg(EN ? 'The browser did not allow access to your location. You can search by zip code or address instead.' : 'הדפדפן לא אישר גישה למיקום. אפשר לחפש לפי מיקוד או כתובת.', true) }, { timeout: 15000, maximumAge: 600000 });
      };
      var search = function(){
        var q = $('[data-g="q"]').value.trim(); if (q.length < 2) { msg(EN ? 'Type a zip code, address or town.' : 'הקלידו מיקוד, כתובת או שם יישוב.', true); return }
        msg(EN ? 'Searching…' : 'מחפשים…'); $('.res').innerHTML = '';
        fetch('/api/pricing?c=_geo&q=' + encodeURIComponent(q) + (EN ? '&lang=en' : '')).then(function(r){ return r.ok ? r.json() : { results: [] } }).catch(function(){ return null }).then(function(d){
          if (!d) { msg(EN ? 'Search is unavailable right now. Try again later.' : 'החיפוש לא זמין כרגע. נסו שוב מאוחר יותר.', true); return }
          var R = d.results || [];
          if (!R.length) { msg(EN ? 'Nothing found. Try a town name or full address.' : 'לא נמצא. נסו שם יישוב או כתובת מלאה.', true); return }
          msg(EN ? 'Choose the right place:' : 'בחרו את המקום הנכון:');
          $('.res').innerHTML = R.map(function(x, i){ return '<button type="button" data-i="' + i + '"><b>' + esc(x.name) + (x.pc ? ' · ' + esc(x.pc) : '') + '</b><small>' + esc(x.full) + '</small></button>' }).join('');
          $('.res').onclick = function(e){ var t = e.target.closest('[data-i]'); if (!t) return; var x = R[+t.dataset.i]; finish(x.lat, x.lng, x.name, false) };
        });
      };
      $('[data-g="go"]').onclick = search;
      $('[data-g="q"]').addEventListener('keydown', function(e){ if (e.key === 'Enter') { e.preventDefault(); search() } });
      setTimeout(function(){ var q = $('[data-g="q"]'); if (q && !me) q.focus() }, 50);
    });
  }
  window.MyLuachGeo = { open: open };
})();
