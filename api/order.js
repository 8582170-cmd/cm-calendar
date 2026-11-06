/* מצב הזמנה: הדפדפן שואל כאן אם התשלום עבר */
'use strict';
const { db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const { id } = readBody(req);
    if (!/^[0-9a-f]{24}$/.test(String(id || ''))) return json(res, 400, { error: 'bad id' });
    const rows = await db('orders?id=eq.' + id + '&select=id,status,plan,paid_at,amount,email,user_id,coupon,callback');
    if (!rows || !rows[0]) return json(res, 404, { error: 'not found' });
    const o = rows[0];
    /* ביט: בודקים אצל נדרים אם הלקוח כבר אישר באפליקציה (בנוסף לעדכון שנדרים שולחים) */
    if (o.status === 'pending' && o.callback && o.callback.bit && o.callback.bit.pre) {
      try { const c = await require('./_nedarim').bitCheck(o.callback.bit.pre);
        if (c.ok) { await require('./_paid').markPaid(o, { txn: c.tid, callback: { bit: o.callback.bit, TransactionId: c.tid } }, 'ביט'); o.status = 'paid'; }
        else if (/לא אושרה/.test(c.msg)) { await db('orders?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'failed' }) }); o.status = 'failed'; } } catch (e) {}
    }
    json(res, 200, { status: o.status, plan: o.plan, paid_at: o.paid_at });
  } catch (e) {
    console.error('order', e);
    json(res, 500, { error: 'server error' });
  }
};
