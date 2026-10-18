/* Worker קטן ב-Cloudflare שמפעיל פעם ביום את ריצת הלילה של האתר (תזכורות, גיבוי, ניקוי).
   נדרש רק אם האתר עובר ל-Cloudflare Pages (ב-Vercel זה מוגדר ב-vercel.json).
   הקמה: Workers & Pages → Create → Worker → מדביקים את הקוד → Deploy.
   Settings → Variables: CRON_SECRET (אותו ערך כמו באתר, מוצפן), SITE = https://www.myluach.org
   Settings → Triggers → Cron Triggers → Add: 0 4 * * *   (04:00 UTC, כלומר 06:00–07:00 בישראל) */
export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(fetch((env.SITE || 'https://www.myluach.org') + '/api/cron-reminders', { headers: { Authorization: 'Bearer ' + env.CRON_SECRET } })
      .then(r => r.text()).then(t => console.log('cron', t.slice(0, 300))));
  },
  async fetch() { return new Response('MyLuach cron worker'); }
};
