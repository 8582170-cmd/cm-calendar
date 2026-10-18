/* קורא את מאגר דברי הימים מ-assets/yz.js (הקובץ שהאתר טוען) בשרת */
'use strict';
let CACHE = null;
function loadYZ() {
  if (CACHE) return CACHE;
  const { k: k64, d: d64 } = require('./_yzdata');
  const key = Buffer.from(k64, 'base64'), b = Buffer.from(d64, 'base64');
  for (let i = 0; i < b.length; i++) b[i] ^= key[i % key.length] ^ ((i * 131) & 255);
  const o = JSON.parse(b.toString('utf8'));
  CACHE = { list: o.YZ.map((e, i) => ({ id: i, m: e[0], d: e[1], y: e[2] || '', t: e[3] || '', p: e[4] ? 1 : 0 })).filter(e => e.t), sel: o.SEL || [] };
  return CACHE;
}
module.exports = { loadYZ };
