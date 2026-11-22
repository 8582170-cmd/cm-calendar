/* עורך ה-PDF: כניסה, בדיקת הזכאות בהורדה (עריכה חינמית / חבילה / מנוי), וחלון תשלום.
   השרת: /api/pricing?c=_pdfpay (api/_pdfpay.js). העורך (pdfedit.js) קורא ל-__mlGate.check לפני כל הורדה.
   אם המכירה כבויה בניהול, ההורדה חינמית לכולם ולא נדרשת כניסה. */
(function(){
'use strict';
var KEY = 'myluach-auth', API = '/api/pricing?c=_pdfpay', SB = null, INFO = null;
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
function nis(n){ return (Math.round(+n * 100) / 100).toLocaleString('he-IL') + ' ₪' }
function sess(){ try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch (e) { return null } }
function tok(){
  var j = sess(); if (!j) return Promise.resolve('');
  if (j.access_token && (!j.expires_at || j.expires_at * 1000 > Date.now() + 60000)) return Promise.resolve(j.access_token);
  var C = window.MYLUACH_CFG || {}; if (!j.refresh_token || !C.supabaseUrl) return Promise.resolve('');
  return fetch(C.supabaseUrl.replace(/\/$/, '') + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: C.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: j.refresh_token }) })
    .then(function(r){ return r.ok ? r.json() : null }).then(function(n){ if (!n || !n.access_token) return ''; try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, j, { access_token: n.access_token, refresh_token: n.refresh_token || j.refresh_token, expires_at: n.expires_at }))) } catch (e) {} return n.access_token }).catch(function(){ return '' });
}
function meMail(){ var j = sess(); if (!j) return ''; if (j.user && j.user.email) return j.user.email; try { var p = (j.access_token || '').split('.')[1]; return JSON.parse(decodeURIComponent(escape(atob(p.replace(/-/g, '+').replace(/_/g, '/'))))).email || '' } catch (e) { return '' } }
function loadScript(src){ return new Promise(function(ok, bad){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s) }) }
function loadSb(){ return window.supabase ? Promise.resolve() : loadScript('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js').catch(function(){ return loadScript('/cdn/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js') }) }
function sbReady(){ var C = window.MYLUACH_CFG || {}; if (!C.supabaseUrl) return Promise.reject(new Error('cfg')); return loadSb().then(function(){ return SB || (SB = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: KEY } })) }) }
function authMsg(e){ var m = String(e && e.message || e || ''); if (/invalid login/i.test(m)) return 'המייל או הסיסמה שגויים. אם אין לכם סיסמה, השתמשו בקישור במייל.'; if (/rate|limit|seconds/i.test(m)) return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'; if (/provider|not enabled|unsupported/i.test(m)) return 'הכניסה עם Google עדיין לא הופעלה. השתמשו בקישור במייל.'; return 'הכניסה נכשלה. נסו שוב.' }
function pub(){ if (!INFO) INFO = fetch(API + '&a=pub').then(function(r){ return r.ok ? r.json() : { on: false } }).catch(function(){ return { on: false } }); return INFO }
function api(t, b){ return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(b) }).then(function(r){ return r.json().catch(function(){ return {} }).then(function(j){ j._st = r.status; return j }) }) }

var CSS = '.mlg-back{position:fixed;inset:0;background:rgb(0 0 0/.45);z-index:9998;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 12px}.mlg{background:#fff;color:#172126;border-radius:18px;max-width:480px;width:100%;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 50px -10px rgb(0 0 0/.4);margin-top:6vh}' +
  '.mlg h3{margin:0;font-size:22px}.mlg p{margin:0}.mlg .hint{color:#5c686c;font-size:15px}.mlg label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:15px}.mlg input{font:inherit;font-weight:400;padding:10px 12px;border:1.5px solid #cfd6d3;border-radius:10px}' +
  '.mlg .b{font:inherit;font-weight:800;min-height:46px;padding:8px 18px;border-radius:12px;border:2px solid #1f5c63;background:#fff;color:#1f5c63;cursor:pointer}.mlg .b.p{background:#1f5c63;color:#fff}.mlg .b:disabled{opacity:.5}' +
  '.mlg .opt{display:flex;justify-content:space-between;align-items:center;gap:10px;border:1.5px solid #dde2df;border-radius:12px;padding:10px 12px}.mlg .opt small{display:block;color:#5c686c;font-weight:400}.mlg .x{color:#b00020;min-height:1.3em;font-size:15px}.mlg .row{display:flex;gap:8px;flex-wrap:wrap}';
