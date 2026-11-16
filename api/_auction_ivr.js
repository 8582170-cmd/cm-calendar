/* מכירה סינית: שלוחת API בימות המשיח.
   כתובת השלוחה (בהגדרות המכירה): /api/pricing?c=_auctionivr&s=<כתובת המכירה>&k=<מפתח>
   בשלוחה בימות: type=api, api_link=<הכתובת>.
   ימות שולחים בכל בקשה את כל ההקשות הקודמות של השיחה (X1, X2, ...). השרת "משחזר" את השיחה מההתחלה לפי ההקשות,
   כך שלא צריך לשמור מצב בין הבקשות, וכל תשובה מגיעה מהר (רק קריאה אחת למסד הנתונים, ששמורה במטמון). */
'use strict';
const crypto = require('node:crypto');
const { db } = require('./_lib');
const A = () => require('./_auction'), C = require('./_auction_core');

const tts = s => String(s || '').replace(/[.=&"<>,]/g, ' ').replace(/[״׳'`]/g, '').replace(/\s+/g, ' ').trim();
const T = s => 't-' + tts(s);
const nis = n => { n = Math.round(+n * 100) / 100; return (Number.isInteger(n) ? n : n.toFixed(2)) + ' שקלים'; };

/* מטמון קצר של המגייסים, לבדיקת קוד נציג בלי לחכות */
const REPS = new Map();
async function reps(s) { const c = REPS.get(s.id); if (c && Date.now() - c.at < 20000) return c.v; const L = await db('auction_rep?sale_id=eq.' + s.id + '&active=is.true&select=id,code,name&limit=5000').catch(() => []); const v = new Map((L || []).map(r => [r.code, r])); REPS.set(s.id, { at: Date.now(), v }); return v; }

function prodSay(s, p, full) {
  const iv = (s.cfg || {}).ivr || {}, y = (p.cfg || {}).y, out = [];
  if (y && iv.path) out.push('f-/' + iv.path + '/' + y);
  else out.push(T('מוצר ' + p.num + ' ' + p.name));
  if (full !== false) out.push(T('מחיר כרטיס ' + nis(p.price) + ((+p.draws || 1) > 1 ? ' ' + p.draws + ' הגרלות' : '')));
  return out;
}
const pkgKey = (k, i) => String(+((k.cfg || {}).key) || i + 1);

/* השחזור: מצב השיחה אחרי כל ההקשות */
function replay(s, R, ans) {
  const c = A().cfgOf(s), prods = s.products.filter(p => p.active !== false), pkgs = s.pkgs.filter(A().pkgLive);
  const repAsk = w => c.repPhone === w || c.repPhone === 'both';
  const st = { phase: repAsk('start') ? 'repA' : 'menu', cart: [], pkg: null, rep: null, tries: 0, msg: [] };
  const quote = () => C.price(s.products, st.pkg, st.cart);
  const afterRep = ph => ph === 'repA' ? 'menu' : 'pay';
  for (const v0 of ans) {
    const v = String(v0 == null ? '' : v0).replace(/\D/g, ''); st.msg = [];
    if (st.phase === 'repA' || st.phase === 'repB') {
      if (v === '0' || v === '') { if (c.repSkip) { st.phase = afterRep(st.phase); st.tries = 0; } else st.msg.push(T('צריך להקיש קוד נציג')); continue; }
      const r = R.get(v);
      if (r) { st.rep = r; st.msg.push(T('תודה' + (r.name ? ' הרכישה תירשם על שם ' + r.name : ''))); st.phase = afterRep(st.phase); st.tries = 0; continue; }
      st.tries++; st.msg.push(T('קוד הנציג לא נמצא'));
      if (st.tries >= 2 && c.repSkip) { st.msg.push(T('ממשיכים בלי קוד נציג')); st.phase = afterRep(st.phase); st.tries = 0; }
      else if (st.tries >= 3) { st.phase = 'bye'; }
      continue;
    }
    if (st.phase === 'menu') {
      if (v === '1' && pkgs.length) st.phase = 'pkg';
      else if (v === '2') st.phase = 'prod';
      else if (v === '3') { st.msg.push(T('המוצרים במכירה')); prods.forEach(p => st.msg.push(...prodSay(s, p))); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'pkg') {
      const i = pkgs.findIndex((k, j) => pkgKey(k, j) === v);
      if (i < 0) { st.msg.push(T('בחירה לא תקינה')); continue; }
      st.pkg = pkgs[i]; st.cart = [];
      if (st.pkg.kind === 'fixed') { st.msg.push(T('בחרתם ' + st.pkg.name + ' אפשר להוסיף כרטיסים נוספים בתשלום רגיל')); st.phase = 'more'; }
      else { st.msg.push(T('בחרתם ' + st.pkg.name + (st.pkg.kind === 'free' ? ' יש לכם ' + st.pkg.qty + ' כרטיסים לחלוקה' : ' יש לכם ' + nis(st.pkg.credit) + ' לניצול'))); st.phase = 'prod'; }
      continue;
    }
    if (st.phase === 'prod') {
      const p = prods.find(x => String(x.num) === v);
      if (!p) { st.msg.push(T('מוצר ' + v + ' לא נמצא')); continue; }
      st.cur = p; st.msg.push(...prodSay(s, p)); st.phase = 'qty'; continue;
    }
    if (st.phase === 'qty') {
      const n = +v, p = st.cur, have = st.cart.filter(x => x.p === p.id).reduce((t, x) => t + x.n, 0), mx = +((p.cfg || {}).maxPer) || 0;
      if (!(n > 0 && n <= 999)) { st.msg.push(T('כמות לא תקינה')); continue; }
      if (mx && have + n > mx) { st.msg.push(T('אפשר לקנות עד ' + mx + ' כרטיסים למוצר הזה')); continue; }
      st.cart.push({ p: p.id, n }); st.phase = 'more';
      const q = quote(); st.msg.push(T('נוספו ' + n + ' כרטיסים למוצר ' + p.num));
      if (q.left && q.left.tickets != null && st.pkg) st.msg.push(T(q.left.tickets ? 'נותרו לכם ' + q.left.tickets + ' כרטיסים לחלוקה' : 'ניצלתם את כל הכרטיסים בחבילה'));
      if (q.left && q.left.credit != null && st.pkg) st.msg.push(T(q.left.credit ? 'נותרו לכם ' + nis(q.left.credit) + ' לניצול' : 'ניצלתם את כל החבילה'));
      continue;
    }
    if (st.phase === 'more') {
      if (v === '1') st.phase = 'prod';
      else if (v === '2') { const q = quote(); if (q.error) st.msg.push(T(q.message || 'לא נבחרו כרטיסים')); else st.phase = 'sum'; }
      else if (v === '3') { if (st.pkg) st.msg.push(T('חבילה ' + st.pkg.name)); st.cart.forEach(x => { const p = s.products.find(y => y.id === x.p); st.msg.push(T(x.n + ' כרטיסים למוצר ' + p.num + ' ' + p.name)); }); if (!st.cart.length && !st.pkg) st.msg.push(T('עוד לא נבחרו כרטיסים')); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'sum') {
      if (v === '1') st.phase = repAsk('pay') && !st.rep ? 'repB' : 'pay';
      else if (v === '2') { st.cart = []; st.pkg = null; st.phase = 'menu'; st.msg.push(T('הבחירה נמחקה')); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
  }
  st.quote = quote();
  return st;
}

module.exports = async (req, res) => {
  const q = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  const out = t => { res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(t); };
  const bye = parts => out('id_list_message=' + [].concat(parts).join('.') + '&go_to_folder=hangup');
  if (q.hangup === 'yes') return out('');
  try {
    const s = await A().load(q.s), iv = s && (s.cfg || {}).ivr || {};
    if (!s || !iv.key || String(q.k || '') !== iv.key || iv.on === false) return bye(T('השלוחה לא מוגדרת'));
    if (await require('./_shabbat').closedNow(req, await require('./_lib').loadConfig())) return bye(T('המכירה סגורה בשבת ובחג'));
    const c = A().cfgOf(s);
    if (!A().isOpen(s)) return bye(T('המכירה הסינית של ' + c.title + ' סגורה כרגע'));
    const ans = []; for (let i = 1; i <= 400 && q['X' + i] != null; i++) ans.push(q['X' + i]);
    const st = replay(s, await reps(s), ans), next = 'X' + (ans.length + 1);
    const pre = ans.length ? st.msg : [T('שלום וברוכים הבאים למכירה הסינית של ' + c.title)];
    const rd = (parts, max, min, ok) => out('read=' + pre.concat(parts).join('.') + '=' + next + ',no,' + max + ',' + min + ',10,NO,yes,no,,' + (ok || ''));
    const pkgs = s.pkgs.filter(A().pkgLive);
    switch (st.phase) {
      case 'bye': return bye(pre.concat(T('להתראות')));
      case 'repA': case 'repB': return rd([T('אם יש בידכם קוד נציג הקישו אותו וסולמית' + (c.repSkip ? ' לדילוג הקישו אפס וסולמית' : ''))], 8, 1);
      case 'menu': return rd([T((pkgs.length ? 'לרכישת חבילה הקישו 1 ' : '') + 'לבחירת כרטיסים לפי מספר מוצר הקישו 2 לשמיעת כל המוצרים ברצף הקישו 3')], 1, 1, pkgs.length ? '1.2.3' : '2.3');
      case 'pkg': return rd(pkgs.map((k, i) => T('ל' + k.name + ' במחיר ' + nis(k.price) + ' הקישו ' + pkgKey(k, i))), 1, 1);
      case 'prod': return rd([T('הקישו את מספר המוצר וסולמית')], 5, 1);
      case 'qty': return rd([T('כמה כרטיסים הקישו את המספר וסולמית')], 3, 1);
      case 'more': return rd([T('למוצר נוסף הקישו 1 לסיום ולתשלום הקישו 2 לשמיעת מה שבחרתם הקישו 3')], 1, 1, '1.2.3');
      case 'sum': { const Q = st.quote; return rd([T('בחרתם ' + Q.count + ' כרטיסים' + (st.pkg ? ' בחבילת ' + st.pkg.name : '') + ' הסכום לתשלום ' + nis(Q.amount)), T('לאישור הקישו 1 לביטול הבחירה ולהתחלה מחדש הקישו 2')], 1, 1, '1.2'); }
      case 'pay': {
        /* ההזמנה נוצרת פעם אחת לכל שיחה (המזהה נגזר ממזהה השיחה, כך שבקשה חוזרת לא יוצרת כפילות) */
        const call = String(q.ApiCallId || ''), id = 'au' + crypto.createHash('sha256').update((call || crypto.randomBytes(8).toString('hex')) + ':' + s.slug).digest('hex').slice(0, 22);
        const ph = String(q.ApiPhone || '').replace(/\D/g, '');
        let o = (await db('auction_order?id=eq.' + id + '&select=id,amount,status,callback&limit=1').catch(() => []))[0];
        if (!o) {
          const r = await A().makeOrder(s, { pkg: st.pkg ? st.pkg.id : null, items: st.cart, repId: st.rep ? st.rep.id : null, repSrc: 'code', phone: ph, name: '' }, 'phone', null, id);
          if (r.error) return bye(pre.concat(T(r.message || 'לא הצלחנו לרשום את ההזמנה')));
          o = r.order;
          A().notify(s, 'הזמנה חדשה בטלפון', '<p>מתקשר ' + ph + ' הזמין ' + (st.quote.count || '') + ' כרטיסים בסך ' + (+o.amount) + ' ₪.' + (iv.cc && iv.cc.on ? ' מועבר לתשלום בטלפון.' : ' ההזמנה ממתינה לתשלום: צריך לחזור אליו ולסמן "שולם" אחרי הגבייה.') + '</p>').catch(() => {});
        }
        const said = o2 => { const L = o2.serials || []; return !L.length ? [] : L.length === 1 ? [T('מספר הכרטיס שלכם'), 'n-' + L[0]] : [T('מספרי הכרטיסים שלכם מ'), 'n-' + L[0], T('עד'), 'n-' + L[L.length - 1]]; };
        const serials = async () => ((await db('auction_ticket?order_id=eq.' + o.id + '&select=serial&order=serial.asc&limit=5000').catch(() => [])) || []).map(x => x.serial);
        if (o.status === 'paid') return bye(pre.concat(T('ההזמנה שולמה תודה רבה')).concat(said({ serials: await serials() })).concat(T('בהצלחה')));
        /* חזרה מסליקת האשראי של ימות: CreditCard_CODE */
        const cc = iv.cc || {};
        if (q.CreditCard_CODE != null && cc.on) {
          const code = String(q.CreditCard_CODE).trim(), okL = String(cc.okCodes || '000,0,OK,Success').toLowerCase().split(',').filter(Boolean);
          const rec = { ...(o.callback || {}), phonecc: { code, all: String(q.CreditCard_All || '').slice(0, 500), at: new Date().toISOString() } };
          if (code === 'GoBack') { await db('auction_order?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: rec }) }).catch(() => {});
            return bye(T('התשלום בוטל ההזמנה נשמרה ונציג המכירה יחזור אליכם')); }
          if (okL.includes(code.toLowerCase())) {
            await A().markPaid(o.id, { txn: 'YM-' + (code + '-' + call).slice(0, 60), callback: rec });
            return bye([T('התשלום התקבל תודה רבה')].concat(said({ serials: await serials() })).concat(T('בהצלחה')));
          }
          await db('auction_order?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', callback: rec }) }).catch(() => {});
          return bye(T('התשלום לא עבר ההזמנה נשמרה ונציג המכירה יחזור אליכם'));
        }
        /* סליקת אשראי בטלפון דרך מודול הסליקה של ימות (credit_card) עם הסכום הקבוע של ההזמנה */
        if (cc.on && cc.type) {
          const sum = Number.isInteger(+o.amount) ? String(+o.amount) : (+o.amount).toFixed(2);
          const v = [cc.type, sum, cc.register || '', '1', '1', '', cc.user || '', cc.terminal || '', cc.password || '', 'all', '', '', '', '', 'GoBack'].map(x => String(x).replace(/[,&=]/g, ''));
          return out('id_list_message=' + pre.concat(T('הסכום לתשלום ' + nis(o.amount) + ' מעבירים אתכם לתשלום מאובטח')).join('.') + '&credit_card=' + v.join(','));
        }
        /* מעבר לשלוחת סליקה של הארגון (אם הוגדרה). אחרת ההזמנה נשארת ממתינה, ומנהל המכירה משלים אותה */
        if (iv.payPath) return out('id_list_message=' + pre.concat(T('ההזמנה נרשמה הסכום לתשלום ' + nis(o.amount) + ' מעבירים אתכם לתשלום מאובטח')).join('.') + '&go_to_folder=/' + iv.payPath);
        return bye(pre.concat(T('ההזמנה נרשמה הסכום ' + nis(o.amount) + ' נציג המכירה יחזור אליכם להשלמת התשלום תודה רבה ובהצלחה')));
      }
    }
    return bye(T('שגיאה'));
  } catch (e) { console.error('auction ivr', e.message); return bye(T('אירעה תקלה נסו שוב מאוחר יותר')); }
};
module.exports.replay = replay;
