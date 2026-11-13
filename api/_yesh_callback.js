/* יש חשבונית שולחים לכאן עדכון כשתשלום בדף התשלום שלהם הסתיים (NotifyUrl, נקבע לכל הזמנה בנפרד).
   הכתובת כוללת את מספר ההזמנה וחתימה (id, s), כך שאי אפשר לזייף עדכון בלי הסוד שבשרת.
   (ה-Webhooks הכלליים בחשבון ביש חשבונית לא נחוצים לזה: הם לא יודעים לאיזו הזמנה באתר הם שייכים.)
   כל עדכון נשמר בהזמנה (callback.yesh.log), כדי שאפשר יהיה לראות בדיוק מה הגיע. */
'use strict';
const { db, readBody, json } = require('./_lib');

module.exports = async (req, res) => {
  const q = req.query || {}, p = readBody(req); delete p.id; delete p.s; /* id ו-s מגיעים בכתובת, לא שומרים את החתימה */
  console.log('yesh callback', JSON.stringify(p).slice(0, 2000));
  try {
    const Y = require('./_yesh');
    const id = String(q.id || '');
    if (!/^[0-9a-f]{24}$/.test(id) || !Y.ready() || !Y.sigOk(id, q.s)) return json(res, 403, { error: 'signature' });
    const rows = await db('orders?id=eq.' + id + '&select=*'); const o = rows && rows[0];
    if (!o) return json(res, 404, { error: 'no order' });
    const r = Y.parse(p), cb = o.callback && typeof o.callback === 'object' ? o.callback : {};
    const prev = (cb.yesh && cb.yesh.log) || [];
    const yesh = { ...(cb.yesh || {}), log: [...prev, { at: new Date().toISOString(), ok: r.ok, body: p }].slice(-6) };
    if (r.docNumber) { yesh.doc = r.docNumber; if (r.pdf) yesh.pdf = r.pdf; }
    /* כבר שולם: רק שומרים את העדכון (למשל קבלה שנוצרה אחרי האישור) */
    if (o.status === 'paid') { await db('orders?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ callback: { ...cb, yesh } }) }); return json(res, 200, { ok: true, already: true }); }
    const enough = r.amount == null || r.amount + 0.001 >= Number(o.amount);
    if (r.ok === true && enough) {
      await require('./_paid').markPaid(o, { txn: r.txn || o.txn || '', callback: { ...cb, yesh } }, 'יש חשבונית');
      return json(res, 200, { ok: true });
    }
    /* נכשל, שולם חלקית, או עדכון שלא ברור ממנו אם התשלום עבר: ההזמנה לא נפתחת, והעדכון נשמר לבדיקה בניהול */
    const status = r.ok === false ? 'failed' : r.ok === true ? 'underpaid' : o.status;
    await db('orders?id=eq.' + id, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status, callback: { ...cb, yesh } }) });
    json(res, 200, { ok: true });
  } catch (e) {
    console.error('yesh callback', e);
    json(res, 500, { error: 'server error' });
  }
};
