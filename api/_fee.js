/* דמי השימוש ש-MyLuach גובה מארגון (מכירה סינית / קמפיין התרמה): סכום קבוע, אחוז מההכנסות, או שניהם.
   ההגדרה הכללית של בעל האתר בכל אגף (fee), ואפשר לקבוע אחרת לארגון מסוים (cfg.admin.fee).
   הכסף עצמו לא עובר דרך האתר, ולכן זה חישוב להצגה ולחיוב. */
'use strict';
/* deal = הסכם ידני שסוכם מחוץ לאתר: אין מחיר באתר, ובעל האתר רואה רק את ההערה ואת הדוח */
/* מסלולים: בעל האתר מגדיר כמה מסלולי דמי שימוש (למשל 2000 ₪ בלי אחוז, או 1000 ₪ ועוד אחוז), והארגון בוחר אחד לפני הפתיחה (cfg.feePlan) */
const plansOf = v => (Array.isArray(v) ? v : []).slice(0, 12).map((x, i) => ({ id: String((x && x.id) || ('p' + (i + 1))).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20) || ('p' + (i + 1)), name: String((x && x.name) || '').replace(/[<>]/g, '').trim().slice(0, 40), fixed: Math.max(0, Math.min(1e7, +(x && x.fixed) || 0)), pct: Math.max(0, Math.min(100, +(x && x.pct) || 0)), desc: String((x && x.desc) || '').replace(/[<>]/g, '').trim().slice(0, 200) })).filter((x, i, A) => x.name && A.findIndex(y => y.id === x.id) === i);
const planType = p => p.fixed > 0 && p.pct > 0 ? 'both' : p.fixed > 0 ? 'fixed' : p.pct > 0 ? 'pct' : 'none';
const feeOf = f => { f = f || {}; return { type: ['fixed', 'pct', 'both', 'none', 'deal'].includes(f.type) ? f.type : 'none', fixed: Math.max(0, Math.min(1e7, +f.fixed || 0)), pct: Math.max(0, Math.min(100, +f.pct || 0)), note: String(f.note || '').replace(/[<>]/g, '').slice(0, 300), plans: plansOf(f.plans) }; };
function calc(f, amount) { f = feeOf(f); const v = (f.type === 'fixed' || f.type === 'both' ? f.fixed : 0) + (f.type === 'pct' || f.type === 'both' ? (+amount || 0) * f.pct / 100 : 0); return Math.round(v * 100) / 100; }
/* ההגדרה שחלה בפועל: של הארגון אם נקבעה, אחרת הכללית */
/* אם נקבעו מסלולים והארגון לא קיבל הגדרה אישית: המסלול שהארגון בחר. לפני שבחר: needPlan (ההגדרה הכללית משמשת רק לתצוגה) */
const raw = (cfg, siteFee) => { const a = ((cfg || {}).admin || {}).fee; if (a && a.type) return feeOf(a); const b = feeOf(siteFee); if (!b.plans.length) return b; const p = b.plans.find(x => x.id === (cfg || {}).feePlan); if (!p) return { ...b, needPlan: true }; return { ...b, type: planType(p), fixed: p.fixed, pct: p.pct, plan: p.id, planName: p.name }; };
/* אחרי ששולמו דמי פתיחה (api/_openfee.js) החלק הקבוע כבר שולם, ולא נגבה שוב */
const eff = (cfg, siteFee) => { const f = raw(cfg, siteFee), p = (cfg || {}).openfee; return p && p.paid && (f.type === 'fixed' || f.type === 'both') ? { ...f, fixed: 0, prepaid: +p.amount || 0 } : f; };
/* מה מנהל הארגון רואה: בלי ההערה הפנימית */
const pub = f => { const r = feeOf(f); delete r.note; delete r.plans; if (f && f.plan) { r.plan = f.plan; r.planName = f.planName; } if (f && f.needPlan) r.needPlan = true; return r; };
/* המסלולים שהארגון רואה ובוחר מהם (בלי הגדרה אישית לארגון) */
const plansPub = (cfg, siteFee) => { const a = ((cfg || {}).admin || {}).fee; return a && a.type ? [] : feeOf(siteFee).plans; };
module.exports = { feeOf, calc, eff, raw, pub, plansOf, plansPub };