function modal(html){
  if (!document.getElementById('mlg-css')) { var st = document.createElement('style'); st.id = 'mlg-css'; st.textContent = CSS; document.head.appendChild(st) }
  var back = document.createElement('div'); back.className = 'mlg-back'; back.innerHTML = '<div class="mlg" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(back);
  var box = back.firstChild; return { back: back, box: box, $: function(s){ return box.querySelector(s) }, close: function(){ back.remove() } };
}

/* חלון כניסה. מחזיר הבטחה: true אם נכנסו (בסיסמה, בלי רענון הדף), false אם סגרו */
function openLogin(text, optional){
  return new Promise(function(done){
    var m = modal('<h3>כניסה</h3><p class="hint">' + esc(text) + '</p>' +
      '<button class="b p" type="button" id="g1">כניסה עם Google</button>' +
      '<label>מייל<input id="g2" type="email" dir="ltr" autocomplete="email"></label>' +
      '<button class="b" type="button" id="g3">שלחו לי קישור כניסה למייל</button>' +
      '<details><summary style="cursor:pointer;font-size:14px">יש לי סיסמה</summary><label>סיסמה<input id="g4" type="password" dir="ltr" autocomplete="current-password"></label><button class="b" type="button" id="g5" style="margin-top:8px">כניסה עם סיסמה</button></details>' +
      '<p class="hint">כניסה עם Google או עם קישור במייל טוענת את הדף מחדש, ולכן בוחרים את הקובץ שוב אחרי הכניסה. כניסה עם סיסמה לא מרעננת את הדף.</p><p class="x" id="g6" role="alert"></p>' +
      '<div class="row"><button class="b" type="button" id="g7">' + (optional ? 'להמשיך בלי להיכנס עכשיו' : 'ביטול') + '</button></div>');
    var X = m.$('#g6'), say = function(t, bad){ X.textContent = t; X.style.color = bad ? '#b00020' : '#1f5c63' };
    var mail = function(){ var v = m.$('#g2').value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { say('נא למלא כתובת מייל תקינה.', 1); m.$('#g2').focus(); return '' } return v };
    var here = location.origin + location.pathname;
    m.$('#g7').onclick = function(){ m.close(); done(false) };
    m.$('#g1').onclick = function(){ say('עוברים לגוגל…'); sbReady().then(function(sb){ return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here, queryParams: { prompt: 'select_account' } } }) }).then(function(r){ if (r && r.error) say(authMsg(r.error), 1) }).catch(function(e){ say(authMsg(e), 1) }) };
    m.$('#g3').onclick = function(){ var v = mail(); if (!v) return; var b = m.$('#g3'); b.disabled = true; say('שולחים…');
      sbReady().then(function(sb){ return sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: here } }) }).then(function(r){ b.disabled = false; if (r && r.error) return say(authMsg(r.error), 1); say('נשלח! פתחו את המייל ולחצו על הקישור. אם הוא לא מגיע תוך דקה, בדקו בספאם.'); b.textContent = 'שליחה חוזרת' }).catch(function(e){ b.disabled = false; say(authMsg(e), 1) }) };
    var pw = function(){ var v = mail(), p = m.$('#g4').value, C = window.MYLUACH_CFG || {}; if (!v) return; if (!p) return say('נא למלא סיסמה.', 1); if (!C.supabaseUrl) return say('הכניסה לא זמינה כרגע.', 1);
      m.$('#g5').disabled = true; say('נכנסים…');
      fetch(C.supabaseUrl.replace(/\/$/, '') + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: C.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, password: p }) })
        .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j } }) }).then(function(o){
          if (!o.ok || !o.j.access_token) { m.$('#g5').disabled = false; return say('המייל או הסיסמה שגויים. אם אין לכם סיסמה, השתמשו בקישור במייל.', 1) }
          try { localStorage.setItem(KEY, JSON.stringify(o.j)) } catch (e) {} m.close(); done(true) }).catch(function(){ m.$('#g5').disabled = false; say('תקלת תקשורת. נסו שוב.', 1) }) };
    m.$('#g5').onclick = pw; m.$('#g4').onkeydown = function(e){ if (e.key === 'Enter') pw() };
  });
}

