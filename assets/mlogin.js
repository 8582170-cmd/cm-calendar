/* כניסה בתוך הדף (גוגל / קישור במייל / סיסמה), בלי לעבור דרך דף הלוח.
   משמש את דפי ההזמנות. כל קישור שמוביל ל-/app.html#login נתפס וחלון הכניסה נפתח במקומו.
   החזרה מגוגל וממייל חוזרת לאותו דף ואותה כתובת מלאה (כולל ?s=...).
   כתובת החזרה שנשלחת ל-Supabase היא הדף בלבד (בלי פרמטרים), ולכן כל דף כזה צריך להופיע ב-Redirect URLs. */
(function(){
'use strict';
var KEY = 'myluach-auth', BK = 'ml-inv-back', SB = null;
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
function loadScript(src){ return new Promise(function(ok, bad){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s) }) }
function cfg(){ return window.MYLUACH_CFG ? Promise.resolve(window.MYLUACH_CFG) : loadScript('/assets/config.js').then(function(){ return window.MYLUACH_CFG }) }
function loadSb(){ return window.supabase ? Promise.resolve() : loadScript('https://unpkg.com/@supabase/supabase-js@2.45.4/dist/umd/supabase.js').catch(function(){ return loadScript('/cdn/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js') }) }
function sbReady(){ return cfg().then(function(C){ if (!C || !C.supabaseUrl) throw new Error('cfg'); return loadSb().then(function(){ return SB || (SB = window.supabase.createClient(C.supabaseUrl, C.supabaseKey, { auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: KEY } })) }) }) }
function authMsg(e){ var m = String(e && e.message || e || ''); if (/invalid login/i.test(m)) return 'המייל או הסיסמה שגויים. אם אין לכם סיסמה, השתמשו בקישור במייל.'; if (/rate|limit|seconds/i.test(m)) return 'יותר מדי ניסיונות. נסו שוב בעוד כמה דקות.'; if (/provider|not enabled|unsupported/i.test(m)) return 'הכניסה עם Google עדיין לא הופעלה. השתמשו בקישור במייל.'; return 'הכניסה נכשלה. נסו שוב.' }
function mark(){ try { localStorage.setItem(BK, JSON.stringify({ u: location.pathname + location.search, t: Date.now() })) } catch (e) {} }
function back(){ try { var b = JSON.parse(localStorage.getItem(BK) || 'null'); localStorage.removeItem(BK); if (b && b.u && Date.now() - b.t < 900000 && /^\/[^/]/.test(b.u)) return b.u } catch (e) {} return '' }

var CSS = '.mll-back{position:fixed;inset:0;background:rgb(0 0 0/.45);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:20px 12px}.mll{background:#fff;color:#172126;border-radius:18px;max-width:440px;width:100%;padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:0 20px 60px rgb(0 0 0/.3);direction:rtl;font-family:inherit}' +
  '.mll h3{margin:0;font-size:22px}.mll p{margin:0}.mll .hint{color:#5c686c;font-size:15px}.mll label{display:flex;flex-direction:column;gap:4px;font-weight:700;font-size:15px}.mll input{font:inherit;font-weight:400;padding:10px 12px;border:1.5px solid #cfd6d3;border-radius:10px}' +
  '.mll .b{font:inherit;font-weight:800;min-height:46px;padding:8px 18px;border-radius:12px;border:2px solid #1f5c63;background:#fff;color:#1f5c63;cursor:pointer}.mll .b.p{background:#1f5c63;color:#fff}.mll .b:disabled{opacity:.5}.mll .x{min-height:1.3em;font-size:15px}';
function modal(html){
  if (!document.getElementById('mll-css')) { var st = document.createElement('style'); st.id = 'mll-css'; st.textContent = CSS; document.head.appendChild(st) }
  var bk = document.createElement('div'); bk.className = 'mll-back'; bk.innerHTML = '<div class="mll" role="dialog" aria-modal="true">' + html + '</div>'; document.body.appendChild(bk);
  var box = bk.firstChild; return { $: function(s){ return box.querySelector(s) }, close: function(){ bk.remove() } };
}

