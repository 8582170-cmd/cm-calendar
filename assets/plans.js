/* לוחנו: הגדרת המסלולים. מקור אחד לדף הבית, לדף המסלולים ולמגבלות בבונה הלוח. */
(function(){
  'use strict';
  const ALL = {views:true, banners:true, extraPages:true, advZmanim:true, customSize:true, imageEditor:true, fonts:true, tfilot:true};
  const PLANS = [
    {id:'free',  name:'ניסיון',  tagline:'בונים, רואים, מתלהבים',
     price:{ils:0, usd:0}, months:13, events:30, downloads:0, watermark:true,
     features:{...ALL},
     bullets:['בונים ורואים את כל השנה, עם סימן מים חזק','כל האפשרויות פתוחות לניסיון','חודש אחד מלא להורדה, עם סימן מים עדין','פעם אחת לכל כתובת מייל']},
    {id:'basic', name:'בסיסי',   tagline:'לוח חודשי פשוט ויפה',
     price:{ils:19, usd:4.9}, months:13, events:30, downloads:1, watermark:false,
     features:{views:false, banners:false, extraPages:false, advZmanim:false, customSize:false, imageEditor:false, fonts:true, tfilot:false},
     bullets:['שנה שלמה, לוח חודשי','עד 30 אירועים משפחתיים','זמני היום ב־4 שיטות עיקריות','הורדה אחת של לוח מוכן']},
    {id:'family',name:'משפחתי',  tagline:'לכל המשפחה המורחבת',
     price:{ils:49, usd:14}, months:13, events:120, downloads:2, watermark:false,
     features:{views:true, banners:true, extraPages:true, advZmanim:false, customSize:false, imageEditor:true, fonts:true, tfilot:false},
     bullets:['כל התצוגות: חודשי, שבועי, יומי וטבלה','עד 120 אירועים משפחתיים','באנרים, עמודי ברכות ופרסומות','עורך תמונות','2 הורדות של לוח מוכן']},
    {id:'full',  name:'מלא',     tagline:'הכל פתוח, בלי חשבונות',
     price:{ils:99, usd:30}, months:13, events:Infinity, downloads:5, watermark:false, best:true,
     features:{...ALL},
     bullets:['אירועים משפחתיים בלי הגבלה','כל שיטות הזמנים, כולל מעלות ודקות לפי בחירה','כל גודל דף, כולל מידות אישיות','זמני תפילות לבית הכנסת, מחושבים לכל יום','5 הורדות של לוח מוכן']}
  ];
  const FEATURE_NAMES = {
    views:'תצוגה שבועית, יומית וטבלה', banners:'באנרים בצדי הדף', extraPages:'עמודים נוספים (ברכות, פרסומות, הערות)',
    advZmanim:'הגדרות זמנים מתקדמות', tfilot:'זמני תפילות בבית הכנסת', customSize:'גודל דף לפי מידה', imageEditor:'עורך התמונות', events:'אירועים משפחתיים נוספים',
    months:'כל חודשי השנה', download:'הורדה והדפסה של הלוח'
  };
  const KEY = 'luchenu-plan', DL = 'luchenu-downloads';
  const get = k => { try { return localStorage.getItem(k) } catch(e) { return null } };
  const put = (k,v) => { try { localStorage.setItem(k,v) } catch(e) {} };
  const byId = id => PLANS.find(p => p.id === id) || PLANS[0];
  window.LuchenuPlans = {
    PLANS, FEATURE_NAMES, byId,
    current(){ return byId(get(KEY) || 'free') },
    /* שלב 1: המסלול נשמר בדפדפן לבדיקה. בשלב 2 הוא יגיע מהחשבון בשרת. */
    setCurrent(id){ put(KEY, id); put(DL, '0') },
    can(feature){ return !!this.current().features[feature] },
    downloadsUsed(){ return +(get(DL) || 0) },
    useDownload(){ put(DL, String(this.downloadsUsed() + 1)) },
    downloadsLeft(){ return Math.max(0, this.current().downloads - this.downloadsUsed()) },
    price(p, cur){ const v = p.price[cur]; return v === 0 ? 'חינם' : (cur === 'ils' ? v + ' ₪' : '$' + v) },
    /* מי שמסלול ממנו חסרה יכולת: המסלול הזול ביותר שכולל אותה */
    cheapestWith(feature){ return PLANS.find(p => p.id !== 'free' && (feature === 'events' ? p.events > this.current().events : feature === 'months' || feature === 'download' ? true : p.features[feature])) || PLANS[3] }
  };
})();
