/* Worker ב-Cloudflare שמפעיל פעם ביום את משימת הלילה של האתר (תזכורות, גיבוי, ניקוי).
   בשבת ובחג (לפי ארץ ישראל) הוא לא פונה לאתר בכלל. רשימת החגים מחושבת מראש עד 2041.
   הקמה: Workers & Pages → Create → Worker → מדביקים את הקוד → Deploy.
   Settings → Variables: CRON_SECRET (אותו ערך כמו באתר, Secret), SITE = https://www.myluach.org
   Settings → Trigger events → Cron triggers: 0 4 * * SUN-FRI   (04:00 UTC, כלומר 06:00–07:00 בישראל)
   ב-Vercel המשימה הייתה מוגדרת ב-vercel.json תחת "crons" והוסרה במעבר. לחזרה ל-Vercel: להחזיר {"path":"/api/cron-reminders","schedule":"0 4 * * *"} */
const YT = '270422,270428,270611,271003,271011,280411,280417,280531,280921,280922,281005,281012,290406,290520,290910,290911,290919,290924,291001,300418,300424,300607,300929,301007,310408,310414,310528,310918,310919,311002,311009,320402,320516,320906,320907,320915,320920,320927,330414,330420,330603,330925,331003,340404,340410,340524,340914,340915,340928,341005,350424,350430,350613,351004,351005,351018,351025,360418,360601,360922,360923,361001,361006,361013,370331,370406,370520,370910,370911,370924,371001,380420,380426,380609,380930,381001,381014,381021,390415,390529,390919,390920,390928,391003,391010,400329,400404,400518,400909,400917,410416,410422,410605'.split(',');
export default {
  async scheduled(event, env, ctx) {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date(event.scheduledTime));
    const g = t => (p.find(x => x.type === t) || {}).value;
    if (g('weekday') === 'Sat' || YT.includes(g('year').slice(2) + g('month') + g('day'))) return console.log('shabbat/yom tov: skipped');
    ctx.waitUntil(fetch((env.SITE || 'https://www.myluach.org') + '/api/cron-reminders', { headers: { Authorization: 'Bearer ' + env.CRON_SECRET } })
      .then(r => r.text()).then(t => console.log('cron', t.slice(0, 300))));
  },
  async fetch() { return new Response('MyLuach cron worker'); }
};
