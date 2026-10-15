/* פעולות של משתמש מחובר (מאוחדות לפונקציה אחת, בגלל מגבלת מספר הפונקציות ב-Vercel):
   ?fn=lite  לוח חינמי לשנה · ?fn=phone אימות טלפון · ?fn=voice תזכורות קוליות · ?fn=appt פגישות */
'use strict';
const { json } = require('./_lib');
const H = { lite: require('./_u_lite'), phone: require('./_u_phone'), voice: require('./_u_voice'), appt: require('./_u_appt') };
module.exports = (req, res) => { const f = H[String((req.query || {}).fn || '')]; return f ? f(req, res) : json(res, 404, { error: 'fn' }); };
