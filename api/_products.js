/* רשימת המוצרים של MyLuach (דף /products) והבקרה עליהם מהניהול:
   show = להציג בדף "עוד מוצרים", index = לכלול במפת האתר ובאינדוקס של גוגל.
   ההגדרה נשמרת ב-setting "products". ברירת המחדל: כמו שהאתר נראה עכשיו (עריכת PDF והגלריה: לא מוצגים ולא באינדוקס). */
'use strict';
const { loadSetting } = require('./_lib');
const SITE = () => (require('./_lib').env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
const LIST = [
  { k: 'app', path: '/app.html', name: 'לוח שנה עברי להדפסה', show: true, index: true },
  { k: 'simple', path: '/simple', name: 'בונה לוח מהיר', show: true, index: true },
  { k: 'online', path: '/online/', name: 'לוח שנה אונליין', show: true, index: true },
  { k: 'countdown', path: '/countdown', name: 'לוח ספירה לאחור', show: true, index: true },
  { k: 'timer', path: '/timer', name: 'שעון ספירה לאחור', show: true, index: true },
  { k: 'brachot', path: '/brachot/', name: 'ברכות והזמנות מעוצבות', show: true, index: true },
  { k: 'invite', path: '/invite', name: 'הזמנות דיגיטליות', show: true, index: true },
  { k: 'auction', path: '/auction', name: 'מכירה סינית', show: true, index: true },
  { k: 'give', path: '/give', name: 'התרמה מקוונת', show: true, index: true },
  { k: 'book', path: '/book', name: 'זימון תורים', show: false, index: false },
  { k: 'pdf', path: '/pdf', name: 'עריכת PDF', show: false, index: false },
  { k: 'gallery', path: '/gallery.html', name: 'גלריית עיצובים', show: false, index: true }
];
async function cfg() {
  const s = (await loadSetting('products').catch(() => ({}))) || {};
  return LIST.map(x => { const o = s[x.k] && typeof s[x.k] === 'object' ? s[x.k] : {}; return { k: x.k, path: x.path, name: x.name, show: o.show === undefined ? x.show : !!o.show, index: o.index === undefined ? x.index : !!o.index }; });
}
function clean(b) {
  const out = {}; LIST.forEach(x => { const o = b && b[x.k]; if (o && typeof o === 'object') out[x.k] = { show: !!o.show, index: !!o.index }; }); return out;
}
module.exports = { LIST, cfg, clean, SITE };
