/* "העיצובים שלי": שמירת ברכה / הזמנה בחשבון (מי שמחובר באתר), כדי לפתוח אותה שוב ולשנות רק שם.
   נשמר באחסון של החשבון (bucket "calendars", בתיקייה של המשתמש): <uid>/greet/<id>.json ורשימה ב-<uid>/greet/index.json */
(function(){
  'use strict';
  var CFG = window.MYLUACH_CFG || { supabaseUrl: 'https://dhawbefhdxqfmpovgnwn.supabase.co', supabaseKey: 'sb_publishable_MfBSTwi7wc_qSHZwu4GMCw_nvckMkBR' };
  var sbP = null;
  function loadScript(src){ return new Promise(function(ok, bad){ var s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); }); }
  function client(){
    if (!sbP) sbP = (window.supabase ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js').catch(function(){ return loadScript('/cdn/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js'); })).then(function(){
      return window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'myluach-auth' } });
    }).catch(function(){ return null; });
    return sbP;
  }
  function user(){ return client().then(function(sb){ if (!sb) return null; return sb.auth.getSession().then(function(r){ var s = r && r.data && r.data.session; return s && s.user ? { id: s.user.id, email: s.user.email } : null; }); }).catch(function(){ return null; }); }
  var BK = 'calendars';
  function path(u, id){ return u.id + '/greet/' + id + '.json'; }
  function ipath(u){ return u.id + '/greet/index.json'; }
  function readJson(sb, p){ return sb.storage.from(BK).download(p).then(function(r){ return r.data ? r.data.text().then(function(t){ return JSON.parse(t); }) : null; }).catch(function(){ return null; }); }
  function writeJson(sb, p, o){ return sb.storage.from(BK).upload(p, new Blob([JSON.stringify(o)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' }).then(function(r){ if (r.error) throw r.error; }); }
  function ctx(){ return Promise.all([client(), user()]).then(function(a){ if (!a[0] || !a[1]) throw Object.assign(new Error('login'), { login: true }); return { sb: a[0], u: a[1] }; }); }
  /* רשימת העיצובים: { id: { title, tpl, v, kind, updated, thumb } } */
  function list(){ return ctx().then(function(c){ return readJson(c.sb, ipath(c.u)).then(function(ix){ return ix || {}; }); }); }
  function get(id){ return ctx().then(function(c){ return readJson(c.sb, path(c.u, id)); }); }
  function save(id, rec, meta){
    return ctx().then(function(c){
      id = id || ('g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
      rec.updated = new Date().toISOString();
      return writeJson(c.sb, path(c.u, id), rec).then(function(){ return readJson(c.sb, ipath(c.u)); }).then(function(ix){
        ix = ix || {}; ix[id] = Object.assign({}, meta || {}, { updated: rec.updated });
        return writeJson(c.sb, ipath(c.u), ix);
      }).then(function(){ return id; });
    });
  }
  function remove(id){
    return ctx().then(function(c){ return c.sb.storage.from(BK).remove([path(c.u, id)]).catch(function(){}).then(function(){ return readJson(c.sb, ipath(c.u)); }).then(function(ix){ ix = ix || {}; delete ix[id]; return writeJson(c.sb, ipath(c.u), ix); }); });
  }
  /* תמונה קטנה של העיצוב לרשימה */
  function thumb(canvas){ try { var k = 380 / Math.max(canvas.width, canvas.height), c = document.createElement('canvas'); c.width = Math.round(canvas.width * k); c.height = Math.round(canvas.height * k); c.getContext('2d').drawImage(canvas, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); } catch (e) { return ''; } }
  /* שינוי שם ושכפול של עיצוב שמור */
  function rename(id, title){ return ctx().then(function(c){ return readJson(c.sb, ipath(c.u)).then(function(ix){ ix = ix || {}; if (!ix[id]) return; ix[id].title = String(title || '').slice(0, 80); return writeJson(c.sb, ipath(c.u), ix); }); }); }
  function duplicate(id){ return Promise.all([get(id), list()]).then(function(a){ var rec = a[0], m = a[1][id]; if (!rec) throw new Error('missing'); var meta = Object.assign({}, m || {}, { title: ((m && m.title) || 'עיצוב') + ' (עותק)' }); return save(null, rec, meta); }); }
  /* הפרטים האישיים (שמות, חתימה...) נשמרים גם בחשבון, כדי שיופיעו בכל מחשב וטלפון */
  function profileGet(){ return ctx().then(function(c){ return readJson(c.sb, c.u.id + '/greet/profile.json'); }); }
  function profileSave(p){ return ctx().then(function(c){ return writeJson(c.sb, c.u.id + '/greet/profile.json', p || {}); }); }
  /* ממלאים בדפדפן שדות ריקים ממה ששמור בחשבון */
  function profileSync(G){ return user().then(function(u){ if (!u || !G) return null; return profileGet().then(function(acc){ if (!acc) return null; var loc = G.profile(), ch = false; Object.keys(acc).forEach(function(k){ if (acc[k] && !String(loc[k] || '').trim()) { loc[k] = acc[k]; ch = true; } }); if (ch) G.saveProfile(loc); return ch ? loc : null; }); }).catch(function(){ return null; }); }
  /* הרכישות: ברכות והזמנות ששולמו, עם הקישור האישי */
  function purchases(){ return client().then(function(sb){ if (!sb) throw new Error('login'); return sb.auth.getSession(); }).then(function(r){ var s = r && r.data && r.data.session; if (!s) throw Object.assign(new Error('login'), { login: true });
    return fetch('/api/pricing?c=_greetpay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + s.access_token }, body: JSON.stringify({ action: 'mine' }) }).then(function(x){ return x.json().then(function(j){ if (!x.ok) throw new Error(j.error || x.status); return j; }); }); }); }
  /* מנויים וחבילות: הזכאות של המחובר (ent), ושימוש בה לעיצוב (redeem). בלי חשבון: רק מה שאפשר לקנות */
  function gpAuth(body){ return client().then(function(sb){ return sb ? sb.auth.getSession() : null; }).catch(function(){ return null; }).then(function(r){ var s = r && r.data && r.data.session;
    return fetch('/api/pricing?c=_greetpay', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, s ? { Authorization: 'Bearer ' + s.access_token } : {}), body: JSON.stringify(body) }).then(function(x){ return x.json().catch(function(){ return {}; }).then(function(j){ if (!x.ok) throw Object.assign(new Error(j.error || x.status), { msg: j.message, status: x.status }); return j; }); }); }); }
  function ent(){ return gpAuth({ action: 'ent' }); }
  function redeem(body){ return gpAuth(Object.assign({ action: 'redeem' }, body)); }
  function receipt(order){ return gpAuth({ action: 'receipt', order: order }); }
  function cancelAuto(order){ return gpAuth({ action: 'cancelauto', order: order }); }
  function signOut(){ return client().then(function(sb){ return sb && sb.auth.signOut(); }); }
  function loginUrl(){ return '/app.html#login&back=' + encodeURIComponent(location.pathname + location.search + location.hash); }
  window.MyGreets = { user: user, list: list, get: get, save: save, remove: remove, rename: rename, duplicate: duplicate, profileGet: profileGet, profileSave: profileSave, profileSync: profileSync, purchases: purchases, ent: ent, redeem: redeem, cancelAuto: cancelAuto, receipt: receipt, signOut: signOut, thumb: thumb, loginUrl: loginUrl };
})();
