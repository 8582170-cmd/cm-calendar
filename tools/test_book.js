/* בדיקות לחישובי זימון התורים: node tools/test_book.js */
'use strict';
const assert = require('node:assert');
const C = require('../api/_book_core');
const TZ = 'Asia/Jerusalem';

/* ===== זמן מקומי, כולל מעבר שעון קיץ ===== */
let ms = C.localToMs('2026-01-15', 9 * 60, TZ);
assert.strictEqual(new Date(ms).toISOString(), '2026-01-15T07:00:00.000Z', 'חורף = UTC+2');
ms = C.localToMs('2026-07-15', 9 * 60, TZ);
assert.strictEqual(new Date(ms).toISOString(), '2026-07-15T06:00:00.000Z', 'קיץ = UTC+3');
for (const d of ['2026-03-26', '2026-03-27', '2026-03-28', '2026-10-24', '2026-10-25', '2026-10-26', '2026-12-31']) {
  for (const m of [0, 60, 9 * 60 + 15, 12 * 60, 23 * 60 + 45]) {
    const L = C.msToLocal(C.localToMs(d, m, TZ), TZ); assert.deepStrictEqual([L.date, L.min], [d, m], 'הלוך ושוב ' + d + ' ' + m);
  }
}
assert.strictEqual(C.dowOf('2026-11-22'), 0); /* יום ראשון */
assert.strictEqual(C.addDays('2026-12-31', 1), '2027-01-01');
assert.strictEqual(C.toMin('09:30'), 570); assert.strictEqual(C.toMin('9'), null); assert.strictEqual(C.fmtMin(570), '09:30');

/* ===== התאמות מחיר ===== */
assert.strictEqual(C.adjust(100, { t: 'pct', v: 20 }), 120);
assert.strictEqual(C.adjust(100, { t: 'pct', v: -30 }), 70);
assert.strictEqual(C.adjust(100, { t: 'add', v: 15 }), 115);
assert.strictEqual(C.adjust(100, { t: 'set', v: 60 }), 60);
assert.strictEqual(C.adjust(100, {}), 100); assert.strictEqual(C.adjust(100, null), 100); assert.strictEqual(C.adjust(100, { t: 'pct', v: '' }), 100);
assert.strictEqual(C.adjust(10, { t: 'pct', v: -200 }), 0, 'לא יורד מתחת לאפס');

/* ===== מחיר תור ===== */
const svc = { name: 'חדר', cfg: { price: { unit: 15, per: 40 }, rules: [{ days: [4], from: '18:00', to: '23:00', t: 'set', v: 60 }, { date: '2026-12-25', t: 'pct', v: 50 }] } };
const at = (d, h, m) => C.localToMs(d, h * 60 + (m || 0), TZ);
let q = C.quote({ svc, startMs: at('2026-11-23', 10), dur: 60, tz: TZ });
assert.strictEqual(q.total, 160, '4 יחידות × 40'); /* 23.11.2026 הוא יום שני */
/* יום חמישי 26.11 בערב: 60 ליחידה */
q = C.quote({ svc, startMs: at('2026-11-26', 18), dur: 60, tz: TZ }); assert.strictEqual(q.total, 240);
/* תור שמתחיל ב-17:30 וחוצה את 18:00: שתי יחידות רגילות ושתיים יקרות */
q = C.quote({ svc, startMs: at('2026-11-26', 17, 30), dur: 60, tz: TZ }); assert.strictEqual(q.total, 40 * 2 + 60 * 2);
/* כלל לתאריך מסוים גובר על כלל כללי */
q = C.quote({ svc, startMs: at('2026-12-25', 10), dur: 30, tz: TZ }); assert.strictEqual(q.total, 120);
/* קבוצה ומשאב: קומה 2 יקרה ב-20%, חדר מסוים עוד 5 ₪ ליחידה */
q = C.quote({ svc: { cfg: { price: { unit: 60, per: 100 } } }, group: { adj: { t: 'pct', v: 20 } }, res: { cfg: { adj: { t: 'add', v: 5 } } }, startMs: at('2026-11-23', 10), dur: 60, tz: TZ });
assert.strictEqual(q.total, 125);
/* מחיר קבוע ואורך חלקי יחידה */
q = C.quote({ svc: { cfg: { price: { fixed: 150 } } }, group: { adj: { t: 'pct', v: 10 } }, startMs: at('2026-11-23', 10), dur: 45, tz: TZ }); assert.strictEqual(q.total, 165);
q = C.quote({ svc: { cfg: { price: { unit: 60, per: 100 } } }, startMs: at('2026-11-23', 10), dur: 90, tz: TZ }); assert.strictEqual(q.total, 150);
/* תוספות: קבוע, ליחידת זמן, כמות */
const AD = [{ id: 1, name: 'מקרן', cfg: { price: 30, max: 1 } }, { id: 2, name: 'כיבוד', cfg: { price: 12, max: 10 } }, { id: 3, name: 'מיזוג', cfg: { price: 5, per: 'unit', unit: 60 } }];
q = C.quote({ svc: { cfg: { price: { unit: 60, per: 100 } } }, startMs: at('2026-11-23', 10), dur: 120, tz: TZ, addons: [{ a: AD[0], n: 1 }, { a: AD[1], n: 4 }, { a: AD[2], n: 1 }] });
assert.strictEqual(q.total, 200 + 30 + 48 + 10); assert.strictEqual(q.lines.length, 4);
/* מקדמה */
q = C.quote({ svc: { cfg: { price: { fixed: 200 }, deposit: { t: 'pct', v: 25 } } }, startMs: 0, dur: 30 }); assert.strictEqual(q.deposit, 50);
q = C.quote({ svc: { cfg: { price: { fixed: 200 }, deposit: { t: 'abs', v: 500 } } }, startMs: 0, dur: 30 }); assert.strictEqual(q.deposit, 200, 'לא יותר מהסכום');