/* פותח את חלון הכניסה. הבטחה: true אם נכנסו בסיסמה (הדף נטען מחדש), false אם סגרו */
function open(text, note){
  return new Promise(function(done){
    var m = modal('<h3>כניסה</h3><p class="hint">' + esc(text || 'הכניסה בחינם, עם Google או עם קישור במייל. אחרי הכניסה תחזרו לכאן.') + '</p>' +
      '<button class="b p" type="button" id="l1">כניסה עם Google</button>' +
      '<label>מייל<input id="l2" type="email" dir="ltr" autocomplete="email"></label>' +
      '<button class="b" type="button" id="l3">שלחו לי קישור כניסה למייל</button>' +
      '<details><summary style="cursor:pointer;font-size:14px">יש לי סיסמה</summary><label>סיסמה<input id="l4" type="password" dir="ltr" autocomplete="current-password"></label><button class="b" type="button" id="l5" style="margin-top:8px">כניסה עם סיסמה</button></details>' +
      '<p class="x" id="l6" role="alert"></p><button class="b" type="button" id="l7">ביטול</button>');
    var X = m.$('#l6'), say = function(t, bad){ X.textContent = t; X.style.color = bad ? '#b00020' : '#1f5c63' };
    if (note) say(note, 1);
    var mail = function(){ var v = m.$('#l2').value.trim(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { say('נא למלא כתובת מייל תקינה.', 1); m.$('#l2').focus(); return '' } return v };
    var here = location.origin + location.pathname;
    m.$('#l7').onclick = function(){ m.close(); done(false) };
    m.$('#l1').onclick = function(){ say('עוברים לגוגל…'); mark(); sbReady().then(function(sb){ return sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: here, queryParams: { prompt: 'select_account' } } }) }).then(function(r){ if (r && r.error) say(authMsg(r.error), 1) }).catch(function(e){ say(authMsg(e), 1) }) };
    m.$('#l3').onclick = function(){ var v = mail(); if (!v) return; var b = m.$('#l3'); b.disabled = true; say('שולחים…'); mark();
      sbReady().then(function(sb){ return sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: here } }) }).then(function(r){ b.disabled = false; if (r && r.error) return say(authMsg(r.error), 1); say('נשלח! פתחו את המייל ולחצו על הקישור, ותחזרו ישר לכאן. אם הוא לא מגיע תוך דקה, בדקו בספאם.'); b.textContent = 'שליחה חוזרת' }).catch(function(e){ b.disabled = false; say(authMsg(e), 1) }) };
    var pw = function(){ var v = mail(), p = m.$('#l4').value; if (!v) return; if (!p) return say('נא למלא סיסמה.', 1);
      m.$('#l5').disabled = true; say('נכנסים…');
      cfg().then(function(C){ return fetch(C.supabaseUrl.replace(/\/$/, '') + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: C.supabaseKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: v, password: p }) }) })
        .then(function(r){ return r.json().then(function(j){ return { ok: r.ok, j: j } }) }).then(function(o){
          if (!o.ok || !o.j.access_token) { m.$('#l5').disabled = false; return say('המייל או הסיסמה שגויים. אם אין לכם סיסמה, השתמשו בקישור במייל.', 1) }
          try { localStorage.setItem(KEY, JSON.stringify(o.j)) } catch (e) {} m.close(); done(true); location.reload() }).catch(function(){ m.$('#l5').disabled = false; say('תקלת תקשורת. נסו שוב.', 1) }) };
    m.$('#l5').onclick = pw; m.$('#l4').onkeydown = function(e){ if (e.key === 'Enter') pw() };
  });
}
window.MLLogin = { open: open };

/* כל קישור ל-/app.html#login נתפס ופותח את החלון כאן */
document.addEventListener('click', function(e){
  var a = e.target.closest && e.target.closest('a[href^="/app.html#login"]'); if (!a) return;
  if (e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); open();
}, true);

/* חזרה מגוגל / מקישור במייל: שומרים את ההתחברות וחוזרים לכתובת המלאה שממנה יצאו */
(function(){
  var h = location.hash || '';
  if (!/[#&](access_token|error_description)=/.test(h)) return;
  var err = /[#&]error_description=([^&]*)/.exec(h), em = err ? decodeURIComponent(err[1].replace(/\+/g, ' ')) : '';
  var clean = location.pathname + location.search;
  if (em) { try { history.replaceState(null, '', clean) } catch (e) {} localStorage.removeItem(BK); document.addEventListener('DOMContentLoaded', function(){ open('', /expired|invalid/i.test(em) ? 'קישור הכניסה פג תוקף או כבר נוצל. בקשו קישור חדש.' : 'הכניסה נכשלה. נסו שוב.') }); return }
  sbReady().then(function(sb){ return sb.auth.getSession() }).then(function(r){
    var b = back();
    if (b && b !== clean) location.replace(b); else { try { history.replaceState(null, '', clean) } catch (e) {} location.reload() }
  }).catch(function(){ try { history.replaceState(null, '', clean) } catch (e) {} });
})();
})();
