/* נדרים פלוס שולחים לכאן הודעה כשתשלום עבר (CallBack). מסמנים את ההזמנה כשולמה. */
'use strict';
const { env, db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  const p = readBody(req);
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  console.log('nedarim callback', ip, JSON.stringify(p).slice(0, 1500));
  try {
    const allowed = env('NEDARIM_CALLBACK_IPS').split(',').map(s => s.trim()).filter(Boolean);
    if (allowed.length && !allowed.includes(ip)) return json(res, 403, { error: 'ip' });
    const id = String(p.Param1 || p.param1 || '');
    if (!/^[0-9a-f]{24}$/.test(id)) return json(res, 400, { error: 'missing order' });
    const rows = await db('orders?id=eq.' + id + '&select=*');
    const o = rows && rows[0];
    if (!o) return json(res, 404, { error: 'no order' });
    const status = String(p.Status || p.status || '');
    const ok = /^(ok|1|true|success)$/i.test(status);
    const paid = Number(p.Amount || p.amount || 0);
    const enough = !paid || paid + 0.001 >= Number(o.amount);
    const base = { callback: p, txn: String(p.TransactionId || p.TransactionID || p.Id || p.id || '') };
    if (o.status === 'paid' || (ok && enough)) await require('./_paid').markPaid(o, base, 'נדרים פלוס');
    else await db('orders?id=eq.' + id, { method: 'PATCH', body: JSON.stringify({ ...base, status: ok ? 'underpaid' : 'failed' }) });
    json(res, 200, { ok: true });
  } catch (e) {
    console.error('callback', e);
    json(res, 500, { error: 'server error' });
  }
};