/* חלון בחירת תשלום. מחזיר הבטחה: true אם שולם, false אם סגרו */
function openPay(info, why, locked){
  return new Promise(function(done){
    var h = '<h3>להורדה צריך תשלום</h3><p class="hint">' + esc(why) + '</p>';
    if (locked && locked.length) h += '<p><b>כלול בתשלום:</b> ' + locked.map(esc).join(', ') + '</p>';
    var opts = [];
    if (info.one) opts.push({ k: 'psingle', t: 'הורדה אחת', d: 'כולל כל היכולות, בלי סימן מים', p: info.one.price });
    info.packs.forEach(function(x){ opts.push({ k: 'ppack', id: x.id, t: x.name || ('חבילה של ' + x.n + ' הורדות'), d: x.n + ' הורדות' + (x.months ? ', תקף ' + x.months + ' חודשים' : '') + (x.desc ? '. ' + x.desc : ''), p: x.price }) });
    info.subs.forEach(function(x){ var q = x.quota ? x.quota + ' הורדות בחודש' : 'הורדות ללא הגבלה'; if (x.pm >= 1) opts.push({ k: 'psub', id: x.id, per: 'm', t: x.name + ' (חודשי)', d: q + (x.desc ? '. ' + x.desc : ''), p: x.pm }); if (x.py >= 1) opts.push({ k: 'psub', id: x.id, per: 'y', t: x.name + ' (שנתי)', d: q + (x.desc ? '. ' + x.desc : ''), p: x.py }) });
    if (!opts.length) h += '<p class="x">אפשרויות התשלום עדיין לא הוגדרו. נסו שוב בקרוב.</p>';
    opts.forEach(function(o, i){ h += '<div class="opt"><span><b>' + esc(o.t) + '</b><small>' + esc(o.d) + '</small></span><button class="b p" type="button" data-i="' + i + '">' + nis(o.p) + '</button></div>' });
    h += '<div class="row"><button class="b" type="button" id="p0">סגירה</button></div>';
    var m = modal(h);
    m.$('#p0').onclick = function(){ m.close(); done(false) };
    m.box.addEventListener('click', function(e){ var b = e.target.closest && e.target.closest('[data-i]'); if (!b) return; var o = opts[+b.dataset.i];
      var go = function(){ m.close(); window.MLPay.open({ title: o.t, sub: nis(o.p) + '. אחרי התשלום ההורדה תימשך אוטומטית.', mailNote: 'לשם יישלח אישור הרכישה', email: meMail(), body: { plan: 'sub', kind: o.k, id: o.id || '', per: o.per || '' }, onPaid: function(){ INFO = null; done(true) } }) };
      if (window.MLPay) go(); else loadScript('/assets/pay.js?v=6').then(function(){ setTimeout(go, 300) }).catch(function(){ m.$('#p0').textContent = 'לא נטען חלון התשלום. סגרו ונסו שוב.' }) });
  });
}

var SID = ''; try { SID = sessionStorage.getItem('ml-pdf-sid') || ''; if (!SID) { SID = Math.random().toString(36).slice(2, 10) + Date.now().toString(36); sessionStorage.setItem('ml-pdf-sid', SID) } } catch (e) { SID = String(Date.now()) }

function noteOf(r){
  var l = r.left || {}, v = r.via;
  if (v === 'FREE') return 'זו הייתה העריכה החינמית שלך. להורדות הבאות בלי סימן מים אפשר לרכוש חבילה, מנוי או הורדה.';
  if (v === 'WM') return 'הקובץ ירד עם סימן מים. להורדה בלי סימן מים אפשר לרכוש הורדה, חבילה או מנוי.';
  if (v === 'SUB' && l.sub && l.sub.left != null) return 'נשארו ' + l.sub.left + ' הורדות החודש במנוי.';
  if (v === 'PACK') return 'נשארו ' + l.pack + ' הורדות בחבילה.';
  return '';
}

/* הבדיקה לפני כל הורדה: { ok, mode: clean | watermark, mark, note, msg } */
async function check(feats, pages, keyHint, again){
  var info = await pub(); if (!info.on) return { ok: true, mode: 'clean' };
  var t = await tok();
  if (!t) { var ok = await openLogin('כדי להוריד צריך להיכנס עם מייל או Google. כך נספור את העריכה החינמית שלכם ונשמור את הרכישות שלכם.'); if (!ok) return { ok: false, msg: 'כדי להוריד צריך להיכנס.' }; t = await tok(); if (!t) return { ok: false, msg: 'הכניסה לא הושלמה.' } }
  var r = await api(t, { a: 'dl', key: SID + ':' + (keyHint || ''), feats: feats, pages: pages });
  if (r._st === 401) { try { localStorage.removeItem(KEY) } catch (e) {} return again ? { ok: false, msg: 'הכניסה פגה. נסו שוב.' } : check(feats, pages, keyHint, true) }
  if (r._st !== 200) return { ok: false, msg: r.message || 'לא הצלחנו לבדוק את הזכאות להורדה. נסו שוב.' };
  if (r.ok) { bal(r.left); return { ok: true, mode: r.mode, mark: r.mark, note: noteOf(r) }; }
  var why = r.locked && r.locked.length ? 'היכולות שבקובץ הזה כלולות רק בתשלום.' : 'העריכה החינמית שלכם נוצלה.';
  var paid = await openPay(info, why, r.locked);
  if (!paid) return { ok: false, msg: '' };
  return check(feats, pages, keyHint, true);
}

