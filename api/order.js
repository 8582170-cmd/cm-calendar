/* מצב הזמנה: הדפדפן שואל כאן אם התשלום עבר */
'use strict';
const { db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const { id } = readBody(req);
    if (!/^[0-9a-f]{24}$/.test(String(id || ''))) return json(res, 400, { error: 'bad id' });
    const rows = await db('orders?id=eq.' + id + '&select=status,plan,paid_at');
    if (!rows || !rows[0]) return json(res, 404, { error: 'not found' });
    json(res, 200, rows[0]);
  } catch (e) {
    console.error('order', e);
    json(res, 500, { error: 'server error' });
  }
};
