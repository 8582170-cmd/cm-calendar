/* בדיקות לחישובי המכירה הסינית: node tools/test_auction.js */
'use strict';
const assert = require('node:assert');
const C = require('../api/_auction_core');
const P = [{ id: 1, name: 'א', price: 20 }, { id: 2, name: 'ב', price: 50 }, { id: 3, name: 'ג', price: 10 }, { id: 4, name: 'כבוי', price: 10, active: false }, { id: 5, name: 'מוגבל', price: 10, cfg: { maxPer: 2 } }];

/* בלי חבילה */
let r = C.price(P, null, [{ p: 1, n: 2 }, { p: 2, n: 1 }]);
assert.deepStrictEqual([r.amount, r.count], [90, 3]);
assert.strictEqual(C.price(P, null, []).error, 'empty');
assert.strictEqual(C.price(P, null, [{ p: 4, n: 1 }]).error, 'product');
assert.strictEqual(C.price(P, null, [{ p: 9, n: 1 }]).error, 'product');
assert.strictEqual(C.price(P, null, [{ p: 5, n: 3 }]).error, 'max');
assert.strictEqual(C.price(P, null, [{ p: 1, n: -3 }, { p: 1, n: 0.5 }]).error, 'empty');
assert.strictEqual(C.price(P, null, [{ p: 1, n: 9999 }]).error, 'qty');

/* חלוקה חופשית: 5 כרטיסים ב-60. היקרים מכוסים קודם, העודף בתשלום רגיל */
const free = { kind: 'free', price: 60, qty: 5 };
r = C.price(P, free, [{ p: 1, n: 2 }, { p: 3, n: 1 }]);
assert.deepStrictEqual([r.amount, r.count, r.left.tickets], [60, 3, 2]);
r = C.price(P, free, [{ p: 2, n: 3 }, { p: 3, n: 4 }]); /* 3 יקרים + 2 זולים בחבילה, 2 זולים בתשלום */
assert.deepStrictEqual([r.amount, r.count, r.left.tickets], [80, 7, 0]);
assert.strictEqual(r.lines.find(l => l.p === '3').pkg, 2);
/* חבילה שחלה רק על חלק מהמוצרים */
r = C.price(P, { kind: 'free', price: 60, qty: 5, products: [3] }, [{ p: 2, n: 1 }, { p: 3, n: 2 }]);
assert.deepStrictEqual([r.amount, r.left.tickets], [110, 3]);

/* הרכב קבוע: כרטיס בכל מוצר פעיל + תוספות בתשלום */
r = C.price(P, { kind: 'fixed', price: 70 }, []);
assert.deepStrictEqual([r.amount, r.count], [70, 4]);
r = C.price(P, { kind: 'fixed', price: 70 }, [{ p: 1, n: 2 }]);
assert.deepStrictEqual([r.amount, r.count, r.lines.find(l => l.p === '1').n], [110, 6, 3]);
r = C.price(P, { kind: 'fixed', price: 30, comp: [{ p: 2, n: 2 }, { p: 4, n: 1 }] }, []);
assert.deepStrictEqual([r.amount, r.count], [30, 2]);

/* לפי שווי: 100 ₪ לניצול ב-80 */
const cr = { kind: 'credit', price: 80, credit: 100 };
r = C.price(P, cr, [{ p: 2, n: 1 }, { p: 1, n: 2 }]);
assert.deepStrictEqual([r.amount, r.left.credit], [80, 10]);
r = C.price(P, cr, [{ p: 2, n: 3 }]); /* שניים מכוסים, השלישי בתשלום */
assert.deepStrictEqual([r.amount, r.left.credit], [130, 0]);
assert.strictEqual(C.price(P, { kind: 'x', price: 1 }, [{ p: 1, n: 1 }]).error, 'pkg');