/* ===== אורך התור ושינוי על ידי הלקוח ===== */
assert.strictEqual(C.pickDur({ cfg: { dur: 60 } }, 90), 60, 'לא ניתן לשינוי');
const ad = { cfg: { dur: 60, adj: { on: true, min: 30, max: 120, step: 15 } } };
assert.strictEqual(C.pickDur(ad, 90), 90); assert.strictEqual(C.pickDur(ad, 100), null); assert.strictEqual(C.pickDur(ad, 150), null); assert.strictEqual(C.pickDur(ad, 15), null); assert.strictEqual(C.pickDur(ad, null), 60);

/* ===== תוספות מותרות ===== */
const ALL = [{ id: 1, cfg: { price: 30, max: 1, addMin: 15 } }, { id: 2, cfg: { price: 12, max: 4 } }, { id: 3, cfg: { price: 5, req: true } }, { id: 4, cfg: { price: 1 } }];
const S = { cfg: { addons: [1, 2, 3] } };
let pa = C.pickAddons(ALL, S, [{ id: 1, n: 1 }, { id: 2, n: 3 }]);
assert.deepStrictEqual(pa.list.map(x => [x.a.id, x.n]), [[1, 1], [2, 3], [3, 1]], 'תוספת חובה נוספת אוטומטית'); assert.strictEqual(pa.addMin, 15);
assert.strictEqual(C.pickAddons(ALL, S, [{ id: 2, n: 5 }]).error, 'addon', 'מעל המקסימום');
assert.strictEqual(C.pickAddons(ALL, S, [{ id: 4, n: 1 }]).error, 'addon', 'תוספת שלא שייכת לשירות');
assert.strictEqual(C.pickAddons(ALL, S, [{ id: 99, n: 1 }]).error, 'addon');
assert.strictEqual(C.pickAddons(ALL, S, [{ id: 2, n: -1 }]).error, 'addon', 'כמות שלילית נדחית');

