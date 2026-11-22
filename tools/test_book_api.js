/* בדיקת הזרימה המלאה של זימון התורים מול מסד נתונים מדומה בזיכרון: node tools/test_book_api.js
   המסד המדומה מחקה את הדברים ש-PostgREST ו-Supabase עושים כאן: סינון, מיון, ומניעת תורים חופפים באותו משאב (האילוץ ב-supabase_book.sql). */
'use strict';
const assert = require('node:assert');
const path = require('node:path');

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