/* בבחירת קובץ: אם אין חשבון מחובר, מציעים להיכנס עכשיו (לפני העריכה), כדי שלא יצטרכו לצאת מהדף באמצע */
async function early(){
  var info = await pub(); if (!info.on) return; if (await tok()) return;
  try { if (sessionStorage.getItem('ml-pdf-early')) return; sessionStorage.setItem('ml-pdf-early', '1') } catch (e) {}
  await openLogin('כדי להוריד את הקובץ צריך להיכנס. כדאי להיכנס עכשיו, לפני שמתחילים לערוך. העריכה החינמית הראשונה בלי תשלום.', true);
}

/* חזרה מכניסה עם Google או מקישור במייל: ספריית הכניסה שומרת את החשבון, ואז מנקים את הכתובת */
if (/access_token=|error_description=/.test(location.hash)) {
  sbReady().then(function(sb){ return new Promise(function(res){ var d = 0; sb.auth.onAuthStateChange(function(ev, s){ if (s && !d) { d = 1; res() } }); setTimeout(function(){ if (!d) { d = 1; res() } }, 5000) }) }).then(function(){ history.replaceState(null, '', location.pathname + location.search) }).catch(function(){ history.replaceState(null, '', location.pathname + location.search) });
}

/* כשהמכירה פעילה, נוסח השאלה "זה בחינם?" בדף מתעדכן להסבר המדויק (בלי "בלי סימן מים" ובלי "בלי הרשמה") */
pub().then(function(info){
  if (!info || !info.on) return;
  Array.prototype.forEach.call(document.querySelectorAll('details'), function(d){ var q = d.querySelector('summary'); if (q && /זה בחינם/.test(q.textContent)) { var p = d.querySelector('p'); if (p) p.textContent = 'העריכה עצמה בחינם. לכל מייל יש הורדה אחת בלי תשלום (כניסה עם מייל או Google). אחריה אפשר להוריד עם סימן מים, או לרכוש הורדה בודדת, חבילה או מנוי. יכולות מסוימות כלולות רק בתשלום.' } });
}).catch(function(){});
async function token(){
  var t = await tok(); if (t) return t;
  var ok = await openLogin('כדי לחתום על הקובץ בחתימה מוצפנת צריך להיכנס עם מייל או Google.'); if (!ok) return '';
  return tok();
}
/* שורת יתרה בראש העורך: כמה הורדות נשארו (רק כשהמכירה פעילה והמשתמש מחובר) */
function bal(l){
  if (!l) return; var el = document.getElementById('mlBal');
  if (!el) { var at = document.getElementById('intro'); if (!at || !at.parentNode) return; el = document.createElement('p'); el.id = 'mlBal'; el.setAttribute('role', 'status'); el.style.cssText = 'margin:0 0 12px;padding:8px 14px;border:1px solid #dde2df;border-radius:10px;background:#e4eeec;color:#172126;font-size:15px'; at.parentNode.insertBefore(el, at.nextSibling) }
  var p = [], d = function(t){ return new Date(t).toLocaleDateString('he-IL') };
  if (l.sub) p.push('מנוי ' + l.sub.name + ': ' + (l.sub.left == null ? 'הורדות ללא הגבלה' : 'נשארו ' + l.sub.left + ' הורדות החודש') + ', עד ' + d(l.sub.end));
  if (l.pack > 0) p.push('בחבילה נשארו ' + l.pack + ' הורדות');
  if (l.one > 0) p.push('הורדה בודדת שנרכשה: ' + l.one);
  if (l.free > 0) p.push('העריכה החינמית: נשארו ' + l.free);
  el.textContent = p.length ? 'היתרה שלך: ' + p.join(' · ') : 'אין כרגע הורדות ללא סימן מים. העריכה החינמית נוצלה, וההורדה הבאה תדרוש רכישה.';
}
pub().then(function(info){ if (!info || !info.on) return; return tok().then(function(t){ if (!t) return; return api(t, { a: 'me' }).then(function(r){ if (r && r._st === 200) bal(r.left) }) }) }).catch(function(){});

window.__mlGate = { check: check, early: early, token: token };
})();
