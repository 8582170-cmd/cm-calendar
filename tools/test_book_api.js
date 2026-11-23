/* בדיקת הזרימה המלאה של זימון התורים מול מסד נתונים מדומה בזיכרון: node tools/test_book_api.js
   המסד המדומה מחקה את הדברים ש-PostgREST ו-Supabase עושים כאן: סינון, מיון, ומניעת תורים חופפים באותו משאב (האילוץ ב-supabase_book.sql). */
'use strict';
const assert = require('node:assert');
const path = require('node:path');

process.env.NEDARIM_MOSAD = '1234567'; process.env.NEDARIM_API_VALID = 'abcdef';
const { T, sent, SETTINGS, STATE } = require('./_book_mockdb');
let USER = STATE.user;
let IPN = 0;
const BOOK = require('../api/_book'), K = require('../api/_book_core');

const call = async (body, user) => { if (user !== undefined) USER = user; STATE.user = USER; const res = { headers: {}, setHeader() {}, end() {} }; await BOOK({ method: 'POST', headers: { 'cf-connecting-ip': '10.0.0.' + (++IPN) }, body }, res); return res; };
const ok = async (body, user) => { const r = await call(body, user); assert.strictEqual(r.statusCode, 200, JSON.stringify(body) + ' → ' + r.statusCode + ' ' + JSON.stringify(r.body)); return r.body; };
const bad = async (body, st, err, user) => { const r = await call(body, user); assert.strictEqual(r.statusCode, st, JSON.stringify(body) + ' → ' + r.statusCode + ' ' + JSON.stringify(r.body)); if (err) assert.strictEqual(r.body.error, err); return r.body; };