/* הגרלה */
assert.strictEqual(C.draw([]), null);
const S = Array.from({ length: 50 }, (_, i) => i + 1);
const d = C.draw(S);
assert.ok(S.includes(d.serial)); assert.strictEqual(d.pool, 50); assert.strictEqual(d.shuffles, 3);
assert.deepStrictEqual(S, Array.from({ length: 50 }, (_, i) => i + 1), 'הרשימה המקורית לא משתנה');
assert.strictEqual(C.poolHash([3, 1, 2]), C.poolHash([1, 2, 3]));
assert.notStrictEqual(C.poolHash([1, 2, 3]), C.poolHash([1, 2, 4]));
const sh = C.shuffle(S.slice()); assert.deepStrictEqual(sh.slice().sort((a, b) => a - b), S);
/* פיזור: 60,000 הגרלות מתוך 6 כרטיסים, כל כרטיס צריך לזכות בערך 10,000 פעם */
const cnt = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 60000; i++) cnt[C.draw([0, 1, 2, 3, 4, 5]).serial]++;
cnt.forEach(c => assert.ok(Math.abs(c - 10000) < 500, 'פיזור לא אחיד: ' + cnt.join(',')));
for (let i = 0; i < 2000; i++) { const x = C.randInt(7); assert.ok(x >= 0 && x < 7 && Number.isInteger(x)); }
assert.throws(() => C.randInt(0));

/* מי משתתף בהגרלה הבאה */
const T = [{ id: 1, customer_id: 10 }, { id: 2, customer_id: 10 }, { id: 3, customer_id: 11 }, { id: 4, customer_id: 12, void: true }, { id: 5, customer_id: null }];
assert.deepStrictEqual(C.eligible(T, [], false).map(t => t.id), [1, 2, 3, 5]);
assert.deepStrictEqual(C.eligible(T, [{ ticket_id: 1, customer_id: 10 }], false).map(t => t.id), [3, 5]);
assert.deepStrictEqual(C.eligible(T, [{ ticket_id: 1, customer_id: 10 }], true).map(t => t.id), [2, 3, 5]);
console.log('auction core: all tests passed', cnt.join(','));

/* שחזור שיחת הטלפון */
const IVR = require('../api/_auction_ivr');
const SALE = { id: 1, slug: 'x', status: 'open', cfg: { title: 'בדיקה', repPhone: 'both', repSkip: true }, products: [{ id: 1, num: 101, name: 'א', price: 20, draws: 1 }, { id: 2, num: 102, name: 'ב', price: 50, draws: 3, cfg: { maxPer: 5 } }],
  pkgs: [{ id: 7, name: 'ארבעים', kind: 'free', price: 60, qty: 5 }, { id: 8, name: 'קבועה', kind: 'fixed', price: 30 }] };
