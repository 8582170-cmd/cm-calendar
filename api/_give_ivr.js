/* אתר התרמה: שלוחת API בימות המשיח.
   כתובת השלוחה (מוצגת בניהול): /api/pricing?c=_giveivr&s=<כתובת הקמפיין>&k=<מפתח>
   כמו במכירה הסינית: ימות שולחים בכל בקשה את כל ההקשות (X1, X2...), והשרת משחזר את השיחה מההתחלה.
   תפריט ראשי: 1 תרומה · 2 מצב הקמפיין · 3 כניסת נציגים (קוד נציג + קוד אישי).
   תרומה: (קוד נציג) → סכום → אישור → תשלום.
   נציג: 1 רישום תרומה (סכום, טלפון התורם, ואז: אשראי עכשיו / התקבל מזומן או צ'ק / התחייבות) · 2 ההתקדמות שלי · 3 מצב הקמפיין.
   תשלום: מודול הסליקה של ימות (credit_card), או מעבר לשלוחת סליקה של הארגון, או התחייבות שממתינה לגבייה. */
'use strict';
const crypto = require('node:crypto');
const { db } = require('./_lib');
const G = () => require('./_give');

const tts = s => String(s || '').replace(/[.=&"<>,]/g, ' ').replace(/[״׳'`]/g, '').replace(/\s+/g, ' ').trim();
const T = s => 't-' + tts(s);
const nis = n => { n = Math.round(+n); return n.toLocaleString('en-US').replace(/,/g, '') + ' שקלים'; };

/* הנוסחים. מנהל הקמפיין יכול לשנות כל אחד (cfg.ivr.txt). {קמפיין} {סכום} {יחס} מתמלאים */
const MSG = {
  welcome: ['פתיחה', 'שלום וברוכים הבאים לקמפיין {קמפיין}'],
  match: ['הכפלה', 'כל תרומה מוכפלת פי {יחס}'],
  menu: ['תפריט ראשי', 'לתרומה הקישו 1 לשמיעת מצב הקמפיין הקישו 2'],
  menuRep: ['תפריט ראשי: נציגים', 'לכניסת נציגים הקישו 3'],
  closed: ['כשאי אפשר לתרום', 'הקמפיין סגור כרגע לתרומות'],
  shabbat: ['בשבת ובחג', 'שבת שלום התרומות ייפתחו מחדש במוצאי שבת'],
  repAsk: ['בקשת קוד נציג מתורם', 'אם יש בידכם קוד נציג הקישו אותו וסולמית לדילוג הקישו אפס וסולמית'],
  amountAsk: ['בקשת סכום', 'הקישו את סכום התרומה בשקלים וסולמית'],
  confirm: ['אישור הסכום', 'תרומה בסך {סכום} לאישור הקישו 1 לתיקון הסכום הקישו 2'],
  toPay: ['מעבר לתשלום', 'מעבירים אתכם לתשלום מאובטח בכרטיס אשראי'],
  paidOk: ['התשלום התקבל', 'התרומה התקבלה תודה רבה ותזכו למצוות'],
  payFail: ['התשלום נכשל', 'התשלום לא עבר אפשר להתקשר שוב ולנסות שוב'],
  pledge: ['התחייבות ללא תשלום בטלפון', 'התרומה בסך {סכום} נרשמה נציג הקמפיין יחזור אליכם להשלמת התשלום תודה רבה'],
  rCode: ['נציג: בקשת קוד נציג', 'הקישו את קוד הנציג שלכם וסולמית'],
  rPin: ['נציג: בקשת קוד אישי', 'הקישו את הקוד האישי שלכם וסולמית'],
  rMenu: ['נציג: תפריט', 'לרישום תרומה הקישו 1 לשמיעת ההתקדמות שלכם הקישו 2 לשמיעת מצב הקמפיין הקישו 3 לסיום הקישו 0'],
  rAmount: ['נציג: סכום התרומה', 'הקישו את סכום התרומה בשקלים וסולמית'],
  rDonor: ['נציג: טלפון התורם', 'הקישו את מספר הטלפון של התורם וסולמית אם אין הקישו אפס וסולמית'],
  rHow: ['נציג: אופן התשלום', 'לתשלום עכשיו בכרטיס אשראי הקישו 1 אם קיבלתם מזומן או צ׳ק הקישו 2 לרישום התחייבות לתשלום מאוחר יותר הקישו 3'],
  rSaved: ['נציג: התרומה נרשמה', 'התרומה בסך {סכום} נרשמה על שמכם'],
  end: ['סיום', 'להתראות']
};
function M(s, key, V) {
  const own = ((((s.cfg || {}).ivr || {}).txt) || {})[key], txt = String(own || '').trim() || MSG[key][1];
  const val = k => V && V[k] != null ? V[k] : k === 'קמפיין' ? G().cfgOf(s).title : '';
  return T(txt.replace(/\{(קמפיין|סכום|יחס)\}/g, (x, k) => val(k)));
}
const ivrOf = s => { const v = (s.cfg || {}).ivr || {}; return { ...v, rep: ['start', 'end', 'off'].includes(v.rep) ? v.rep : 'start', status: v.status !== false, reps: v.reps !== false, repCash: ['paid', 'pending', 'off'].includes(v.repCash) ? v.repCash : 'paid', max: Math.max(100, +v.max || 100000) }; };

/* מה מושמע במצב הקמפיין ובהתקדמות של נציג */
function statusSay(s, st, tm) {
  const c = G().cfgOf(s), out = [T('עד כה נאספו ' + nis(st.total))];
  const goal = c.goal; if (goal) out.push(T('מתוך יעד של ' + nis(goal) + ' שהם ' + Math.floor(st.total / goal * 100) + ' אחוז'));
  if (c.f.donors) out.push(T(st.donors + ' תורמים'));
  if (tm.end && !tm.ended) { const ms = Date.parse(tm.end) - Date.now(), d = Math.floor(ms / 864e5), h = Math.floor(ms % 864e5 / 36e5); out.push(T('נותרו ' + (d ? d + ' ימים ו' : '') + h + ' שעות')); }
  if (c.f.teams && s.teams.length) { const L = s.teams.map(t => [t, (st.team[t.id] || {}).amount || 0]).sort((a, b) => b[1] - a[1]).slice(0, 3).filter(x => x[1] > 0); if (L.length) out.push(T('הקבוצות המובילות ' + L.map((x, i) => 'במקום ' + (i + 1) + ' ' + x[0].name + ' עם ' + nis(x[1])).join(' '))); }
  return out;
}
function repSay(s, st, r) {
  const me = st.rep[r.id] || { amount: 0, count: 0 }, L = s.reps.filter(x => x.active !== false).map(x => (st.rep[x.id] || {}).amount || 0).sort((a, b) => b - a);
  const out = [T((r.name ? r.name + ' ' : '') + 'גייסתם עד כה ' + nis(me.amount) + ' מ' + me.count + ' תורמים')];
  if (+r.goal) out.push(T('מתוך יעד אישי של ' + nis(r.goal) + ' שהם ' + Math.floor(me.amount / r.goal * 100) + ' אחוז'));
  if (me.amount > 0) out.push(T('אתם במקום ' + (L.indexOf(me.amount) + 1) + ' מתוך ' + L.length + ' נציגים'));
  if (r.team_id) { const t = s.teams.find(x => x.id === r.team_id); if (t) out.push(T('הקבוצה שלכם ' + t.name + ' גייסה ' + nis((st.team[t.id] || {}).amount || 0))); }
  return out;
}

/* השחזור: מצב השיחה אחרי כל ההקשות. saveAt = תרומה של נציג שנרשמה בהקשה האחרונה */
function replay(s, ans, ctx) {
  const c = G().cfgOf(s), iv = ivrOf(s), reps = new Map(s.reps.filter(r => r.active !== false).map(r => [r.code, r]));
  const repOn = iv.reps && reps.size > 0;
  const st = { phase: 'menu', amount: 0, rep: null, me: null, donor: '', tries: 0, msg: [], save: null, payBy: null };
  const fromMenu = () => iv.rep === 'start' && reps.size ? 'rep' : 'amount';
  ans.forEach((v0, idx) => {
    const v = String(v0 == null ? '' : v0).replace(/\D/g, ''), last = idx === ans.length - 1; st.msg = [];
    switch (st.phase) {
      case 'menu':
        if (v === '1') { st.phase = fromMenu(); st.payBy = 'donor'; }
        else if (v === '2' && iv.status) st.msg.push(...statusSay(s, ctx.st, ctx.tm));
        else if (v === '3' && repOn) { st.phase = 'rcode'; st.tries = 0; }
        else st.msg.push(T('בחירה לא תקינה'));
        return;
      case 'rep':
        if (v === '0' || v === '') { st.phase = st.amount ? 'pay' : 'amount'; st.tries = 0; return; }
        if (reps.get(v)) { st.rep = reps.get(v); st.msg.push(T('תודה' + (st.rep.name ? ' התרומה תירשם על שם ' + st.rep.name : ''))); st.phase = st.amount ? 'pay' : 'amount'; st.tries = 0; return; }
        st.tries++; st.msg.push(T('קוד הנציג לא נמצא'));
        if (st.tries >= 2) { st.msg.push(T('ממשיכים בלי קוד נציג')); st.phase = st.amount ? 'pay' : 'amount'; st.tries = 0; }
        return;
      case 'amount': case 'ramount': {
        const a = +v;
        if (!(a >= c.min)) { st.msg.push(T('הסכום המינימלי לתרומה ' + nis(c.min))); return; }
        if (a > iv.max && st.phase === 'amount') { st.msg.push(T('לתרומה בסכום כזה נא לפנות למארגני הקמפיין')); return; }
        st.amount = a; st.phase = st.phase === 'amount' ? 'confirm' : 'rdonor'; return;
      }
      case 'confirm':
        if (v === '1') st.phase = iv.rep === 'end' && reps.size && !st.rep ? 'rep' : 'pay';
        else if (v === '2') { st.amount = 0; st.phase = 'amount'; }
        else st.msg.push(T('בחירה לא תקינה'));
        return;
      case 'rcode': {
        const r = reps.get(v);
        if (r && r.pin) { st.me = r; st.phase = 'rpin'; st.tries = 0; return; }
        st.tries++; st.msg.push(T(r ? 'לנציג הזה עדיין לא הוגדר קוד אישי פנו למנהל הקמפיין' : 'קוד הנציג לא נמצא'));
        if (st.tries >= 3 || r) st.phase = 'bye';
        return;
      }
      case 'rpin':
        if (v && v === String(st.me.pin)) { st.phase = 'rmenu'; st.tries = 0; st.msg.push(T('שלום ' + (st.me.name || ''))); return; }
        st.tries++; st.msg.push(T('הקוד האישי שגוי')); if (st.tries >= 3) st.phase = 'bye';
        return;
      case 'rmenu':
        if (v === '1') { st.phase = 'ramount'; st.amount = 0; st.donor = ''; }
        else if (v === '2') st.msg.push(...repSay(s, ctx.st, st.me));
        else if (v === '3') st.msg.push(...statusSay(s, ctx.st, ctx.tm));
        else if (v === '0') st.phase = 'bye';
        else st.msg.push(T('בחירה לא תקינה'));
        return;
      case 'rdonor':
        st.donor = v === '0' ? '' : /^0\d{8,9}$/.test(v) ? v : null;
        if (st.donor === null) { st.donor = ''; st.msg.push(T('המספר לא תקין')); return; }
        st.phase = 'rhow'; return;
      case 'rhow':
        if (v === '1' && ctx.ccOn) { st.rep = st.me; st.payBy = 'rep'; st.phase = 'pay'; return; }
        if ((v === '2' && iv.repCash !== 'off') || v === '3') { st.save = { at: idx, kind: v === '2' ? 'cash' : 'pledge', amount: st.amount, donor: st.donor, last }; st.msg.push(M(s, 'rSaved', { 'סכום': nis(st.amount) })); st.phase = 'rmenu'; return; }
        st.msg.push(T('בחירה לא תקינה')); return;
    }
  });
  return st;
}

module.exports = async (req, res) => {
  const q = { ...(req.query || {}), ...(req.body && typeof req.body === 'object' ? req.body : {}) };
  const out = t => { res.statusCode = 200; res.setHeader('Content-Type', 'text/plain; charset=utf-8'); res.end(t); };
  const bye = parts => out('id_list_message=' + [].concat(parts).filter(Boolean).join('.') + '&go_to_folder=hangup');
  try {
    if (q.hangup === 'yes') return out('');
    const s = await G().load(q.s), iv = s ? ivrOf(s) : {};
    if (!s || !iv.key || String(q.k || '') !== iv.key || iv.on === false) return bye(T('השלוחה לא מוגדרת'));
    const c = G().cfgOf(s), st0 = await G().stats(s), tm = await G().timing(s, c, st0), cc = iv.cc || {};
    const call = String(q.ApiCallId || '') || crypto.randomBytes(8).toString('hex'), ph = String(q.ApiPhone || '').replace(/\D/g, '');
    const idOf = tag => 'gv' + crypto.createHash('sha256').update(call + ':give:' + s.slug + ':' + tag).digest('hex').slice(0, 22);
    const ans = []; for (let i = 1; i <= 120 && q['X' + i] != null; i++) ans.push(q['X' + i]);
    const st = replay(s, ans, { st: st0, tm, ccOn: !!(cc.on && cc.type) }), next = 'X' + (ans.length + 1);
    const pre = ans.length ? st.msg : [M(s, 'welcome')].concat(c.match.on ? [M(s, 'match', { 'יחס': String(c.match.ratio).replace('.', ' נקודה ') })] : []);
    const rd = (parts, max, min, ok) => out('read=' + pre.concat(parts).filter(Boolean).join('.') + '=' + [next, 'no', max, min, 10, 'NO', 'yes', 'no', '', ok || '', '', '', '', '', 'no'].join(','));
    if (tm.shabbat && q.CreditCard_CODE == null) return bye(M(s, 'shabbat'));
    /* תרומה שנציג רשם בהקשה האחרונה: נשמרת פעם אחת (המזהה נגזר מהשיחה ומהמקום בשיחה) */
    if (st.save && st.save.last) {
      const sv = st.save, id = idOf('r' + sv.at), ex = (await db('give_donation?id=eq.' + id + '&select=id&limit=1').catch(() => []))[0];
      if (!ex) {
        const paid = sv.kind === 'cash' && iv.repCash === 'paid', rep = st.me;
        const row = { id, campaign_id: s.id, rep_id: rep ? rep.id : null, team_id: rep && rep.team_id ? rep.team_id : null, amount: sv.amount, months: 1, total: sv.amount, status: 'pending', channel: 'phone', method: sv.kind === 'cash' ? 'מזומן / צ׳ק (נציג)' : 'התחייבות (נציג)', name: 'תורם דרך ' + ((rep && rep.name) || 'נציג'), phone: sv.donor || null };
        await db('give_donation', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(row) });
        if (paid) await G().markPaid(id, { txn: 'REP-' + (rep ? rep.code : '') });
        else G().notifyPhone(s, row).catch(() => {});
      }
    }
    const canGive = tm.can;
    switch (q.CreditCard_CODE != null ? 'pay' : st.phase) {
      case 'bye': return bye(pre.concat(M(s, 'end')));
      case 'menu': return rd([M(s, 'menu')].concat(iv.reps && s.reps.length ? [M(s, 'menuRep')] : []), 1, 1, '1.2' + (iv.reps && s.reps.length ? '.3' : ''));
      case 'rep': case 'amount': case 'confirm':
        if (!canGive) return bye(pre.concat(T(tm.why || ''), M(s, 'end')));
        if (st.phase === 'rep') return rd([M(s, 'repAsk')], 8, 1);
        if (st.phase === 'amount') return rd([M(s, 'amountAsk')], 7, 1);
        return rd([M(s, 'confirm', { 'סכום': nis(st.amount) })], 1, 1, '1.2');
      case 'rcode': return rd([M(s, 'rCode')], 8, 1);
      case 'rpin': return rd([M(s, 'rPin')], 6, 1);
      case 'rmenu': return rd([M(s, 'rMenu')], 1, 1, '0.1.2.3');
      case 'ramount': return rd([M(s, 'rAmount')], 7, 1);
      case 'rdonor': return rd([M(s, 'rDonor')], 10, 1);
      case 'rhow': return rd([M(s, 'rHow')], 1, 1, (cc.on && cc.type ? '1.' : '') + (iv.repCash !== 'off' ? '2.' : '') + '3');
      case 'pay': {
        const id = idOf('pay');
        let d = (await db('give_donation?id=eq.' + id + '&select=*&limit=1').catch(() => []))[0];
        if (!d && q.CreditCard_CODE != null) return bye(T('התרומה לא נמצאה'));
        if (!d) {
          if (!canGive) return bye(pre.concat(T(tm.why || ''), M(s, 'end')));
          d = { id, campaign_id: s.id, rep_id: st.rep ? st.rep.id : null, team_id: st.rep && st.rep.team_id ? st.rep.team_id : null, amount: st.amount, months: 1, total: st.amount, status: 'pending', channel: 'phone', name: st.payBy === 'rep' ? 'תורם דרך ' + (st.rep.name || 'נציג') : 'תורם בטלפון', phone: (st.payBy === 'rep' ? st.donor : ph) || null };
          await db('give_donation', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(d) });
        }
        if (d.status === 'paid') return bye(M(s, 'paidOk'));
        if (q.CreditCard_CODE != null && cc.on) {
          const code = String(q.CreditCard_CODE).trim(), okL = String(cc.okCodes || '000,OK').toLowerCase().split(',').filter(Boolean);
          const rec = { phonecc: { code, all: String(q.CreditCard_All || '').slice(0, 500), at: new Date().toISOString() } };
          if (okL.includes(code.toLowerCase())) { await G().markPaid(d.id, { txn: 'YM-' + (code + '-' + call).slice(0, 60), callback: rec }); return bye([M(s, 'paidOk'), M(s, 'end')]); }
          await db('give_donation?id=eq.' + d.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed', callback: rec }) }).catch(() => {});
          return bye(M(s, 'payFail'));
        }
        if (cc.on && cc.type) {
          const sum = Number.isInteger(+d.amount) ? String(+d.amount) : (+d.amount).toFixed(2), P = (s.cfg || {}).pay || {}, K = P.kesher || {};
          const f = cc.type === 'nedarim_plus' ? { term: cc.terminal || P.mosad || '', pass: cc.password || '', reg: cc.register || '', user: cc.user || '' }
            : cc.type === 'kesherhk' ? { term: cc.terminal || K.userName || '', pass: cc.password || K.password || '', reg: cc.register || '', user: cc.user || '' }
            : { term: cc.terminal || '', pass: cc.password || '', reg: cc.register || '', user: cc.user || '' };
          const v = [cc.type, sum, f.reg, '1', '1', '', f.user, f.term, f.pass, 'all', '', '', '', '', 'GoBack'].map(x => String(x).replace(/[,&=]/g, ''));
          return out('id_list_message=' + pre.concat(M(s, 'toPay')).filter(Boolean).join('.') + '&credit_card=' + v.join(','));
        }
        G().notifyPhone(s, d).catch(() => {});
        if (iv.payPath) return out('id_list_message=' + pre.concat(M(s, 'toPay')).filter(Boolean).join('.') + '&go_to_folder=/' + iv.payPath);
        return bye(pre.concat(M(s, 'pledge', { 'סכום': nis(d.amount) })));
      }
    }
    return bye(T('שגיאה'));
  } catch (e) { console.error('give ivr', e.message); return bye(T('אירעה תקלה נסו שוב מאוחר יותר')); }
};
module.exports.MSG = MSG; module.exports.replay = replay;
