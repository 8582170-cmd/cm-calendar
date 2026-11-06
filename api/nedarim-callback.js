/* נדרים פלוס שולחים לכאן הודעה כשתשלום עבר (CallBack), וגם:
   - עסקת ביט (מספר ההזמנה ב-Param2),
   - עדכון סירוב (Webhook "עדכוני סירובים" של המוסד): חיוב חודשי של הוראת קבע שנכשל → מייל ללקוח עם קישור לעדכון הכרטיס.
   אימות: חתימת HMAC (אם הוגדר NEDARIM_WEBHOOK_SECRET והבקשה חתומה), ואחרת רשימת כתובות IP (NEDARIM_CALLBACK_IPS). */
'use strict';
const { env, db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  const p = readBody(req);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  console.log('nedarim callback', ip, JSON.stringify(p).slice(0, 1500));
  try {
    const sig = require('./_nedarim').verify(req);
    if (sig === false) return json(res, 403, { error: 'signature' });
    if (sig === null) { const allowed = env('NEDARIM_CALLBACK_IPS').split(',').map(s => s.trim()).filter(Boolean); if (allowed.length && !allowed.includes(ip)) return json(res, 403, { error: 'ip' }); }

    /* סירוב של חיוב חודשי בהוראת קבע (רק בניסיון הראשון של החודש, כדי לא לשלוח כמה מיילים) */
    if (String(p.Status || '') === 'Error' && String(p.Source || '') === 'Keva' && p.KevaId) {
      if (String(p.IsFirstKevaTry || '1') !== '1') return json(res, 200, { ok: true, skipped: 'retry' });
      const L = await db('orders?select=id,plan,email,callback&callback->auto->>kid=eq.' + encodeURIComponent(String(p.KevaId)) + '&limit=1').catch(() => []);
      const o = L && L[0];
      if (o && o.email) {
        const N = require('./_nedarim'); let link = null; try { link = await N.updateLink(p.KevaId); } catch (e) {}
        const SB = require('./_subs'), name = SB.nameOf(o.plan, await SB.cfg().catch(() => null)) || 'המנוי';
        const site = (env('SITE_URL') || 'https://www.myluach.org').replace(/\/$/, '');
        await require('./_paid').send('cardfail', o.email, { 'מנוי': name, 'סיבה': String(p.Message || '').replace(/<[^>]*>/g, ' ').slice(0, 200) }, { url: link || site + '/brachot/my.html#subs' }, 'cardfail').catch(e => console.error('cardfail mail', e.message));
        const A = { ...((o.callback || {}).auto || {}), failAt: new Date().toISOString(), failMsg: String(p.Message || '').replace(/<[^>]*>/g, ' ').slice(0, 200) };
        await db('orders?id=eq.' + o.id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...(o.callback || {}), auto: A } }) }).catch(() => {});
      }
      return json(res, 200, { ok: true });
    }

    /* מספר ההזמנה: Param1 (טופס התשלום) או Param2 (ביט) */
    const id = [p.Param1, p.param1, p.Param2, p.param2].map(x => String(x || '')).find(x => /^[0-9a-f]{24}$/.test(x)) || '';
    if (!id) return json(res, 200, { ok: true, skipped: 'no order' });
    const rows = await db('orders?id=eq.' + id + '&select=*');
    const o = rows && rows[0];
    if (!o) return json(res, 404, { error: 'no order' });
    /* כבר שולם: לא נוגעים (כדי לא לדרוס את הנתונים השמורים, למשל של מנוי) */
    if (o.status === 'paid') return json(res, 200, { ok: true, already: true });
    const status = String(p.Status || p.status || '');
    const ok = /^(ok|1|true|success)$/i.test(status);
    const paid = Number(p.Amount || p.amount || 0);
    const enough = !paid || paid + 0.001 >= Number(o.amount);
    const base = { callback: p, txn: String(p.TransactionId || p.TransactionID || p.Id || p.id || p.ID || '') };
    /* הוראת קבע (מנוי עם חידוש אוטומטי): שומרים את מזהה ההוראה. ההטבה עד מועד החיוב הראשון + כמה ימים, ומשימת הבוקר מאריכה אחרי כל חיוב */
    const A0 = o.callback && o.callback.auto;
    if (A0 && A0.prov === 'nedarim') { const AP = require('./_subauto'), nx = AP.ddmm(p.NextDate) || Date.now();
      base.callback = { ...p, auto: { ...A0, kid: String(p.ID || p.KevaId || ''), state: 'active', until: Math.max(nx, Date.now()) + 4 * 864e5, paid: 0 } }; base.txn = 'HK-' + String(p.ID || p.KevaId || ''); }
    if (o.callback && o.callback.bit) base.callback = { ...p, bit: o.callback.bit };
    if (ok && enough) await require('./_paid').markPaid(o, base, o.callback && o.callback.bit ? 'ביט' : 'נדרים פלוס');
    else await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ ...base, status: ok ? 'underpaid' : 'failed' }) });
    json(res, 200, { ok: true });
  } catch (e) {
    console.error('callback', e);
    json(res, 500, { error: 'server error' });
  }
};
