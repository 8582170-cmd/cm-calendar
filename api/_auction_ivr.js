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

function prodSay(s, p, full, nameSaid) {
  const iv = (s.cfg || {}).ivr || {}, y = (p.cfg || {}).y, out = [];
  if (y && iv.path) out.push('f-/' + iv.path + '/' + y);
  else if (!nameSaid) out.push(T('מוצר ' + p.num + ' ' + p.name));
  if (full !== false) out.push(T('מחיר כרטיס ' + nis(p.price) + ((+p.draws || 1) > 1 ? ' ' + p.draws + ' הגרלות' : '')));
  return out;
}
/* הנוסחים שמושמעים בשיחה. מנהל המכירה יכול לשנות כל אחד בלשונית "שלוחה טלפונית" (cfg.ivrtxt). {מכירה} {סכום} {כרטיסים} {חבילה} מתמלאים */
const MSG = {
  welcome: ['פתיחה', 'שלום וברוכים הבאים למכירה הסינית של {מכירה}'],
  closed: ['כשהמכירה סגורה', 'המכירה הסינית של {מכירה} סגורה כרגע'],
  shabbat: ['בשבת ובחג', 'המכירה סגורה בשבת ובחג'],
  repAsk: ['בקשת קוד נציג', 'אם יש בידכם קוד נציג הקישו אותו וסולמית'],
  repSkip: ['דילוג על קוד נציג', 'לדילוג הקישו אפס וסולמית'],
  savedHead: ['למי שיש סל שמור', 'יש לכם סל שמור מההתקשרות הקודמת'],
  savedMenu: ['תפריט הסל השמור', 'להמשך עם הסל להוספה ולתשלום הקישו 1 לשמיעת הסל שוב הקישו 2 לריקון הסל ולהתחלה מחדש הקישו 3'],
  menuPkg: ['תפריט ראשי: חבילה', 'לרכישת חבילה הקישו {מקש}'],
  menuProd: ['תפריט ראשי: בחירת מוצרים', 'לבחירת כרטיסים לפי מספר מוצר הקישו {מקש}'],
  menuAll: ['תפריט ראשי: כל המוצרים', 'לשמיעת כל המוצרים ברצף הקישו {מקש}'],
  menuCart: ['תפריט ראשי: מעבר לסל (כשיש בו כרטיסים)', 'למעבר לסל ולתשלום הקישו 9'],
  navHint: ['הסבר על סולמית וכוכבית (בתחילת השיחה)', 'בכל שלב לחזרה שלב אחורה הקישו אפס ובמקום שמקישים מספר הקישו אפס וסולמית וליציאה לתפריט הראשי של הקו הקישו כוכבית'],
  brwIntroA: ['דפדוף אוטומטי: הסבר לפני המוצר הראשון', 'נשמיע לכם את המוצרים אחד אחרי השני בכל רגע וגם תוך כדי ההקראה לבחירת המוצר הקישו 1 למוצר הקודם 2 למעבר מיידי למוצר הבא 3 ולחזרה לתפריט אפס'],
  brwIntroM: ['דפדוף עם תפריט: הסבר לפני המוצר הראשון', 'נשמיע לכם את המוצרים אחד אחרי השני ואחרי כל מוצר תוכלו לבחור אותו או לעבור למוצר אחר'],
  brwMenu: ['דפדוף עם תפריט: אחרי כל מוצר', 'לבחירת המוצר הקישו 1 למוצר הקודם 2 למוצר הבא 3'],
  brwFirst: ['דפדוף: כשמבקשים מוצר קודם במוצר הראשון', 'זה המוצר הראשון'],
  brwEnd: ['דפדוף: סוף הרשימה', 'זה סוף רשימת המוצרים'],
  afterBrw: ['אחרי בחירת מוצר מהדפדוף והכמות', 'להמשך שמיעת המוצרים מהמוצר שבחרת הקישו 1 לשמיעת המוצרים מההתחלה הקישו 2 למעבר לתשלום הקישו 3'],
  listMore: ['אחרי כל קבוצת מוצרים ברשימה', 'להמשך הרשימה הקישו 1, לחזרה לתפריט הקישו 2, לבחירת מוצר הקישו 3'],
  prodAsk: ['בקשת מספר מוצר', 'הקישו את מספר המוצר וסולמית'],
  prodChosen: ['אחרי הקשת מספר מוצר', 'בחרתם מוצר {מוצר}'],
  prodConfirm: ['אישור המוצר שנבחר', 'לאישור הקישו 1 לבחירת מוצר אחר הקישו 2'],
  qtyChosen: ['אחרי הקשת כמות: פתיחה (אחריה מושמעת הכמות כמספר)', 'בחרתם'],
  qtyUnit: ['אחרי הקשת כמות: המשך', 'כרטיסים למוצר {מוצר}'],
  qtyConfirm: ['אישור הכמות שנבחרה', 'לאישור הקישו 1 לתיקון הכמות הקישו 2'],
  qtyAsk: ['בקשת כמות', 'כמה כרטיסים הקישו את המספר וסולמית'],
  moreMenu: ['אחרי הוספת כרטיסים', 'למוצר נוסף הקישו 1 לסיום ולתשלום הקישו 2 לשמיעת הסל הקישו 3'],
  moreSave: ['אפשרות שמירת הסל', 'לשמירת הסל להתקשרות הבאה הקישו 4'],
  moreEdit: ['אפשרות עריכת הסל', 'לשינוי כמות או הסרה של מוצר הקישו 5'],
  editAsk: ['עריכה: בקשת מוצר', 'הקישו את מספר המוצר שתרצו לשנות וסולמית'],
  editQty: ['עריכה: כמות חדשה', 'הקישו את הכמות החדשה וסולמית להסרת המוצר מהסל הקישו אפס וסולמית'],
  sum: ['סיכום ההזמנה', 'בחרתם {כרטיסים} כרטיסים{חבילה} הסכום לתשלום {סכום}'],
  sumMenu: ['תפריט הסיכום', 'לאישור ולתשלום הקישו 1 לחזרה לסל הקישו 2 לביטול הבחירה ולהתחלה מחדש הקישו 3'],
  payhow: ['תשלום עכשיו או מאוחר', 'לתשלום עכשיו בכרטיס אשראי הקישו 1 להזמנה ותשלום מאוחר יותר הקישו 2'],
  toPay: ['מעבר לתשלום', 'הסכום לתשלום {סכום} מעבירים אתכם לתשלום מאובטח'],
  paidOk: ['התשלום התקבל', 'התשלום התקבל תודה רבה'],
  payFail: ['התשלום נכשל', 'התשלום לא עבר הכרטיסים שבחרתם נשמרו בסל ואפשר להתקשר שוב ולנסות שוב'],
  payCancel: ['התשלום בוטל', 'התשלום בוטל הכרטיסים שבחרתם נשמרו בסל להתקשרות הבאה'],
  later: ['הזמנה לתשלום מאוחר', 'ההזמנה נרשמה הסכום {סכום} הכרטיסים יקבלו מספרים אחרי התשלום לנציגי המכירה תודה רבה ובהצלחה'],
  pending: ['הזמנה שממתינה לנציג', 'ההזמנה נרשמה הסכום {סכום} נציג המכירה יחזור אליכם להשלמת התשלום תודה רבה ובהצלחה'],
  stored: ['הסל נשמר', 'הסל נשמר בהתקשרות הבאה מהטלפון הזה תוכלו לשמוע אותו לערוך ולהוסיף עליו ולהשלים את הרכישה להתראות'],
  end: ['סיום אחרי תשלום', 'בהצלחה']
};
/* פירוק הודעה לחלקים: טקסט קבוע, ומשתנה שמושמע אוטומטית באמצע (סכום, כמות, שם מוצר...). לכל חלק קבוע אפשר להעלות הקלטה */
const PH_RE = /(\{(?:מכירה|סכום|כרטיסים|חבילה|מקש|מוצר)\})/;
function partsOf(text) { return String(text).split(PH_RE).map(x => { const m = /^\{(.+)\}$/.exec(x); return m ? { v: m[1] } : { s: x.trim() }; }); }
function M(s, key, V) {
  const cfg = s.cfg || {}, ia = cfg.ivrAudio || {}, ivp = (cfg.ivr || {}).path, P = partsOf(MSG[key][1]);
  const au = i => { const a = ia[key + '#' + i] || (i === 0 ? ia[key] : null); return a && (a.y || a.mute) ? a : null; };
  /* הקלטה אחת לכל ההודעה: מחליפה את כל הטקסט (גם את הסכום והכמות). או סימון "בלי טקסט": ההודעה לא מושמעת */
  const all = ia[key + '#all'];
  if (all && all.mute) return '';
  if (all && all.y && ivp) return 'f-/' + ivp + '/' + all.y;
  const val = k => V && V[k] != null ? V[k] : k === 'מכירה' ? A().cfgOf(s).title : '';
  /* אם הועלתה הקלטה לחלק כלשהו: החלקים הקבועים בלי הקלטה מושמעים כטקסט, והמשתנים (סכום, כמות...) מושמעים אוטומטית */
  if (P.some((x, i) => x.s && au(i) && (au(i).mute || ivp))) {
    const out = [];
    P.forEach((x, i) => {
      if (x.v) { const v = val(x.v); if (v !== '' && v != null) out.push(x.v === 'כרטיסים' || x.v === 'מקש' ? 'n-' + v : T(v)); }
      else if (x.s) { const a = au(i); if (a && a.mute) return; if (a && a.y && ivp) out.push('f-/' + ivp + '/' + a.y); else out.push(T(x.s)); }
    });
    return out.join('.');
  }
  const own = ((cfg.ivrtxt) || {})[key], txt = String(own || '').trim() || MSG[key][1];
  return T(txt.replace(/\{(מכירה|סכום|כרטיסים|חבילה|מקש|מוצר)\}/g, (x, k) => val(k)));
}
const pkgKey = (k, i) => String(+((k.cfg || {}).key) || i + 1);