(async () => {
  /* ===== יצירת עסק ===== */
  await bad({ a: 'mine' }, 401, 'login', null);
  const OWN = { id: 'u-owner', email: 'owner@example.com' };
  SETTINGS.book.open = false; await bad({ a: 'create', name: 'מרכז', slug: 'centre' }, 403, 'closed', OWN); SETTINGS.book.open = true;
  await bad({ a: 'create', name: 'מ', slug: 'centre' }, 400, 'name', OWN); await bad({ a: 'create', name: 'מרכז', slug: 'A' }, 400, 'slug', OWN); await bad({ a: 'create', name: 'מרכז', slug: 'admin' }, 400, 'slug', OWN);
  await ok({ a: 'create', name: 'מרכז השכרה', slug: 'centre' }, OWN); await bad({ a: 'create', name: 'עוד', slug: 'centre' }, 409, 'slug_taken', OWN);
  const mine = await ok({ a: 'mine' }); assert.strictEqual(mine.items.length, 1);
  const SITEADMIN = { id: 'u-site', email: 'site@example.com' };
  assert.strictEqual((await ok({ a: 'mine' }, SITEADMIN)).items.length, 1, 'בעל האתר רואה את כל העסקים'); assert.strictEqual((await ok({ a: 'mine', own: true }, SITEADMIN)).items.length, 0, 'own: רק העסקים שלו'); await bad({ a: 'site' }, 403, 'forbidden', OWN); assert.strictEqual((await ok({ a: 'site' }, SITEADMIN)).admin, true); await bad({ a: 'site', set: { open: true } }, 403, 'forbidden', OWN); await ok({ a: 'mine' }, OWN);
  let g = await ok({ a: 'get', s: 'centre' }); assert.strictEqual(g.role, 'owner'); assert.strictEqual(g.res.length, 1); assert.strictEqual(g.svcs.length, 1);
  await bad({ a: 'get', s: 'centre' }, 403, 'forbidden', { id: 'x', email: 'stranger@example.com' });

  /* ===== הגדרת העסק: קבוצות (קומות), חדרים, שירות, תוספות, שאלון ===== */
  USER = OWN;
  const f1 = (await ok({ a: 'put', s: 'centre', kind: 'group', item: { name: 'קומה 1' } })).item, f2 = (await ok({ a: 'put', s: 'centre', kind: 'group', item: { name: 'קומה 2', adj: { t: 'pct', v: 20 } } })).item;
  /* החדר שנוצר אוטומטית עובר לקומה 1, ועוד שלושה חדרים */
  await ok({ a: 'put', s: 'centre', kind: 'res', item: { id: g.res[0].id, name: 'חדר 1', group_id: f1.id } });
  await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'חדר 2', group_id: f1.id, sort: 2 } });
  await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'חדר 3', group_id: f2.id, sort: 3 } });
  await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'חדר 4', group_id: f2.id, sort: 4, cfg: { adj: { t: 'add', v: 10 } } } });
  const proj = (await ok({ a: 'put', s: 'centre', kind: 'addon', item: { name: 'מקרן', cfg: { price: 30, max: 1 } } })).item;
  const snack = (await ok({ a: 'put', s: 'centre', kind: 'addon', item: { name: 'כיבוד', cfg: { price: 12, max: 6, addMin: 0 } } })).item;
  const form = (await ok({ a: 'put', s: 'centre', kind: 'form', item: { name: 'פרטים', fields: [{ type: 'text', label: 'שם הקבוצה', req: true, perm: true }, { type: 'select', label: 'מספר משתתפים', opts: ['עד 10', 'עד 20'], req: true }, { type: 'long', label: 'הערות' }] } })).item;
  assert.strictEqual(form.fields.length, 3);
  g = await ok({ a: 'get', s: 'centre' });
  const room = g.svcs[0];
  await ok({ a: 'put', s: 'centre', kind: 'svc', item: { id: room.id, name: 'השכרת חדר', cfg: { dur: 60, adj: { on: true, min: 30, max: 180, step: 30 }, ba: 15, price: { unit: 15, per: 40 }, alloc: 'group', groups: [f1.id, f2.id], addons: [proj.id, snack.id], form: form.id, rules: [{ days: [4], from: '18:00', to: '23:00', t: 'set', v: 60 }] } } });
  const pick = (await ok({ a: 'put', s: 'centre', kind: 'svc', item: { name: 'ייעוץ', cfg: { dur: 30, price: { fixed: 100 }, alloc: 'pick', res: [g.res[0].id, g.res[1].id], approval: false, showRes: true } } })).item;
  const appr = (await ok({ a: 'put', s: 'centre', kind: 'svc', item: { name: 'אירוע', cfg: { dur: 60, price: { fixed: 500 }, alloc: 'auto', autoRule: 'least', approval: true, deposit: { t: 'pct', v: 20 }, showRes: false } } })).item;
  await ok({ a: 'save', s: 'centre', status: 'open', cfg: { ...g.biz.cfg, hours: { 0: [['09:00', '18:00']], 1: [['09:00', '18:00']], 2: [['09:00', '18:00']], 3: [['09:00', '18:00']], 4: [['09:00', '23:00']], 5: [], 6: [] }, minNotice: 60, maxAhead: 60, texts: { address: 'רחוב הדוגמה 1', thanks: 'תודה!' },
    consents: [{ text: 'אני מאשר את התקנון', link: 'https://example.com/terms', req: true }, { text: 'אשמח לקבל הצעות', req: false, mkt: true }], notify: { sms: true, email: true, owner: true } } });
  g = await ok({ a: 'get', s: 'centre' });
  assert.strictEqual(g.biz.status, 'open'); assert.strictEqual(g.biz.cfg.consents.length, 2); assert.strictEqual(g.biz.cfg.consents[0].id, 'c1');

  /* ===== תצוגה ציבורית ===== */
  const pv = await ok({ a: 'biz', s: 'centre' }, null);
  assert.strictEqual(pv.svcs.length, 3); assert.strictEqual(pv.groups.length, 2, 'רק קבוצות של שירות שנבחרים בהן'); assert.ok(!JSON.stringify(pv).includes('owner@example.com'), 'אין מיילים של הצוות');
  assert.strictEqual(pv.svcs[0].form.fields.length, 3); assert.ok(pv.svcs[0].form.fields.every(f => f.perm === undefined), 'דגלי פרטיות לא נחשפים');
  assert.strictEqual(pv.res.length, 2, 'רק חדרים שנבחרים בשירות ייעוץ');
  await bad({ a: 'biz', s: 'nope' }, 404, 'none', null);

  /* ===== שעות פנויות ===== */
  const today = K.msToLocal(Date.now(), K.TZ).date; let day = K.addDays(today, 2); while ([5, 6].includes(K.dowOf(day))) day = K.addDays(day, 1);
  const sl = await ok({ a: 'slots', s: 'centre', svc: room.id, from: day, days: 1 }, null);
  const first = sl.days[day]; assert.ok(first.length > 5, 'יש שעות'); const at10 = first.find(x => x.t === '10:00'); assert.ok(at10, '10:00 פנוי');
  assert.deepStrictEqual(at10.g, { [f1.id]: 2, [f2.id]: 2 }, 'שני חדרים בכל קומה'); assert.strictEqual(at10.n, 4);
  assert.strictEqual(at10.gp[f1.id], 160); assert.strictEqual(at10.gp[f2.id], 192, 'קומה 2 יקרה ב-20% (חדר 3): 160*1.2'); assert.strictEqual(sl.dur, 60);
  /* משך ארוך יותר ותוספות */
  const sl2 = await ok({ a: 'slots', s: 'centre', svc: room.id, from: day, days: 1, dur: 90 }, null); assert.strictEqual(sl2.dur, 90);
  await bad({ a: 'slots', s: 'centre', svc: room.id, from: day, days: 1, dur: 100 }, 400, 'dur', null);
  await bad({ a: 'slots', s: 'centre', svc: room.id, dur: 60, addons: [{ id: proj.id, n: 3 }] }, 400, 'addon', null);

  /* ===== קביעת תור ===== */
  const base = { a: 'book', s: 'centre', svc: room.id, start: day + ' 10:00', group: f1.id, name: 'דני כהן', phone: '052-1234567', email: 'dani@example.com', consent: ['c1'], answers: { [form.fields[0].id]: 'המנהלים', [form.fields[1].id]: 'עד 10' }, addons: [{ id: proj.id, n: 1 }, { id: snack.id, n: 2 }] };
  await bad({ ...base, consent: [] }, 400, 'consent', null);
  await bad({ ...base, answers: {} }, 400, 'answer', null);
  await bad({ ...base, phone: '123' }, 400, 'phone', null); await bad({ ...base, name: 'ד' }, 400, 'name', null); await bad({ ...base, group: undefined }, 400, 'group', null);
  await bad({ ...base, start: day + ' 10:07' }, 409, 'taken', null); /* לא על רשת הזמנים */
  const b1 = await ok(base, null);
  assert.strictEqual(b1.status, 'confirmed'); assert.strictEqual(b1.price, 160 + 30 + 24); assert.strictEqual(b1.res, 'חדר 1'); assert.ok(b1.link.includes('/book/centre?m='));
  const b2 = await ok({ ...base, name: 'שרה לוי', phone: '0541112222', consent: ['c1', 'c2'] }, null); assert.strictEqual(b2.res, 'חדר 2');
  /* קומה 1 מלאה בשעה 10:00. גם חפיפה חלקית (10:30) תפוסה */
  await bad({ ...base, phone: '0501234567' }, 409, 'taken', null); await bad({ ...base, start: day + ' 10:30', phone: '0501234567' }, 409, 'taken', null);
  /* קומה 2 עדיין פנויה */
  const b3 = await ok({ ...base, group: f2.id, phone: '0501234567', name: 'משה' }, null); assert.strictEqual(b3.res, 'חדר 3'); assert.strictEqual(b3.price, 192 + 30 + 24);
  const b4 = await ok({ ...base, group: f2.id, phone: '0501230000', name: 'רבקה' }, null); assert.strictEqual(b4.res, 'חדר 4'); assert.strictEqual(b4.price, 160 * 1.2 + 10 * 4 + 54, 'חדר 4: קומה 2 ועוד 10 ₪ ליחידה');
  await bad({ ...base, group: f2.id, phone: '0501239999', name: 'לאה' }, 409, 'taken', null);
  /* ההפסקה אחרי התור (15 דקות): 11:00 בקומה 1 עדיין תפוס, 11:15 פנוי */
  await bad({ ...base, start: day + ' 11:00', phone: '0501239999', name: 'לאה' }, 409, 'taken', null);
  const slAfter = await ok({ a: 'slots', s: 'centre', svc: room.id, from: day, days: 1 }, null); const t = slAfter.days[day];
  assert.ok(!t.find(x => x.t === '10:00'), 'אין יותר 10:00'); assert.ok(!t.find(x => x.t === '10:30')); assert.ok(!t.find(x => x.t === '11:00'), 'ההפסקה');
  assert.ok(t.find(x => x.t === '11:30'), '11:30 פנוי'); assert.ok(!t.find(x => x.t === '09:00'), '09:00 חסום: ההפסקה אחרי התור (עד 10:15) חופפת את התורים של 10:00 בכל החדרים');
  /* שמירת הנתונים: לקוחות ושדה קבוע */
  const cl = await ok({ a: 'custs', s: 'centre' }, OWN); assert.strictEqual(cl.items.length, 4);
  const dani = cl.items.find(c => c.phone === '0521234567'); assert.ok(dani, 'נורמליזציה של טלפון'); assert.strictEqual(Object.values(dani.fields)[0].v, 'המנהלים', 'תשובה קבועה נשמרה בכרטיס'); assert.strictEqual(dani.marketing, false);
  assert.strictEqual(cl.items.find(c => c.phone === '0541112222').marketing, true, 'אישור דיוור');
  /* לקוח חוזר: אותו כרטיס, השדה הקבוע מתעדכן */
  const dayB = K.addDays(day, 1); const b5 = await ok({ ...base, start: day + ' 14:00', answers: { [form.fields[0].id]: 'הצוות', [form.fields[1].id]: 'עד 20' } }, null);
  const cl2 = await ok({ a: 'custs', s: 'centre' }, OWN); assert.strictEqual(cl2.items.length, 4, 'לא נוצר כרטיס כפול'); assert.strictEqual(Object.values(cl2.items.find(c => c.phone === '0521234567').fields)[0].v, 'הצוות');
  /* הודעות */
  assert.ok(sent.mail.some(m => m.to === 'dani@example.com'), 'מייל ללקוח'); assert.ok(sent.mail.some(m => m.to === 'owner@example.com'), 'מייל לבעל העסק'); assert.ok(sent.sms.some(s => s[0] === '0521234567'), 'SMS ללקוח');

  /* ===== הקישור האישי: צפייה וביטול ===== */
  const kk = b1.link.match(/m=([^&]+)&k=(.+)$/), M = { s: 'centre', m: kk[1], k: kk[2] };
  const v = await ok({ a: 'view', ...M }, null); assert.strictEqual(v.svc, 'השכרת חדר'); assert.strictEqual(v.canCancel, true); assert.strictEqual(v.res, 'חדר 1');
  await bad({ a: 'view', ...M, k: 'x'.repeat(24) }, 404, 'none', null); await bad({ a: 'view', ...M, k: 'short' }, 404, 'none', null);
  /* רשימת המתנה: נרשמים ליום, ואז מתפנה תור */
  await ok({ a: 'wait', s: 'centre', day, svc: room.id, name: 'ממתין', phone: '0509998888' }, null); await bad({ a: 'wait', s: 'centre', day: 'x', name: 'ממתין', phone: '0509998888' }, 400, 'bad', null);
  const smsBefore = sent.sms.length; await ok({ a: 'cancel', ...M }, null);
  await new Promise(r => setTimeout(r, 30)); assert.ok(sent.sms.length > smsBefore && sent.sms.some(s => s[0] === '0509998888'), 'הודעה למי שברשימת ההמתנה');
  await bad({ a: 'cancel', ...M }, 400, 'late', null); /* כבר מבוטל: אין מה לבטל */
  const back = await ok({ a: 'slots', s: 'centre', svc: room.id, from: day, days: 1 }, null); assert.ok(back.days[day].find(x => x.t === '10:00'), 'השעה חזרה להיות פנויה אחרי ביטול');

  /* ===== בחירת חדר על ידי הלקוח ===== */
  const ps = await ok({ a: 'slots', s: 'centre', svc: pick.id, from: day, days: 1 }, null); const p10 = ps.days[day].find(x => x.t === '12:00'); assert.deepStrictEqual(p10.r.sort(), g.res.slice(0, 2).map(r => r.id).sort());
  const pb = { a: 'book', s: 'centre', svc: pick.id, start: day + ' 12:00', res: g.res[1].id, name: 'נועה', phone: '0531111111', consent: ['c1'] };
  await bad({ ...pb, res: undefined }, 400, 'res', null); await bad({ ...pb, res: g.res[2].id }, 409, 'taken', null);
  const r1 = await ok(pb, null); assert.strictEqual(r1.res, 'חדר 2'); await bad({ ...pb, phone: '0532222222' }, 409, 'taken', null);

  /* ===== אישור מנהל, מקדמה ושיבוץ אוטומטי לפי עומס ===== */
  const ev = await ok({ a: 'book', s: 'centre', svc: appr.id, start: day + ' 15:00', name: 'אירוע', phone: '0501112233', consent: ['c1'] }, null);
  assert.strictEqual(ev.status, 'pending'); assert.strictEqual(ev.res, '', 'המשאב מוסתר מהלקוח'); assert.ok([500, 600, 540].includes(ev.price), 'המחיר תלוי בחדר שהוקצה: 500 בקומה 1, 600 בקומה 2');
  const ap = await ok({ a: 'appts', s: 'centre', from: day, to: K.addDays(day, 1) }, OWN); assert.ok(ap.items.length >= 5); assert.ok(ap.items.every(a => a.token === undefined), 'הטוקן לא נחשף');
  const evA = ap.items.find(a => a.id === ev.id); assert.strictEqual(evA.pay.due, ev.price * 0.2, 'מקדמה 20%');
  await ok({ a: 'apptSet', s: 'centre', id: ev.id, patch: { status: 'confirmed' } }); /* אישור */
  /* החלפת משאב: לחדר תפוס נדחה */
  await bad({ a: 'apptSet', s: 'centre', id: b3.id, patch: { res_id: g.res.find(r => r.name === 'חדר 4').id } }, 409, 'taken');
  await ok({ a: 'apptSet', s: 'centre', id: ev.id, patch: { note: 'מגיעים עם קייטרינג', paid: 100, price: 550 } });
  const ap2 = (await ok({ a: 'appts', s: 'centre', from: day, to: K.addDays(day, 1) })).items.find(a => a.id === ev.id); assert.strictEqual(ap2.price, 550); assert.strictEqual(ap2.pay.paid, 100); assert.strictEqual(ap2.note, 'מגיעים עם קייטרינג');

  /* ===== תור ידני של פקידה ===== */
  const CLERK = { id: 'u-clerk', email: 'clerk@example.com' };
  await bad({ a: 'manual', s: 'centre', svc: pick.id, start: day + ' 16:00', res: g.res[0].id, name: 'ידני', phone: '0501111110' }, 403, 'forbidden', CLERK);
  await ok({ a: 'save', s: 'centre', cfg: { ...g.biz.cfg, staff: [{ email: 'clerk@example.com', role: 'clerk' }, { email: 'bad', role: 'x' }] } }, OWN);
  g = await ok({ a: 'get', s: 'centre' }); assert.deepStrictEqual(g.biz.cfg.staff, [{ email: 'clerk@example.com', role: 'clerk' }]);
  const mm = await ok({ a: 'manual', s: 'centre', svc: pick.id, start: day + ' 16:20', res: g.res[0].id, name: 'ידני', phone: '0501111110', price: 80 }, CLERK); assert.strictEqual(mm.price, 80); assert.strictEqual(mm.res, 'חדר 1');
  const mg = await ok({ a: 'manual', s: 'centre', svc: room.id, start: day + ' 16:00', name: 'ידני קבוצה', phone: '0501111118' }, CLERK); assert.ok(mg.res, 'תור ידני בלי משאב בשירות של בחירת קבוצה משובץ אוטומטית');
  await bad({ a: 'manual', s: 'centre', svc: pick.id, start: day + ' 16:30', res: g.res[0].id, name: 'עוד', phone: '0501111119' }, 409, 'taken', CLERK);
  await bad({ a: 'save', s: 'centre', name: 'שינוי' }, 403, 'forbidden', CLERK); const cg = await ok({ a: 'get', s: 'centre' }, CLERK); assert.strictEqual(cg.role, 'clerk'); assert.strictEqual(cg.biz.cfg.staff, undefined, 'פקידה לא רואה את הצוות');

  /* ===== שעות סגורות: שבת וחג ===== */
  let sat = K.addDays(today, 1); while (K.dowOf(sat) !== 6) sat = K.addDays(sat, 1);
  const ss = await ok({ a: 'slots', s: 'centre', svc: pick.id, from: sat, days: 1 }, null); assert.deepStrictEqual(ss.days[sat], [], 'שבת סגורה (בלי שעות פעילות)');
  /* שעות פעילות בשבת בכל זאת: השבת עצמה חוסמת */
  await ok({ a: 'save', s: 'centre', cfg: { ...g.biz.cfg, hours: { ...g.biz.cfg.hours, 6: [['09:00', '12:00']] } } }, OWN);
  const ss2 = await ok({ a: 'slots', s: 'centre', svc: pick.id, from: sat, days: 1 }, null); assert.deepStrictEqual(ss2.days[sat], [], 'ביום שבת חסום גם אם הוגדרו שעות');
  await ok({ a: 'save', s: 'centre', cfg: { ...g.biz.cfg, hours: { ...g.biz.cfg.hours, 6: [['09:00', '12:00']] }, shabbat: { on: false } } }, OWN);
  const ss3 = await ok({ a: 'slots', s: 'centre', svc: pick.id, from: sat, days: 1 }, null); assert.ok(ss3.days[sat].length > 0, 'בלי חסימת שבת: פנוי');

  /* ===== מסלולי מחיר: הגדרה בניהול האתר, בחירה על ידי העסק, אכיפה ===== */
  const SA = { id: 'u-site', email: 'site@example.com' };
  const plansSet = (await ok({ a: 'site', set: { open: true, plans: [{ name: 'בלי סליקה', mode: 'none', monthly: 49, perBooking: 0 }, { name: 'סליקה בחשבון שלכם', mode: 'own', monthly: 79, perBooking: 0.5 }, { name: 'סליקה דרך האתר', mode: 'site', monthly: 99, perBooking: 1, pct: 2.5, pub: false }, { name: '', mode: 'x' }] } }, SA)).plans;
  assert.strictEqual(plansSet.length, 3, 'מסלול בלי שם נזרק'); assert.strictEqual(plansSet[2].pub, false); const [pNone, pOwn, pSite] = plansSet;
  await bad({ a: 'site', set: { plans: [] } }, 403, 'forbidden', OWN);
  const g2 = await ok({ a: 'get', s: 'centre' }, OWN); assert.deepStrictEqual(g2.plans.map(p => p.id), [pNone.id, pOwn.id], 'העסק רואה רק מסלולים פומביים');
  await bad({ a: 'pickPlan', s: 'centre', plan: pSite.id }, 400, 'plan', OWN); await bad({ a: 'pickPlan', s: 'centre', plan: 'zzz' }, 400, 'plan');
  await bad({ a: 'pickPlan', s: 'centre', plan: pOwn.id }, 403, 'forbidden', CLERK);
  await ok({ a: 'pickPlan', s: 'centre', plan: pOwn.id }, OWN);
  await ok({ a: 'save', s: 'centre', cfg: { ...(await ok({ a: 'get', s: 'centre' })).biz.cfg, pay: { mode: 'link', url: 'https://pay.example.com/x', require: 'deposit' } } });
  let cf = (await ok({ a: 'get', s: 'centre' })).biz.cfg; assert.strictEqual(cf.plan, pOwn.id, 'שמירת הגדרות לא מוחקת את המסלול'); assert.strictEqual(cf.pay.mode, 'link', 'מסלול עם סליקה מאפשר תשלום');
  await ok({ a: 'pickPlan', s: 'centre', plan: pNone.id }); cf = (await ok({ a: 'get', s: 'centre' })).biz.cfg; assert.strictEqual(cf.pay.mode, 'none', 'מסלול בלי סליקה מכבה תשלום באתר'); assert.strictEqual(cf.pay.require, 'none');
  await bad({ a: 'plan', s: 'centre', plan: pSite.id }, 403, 'forbidden', OWN); await ok({ a: 'plan', s: 'centre', plan: pSite.id }, SA); assert.strictEqual((await ok({ a: 'mine' }, SA)).items[0].plan, pSite.id, 'בעל האתר משייך מסלול גם לא פומבי'); await bad({ a: 'plan', s: 'centre', plan: 'nope' }, 400, 'plan', SA);
  USER = OWN;
  /* ===== לילות וכמויות ===== */
  const nq_hg = (await ok({ a: 'put', s: 'centre', kind: 'group', item: { name: 'מלון' } })).item;
  const nq_rA = (await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'חדר א', group_id: nq_hg.id, cfg: { cap: 4 } } })).item, nq_rB = (await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'חדר ב', group_id: nq_hg.id, cfg: { cap: 2 } } })).item;
  const nq_hotel = (await ok({ a: 'put', s: 'centre', kind: 'svc', item: { name: 'לינה', cfg: { alloc: 'auto', res: [nq_rA.id, nq_rB.id], nights: { on: true, min: 1, max: 7, inT: '15:00', outT: '11:00', price: 300 }, qty: { on: true, max: 4, mult: false, label: 'אורחים' } } } })).item;
  const nq_hs = await ok({ a: 'slots', s: 'centre', svc: nq_hotel.id, from: day, days: 10, nights: 2, qty: 1 }, null); assert.strictEqual(nq_hs.kind, 'nights'); assert.strictEqual(nq_hs.days[day].mx, 7); assert.strictEqual(nq_hs.days[day].pn[2], 600);
  await bad({ a: 'slots', s: 'centre', svc: nq_hotel.id, from: day, nights: 2, qty: 9 }, 400, 'qty', null);
  const nq_hb = { a: 'book', s: 'centre', svc: nq_hotel.id, start: day, nights: 2, qty: 3, name: 'אורח', phone: '0521110040', consent: ['c1'] };
  await bad({ ...nq_hb, nights: 9 }, 400, 'nights', null);
  const nq_h1 = await ok(nq_hb, null); assert.strictEqual(nq_h1.price, 600); assert.strictEqual(nq_h1.nights, 2); assert.strictEqual(T.book_appt.find(x => x.id === nq_h1.id).res_id, nq_rA.id, 'האורחים 3 מתאימים רק לחדר א (עד 4)');
  const nq_h1r = T.book_appt.find(x => x.id === nq_h1.id); assert.strictEqual(new Date(nq_h1r.end_at) - new Date(nq_h1r.start_at), (2 * 24 - 4) * 3600e3, 'כניסה ב-15:00 ויציאה ב-11:00 כעבור לילותיים');
  await bad({ ...nq_hb, phone: '0521110041', qty: 3 }, 409, 'taken', null); /* היחיד שמתאים ל-3 אורחים תפוס */
  const nq_h2 = await ok({ ...nq_hb, phone: '0521110042', qty: 2 }, null); assert.strictEqual(T.book_appt.find(x => x.id === nq_h2.id).res_id, nq_rB.id);
  const nq_dayOut = K.addDays(day, 2); const nq_h3 = await ok({ ...nq_hb, phone: '0521110043', qty: 2, start: nq_dayOut, nights: 1 }, null); assert.ok(nq_h3.id, 'כניסה ביום היציאה של אחר מותרת (15:00 אחרי 11:00)');
  const nq_hs2 = await ok({ a: 'slots', s: 'centre', svc: nq_hotel.id, from: day, days: 4, nights: 1, qty: 3 }, null); assert.strictEqual(nq_hs2.days[day], null, 'אין חדר פנוי ל-3 בימים האלה'); assert.strictEqual(nq_hs2.days[nq_dayOut], null); assert.strictEqual(nq_hs2.days[K.addDays(nq_dayOut, 1)].mx, 7);
  USER = OWN; const nq_tour = (await ok({ a: 'put', s: 'centre', kind: 'res', item: { name: 'סיור', cfg: { cap: 10 } } })).item;
  const nq_ts = (await ok({ a: 'put', s: 'centre', kind: 'svc', item: { name: 'סיור קבוצתי', cfg: { dur: 60, alloc: 'auto', res: [nq_tour.id], price: { fixed: 50 }, qty: { on: true, max: 5, share: true, mult: true, label: 'משתתפים' } } } })).item;
  const nq_tb = { a: 'book', s: 'centre', svc: nq_ts.id, start: day + ' 10:00', name: 'קבוצה', phone: '0521110050', consent: ['c1'], qty: 4 };
  const nq_sl = (await ok({ a: 'slots', s: 'centre', svc: nq_ts.id, from: day, days: 1, qty: 1 }, null)).days[day].find(x => x.t === '10:00'); assert.strictEqual(nq_sl.n, 10); assert.ok(nq_sl.seats);
  const nq_t1 = await ok(nq_tb, null); assert.strictEqual(nq_t1.price, 200, 'מחיר לכל משתתף');
  const nq_t2 = await ok({ ...nq_tb, phone: '0521110051', qty: 5 }, null); assert.strictEqual(nq_t2.price, 250);
  const nq_sl2 = (await ok({ a: 'slots', s: 'centre', svc: nq_ts.id, from: day, days: 1, qty: 1 }, null)).days[day].find(x => x.t === '10:00'); assert.strictEqual(nq_sl2.n, 1, 'נשאר מקום אחד');
  await bad({ ...nq_tb, phone: '0521110052', qty: 2 }, 409, 'taken', null); await bad({ ...nq_tb, phone: '0521110052', qty: 9 }, 400, 'qty', null);
  const nq_t3 = await ok({ ...nq_tb, phone: '0521110053', qty: 1 }, null); assert.ok(nq_t3.id);
  await ok({ a: 'cancel', s: 'centre', m: nq_t1.id, k: nq_t1.k }, null); await ok({ ...nq_tb, phone: '0521110054', qty: 4 }, null);
  /* ===== תשלום דרך האתר: סליקה בחשבון האתר, ספר חשבונות, החזר והעברה ידנית ===== */
  const cfgNow = async () => (await ok({ a: 'get', s: 'centre' }, OWN)).biz.cfg;
  await ok({ a: 'plan', s: 'centre', plan: pSite.id }, SA); await ok({ a: 'save', s: 'centre', cfg: { ...(await cfgNow()), pay: { mode: 'site', require: 'full', holdMin: 10 } } }, OWN);
  assert.strictEqual((await cfgNow()).pay.mode, 'site', 'מסלול סליקה דרך האתר מאפשר מצב site');
  await bad({ a: 'book', s: 'centre', svc: pick.id, start: day + ' 17:30', res: g.res[0].id, name: 'משלם', phone: '0521110001', consent: ['c1'] }, 503, 'payoff', null);
  await ok({ a: 'site', set: { sitePay: true } }, SA); assert.strictEqual((await ok({ a: 'site' }, SA)).sitePayReady, true);
  const payBk = { a: 'book', s: 'centre', svc: appr.id, start: day + ' 17:00', name: 'משלם', phone: '0521110002', consent: ['c1'] };
  const mailsBefore = sent.mail.length; const spb = await ok(payBk, null);
  assert.strictEqual(spb.status, 'held'); assert.ok(spb.payNow && spb.tx && spb.tx.Mosad === '1234567', 'מוחזר טופס תשלום'); assert.strictEqual(spb.tx.Param1, spb.id); assert.strictEqual(spb.tx.Amount, String(spb.price), 'הסכום המלא'); assert.ok(spb.hold, 'השעה שמורה');
  await new Promise(r => setTimeout(r, 30)); assert.strictEqual(sent.mail.length, mailsBefore, 'אין הודעת אישור לפני תשלום');
  const PM = { s: 'centre', m: spb.id, k: spb.k }; const ptx = await ok({ a: 'paytx', ...PM }, null); assert.strictEqual(ptx.due, spb.price);
  const BOOKMOD = require('../api/_book'); assert.deepStrictEqual(await BOOKMOD.nedPaid({ Param1: spb.id, Status: 'Error' }), { ok: true, failed: true });
  assert.strictEqual(T.book_appt.find(a => a.id === spb.id).status, 'held', 'תשלום שנכשל לא מאשר');
  const cb = await BOOKMOD.nedPaid({ Param1: spb.id, Status: 'OK', Amount: String(spb.price), TransactionId: 'T1' }); assert.strictEqual(cb.ok, true);
  const apPaid = T.book_appt.find(a => a.id === spb.id); assert.strictEqual(apPaid.status, 'pending', 'שירות שדורש אישור עובר לממתין לאישור אחרי תשלום'); assert.strictEqual(apPaid.pay.paid, spb.price); assert.strictEqual(apPaid.hold_until, null);
  assert.deepStrictEqual(await BOOKMOD.nedPaid({ Param1: spb.id, Status: 'OK', Amount: String(spb.price), TransactionId: 'T1' }), { already: true }, 'callback כפול לא נרשם פעמיים');
  await new Promise(r => setTimeout(r, 30)); assert.ok(sent.mail.length > mailsBefore, 'הודעה אחרי תשלום'); await bad({ a: 'paytx', ...PM }, 400, 'paid', null);
  let led = await ok({ a: 'ledger', s: 'centre' }, OWN);
  const exFee = Math.round((pSite.perBooking + spb.price * pSite.pct / 100) * 100) / 100;
  assert.strictEqual(led.totals.gross, spb.price); assert.strictEqual(led.totals.fees, exFee, 'עמלה: קבועה ואחוזים לפי המסלול'); assert.strictEqual(led.totals.balance, Math.round((spb.price - exFee) * 100) / 100); assert.strictEqual(led.plan.mode, 'site');
  await bad({ a: 'ledger', s: 'centre' }, 403, 'forbidden', CLERK); await bad({ a: 'payout', s: 'centre', amount: 10 }, 403, 'forbidden', OWN);
  await ok({ a: 'payout', s: 'centre', amount: 100, note: 'העברה בנקאית' }, SA); led = await ok({ a: 'ledger', s: 'centre' }, OWN); assert.strictEqual(led.totals.payouts, 100); assert.strictEqual(led.totals.balance, Math.round((spb.price - exFee - 100) * 100) / 100);
  const payRow = led.items.find(r => r.kind === 'payment'); await bad({ a: 'refund', s: 'centre', id: payRow.id, amount: spb.price + 1 }, 400, 'over', SA);
  await ok({ a: 'refund', s: 'centre', id: payRow.id, amount: spb.price, refundFee: true }, SA); led = await ok({ a: 'ledger', s: 'centre' }, OWN); assert.strictEqual(led.totals.net, 0, 'החזר מלא עם החזר עמלה מאפס את הנטו'); assert.strictEqual(led.totals.balance, -100, 'ההעברה שכבר בוצעה נשארת כחוב של העסק');
  const all = await ok({ a: 'ledger' }, SA); assert.strictEqual(all.items.length, 1); assert.strictEqual(all.items[0].slug, 'centre'); await bad({ a: 'ledger' }, 403, 'forbidden', OWN);
  /* תשלום אחרי שפג זמן השמירה ושהשעה נתפסה: נרשם, לא מאשר, ומתריעים לעסק */
  USER = OWN; const pk = { ...payBk, svc: pick.id, res: g.res[0].id, start: day + ' 13:00' }; const ex = await ok({ ...pk, phone: '0521110005', name: 'מאחר' }, null); assert.ok(ex.payNow, 'שירות עם בחירת משאב גם גובה');
  await bad({ ...pk, phone: '0521110007', name: 'אחר' }, 409, 'taken', null); /* החזקה על אותו משאב */
  T.book_appt.find(a => a.id === ex.id).hold_until = new Date(Date.now() - 60000).toISOString();
  await ok({ ...pk, phone: '0521110006', name: 'תופס' }, null); /* מישהו אחר תפס את השעה אחרי שהחזקה פגה */
  const mails2 = sent.mail.length; const late = await BOOKMOD.nedPaid({ Param1: ex.id, Status: 'OK', Amount: String(ex.price), TransactionId: 'T2' }); assert.strictEqual(late.conflict, true);
  assert.notStrictEqual(T.book_appt.find(a => a.id === ex.id).status, 'confirmed'); assert.ok(sent.mail.length > mails2, 'התראה לעסק על תשלום בלי תור');
  /* SUMIT ופייפל: אותם אמצעי תשלום של האתר, והחזר על ידי מנהל העסק */
  const SUM = require('../api/_sumit'), PPL = require('../api/_paypal'); const orig = { r: SUM.ready, p: SUM.pub, c: SUM.charge, pr: PPL.ready, pc: PPL.create, pcap: PPL.capture, prf: PPL.refund };
  SUM.ready = () => true; SUM.pub = () => ({ cid: 1, pk: 'pk' }); SUM.charge = async o => ({ ok: o.token === 'good', system: false, message: 'סירוב', paymentId: 'S9', amount: o.amount });
  PPL.ready = () => true; PPL.create = async () => 'PP1'; PPL.capture = async id => ({ ok: id === 'PP1', amount: 0, txn: 'CAP1' }); const refunds = []; PPL.refund = async (id, am) => { refunds.push([id, am]); return { id: 'RF1', amount: am }; };
  process.env.PAYPAL_CLIENT_ID = 'ppc';
  const pkc = { ...pay2Bk(), start: day + ' 14:00' }; function pay2Bk() { return { a: 'book', s: 'centre', svc: appr.id, name: 'כרטיס', phone: '0521110020', consent: ['c1'] }; }
  await ok({ a: 'plan', s: 'centre', plan: pSite.id }, SA); await ok({ a: 'save', s: 'centre', cfg: { ...(await cfgNow()), pay: { mode: 'site', require: 'full', holdMin: 10 } } }, OWN);
  const sb = await ok(pkc, null); assert.ok(sb.provs.includes('sumit') && sb.provs.includes('paypal') && sb.provs.includes('nedarim')); assert.deepStrictEqual(sb.sumit, { cid: 1, pk: 'pk' }); assert.strictEqual(sb.ppc, 'ppc');
  const SM = { s: 'centre', m: sb.id, k: sb.k };
  await bad({ a: 'paysumit', ...SM, token: 'bad' }, 402, 'payment', null); assert.strictEqual(T.book_appt.find(x => x.id === sb.id).status, 'held');
  await ok({ a: 'paysumit', ...SM, token: 'good', name: 'כרטיס בדיקה' }, null); const sa = T.book_appt.find(x => x.id === sb.id); assert.strictEqual(sa.status, 'pending'); assert.strictEqual(sa.pay.paid, sb.price);
  await bad({ a: 'paysumit', ...SM, token: 'good' }, 400, 'paid', null);
  const ppb = await ok({ ...pkc, phone: '0521110021', start: day + ' 15:30', name: 'פייפל' }, null); const PM2 = { s: 'centre', m: ppb.id, k: ppb.k };
  assert.strictEqual((await ok({ a: 'ppcreate', ...PM2 }, null)).ppid, 'PP1'); await bad({ a: 'ppcapture', ...PM2, ppid: 'X' }, 402, 'payment', null);
  await ok({ a: 'ppcapture', ...PM2, ppid: 'PP1' }, null); assert.strictEqual(T.book_appt.find(x => x.id === ppb.id).pay.paid, ppb.price);
  let L2 = await ok({ a: 'ledger', s: 'centre' }, OWN); const spr = L2.items.find(r => r.kind === 'payment' && r.txn === 'sumit:S9'), ppr = L2.items.find(r => r.kind === 'payment' && r.txn === 'paypal:CAP1'); assert.ok(spr && ppr);
  await bad({ a: 'refund', s: 'centre', id: ppr.id, amount: 10 }, 403, 'forbidden', CLERK);
  const rf = await ok({ a: 'refund', s: 'centre', id: ppr.id, amount: 50 }, OWN); assert.strictEqual(rf.auto, true); assert.deepStrictEqual(refunds[0], ['CAP1', 50]);
  const rf2 = await ok({ a: 'refund', s: 'centre', id: spr.id, amount: 30 }, OWN); assert.strictEqual(rf2.auto, false);
  L2 = await ok({ a: 'ledger', s: 'centre' }, OWN); assert.ok(L2.items.some(r => r.kind === 'refund' && /ידני/.test(r.note)), 'החזר שלא אוטומטי נרשם לביצוע ידני');
  await bad({ a: 'refund', s: 'centre', id: ppr.id, amount: ppb.price }, 400, 'over', OWN);
  Object.assign(SUM, { ready: orig.r, pub: orig.p, charge: orig.c }); Object.assign(PPL, { ready: orig.pr, create: orig.pc, capture: orig.pcap, refund: orig.prf });
  /* חשבון סליקה של העסק עצמו: נדרים פלוס (callback) וקשר (בדיקת עסקה). אין רישום בספר, והאישור אוטומטי */
  await ok({ a: 'plan', s: 'centre', plan: pOwn.id }, SA);
  const ownCfg = o => ({ ...cfgNowSync, pay: { mode: 'own', require: 'full', holdMin: 10, own: o } }); let cfgNowSync = await cfgNow();
  await ok({ a: 'save', s: 'centre', cfg: ownCfg({ prov: 'nedarim', mosad: '', apiValid: '' }) }, OWN);
  await bad({ ...pkc, phone: '0521110030', start: day + ' 16:00', name: 'אין חשבון' }, 503, 'payoff', null);
  await ok({ a: 'save', s: 'centre', cfg: ownCfg({ prov: 'nedarim', mosad: '7654321', apiValid: 'secretX' }) }, OWN);
  const ob = await ok({ ...pkc, phone: '0521110031', start: day + ' 10:00', name: 'עסק' }, null); assert.deepStrictEqual(ob.provs, ['nedarim']); assert.strictEqual(ob.tx.Mosad, '7654321', 'הטופס של חשבון העסק'); assert.ok(!JSON.stringify(await ok({ a: 'biz', s: 'centre' }, null)).includes('secretX'), 'הסוד לא נחשף ללקוחות');
  const ledN = (await ok({ a: 'ledger', s: 'centre' }, OWN)).items.length;
  assert.deepStrictEqual(await BOOKMOD.nedPaid({ Param1: ob.id, Status: 'OK', Mosad: '1111111', Amount: String(ob.price), TransactionId: 'O1' }), { error: 'mosad' }, 'מוסד שונה נדחה');
  await BOOKMOD.nedPaid({ Param1: ob.id, Status: 'OK', Mosad: '7654321', Amount: String(ob.price), TransactionId: 'O1' });
  const oa = T.book_appt.find(x => x.id === ob.id); assert.strictEqual(oa.status, 'pending'); assert.strictEqual(oa.pay.paid, ob.price); assert.strictEqual((await ok({ a: 'ledger', s: 'centre' }, OWN)).items.length, ledN, 'תשלום בחשבון העסק לא נרשם בספר האתר');
  await ok({ a: 'save', s: 'centre', cfg: ownCfg({ prov: 'kesher', kesher: { pageUrl: 'https://kesher.example/pay', userName: 'u', password: 'p' } }) }, OWN);
  const AP2 = require('../api/_auction_pay'); const oldKL = AP2.kesherLinkOf, oldKC = AP2.kesherCheck; AP2.kesherLinkOf = async () => 'https://kesher.example/pay?token=T'; let kamount = 0; AP2.kesherCheck = async (s2, num) => ({ ok: num === '555', amount: kamount, num });
  const kb = await ok({ ...pkc, phone: '0521110032', start: day + ' 11:30', name: 'קשר' }, null); assert.deepStrictEqual(kb.provs, ['kesher']); assert.ok(kb.kurl.includes('token=T'));
  const KM = { s: 'centre', m: kb.id, k: kb.k }; await bad({ a: 'kcheck', ...KM, num: '999' }, 402, 'notpaid', null); kamount = kb.price - 1; await bad({ a: 'kcheck', ...KM, num: '555' }, 402, 'amount', null);
  kamount = kb.price; await ok({ a: 'kcheck', ...KM, num: '555' }, null); assert.strictEqual(T.book_appt.find(x => x.id === kb.id).status, 'pending');
  const kb2 = await ok({ ...pkc, phone: '0521110033', start: day + ' 12:30', name: 'קשר2' }, null); await bad({ a: 'kcheck', s: 'centre', m: kb2.id, k: kb2.k, num: '555' }, 409, 'used', null);
  AP2.kesherLinkOf = oldKL; AP2.kesherCheck = oldKC;
  /* מסלול בלי site: מצב site מכובה */
  await ok({ a: 'plan', s: 'centre', plan: pOwn.id }, SA); assert.notStrictEqual((await cfgNow()).pay.mode, 'site', 'מעבר למסלול בלי סליקה דרך האתר מכבה אותה');
  USER = OWN;
  /* ===== ארכיון ומחיקה ===== */
  const del1 = await ok({ a: 'del', s: 'centre', kind: 'svc', id: pick.id }, OWN); assert.strictEqual(del1.archived, true, 'יש היסטוריה: לארכיון');
  const pv2 = await ok({ a: 'biz', s: 'centre' }, null); assert.ok(!pv2.svcs.some(s => s.id === pick.id));
  const nm = (await ok({ a: 'put', s: 'centre', kind: 'addon', item: { name: 'זמני' } }, OWN)).item; const del2 = await ok({ a: 'del', s: 'centre', kind: 'addon', id: nm.id }); assert.strictEqual(del2.archived, false);
  /* סגירת העסק */
  await ok({ a: 'save', s: 'centre', status: 'closed' }, OWN); await bad({ a: 'slots', s: 'centre', svc: room.id }, 404, 'closed', null); await bad({ ...base, start: day + ' 17:00' }, 404, 'closed', null);
  /* תזכורת: תור מחר */
  await ok({ a: 'save', s: 'centre', status: 'open' }, OWN); const tomorrow = T.book_appt.find(a => a.id === b2.id); tomorrow.start_at = new Date(Date.now() + 20 * 3600e3).toISOString(); const rem = await BOOK.remind(0); assert.strictEqual(rem.sent, 1); assert.strictEqual((await BOOK.remind(0)).sent, 0, 'רק פעם אחת');
  console.log('כל בדיקות השרת עברו');
})().catch(e => { console.error(e); process.exit(1); });
