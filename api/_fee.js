/* דמי השימוש ש-MyLuach גובה מארגון (מכירה סינית / קמפיין התרמה): סכום קבוע, אחוז מההכנסות, או שניהם.
   ההגדרה הכללית של בעל האתר בכל אגף (fee), ואפשר לקבוע אחרת לארגון מסוים (cfg.admin.fee).
   הכסף עצמו לא עובר דרך האתר, ולכן זה חישוב להצגה ולחיוב. */
'use strict';
const feeOf = f => { f = f || {}; return { type: ['fixed', 'pct', 'both', 'none'].includes(f.type) ? f.type : 'none', fixed: Math.max(0, Math.min(1e7, +f.fixed || 0)), pct: Math.max(0, Math.min(100, +f.pct || 0)) }; };
function calc(f, amount) { f = feeOf(f); const v = (f.type === 'fixed' || f.type === 'both' ? f.fixed : 0) + (f.type === 'pct' || f.type === 'both' ? (+amount || 0) * f.pct / 100 : 0); return Math.round(v * 100) / 100; }
/* ההגדרה שחלה בפועל: של הארגון אם נקבעה, אחרת הכללית */
const eff = (cfg, siteFee) => { const a = ((cfg || {}).admin || {}).fee; return feeOf(a && a.type ? a : siteFee); };
module.exports = { feeOf, calc, eff };