/* ===== שעות פנויות ===== */
const biz = { hours: { 0: [['09:00', '13:00'], ['16:00', '19:00']], 1: [['09:00', '12:00']], 2: [], 3: [], 4: [], 5: [], 6: [] }, exc: { '2026-11-30': { closed: true }, '2026-12-06': { hours: [['10:00', '11:00']] } }, step: 30, minNotice: 120, maxAhead: 30 };
const now = at('2026-11-22', 8); /* יום ראשון 08:00 */
const R = [{ id: 1, name: 'חדר 1' }, { id: 2, name: 'חדר 2' }];
const mk = (extra) => C.slots({ now, tz: TZ, biz, dates: ['2026-11-22', '2026-11-23', '2026-11-24', '2026-11-30', '2026-12-06'], dur: 60, bb: 0, ba: 0, res: R, busy: [], blocks: [], ...extra });
let S1 = mk();
/* היום 08:00, התראה מראש שעתיים: מ-10:00 ואילך. חלון 09-13: 10:00,10:30,11:00,11:30,12:00. חלון 16-19: 16:00..18:00 */
assert.deepStrictEqual(S1['2026-11-22'].map(x => x.t), ['10:00', '10:30', '11:00', '11:30', '12:00', '16:00', '16:30', '17:00', '17:30', '18:00']);
assert.deepStrictEqual(S1['2026-11-22'][0].res, [1, 2]);
assert.deepStrictEqual(S1['2026-11-23'].map(x => x.t), ['09:00', '09:30', '10:00', '10:30', '11:00']);
assert.deepStrictEqual(S1['2026-11-24'], [], 'יום בלי שעות');
assert.deepStrictEqual(S1['2026-11-30'], [], 'יום סגור (חריג)');
assert.deepStrictEqual(S1['2026-12-06'].map(x => x.t), ['10:00'], 'שעות מיוחדות בתאריך');
/* מעבר לתאריך רחוק מדי */
assert.deepStrictEqual(C.slots({ now, tz: TZ, biz, dates: ['2027-03-01'], dur: 60, res: R, busy: [], blocks: [] })['2027-03-01'], []);
/* תור קיים בחדר 1: החדר פנוי רק בחדר 2 בזמן הזה */
const busy1 = [{ res_id: 1, s: at('2026-11-23', 9, 30), e: at('2026-11-23', 10, 30) }];
let S2 = mk({ busy: busy1 })['2026-11-23'].reduce((m, x) => (m[x.t] = x.res, m), {});
assert.deepStrictEqual(S2['09:00'], [2], 'מתחיל 09:00 ונגמר 10:00, חופף ל-09:30');
assert.deepStrictEqual(S2['09:30'], [2]); assert.deepStrictEqual(S2['10:00'], [2]); assert.deepStrictEqual(S2['10:30'], [1, 2], 'מיד אחרי התור');
/* הפסקה אחרי התור: 15 דקות */
S2 = mk({ busy: [{ res_id: 1, s: at('2026-11-23', 9), e: at('2026-11-23', 10) + 15 * 60000 }], ba: 15 })['2026-11-23'].reduce((m, x) => (m[x.t] = x.res, m), {});
assert.deepStrictEqual(S2['10:00'], [2], 'ההפסקה תפסה את 10:00 בחדר 1'); assert.deepStrictEqual(S2['10:30'], [1, 2]);
/* שני התורים ביחד: אין שעה פנויה */
S2 = mk({ busy: [{ res_id: 1, s: at('2026-11-23', 9), e: at('2026-11-23', 12) }, { res_id: 2, s: at('2026-11-23', 9), e: at('2026-11-23', 12) }] })['2026-11-23']; assert.deepStrictEqual(S2, []);
/* חסימה כללית (שבת/חג) */
S2 = mk({ blocks: [[at('2026-11-23', 10), at('2026-11-23', 11)]] })['2026-11-23'].map(x => x.t); assert.deepStrictEqual(S2, ['09:00', '11:00']);
/* חופשה של משאב אחד */
const R2 = [{ id: 1, cfg: { blocks: [{ from: '2026-11-23 00:00', to: '2026-11-23 23:59' }] } }, { id: 2 }];
assert.deepStrictEqual(C.slots({ now, tz: TZ, biz, dates: ['2026-11-23'], dur: 60, res: R2, busy: [], blocks: [] })['2026-11-23'][0].res, [2]);
/* שעות מיוחדות למשאב */
const R3 = [{ id: 1, cfg: { hours: { 1: [['14:00', '15:00']] } } }, { id: 2 }];
const S3 = C.slots({ now, tz: TZ, biz, dates: ['2026-11-23'], dur: 60, res: R3, busy: [], blocks: [] })['2026-11-23'];
assert.deepStrictEqual(S3.find(x => x.t === '14:00').res, [1]); assert.deepStrictEqual(S3.find(x => x.t === '09:00').res, [2]);
/* משך ארוך מהחלון */
assert.deepStrictEqual(C.slots({ now, tz: TZ, biz, dates: ['2026-11-23'], dur: 240, res: R, busy: [], blocks: [] })['2026-11-23'], []);

/* ===== הקצאה אוטומטית ===== */
const RES = [{ id: 10, group_id: 1 }, { id: 11, group_id: 1 }, { id: 12, group_id: 2 }];
assert.deepStrictEqual(C.pick([12, 10, 11], RES, 'order'), [10, 11, 12]);
assert.deepStrictEqual(C.pick([10, 11], RES, 'least', new Map([['10', 3], ['11', 1]])), [11, 10], 'הכי פחות עמוס קודם');
assert.deepStrictEqual(C.countBy([10, 12, 11], RES), { 1: 2, 2: 1 });

/* ===== מעבר שעון קיץ: תור ב-27.3.2026 ===== */
const dst = C.slots({ now: at('2026-03-20', 8), tz: TZ, biz: { hours: { 5: [['09:00', '11:00']] }, step: 30, minNotice: 0, maxAhead: 60 }, dates: ['2026-03-27'], dur: 60, res: [{ id: 1 }], busy: [], blocks: [] })['2026-03-27'];
assert.deepStrictEqual(dst.map(x => x.t), ['09:00', '09:30', '10:00']);
assert.strictEqual(C.msToLocal(dst[0].ms, TZ).min, 540);

console.log('כל הבדיקות עברו');
