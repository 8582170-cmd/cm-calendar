/* אתר שומר שבת: בשבת ובחג (מהשקיעה עד צאת הכוכבים, לפי מיקום הגולש) האתר סגור.
   התשובה נשמרת בדפדפן עד תחילת השבת הבאה, כך שבימי חול אין המתנה. */
(function(){
  'use strict';
  if (window.__mlShabbat) return; window.__mlShabbat = true;
  if (/cmsedit|snapview/.test(location.search + location.hash) || /\/admin/.test(location.pathname)) return;
  /* מנועי חיפוש ובודקי אתרים: לא סוגרים בפניהם, כדי שהאתר ייסרק כרגיל גם בשבת (אצלם לפי מיקום השרת שלהם) */
  if (/bot|crawl|spider|slurp|bingpreview|mediapartners|lighthouse|pagespeed|headlesschrome|yandex|duckduck|baidu|facebookexternalhit|whatsapp|telegram/i.test(navigator.userAgent || '')) return;
  var KEY = 'myluach-shabbat', EN = (document.documentElement.lang || '').slice(0, 2) === 'en';
  function get(k){ try { return JSON.parse(localStorage.getItem(k) || 'null') } catch (e) { return null } }
  function put(k, v){ try { localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
  var geo = get('myluach-geo');
  var gk = geo && isFinite(geo.lat) ? [(+geo.lat).toFixed(2), (+geo.lng).toFixed(2), geo.tz || ''].join(',') : '';
  function hm(t, tz){ try { return new Intl.DateTimeFormat(EN ? 'en-GB' : 'he-IL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: tz }).format(new Date(t)) } catch (e) { return '' } }
  function day(t, tz){ try { return new Intl.DateTimeFormat(EN ? 'en-GB' : 'he-IL', { weekday: 'long', timeZone: tz }).format(new Date(t)) } catch (e) { return '' } }
  function close(d){
    var t = d.kind === 'shabbat' ? (EN ? 'Shabbat Shalom!' : 'שבת שלום!') : d.kind === 'yt' ? (EN ? 'Chag Sameach!' : 'חג שמח!') : (EN ? 'Shabbat Shalom & Chag Sameach!' : 'שבת שלום וחג שמח!');
    var when = d.end ? (EN ? 'The site will be back on ' + day(d.end, d.tz) + ' at ' + hm(d.end, d.tz) + '.' : 'האתר יחזור לפעול ב' + day(d.end, d.tz) + ' בשעה ' + hm(d.end, d.tz) + '.') : '';
    var h = '<div id="ml-shabbat" role="dialog" aria-modal="true" lang="' + (EN ? 'en' : 'he') + '" dir="' + (EN ? 'ltr' : 'rtl') + '" style="position:fixed;inset:0;z-index:2147483647;background:#f7f3ea;color:#1d2a2e;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Assistant,Arial,sans-serif;text-align:center">' +
      '<div style="max-width:520px"><div style="font-size:54px;line-height:1" aria-hidden="true">🕯️🕯️</div>' +
      '<h1 style="font-size:34px;margin:14px 0 8px">' + t + '</h1>' +
      '<p style="font-size:19px;margin:0 0 8px">' + (EN ? 'MyLuach is a Shabbat-observant site and is closed on Shabbat and Yom Tov.' : 'MyLuach הוא אתר שומר שבת, וסגור בשבת ובחג.') + '</p>' +
      '<p style="font-size:19px;margin:0 0 14px"><b>' + when + '</b></p>' +
      '<p style="font-size:14px;color:#5c686c;margin:0">' + (EN ? 'Times are for your location.' : 'הזמנים לפי המיקום שלכם.') + '</p></div></div>';
    var go = function(){ if (document.getElementById('ml-shabbat')) return; document.body.insertAdjacentHTML('beforeend', h); document.documentElement.style.overflow = 'hidden';
      Array.prototype.forEach.call(document.body.children, function(n){ if (n.id !== 'ml-shabbat') { n.setAttribute('aria-hidden', 'true'); n.inert = true } }) };
    if (document.body) go(); else document.addEventListener('DOMContentLoaded', go);
    if (d.end) setTimeout(function(){ location.reload() }, Math.min(Math.max(30e3, d.end - Date.now() + 5e3), 2147483000));
  }
  function arm(d){ /* דף שנשאר פתוח: נסגר כשמתחילה השבת */
    if (d.next && d.next - Date.now() < 864e5) setTimeout(check, Math.max(1e3, d.next - Date.now() + 1e3));
  }
  function check(){
    var u = '/api/pricing?c=_shabbat' + (gk ? '&lat=' + geo.lat + '&lng=' + geo.lng + (geo.tz ? '&tz=' + encodeURIComponent(geo.tz) : '') + (geo.il != null ? '&il=' + (geo.il ? 1 : 0) : '') : '');
    fetch(u, { cache: 'no-store' }).then(function(r){ return r.ok ? r.json() : null }).then(function(d){
      if (!d) return; var now = Date.now();
      put(KEY, { gk: gk, on: d.on, closed: d.closed, kind: d.kind, end: d.end, next: d.next, tz: d.tz, until: d.closed ? d.end : Math.min(d.next || now + 864e5, now + 6 * 3600e3), at: now });
      if (d.closed) close(d); else arm(d);
    }).catch(function(){});
  }
  var c = get(KEY), now = Date.now();
  if (c && c.gk === gk && now < c.until && now - c.at < 864e5) { if (c.closed && now < c.end) close(c); else if (c.on !== false) arm(c); }
  else check();
})();