/* השחזור: מצב השיחה אחרי כל ההקשות.
   saved = הסל השמור של המתקשר כפי שהיה בתחילת השיחה ({pkg_id, items}), אם יש */
function replay(s, R, ans, saved, mode) {
  const c = A().cfgOf(s), prods = s.products.filter(p => p.active !== false), pkgs = s.pkgs.filter(A().pkgLive);
  const repAsk = w => c.repPhone === w || c.repPhone === 'both', cartOn = (s.cfg || {}).phoneCart !== false;
  const st = { phase: 'menu', cart: [], pkg: null, rep: null, tries: 0, msg: [] };
  if (cartOn && saved) {
    st.cart = (Array.isArray(saved.items) ? saved.items : []).map(x => ({ p: +x.p, n: Math.floor(+x.n) })).filter(x => x.n > 0 && prods.some(p => p.id === x.p));
    st.pkg = saved.pkg_id ? pkgs.find(k => k.id === +saved.pkg_id) || null : null;
  }
  st.hadSaved = !!(st.cart.length || st.pkg);
  /* מה עושה "שמיעת כל המוצרים" בתפריט: list = בקבוצות (כמו קודם), auto = דפדוף אוטומטי, menu = דפדוף עם תפריט אחרי כל מוצר, none = לא מוצג.
     mode (מהכתובת של השלוחה, &mode=) = כניסה ישירה לסוג מסוים: num / list / auto / menu */
  const ivc = (s.cfg || {}).ivr || {}, browse = ['auto', 'menu', 'none'].includes(ivc.browse) ? ivc.browse : 'list';
  mode = ['num', 'list', 'auto', 'menu'].includes(mode) ? mode : '';
  /* מספרי המקשים בתפריט הראשי: בלי חבילות התפריט מתחיל ב-1 */
  const menuKeys = () => { const k = pkgs.length ? { pkg: '1', prod: '2', all: '3' } : { pkg: null, prod: '1', all: '2' }; if (browse === 'none') k.all = null; return k; };
  st.menuKeys = menuKeys;
  const startBrowse = (m, i) => {
    if (!prods.length) { st.msg.push(T('אין מוצרים במכירה')); st.phase = 'menu'; return; }
    if (!st.brSeen) { st.brSeen = true; st.msg.push(M(s, m === 'auto' ? 'brwIntroA' : 'brwIntroM')); }
    st.bm = m; st.bi = Math.max(0, Math.min(prods.length - 1, i || 0)); st.phase = 'brw';
  };
  const entry = m => {
    if (m === 'num') { st.prodFrom = 'menu'; st.phase = 'prod'; }
    else if (m === 'auto' || m === 'menu') startBrowse(m, 0);
    else { st.msg.push(T('המוצרים במכירה')); st.allAt = 0; st.phase = 'allp'; listChunk(); }
  };
  const goHome = () => { if (st.hadSaved) st.phase = 'saved'; else if (mode) entry(mode); else st.phase = 'menu'; };
  const quote = () => C.price(s.products, st.pkg, st.cart);
  const ccOn = !!(((s.cfg || {}).ivr || {}).cc || {}).on, laterOn = c.allowUnpaid && ccOn;
  /* לפני התשלום: אם אפשר גם לשלם בכרטיס בטלפון וגם להזמין בלי תשלום, שואלים */
  const toPay = () => laterOn ? 'payhow' : 'pay';
  const afterRep = ph => { if (ph === 'repA') goHome(); else st.phase = toPay(); };
  const qtyOf = id => st.cart.filter(x => x.p === id).reduce((t, x) => t + x.n, 0);
  const setQty = (id, n) => { st.cart = st.cart.filter(x => x.p !== id); if (n > 0) st.cart.push({ p: id, n }); };
  const hear = () => { const out = []; if (st.pkg) out.push(T('חבילה ' + st.pkg.name)); st.cart.forEach(x => { const p = s.products.find(y => y.id === x.p); if (p) out.push(T(x.n + ' כרטיסים למוצר ' + p.num + ' ' + p.name)); });
    if (!out.length) out.push(T('הסל ריק')); else { const q = quote(); if (!q.error) out.push(T('סך הכל ' + q.count + ' כרטיסים בסכום ' + nis(q.amount))); } return out; };
  st.hear = hear;
  const listChunk = () => {
    const n = Math.max(3, Math.min(30, +(((s.cfg || {}).ivr || {}).listChunk) || 10)), from = st.allAt || 0;
    prods.slice(from, from + n).forEach(p => st.msg.push(...prodSay(s, p)));
    st.allAt = from + n;
    if (st.allAt >= prods.length) { st.msg.push(T('זה סוף רשימת המוצרים')); st.phase = 'menu'; }
  };
  if (repAsk('start')) st.phase = 'repA'; else goHome();
  st.first = st.msg; /* הודעות של הכניסה הישירה (למשל ההסבר לפני הדפדוף), מושמעות אחרי הפתיחה */
  /* אפס = שלב אחורה (סולמית לבד ושקט נשלחים מימות כאותו ערך, ולכן לא משמשים לחזרה). כוכבית = יציאה לשלוחה הראשית של הקו */
  const BACK = { pkg: 'menu', prod: () => st.prodFrom || 'menu', prodok: 'prod', qty: () => st.fromBrw ? 'brw' : 'prodok', qtyok: 'qty', after: 'brw', more: 'menu', edit: 'more', editq: 'edit', editok: 'editq', sum: 'more', payhow: 'sum', allp: 'menu' };
  for (const v0 of ans) {
    const raw = String(v0 == null ? '' : v0).trim(), v = raw.replace(/\D/g, ''), empty = !v && !raw.includes('*'); st.msg = [];
    if (st.phase !== 'repA' && st.phase !== 'repB' && st.phase !== 'bye') {
      if (raw.includes('*')) { st.phase = 'exit'; break; } /* כוכבית: יציאה לשלוחה הראשית של הקו בימות */
      if (v === '0' && st.phase !== 'editq' && BACK[st.phase]) { const b = BACK[st.phase]; st.phase = typeof b === 'function' ? b() : b; continue; }
    }
    if (st.phase === 'repA' || st.phase === 'repB') {
      if (v === '0' || v === '') { if (c.repSkip) { afterRep(st.phase); st.tries = 0; } else st.msg.push(T('צריך להקיש קוד נציג')); continue; }
      const r = R.get(v);
      if (r) { st.rep = r; st.msg.push(T('תודה' + (r.name ? ' הרכישה תירשם על שם ' + r.name : ''))); afterRep(st.phase); st.tries = 0; continue; }
      st.tries++; st.msg.push(T('קוד הנציג לא נמצא'));
      if (st.tries >= 2 && c.repSkip) { st.msg.push(T('ממשיכים בלי קוד נציג')); afterRep(st.phase); st.tries = 0; }
      else if (st.tries >= 3) { st.phase = 'bye'; }
      continue;
    }
    if (st.phase === 'saved') {
      if (v === '1') st.phase = 'more';
      else if (v === '2') st.msg.push(...hear());
      else if (v === '3') { st.cart = []; st.pkg = null; st.hadSaved = false; st.phase = 'menu'; st.msg.push(T('הסל רוקן')); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    /* רשימת כל המוצרים בקבוצות, כדי שהתשובה לימות לא תהיה ארוכה מדי כשיש הרבה מוצרים */
    if (st.phase === 'allp') {
      if (v === '1') listChunk(); else if (v === '2') st.phase = 'menu'; else if (v === '3') { st.prodFrom = 'allp'; st.phase = 'prod'; } else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    /* דפדוף במוצרים, מוצר אחרי מוצר */
    if (st.phase === 'brw') {
      if (v === '1') { const p = prods[st.bi]; st.cur = p; st.fromBrw = true; if (qtyOf(p.id)) st.msg.push(T('יש כבר בסל ' + qtyOf(p.id) + ' כרטיסים למוצר הזה')); st.phase = 'qty'; }
      else if (v === '2') { if (st.bi > 0) st.bi--; else st.msg.push(M(s, 'brwFirst')); }
      else if (v === '3' || (empty && st.bm === 'auto')) { st.bi++; if (st.bi >= prods.length) { st.msg.push(M(s, 'brwEnd')); st.phase = 'menu'; } }
      else if (v === '0') st.phase = 'menu';
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'after') {
      if (v === '1') { st.bi++; if (st.bi >= prods.length) { st.msg.push(M(s, 'brwEnd')); st.phase = 'menu'; } else st.phase = 'brw'; }
      else if (v === '2') { st.bi = 0; st.phase = 'brw'; }
      else if (v === '3') { const q = quote(); if (q.error) st.msg.push(T(q.message || 'לא נבחרו כרטיסים')); else st.phase = 'sum'; }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'menu') {
      const mk = menuKeys();
      if (v === mk.pkg) st.phase = 'pkg';
      else if (v === mk.prod) { st.prodFrom = 'menu'; st.fromBrw = false; st.phase = 'prod'; }
      else if (mk.all && v === mk.all) entry(browse);
      else if (v === '9' && (st.cart.length || st.pkg)) st.phase = 'more';
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'pkg') {
      const i = pkgs.findIndex((k, j) => pkgKey(k, j) === v);
      if (i < 0) { st.msg.push(T('בחירה לא תקינה')); continue; }
      st.pkg = pkgs[i]; st.cart = [];
      if (st.pkg.kind === 'fixed') { st.msg.push(T('בחרתם ' + st.pkg.name + ' אפשר להוסיף כרטיסים נוספים בתשלום רגיל')); st.phase = 'more'; }
      else if (browse === 'auto' || browse === 'menu') { st.msg.push(T('בחרתם ' + st.pkg.name + (st.pkg.kind === 'free' ? ' יש לכם ' + st.pkg.qty + ' כרטיסים לחלוקה' : ' יש לכם ' + nis(st.pkg.credit) + ' לניצול'))); startBrowse(browse, 0); }
      else { st.msg.push(T('בחרתם ' + st.pkg.name + (st.pkg.kind === 'free' ? ' יש לכם ' + st.pkg.qty + ' כרטיסים לחלוקה' : ' יש לכם ' + nis(st.pkg.credit) + ' לניצול'))); st.phase = 'prod'; }
      continue;
    }
    if (st.phase === 'prod') {
      const p = prods.find(x => String(x.num) === v);
      if (!p) { st.msg.push(T('מוצר ' + v + ' לא נמצא')); continue; }
      st.cur = p; st.msg.push(M(s, 'prodChosen', { 'מוצר': p.num + ' ' + p.name })); st.msg.push(...prodSay(s, p, true, true)); st.phase = 'prodok'; continue;
    }
    if (st.phase === 'prodok') {
      if (v === '1') { const p = st.cur; if (qtyOf(p.id)) st.msg.push(T('יש כבר בסל ' + qtyOf(p.id) + ' כרטיסים למוצר הזה')); st.phase = 'qty'; }
      else if (v === '2') st.phase = 'prod';
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'qty') {
      const n = +v, p = st.cur, have = qtyOf(p.id), mx = +((p.cfg || {}).maxPer) || 0;
      if (!(n > 0 && n <= 999)) { st.msg.push(T('כמות לא תקינה')); continue; }
      if (mx && have + n > mx) { st.msg.push(T('אפשר לקנות עד ' + mx + ' כרטיסים למוצר הזה')); continue; }
      st.pend = n; st.msg.push(M(s, 'qtyChosen'), 'n-' + n, M(s, 'qtyUnit', { 'מוצר': p.num + ' ' + p.name })); st.phase = 'qtyok'; continue;
    }
    if (st.phase === 'qtyok') {
      const n = st.pend, p = st.cur, have = qtyOf(p.id);
      if (v === '2') { st.phase = 'qty'; continue; }
      if (v !== '1') { st.msg.push(T('בחירה לא תקינה')); continue; }
      setQty(p.id, have + n); st.phase = st.fromBrw ? 'after' : 'more';
      const q = quote(); st.msg.push(T('נוספו ' + n + ' כרטיסים למוצר ' + p.num));
      if (q.left && q.left.tickets != null && st.pkg) st.msg.push(T(q.left.tickets ? 'נותרו לכם ' + q.left.tickets + ' כרטיסים לחלוקה' : 'ניצלתם את כל הכרטיסים בחבילה'));
      if (q.left && q.left.credit != null && st.pkg) st.msg.push(T(q.left.credit ? 'נותרו לכם ' + nis(q.left.credit) + ' לניצול' : 'ניצלתם את כל החבילה'));
      continue;
    }
    if (st.phase === 'more') {
      if (v === '1') { st.prodFrom = 'more'; st.fromBrw = false; st.phase = 'prod'; }
      else if (v === '2') { const q = quote(); if (q.error) st.msg.push(T(q.message || 'לא נבחרו כרטיסים')); else st.phase = 'sum'; }
      else if (v === '3') st.msg.push(...hear());
      else if (v === '4' && cartOn) st.phase = 'store';
      else if (v === '5' && st.cart.length) st.phase = 'edit';
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'edit') {
      const p = s.products.find(x => String(x.num) === v);
      if (!p || !qtyOf(p.id)) { st.msg.push(T('מוצר ' + v + ' לא נמצא בסל')); st.phase = 'more'; continue; }
      st.cur = p; st.msg.push(T('בסל ' + qtyOf(p.id) + ' כרטיסים למוצר ' + p.num + ' ' + p.name)); st.phase = 'editq'; continue;
    }
    if (st.phase === 'editq') {
      const n = +v, p = st.cur, mx = +((p.cfg || {}).maxPer) || 0;
      if (!(n >= 0 && n <= 999) || v === '') { st.msg.push(T('כמות לא תקינה')); continue; }
      if (mx && n > mx) { st.msg.push(T('אפשר לקנות עד ' + mx + ' כרטיסים למוצר הזה')); continue; }
      st.pend = n; st.phase = 'editok';
      if (n) st.msg.push(M(s, 'qtyChosen'), 'n-' + n, M(s, 'qtyUnit', { 'מוצר': p.num + ' ' + p.name })); else st.msg.push(T('הסרת מוצר ' + p.num + ' מהסל'));
      continue;
    }
    if (st.phase === 'editok') {
      const n = st.pend, p = st.cur;
      if (v === '2') { st.phase = 'editq'; continue; }
      if (v !== '1') { st.msg.push(T('בחירה לא תקינה')); continue; }
      setQty(p.id, n); st.phase = 'more'; st.msg.push(T(n ? 'עודכן ל ' + n + ' כרטיסים למוצר ' + p.num : 'מוצר ' + p.num + ' הוסר מהסל'));
      continue;
    }
    if (st.phase === 'payhow') {
      if (v === '1') st.phase = 'pay'; else if (v === '2') st.phase = 'later'; else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'sum') {
      if (v === '1') st.phase = repAsk('pay') && !st.rep ? 'repB' : toPay();
      else if (v === '2') st.phase = 'more';
      else if (v === '3') { st.cart = []; st.pkg = null; st.phase = 'menu'; st.msg.push(T('הבחירה נמחקה')); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
  }
  st.quote = quote();
  return st;
}

/* הסל השמור בטלפון. base = מצב הסל בתחילת השיחה הנוכחית, כדי שהשחזור יתחיל תמיד מאותה נקודה */
async function cartRow(s, ph) { if (!ph) return null; const L = await db('auction_cart?sale_id=eq.' + s.id + '&phone=eq.' + ph + '&select=*&limit=1').catch(() => []); return (L && L[0]) || null; }
const startOf = (row, call) => !row ? null : row.call_id === call ? row.base : { pkg_id: row.pkg_id, items: row.items };
async function saveCart(s, ph, call, row, st) {
  if (!ph) return;
  if (!st.cart.length && !st.pkg) return dropCart(s, ph);
  const base = row ? (row.call_id === call ? row.base : { pkg_id: row.pkg_id, items: row.items }) : null;
  await db('auction_cart', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ sale_id: s.id, phone: ph, pkg_id: st.pkg ? st.pkg.id : null, items: st.cart, base, call_id: call, updated_at: new Date().toISOString() }) });
}
async function dropCart(s, ph) { if (ph) await db('auction_cart?sale_id=eq.' + s.id + '&phone=eq.' + ph, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }).catch(() => {}); }


/* ===== שלוחת נציגים (mode=rep): הנציג מקיש את הרכישה של רוכש ששילם לו במזומן =====
   מקשים: קוד נציג, קוד כניסה אישי, ואז רשימה אחת: מספר מוצר * כמות * מספר מוצר * כמות ... וסולמית. כמות לא חובה (כרטיס אחד).
   אחר כך מקריאים את הרשימה לאישור, מקישים את הטלפון של הרוכש, וההזמנה נרשמת על שם הנציג (לפי הרשאתו: שולם / ממתין לאישור).
   גם כאן השחזור הוא מתוך כל ההקשות, וכל הזמנה נוצרת פעם אחת (מזהה קבוע לפי השיחה והמספר הסידורי). */
const BAD = new Map(); /* ניסיונות כושלים לפי מכירה ומתקשר, נגד ניחוש קודים */
const badKey = (s, ph) => s.id + ':' + (ph || '?');
/* ניתוח הרשימה. אם יש מוצר עם מספר קצר (עד 99) אין דרך להבדיל בינו לבין כמות, ולכן נדרשים זוגות מלאים של מוצר וכמות */
function parseItems(raw, prods) {
  const toks = String(raw || '').split('*').map(x => x.replace(/\D/g, '')).filter(Boolean), by = new Map(prods.map(p => [String(p.num), p]));
  if (!toks.length) return { error: 'לא הוקשה רשימה' };
  const L = [], add = (p, n) => { const e = L.find(x => x.p === p.id); if (e) e.n += n; else L.push({ p: p.id, n, prod: p }); };
  if (prods.some(p => +p.num < 100)) {
    if (toks.length % 2) return { error: 'במכירה הזאת מקישים מספר מוצר, כוכבית וכמות, לכל מוצר' };
    for (let i = 0; i < toks.length; i += 2) { const p = by.get(String(+toks[i])), n = +toks[i + 1]; if (!p) return { error: 'מוצר מספר ' + toks[i] + ' לא נמצא' }; if (!(n >= 1 && n <= 99)) return { error: 'כמות לא תקינה' }; add(p, n); }
  } else {
    let cur = null;
    for (const t of toks) {
      const p = by.get(String(+t));
      if (p) { add(p, 1); cur = L.find(x => x.p === p.id); cur.fresh = true; }
      else if (cur && cur.fresh && +t >= 1 && +t <= 99) { cur.n += +t - 1; cur.fresh = false; }
      else return { error: 'מוצר מספר ' + t + ' לא נמצא' };
    }
  }
  return { items: L.map(x => ({ p: x.p, n: x.n })), lines: L };
}
function repReplay(s, R, ans, ph) {
  const c = A().cfgOf(s), prods = s.products.filter(p => p.active !== false);
  const st = { phase: 'code', tries: 0, jobs: [], cur: null, rep: null, msg: [], fail: '' };
  const perm = r => ['off', 'pending', 'paid'].includes(r.perm) ? r.perm : c.repOrders;
  const nameOn = c.repName !== 'off';
  const finish = (phone, name) => { st.jobs.push({ items: st.cur.items, phone, name, quote: st.cur.quote, lines: st.cur.lines }); st.cur = null; st.phase = 'done'; };
  /* רכישה של הנציג לעצמו: הטלפון נלקח מזיהוי המתקשר (ואם אין, מקישים), והשם הוא שם הנציג */
  const selfOrPhone = () => {
    if (st.how !== 'self') { st.phase = 'phone'; return; }
    const ph1 = A().phoneN(String(ph || '').replace(/\D/g, '')), nm = st.rep.name || '';
    if (!ph1) { st.msg.push(T('לא זוהה מספר המתקשר')); st.phase = 'phone'; return; }
    st.buyer = { phone: ph1, name: nm }; if (nm || !nameOn) finish(ph1, nm); else st.phase = 'name';
  };
  for (const v0 of ans) {
    const raw = String(v0 == null ? '' : v0).trim(), v = raw.replace(/\D/g, ''); st.msg = []; st.fail = '';
    if (st.phase === 'code') {
      const r = v ? R.find(x => String(x.code) === String(+v) || String(x.code) === v) : null;
      if (!r) { st.msg.push(T('קוד הנציג לא נמצא')); st.fail = 'code'; if (++st.tries >= 3) st.phase = 'bye'; continue; }
      st.rep = r; st.tries = 0;
      if (perm(r) === 'off') { st.msg.push(T('אין לכם הרשאה לרשום הזמנות במכירה הזאת')); st.phase = 'bye'; continue; }
      if (!r.pin) { st.msg.push(T('לא הוגדר לכם קוד כניסה אישי. פנו למנהל המכירה')); st.phase = 'bye'; continue; }
      st.phase = 'pin'; continue;
    }
    if (st.phase === 'pin') {
      if (v && v === String(st.rep.pin)) { st.phase = 'menu'; st.tries = 0; st.msg.push(T('שלום ' + (st.rep.name || ''))); continue; }
      st.msg.push(T('קוד הכניסה שגוי')); st.fail = 'pin'; if (++st.tries >= 3) st.phase = 'bye'; continue;
    }
    if (st.phase === 'menu') {
      if (v === '1') { st.how = 'list'; st.phase = 'items'; } else if (v === '2') { st.how = 'guided'; st.g = []; st.phase = 'gprod'; }
      else if (v === '3') { st.how = 'self'; st.g = []; st.phase = 'gprod'; } else if (raw === '0') st.phase = 'bye'; else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'items') {
      if (raw === '0') { st.phase = 'menu'; continue; }
      const P = parseItems(raw, prods);
      if (P.error) { st.msg.push(T(P.error)); continue; }
      const Q = C.price(s.products, null, P.items);
      if (Q.error) { st.msg.push(T(Q.message || 'הרשימה לא תקינה')); continue; }
      st.cur = { items: P.items, lines: P.lines, quote: Q }; st.phase = 'confirm'; continue;
    }
    /* הזנה מודרכת, כמו רוכש רגיל: מספר מוצר, שמיעת שם המוצר, כמות, ועוד מוצר או סיום */
    if (st.phase === 'gprod') {
      if (raw === '0') { st.phase = st.g.length ? 'gmore' : 'menu'; continue; }
      const p = prods.find(x => String(x.num) === String(+v));
      if (!v || !p) { st.msg.push(T('מוצר מספר ' + (v || '') + ' לא נמצא')); continue; }
      st.gp = p; st.phase = 'gqty'; continue;
    }
    if (st.phase === 'gqty') {
      if (raw === '0') { st.phase = 'gprod'; continue; }
      const n = +v; if (!(n >= 1 && n <= 99)) { st.msg.push(T('כמות לא תקינה')); continue; }
      const e = st.g.find(x => x.p === st.gp.id); if (e) e.n += n; else st.g.push({ p: st.gp.id, n, prod: st.gp });
      st.gp = null; st.phase = 'gmore'; continue;
    }
    if (st.phase === 'gmore') {
      if (v === '1') st.phase = 'gprod';
      else if (v === '2') {
        const items = st.g.map(x => ({ p: x.p, n: x.n })), Q = C.price(s.products, null, items);
        if (Q.error) { st.msg.push(T(Q.message || 'ההזמנה לא תקינה')); continue; }
        st.cur = { items, lines: st.g.slice(), quote: Q }; st.phase = 'confirm';
      } else if (v === '3') { st.g = []; st.phase = 'menu'; st.msg.push(T('ההזמנה בוטלה')); }
      else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'confirm') {
      if (v === '1') selfOrPhone(); else if (v === '2') { st.cur = null; st.g = []; st.phase = st.how === 'list' ? 'items' : 'menu'; } else st.msg.push(T('בחירה לא תקינה'));
      continue;
    }
    if (st.phase === 'phone') {
      if (raw === '0') { st.phase = 'confirm'; continue; }
      const ph2 = A().phoneN(v); if (!ph2) { st.msg.push(T('מספר הטלפון לא תקין')); continue; }
      st.buyer = { phone: ph2, name: st.how === 'self' ? (st.rep.name || '') : '' };
      if (st.buyer.name || !nameOn) finish(ph2, st.buyer.name); else st.phase = 'name';
      continue;
    }
    if (st.phase === 'name') {
      if (raw === '0') { st.phase = 'phone'; continue; }
      const nm = cleanName(raw); if (nm.length < 2) { st.msg.push(T('השם לא התקבל. נסו שוב')); continue; }
      finish(st.buyer.phone, nm); continue;
    }
    if (st.phase === 'done') { if (v === '1') { st.phase = 'menu'; st.g = []; } else if (v === '2') st.phase = 'bye'; else st.msg.push(T('בחירה לא תקינה')); continue; }
  }
  st.perm = st.rep ? perm(st.rep) : 'off';
  return st;
}
const cleanName = x => String(x || '').replace(/[^\u05d0-\u05eaA-Za-z\s'"\-.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
const lineSay = l => T('מוצר ' + l.prod.num + ' ' + l.prod.name + ' ' + (l.n === 1 ? 'כרטיס אחד' : l.n + ' כרטיסים'));
async function repFlow(s, q, ans, call, ph, out, bye) {
  const R = (await db('auction_rep?sale_id=eq.' + s.id + '&active=is.true&select=id,code,name,pin,perm&limit=5000').catch(() => [])) || [];
  const bk = badKey(s, ph), bd = BAD.get(bk);
  if (bd && bd.n >= 8 && Date.now() - bd.at < 30 * 60e3) return bye(T('נסיונות רבים מדי. נסו שוב מאוחר יותר'));
  const st = repReplay(s, R, ans, ph);
  if (st.fail) BAD.set(bk, { n: ((bd && Date.now() - bd.at < 30 * 60e3) ? bd.n : 0) + 1, at: Date.now() });
  else if (st.phase !== 'code' && st.phase !== 'pin' && st.rep) BAD.delete(bk);
  const next = 'X' + (ans.length + 1), pre = st.msg.filter(Boolean);
  const rd = (parts, max, min, ok, kb) => out('read=' + pre.concat(parts).filter(Boolean).join('.') + '=' + [next, 'no', max, min, kb ? 30 : 12, kb || 'NO', 'no', 'no', '', kb ? '' : ok ? ok + '.0' : '', '', '', '', '', 'no'].join(','));
  /* רישום ההזמנות שהושלמו (פעם אחת לכל הזמנה) */
  let last = null;
  for (let i = 0; i < st.jobs.length; i++) {
    const j = st.jobs[i], id = 'au' + crypto.createHash('sha256').update(call + ':' + s.slug + ':rp' + i).digest('hex').slice(0, 22);
    let o = (await db('auction_order?id=eq.' + id + '&select=id,amount,status&limit=1').catch(() => []))[0];
    if (!o) {
      const r = await A().makeOrder(s, { items: j.items, repId: st.rep.id, repSrc: 'rep', phone: j.phone, name: j.name || '' }, 'rep', null, id);
      if (r.error) return bye(pre.concat(T(r.message || 'לא הצלחנו לרשום את ההזמנה')));
      o = r.order; const cb = { byRep: st.rep.id, method: 'מזומן', note: 'נרשם בטלפון' };
      await db('auction_order?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: cb }) }).catch(() => {});
      if (st.perm === 'paid') await A().markPaid(id, { txn: 'rep:' + st.rep.code + ':מזומן', callback: cb }).catch(e => console.error('rep phone paid', e.message));
    }
    last = { o, j, id };
  }
  switch (st.phase) {
    case 'bye': return bye(pre.concat(T('להתראות')));
    case 'code': return rd([T('נא להקיש את קוד הנציג שלכם וסולמית')], 8, 1);
    case 'pin': return rd([T('נא להקיש את קוד הכניסה האישי שלכם וסולמית')], 6, 1);
    case 'menu': return rd([T('לרישום רשימה מהירה של מספרי מוצרים הקישו 1. להזנה מודרכת מוצר אחרי מוצר הקישו 2. לרכישה לעצמכם הקישו 3. לסיום הקישו אפס')], 1, 1, '1.2.3');
    case 'gprod': return rd([T(st.g.length ? 'הקישו מספר מוצר נוסף וסולמית' : 'הקישו מספר מוצר וסולמית. לחזרה הקישו אפס')], 5, 1);
    case 'gqty': return rd([T('מוצר ' + st.gp.num + ' ' + st.gp.name), T('הקישו כמות כרטיסים וסולמית')], 3, 1);
    case 'gmore': return rd(st.g.map(lineSay).concat(T('להוספת מוצר הקישו 1. לסיום והמשך הקישו 2. לביטול כל ההזמנה הקישו 3')), 1, 1, '1.2.3');
    case 'name': return rd([T('נא להקיש את שם הרוכש באותיות במקשי הטלפון. בסיום בחרו באפשרות סיום ההקלדה')], 40, 1, '', 'HebrewKeyboard');
    case 'items': { const strict = s.products.some(p => p.active !== false && +p.num < 100); return rd([T(st.jobs.length ? 'הקישו את הרשימה של הרוכש הבא' : strict ? 'הקישו מספר מוצר כוכבית כמות, ואחריהם כוכבית ומוצר הבא עם הכמות שלו. בסיום סולמית. לסיום השיחה הקישו אפס וסולמית' : 'הקישו מספר מוצר כוכבית כמות. לכרטיס אחד אפשר לדלג על הכמות. בין מוצר למוצר מקישים כוכבית. בסיום סולמית. לסיום השיחה הקישו אפס וסולמית')], 60, 1); }
    case 'confirm': { const Q = st.cur.quote; return rd(st.cur.lines.map(lineSay).concat(T('סך הכל ' + Q.count + ' כרטיסים ' + nis(Q.amount) + '. לאישור הקישו 1. להקשה מחדש הקישו 2')), 1, 1, '1.2'); }
    case 'phone': return rd([T('נא להקיש את מספר הטלפון של הרוכש וסולמית. לחזרה הקישו אפס')], 10, 1);
    case 'done': {
      const said = [T(st.perm === 'paid' ? 'ההזמנה נרשמה ושולמה' : 'ההזמנה נרשמה וממתינה לאישור מנהל המכירה')];
      if (st.perm === 'paid' && last) { const L = ((await db('auction_ticket?order_id=eq.' + last.id + '&select=serial&order=serial.asc&limit=5000').catch(() => [])) || []).map(x => x.serial); if (L.length === 1) said.push(T('מספר הכרטיס'), 'n-' + L[0]); else if (L.length) said.push(T('מספרי הכרטיסים מ'), 'n-' + L[0], T('עד'), 'n-' + L[L.length - 1]); }
      said.push(T('להזנת רוכש נוסף הקישו 1. לסיום הקישו 2')); return rd(said, 1, 1, '1.2');
    }
  }
  return bye(T('להתראות'));
}

module.exports = async (req, res) => {
  const q = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  const out = t => { res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(t); };
  const bye = parts => out('id_list_message=' + [].concat(parts).filter(Boolean).join('.') + '&go_to_folder=hangup');
  try {
    const s = await A().load(q.s), iv = s && (s.cfg || {}).ivr || {};
    if (!s || !iv.key || String(q.k || '') !== iv.key || iv.on === false) return q.hangup === 'yes' ? out('') : bye(T('השלוחה לא מוגדרת'));
    const call = String(q.ApiCallId || ''), ph = String(q.ApiPhone || '').replace(/\D/g, ''), cartOn = (s.cfg || {}).phoneCart !== false;
    const row = cartOn ? await cartRow(s, ph) : null, saved = startOf(row, call);
    const orderId = 'au' + crypto.createHash('sha256').update((call || crypto.randomBytes(8).toString('hex')) + ':' + s.slug).digest('hex').slice(0, 22);
    /* ניתוק באמצע: הסל נשמר אוטומטית להתקשרות הבאה (אם לא נוצרה הזמנה בשיחה הזאת) */
    if (q.hangup === 'yes' && q.mode === 'rep') return out('');
    if (q.hangup === 'yes') {
      const ans0 = []; for (let i = 1; i <= 1500 && q['X' + i] != null; i++) ans0.push(q['X' + i]);
      if (cartOn && ph && ans0.length) { const o0 = (await db('auction_order?id=eq.' + orderId + '&select=id&limit=1').catch(() => []))[0];
        if (!o0) { const st0 = replay(s, await reps(s), ans0, saved, q.mode); await saveCart(s, ph, call, row, st0).catch(e => console.error('cart save', e.message)); } }
      return out('');
    }
    if (await require('./_shabbat').closedNow(req, await require('./_lib').loadConfig())) return bye(M(s, 'shabbat'));
    const c = A().cfgOf(s);
    const noteParts = () => c.notes.filter(n => n.phone && A().noteLive(n, Date.now())).map(n => T(n.phoneText || n.text.replace(/[.=&"<>-]/g, ' ')));
    if (!A().isOpen(s)) return bye([M(s, 'closed')].concat(noteParts()).join('.'));
    const ans = []; for (let i = 1; i <= 1500 && q['X' + i] != null; i++) ans.push(q['X' + i]);
    if (q.mode === 'rep') return await repFlow(s, q, ans, call, ph, out, bye);
    const st = replay(s, await reps(s), ans, saved, q.mode), next = 'X' + (ans.length + 1);
    const pre = ans.length ? st.msg : [M(s, 'welcome')].concat(noteParts(), [M(s, 'navHint')], st.first || []);
    /* הפרמטרים של read בימות: שם, שימוש בערך קיים, מקסימום ספרות, מינימום, שניות המתנה, השמעת ההקשה, חסימת כוכבית (no = כוכבית מגיעה אלינו),
       חסימת אפס, החלפת תו, מקשים מותרים, מספר ניסיונות, קבלת הקשה ריקה (Ok = סולמית לבד או שקט מגיעים כערך ריק), הערך בריק, ... הערך ה-15: no = בלי בקשת אישור אחרי ההקשה */
    /* wait = דפדוף אוטומטי: רק שם מותרת הקשה ריקה (שקט עד סוף ההמתנה = המוצר הבא). בשאר המסכים שקט = "לא הוקשה בחירה" והשאלה חוזרת */
    const rd = (parts, max, min, ok, wait) => out('read=' + pre.concat(parts).filter(Boolean).join('.') + '=' + [next, 'no', max, min, wait || 10, 'NO', 'no', 'no', '', ok ? ok + '.0.*' : '', '', wait ? 'Ok' : '', wait ? 'E' : '', '', 'no'].join(','));
    const pkgs = s.pkgs.filter(A().pkgLive);
    /* חזרה מסליקת האשראי: ההזמנה של השיחה כבר קיימת (והסל כבר עבר אליה), אז הולכים ישר לטיפול בתשלום */
    switch (q.CreditCard_CODE != null ? 'pay' : st.phase) {
      case 'bye': return bye(pre.concat(T('להתראות')));
      case 'exit': { if (cartOn && ph && (st.cart.length || st.pkg)) await saveCart(s, ph, call, row, st).catch(e => console.error('cart save', e.message)); return out('go_to_folder=/'); }
      case 'repA': case 'repB': return rd([M(s, 'repAsk')].concat(c.repSkip ? [M(s, 'repSkip')] : []), 8, 1);
      case 'saved': return rd([M(s, 'savedHead')].concat(st.hear()).concat(M(s, 'savedMenu')), 1, 1, '1.2.3');
      case 'store': await saveCart(s, ph, call, row, st); return bye(pre.concat(M(s, 'stored')));
      case 'payhow': return rd([M(s, 'payhow')], 1, 1, '1.2');
      case 'edit': return rd([M(s, 'editAsk')], 5, 1);
      case 'editq': return rd([M(s, 'editQty')], 3, 1);
      case 'menu': { const mk = st.menuKeys(), hc = st.cart.length > 0 || !!st.pkg; return rd((mk.pkg ? [M(s, 'menuPkg', { 'מקש': mk.pkg })] : []).concat(M(s, 'menuProd', { 'מקש': mk.prod }), mk.all ? [M(s, 'menuAll', { 'מקש': mk.all })] : [], hc ? [M(s, 'menuCart')] : []), 1, 1, [mk.pkg, mk.prod, mk.all, hc ? '9' : null].filter(Boolean).join('.')); }
      case 'brw': { const prods = s.products.filter(p => p.active !== false), p = prods[st.bi], say = p ? prodSay(s, p) : [];
        if (st.bm === 'auto') return rd(say, 1, 1, '1.2.3', Math.max(1, Math.min(8, +iv.browseWait || 2)));
        return rd(say.concat(M(s, 'brwMenu')), 1, 1, '1.2.3'); }
      case 'after': return rd([M(s, 'afterBrw')], 1, 1, '1.2.3');
      case 'pkg': return rd(pkgs.map((k, i) => T('ל' + k.name + ' במחיר ' + nis(k.price) + ' הקישו ' + pkgKey(k, i))), 1, 1);
      case 'allp': return rd([M(s, 'listMore')], 1, 1, '1.2.3');
      case 'prod': return rd([M(s, 'prodAsk')], 5, 1);
      case 'prodok': return rd([M(s, 'prodConfirm')], 1, 1, '1.2');
      case 'qty': return rd([M(s, 'qtyAsk')], 3, 1);
      case 'qtyok': case 'editok': return rd([M(s, 'qtyConfirm')], 1, 1, '1.2');
      case 'more': { const ed = st.cart.length > 0; return rd([M(s, 'moreMenu')].concat(cartOn ? [M(s, 'moreSave')] : [], ed ? [M(s, 'moreEdit')] : []), 1, 1, '1.2.3' + (cartOn ? '.4' : '') + (ed ? '.5' : '')); }
      case 'sum': { const Q = st.quote; return rd([M(s, 'sum', { 'כרטיסים': Q.count, 'חבילה': st.pkg ? ' בחבילת ' + st.pkg.name : '', 'סכום': nis(Q.amount) }), M(s, 'sumMenu')], 1, 1, '1.2.3'); }
      case 'later': case 'pay': {
        const payLater = st.phase === 'later' && q.CreditCard_CODE == null;
        /* ההזמנה נוצרת פעם אחת לכל שיחה (המזהה נגזר ממזהה השיחה, כך שבקשה חוזרת לא יוצרת כפילות) */
        const id = orderId;
        let o = (await db('auction_order?id=eq.' + id + '&select=id,amount,status,callback,items,pkg_id&limit=1').catch(() => []))[0];
        if (!o && q.CreditCard_CODE != null) return bye(T('ההזמנה לא נמצאה'));
        if (!o) {
          const r = await A().makeOrder(s, { pkg: st.pkg ? st.pkg.id : null, items: st.cart, repId: st.rep ? st.rep.id : null, repSrc: 'code', phone: ph, name: '' }, 'phone', null, id);
          if (r.error) return bye(pre.concat(T(r.message || 'לא הצלחנו לרשום את ההזמנה')));
          o = r.order;
          await dropCart(s, ph); /* הסל עבר להזמנה */
          A().notify(s, 'הזמנה חדשה בטלפון', '<p>מתקשר ' + ph + ' הזמין ' + (st.quote.count || '') + ' כרטיסים בסך ' + (+o.amount) + ' ₪.' + (iv.cc && iv.cc.on && !payLater ? ' מועבר לתשלום בטלפון.' : ' ההזמנה ממתינה לתשלום: צריך לחזור אליו ולסמן "שולם" אחרי הגבייה.') + '</p>').catch(() => {});
        }
        const said = o2 => { const L = o2.serials || []; return !L.length ? [] : L.length === 1 ? [T('מספר הכרטיס שלכם'), 'n-' + L[0]] : [T('מספרי הכרטיסים שלכם מ'), 'n-' + L[0], T('עד'), 'n-' + L[L.length - 1]]; };
        const serials = async () => ((await db('auction_ticket?order_id=eq.' + o.id + '&select=serial&order=serial.asc&limit=5000').catch(() => [])) || []).map(x => x.serial);
        if (o.status === 'paid') return bye(pre.concat(T('ההזמנה שולמה תודה רבה')).concat(said({ serials: await serials() })).concat(M(s, 'end')));
        /* חזרה מסליקת האשראי של ימות: CreditCard_CODE */
        const cc = iv.cc || {};
        if (q.CreditCard_CODE != null && cc.on) {
          const code = String(q.CreditCard_CODE).trim(), okL = String(cc.okCodes || '000,OK').toLowerCase().split(',').filter(Boolean);
          const rec = { ...(o.callback || {}), phonecc: { code, all: String(q.CreditCard_All || '').slice(0, 500), at: new Date().toISOString() } };
          if (code === 'GoBack') { await db('auction_order?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', callback: rec }) }).catch(() => {});
            if (cartOn) { await saveCart(s, ph, call + ':f', null, { cart: o.items || [], pkg: o.pkg_id ? { id: o.pkg_id } : null }).catch(() => {}); return bye(M(s, 'payCancel')); }
            return bye(T('התשלום בוטל ההזמנה נשמרה ונציג המכירה יחזור אליכם')); }
          if (okL.includes(code.toLowerCase())) {
            await A().markPaid(o.id, { txn: 'YM-' + (code + '-' + call).slice(0, 60), callback: rec });
            return bye([M(s, 'paidOk')].concat(said({ serials: await serials() })).concat(M(s, 'end')));
          }
          await db('auction_order?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', callback: rec }) }).catch(() => {});
          if (cartOn) { await saveCart(s, ph, call + ':f', null, { cart: o.items || [], pkg: o.pkg_id ? { id: o.pkg_id } : null }).catch(() => {}); return bye(M(s, 'payFail')); }
          return bye(T('התשלום לא עבר ההזמנה נשמרה ונציג המכירה יחזור אליכם'));
        }
        /* סליקת אשראי בטלפון דרך מודול הסליקה של ימות (credit_card) עם הסכום הקבוע של ההזמנה */
        if (payLater) { await db('auction_order?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...(o.callback || {}), later: true } }) }).catch(() => {}); }
        if (payLater) return bye(pre.concat(M(s, 'later', { 'סכום': nis(o.amount) })));
        if (cc.on && cc.type) {
          const sum = Number.isInteger(+o.amount) ? String(+o.amount) : (+o.amount).toFixed(2);
          const P = (s.cfg || {}).pay || {}, K = P.kesher || {};
          /* נדרים פלוס: מספר המוסד בשדה המסוף. קשר: שם המשתמש בשדה המסוף, הסיסמה, ומספר הפרויקט בשדה החנות (לפי התיעוד של ימות) */
          const f = cc.type === 'nedarim_plus' ? { term: cc.terminal || P.mosad || '', pass: cc.password || '', reg: cc.register || '', user: cc.user || '' }
            : cc.type === 'kesherhk' ? { term: cc.terminal || K.userName || '', pass: cc.password || K.password || '', reg: cc.register || '', user: cc.user || '' }
            : { term: cc.terminal || '', pass: cc.password || '', reg: cc.register || '', user: cc.user || '' };
          const v = [cc.type, sum, f.reg, '1', '1', '', f.user, f.term, f.pass, 'all', '', '', '', '', 'GoBack'].map(x => String(x).replace(/[,&=]/g, ''));
          return out('id_list_message=' + pre.concat(M(s, 'toPay', { 'סכום': nis(o.amount) })).filter(Boolean).join('.') + '&credit_card=' + v.join(','));
        }
        /* מעבר לשלוחת סליקה של הארגון (אם הוגדרה). אחרת ההזמנה נשארת ממתינה, ומנהל המכירה משלים אותה */
        if (iv.payPath) return out('id_list_message=' + pre.concat(T('ההזמנה נרשמה הסכום לתשלום ' + nis(o.amount) + ' מעבירים אתכם לתשלום מאובטח')).join('.') + '&go_to_folder=/' + iv.payPath);
        return bye(pre.concat(M(s, 'pending', { 'סכום': nis(o.amount) })));
      }
    }
    return bye(T('שגיאה'));
  } catch (e) { console.error('auction ivr', e.message); return bye(T('אירעה תקלה נסו שוב מאוחר יותר')); }
};
module.exports.replay = replay; module.exports.MSG = MSG; module.exports.partsOf = partsOf;
