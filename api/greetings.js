/* ברכות והזמנות: הנוסחים המוכנים שהוזנו בדף הניהול (סטודיו רקעים ← נוסחים מוכנים).
   הלקוח בוחר נוסח בעורך, והוא ממלא את השדות המתאימים בעיצוב. */
'use strict';
const { loadSetting, json } = require('./_lib');
module.exports = async (req, res) => {
  try {
    const g = await loadSetting('greetings');
    const presets = (g.presets || []).filter(p => p.on !== false).map(p => ({ id: p.id, title: p.title, cat: p.cat, kind: p.kind, fields: p.fields }));
    res.setHeader('Cache-Control', 'public, max-age=120');
    json(res, 200, { presets });
  } catch (e) { console.error('greetings', e); json(res, 200, { presets: [] }); }
};
