/* המחירים והמבצעים הפעילים, לתצוגה באתר (בלי קופונים) */
'use strict';
const { loadConfig, publicPricing, json } = require('./_lib');
module.exports = async (req, res) => {
  const pub = publicPricing(await loadConfig());
  /* אילו שירותים פעילים (למשל תזכורות קוליות, שאפשר לכבות לגמרי בדף הניהול) */
  try { pub.voice = await require('./_voice').ready(); } catch (e) { pub.voice = false; }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
  res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(pub));
};
