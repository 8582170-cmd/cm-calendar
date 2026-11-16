/* מכירה סינית: החישובים עצמם, בלי מסד נתונים (כדי שאפשר לבדוק אותם לבד: tools/test_auction.js).
   - price: מחיר הרכישה לפי המוצרים, הכמויות והחבילה (שלושה סוגי חבילות).
   - draw: הגרלה אחת. שלושה ערבובים של רשימת הכרטיסים, ואז הגרלה של כרטיס אחד מתוך הרשימה המעורבבת. */
'use strict';
const crypto = require('node:crypto');
const { price, covers } = require('../assets/auction-price.js');

/* מספר אקראי שלם בין 0 ל-n-1, ממחולל קריפטוגרפי, בלי הטיה (דוחים ערכים שמעבר לכפולה השלמה האחרונה של n) */
function randInt(n) {
  if (!(n > 0) || n > 0xFFFFFFFF) throw new Error('randInt range');
  const lim = Math.floor(0x100000000 / n) * n, b = new Uint32Array(1);
  for (;;) { crypto.webcrypto.getRandomValues(b); if (b[0] < lim) return b[0] % n; }
}
/* ערבוב פישר־ייטס: כל סדר אפשרי באותה הסתברות */
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
/* טביעת אצבע של רשימת הכרטיסים שמשתתפים (לפי מספר סידורי, ממוינים): מוכיחה אחר כך שלא נוסף ולא נגרע כרטיס */
function poolHash(serials) { return crypto.createHash('sha256').update(serials.slice().sort((a, b) => a - b).join(',')).digest('hex'); }
/* הגרלה אחת: שלושה ערבובים של הרשימה, ואז הגרלה נפרדת של מקום אחד ברשימה המעורבבת */
function draw(serials, shuffles) {
  if (!serials || !serials.length) return null;
  const a = serials.slice(), k = shuffles == null ? 3 : shuffles;
  for (let i = 0; i < k; i++) shuffle(a);
  return { serial: a[randInt(a.length)], pool: a.length, hash: poolHash(serials), shuffles: k };
}
/* מי משתתף בהגרלה הבאה במוצר: כל הכרטיסים התקפים, חוץ מכרטיסים שכבר זכו. אם אותו אדם לא יכול לזכות פעמיים במוצר: גם בלי שאר הכרטיסים שלו */
function eligible(tickets, wins, repeatWin) {
  const wonT = new Set(wins.map(w => String(w.ticket_id))), wonC = new Set(wins.filter(w => w.customer_id != null).map(w => String(w.customer_id)));
  return tickets.filter(t => !t.void && !wonT.has(String(t.id)) && (repeatWin || t.customer_id == null || !wonC.has(String(t.customer_id))));
}
module.exports = { price, draw, shuffle, randInt, poolHash, eligible, covers };