const RP = new Map([['2417', { id: 9, code: '2417', name: 'משה' }]]);
let s1 = IVR.replay(SALE, RP, []); assert.strictEqual(s1.phase, 'repA');
s1 = IVR.replay(SALE, RP, ['0']); assert.deepStrictEqual([s1.phase, s1.rep], ['menu', null]);
s1 = IVR.replay(SALE, RP, ['2417', '2', '101', '1', '3', '1', '102', '1', '2', '2']);
assert.deepStrictEqual([s1.phase, s1.rep.id, s1.quote.amount, s1.quote.count], ['sum', 9, 160, 5]);
s1 = IVR.replay(SALE, RP, ['2417', '2', '101', '1', '3', '2', '1']); assert.strictEqual(s1.phase, 'pay', 'יש כבר נציג: לא שואלים שוב לפני התשלום');
s1 = IVR.replay(SALE, RP, ['0', '1', '1', '102', '1', '3', '2', '1']); assert.deepStrictEqual([s1.phase, s1.quote.amount], ['repB', 60]);
s1 = IVR.replay(SALE, RP, ['0', '1', '1', '102', '1', '3', '2', '1', '55', '0']); assert.strictEqual(s1.phase, 'pay');
s1 = IVR.replay(SALE, RP, ['0', '2', '102']); assert.strictEqual(s1.phase, 'prodok', 'אחרי מספר מוצר מבקשים אישור');
s1 = IVR.replay(SALE, RP, ['0', '2', '102', '2']); assert.strictEqual(s1.phase, 'prod', 'אי אישור: חוזרים לבחירת מוצר');
s1 = IVR.replay(SALE, RP, ['0', '2', '102', '1']); assert.strictEqual(s1.phase, 'qty');
s1 = IVR.replay({ ...SALE, pkgs: [] }, RP, ['0', '1']); assert.strictEqual(s1.phase, 'prod', 'בלי חבילות התפריט מתחיל ב-1');
s1 = IVR.replay({ ...SALE, pkgs: [] }, RP, ['0', '3']); assert.strictEqual(s1.phase, 'menu', 'בלי חבילות אין מקש 3');
s1 = IVR.replay(SALE, RP, ['0', '2', '999']); assert.strictEqual(s1.phase, 'prod');
s1 = IVR.replay(SALE, RP, ['0', '2', '102', '1', '6']); assert.strictEqual(s1.phase, 'qty', 'מעבר למגבלה למוצר');
s1 = IVR.replay(SALE, RP, ['0', '1', '2', '2']); assert.deepStrictEqual([s1.phase, s1.quote.amount, s1.quote.count], ['sum', 30, 2]);
s1 = IVR.replay(SALE, RP, ['0', '2', '101', '1', '1', '2', '3']); assert.deepStrictEqual([s1.phase, s1.cart.length], ['menu', 0]);
s1 = IVR.replay(SALE, RP, ['0', '2', '101', '1', '1', '2', '2']); assert.deepStrictEqual([s1.phase, s1.cart.length], ['more', 1]);
s1 = IVR.replay(SALE, RP, ['11', '22']); assert.strictEqual(s1.phase, 'menu', 'שני קודים שגויים: ממשיכים בלי');
s1 = IVR.replay({ ...SALE, cfg: { ...SALE.cfg, repSkip: false } }, RP, ['0', '11', '22', '33']); assert.strictEqual(s1.phase, 'bye');
/* סל שמור: ממשיכים, עורכים, מוסיפים */
const SV = { pkg_id: null, items: [{ p: 1, n: 2 }, { p: 2, n: 1 }, { p: 99, n: 4 }] };
s1 = IVR.replay(SALE, RP, ['0'], SV); assert.deepStrictEqual([s1.phase, s1.cart.length, s1.quote.amount], ['saved', 2, 90], 'מוצר שלא קיים מושמט');
s1 = IVR.replay(SALE, RP, ['0', '1', '1', '101', '1', '3'], SV); assert.deepStrictEqual([s1.phase, s1.cart.find(x => x.p === 1).n, s1.cart.length], ['more', 5, 2], 'הוספה למוצר שכבר בסל מתאחדת');
s1 = IVR.replay(SALE, RP, ['0', '1', '5', '102', '0'], SV); assert.deepStrictEqual([s1.phase, s1.cart.length], ['more', 1], 'הסרה');
s1 = IVR.replay(SALE, RP, ['0', '1', '5', '101', '4'], SV); assert.strictEqual(s1.cart.find(x => x.p === 1).n, 4);
s1 = IVR.replay(SALE, RP, ['0', '1', '5', '102', '6'], SV); assert.strictEqual(s1.phase, 'editq', 'מעבר למגבלה');
s1 = IVR.replay(SALE, RP, ['0', '1', '4'], SV); assert.strictEqual(s1.phase, 'store');
s1 = IVR.replay(SALE, RP, ['0', '3'], SV); assert.deepStrictEqual([s1.phase, s1.cart.length], ['menu', 0]);
s1 = IVR.replay({ ...SALE, cfg: { ...SALE.cfg, phoneCart: false } }, RP, ['0'], SV); assert.strictEqual(s1.phase, 'menu', 'כשהסל כבוי לא טוענים');
console.log('auction ivr: all tests passed');
