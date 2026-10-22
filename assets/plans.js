/* MyLuach: הגדרת המסלולים. מקור אחד לדף הבית, לדף המסלולים ולמגבלות בבונה הלוח. */
(function(){
  'use strict';
  const ALL = {views:true, banners:true, extraPages:true, advZmanim:true, customSize:true, imageEditor:true, fonts:true, tfilot:true};
  const PLANS = [
    {id:'free',  name:'ניסיון',  tagline:'בונים, רואים, מתלהבים',
     price:{ils:0, usd:0}, months:13, events:30, downloads:0, watermark:true,
     features:{...ALL},
     bullets:['בונים ורואים את כל השנה','כל האפשרויות פתוחות לניסיון','לוח פשוט לכל השנה להורדה (עד 3 זמנים, 10 תמונות ו־25 אירועים)','חודש אחד מלא להורדה','לוח ספירה לאחור עד 40 יום: הורדה חינם']},
    {id:'basic', name:'בסיסי',   tagline:'לוח חודשי פשוט ויפה',
     price:{ils:19, usd:4.9}, months:13, events:30, downloads:1, watermark:false,
     features:{views:false, banners:false, extraPages:false, advZmanim:false, customSize:false, imageEditor:false, fonts:true, tfilot:false},
     bullets:['שנה שלמה, לוח חודשי','עד 30 אירועים משפחתיים','זמני היום ב־4 שיטות עיקריות','הורדה אחת של לוח מוכן']},
    {id:'family',name:'משפחתי',  tagline:'לכל המשפחה המורחבת',
     price:{ils:49, usd:14}, intro:50, months:13, events:120, downloads:2, watermark:false,
     features:{views:true, banners:true, extraPages:true, advZmanim:false, customSize:false, imageEditor:true, fonts:true, tfilot:false},
     bullets:['כל התצוגות: חודשי, שבועי, יומי וטבלה','עד 120 אירועים משפחתיים','באנרים, עמודי ברכות ופרסומות','עורך תמונות','2 הורדות של לוח מוכן']},
    {id:'full',  name:'מלא',     tagline:'הכל פתוח, בלי חשבונות',
     price:{ils:99, usd:30}, months:13, events:Infinity, downloads:5, watermark:false, best:true,
     features:{...ALL},
     bullets:['אירועים משפחתיים בלי הגבלה','כל שיטות הזמנים, כולל מעלות ודקות לפי בחירה','כל גודל דף, כולל מידות אישיות','זמני תפילות לבית הכנסת, מחושבים לכל יום','5 הורדות של לוח מוכן','אפשר להסתיר את השורה "הופק ע״י MyLuach.org"']}
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
  window.MyLuachPlans = {
    PLANS, FEATURE_NAMES, byId,
    current(){ return byId(get(KEY) || 'free') },
    /* שלב 1: המסלול נשמר בדפדפן לבדיקה. בשלב 2 הוא יגיע מהחשבון בשרת. */
    setCurrent(id){ put(KEY, id); put(DL, '0') },
    can(feature){ return !!this.current().features[feature] },
    downloadsUsed(){ return +(get(DL) || 0) },
    useDownload(){ put(DL, String(this.downloadsUsed() + 1)) },
    downloadsLeft(){ return Math.max(0, this.current().downloads - this.downloadsUsed()) },
    price(p, cur){ const v = p.price[cur]; return v === 0 ? 'חינם' : (cur === 'ils' ? v + ' ₪' : '$' + v) },
    fmt(v, cur){ v = Math.round(v * 10) / 10; return cur === 'ils' ? v + ' ₪' : '$' + v },
    /* הנחה פעילה למסלול: הגבוהה מבין הנחת ההיכרות למסלול ומבצע כללי פעיל (ההנחות לא מצטברות). קופון נבדק בשרת, בחלון התשלום. */
    sale: null,
    off(p){
      const intro = p.intro || 0, s = this.sale;
      const saleOn = s && s.percent > 0 && (!s.plans || s.plans.indexOf(p.id) >= 0) && (!s.until || new Date() <= new Date(s.until + 'T23:59:59'));
      if(saleOn && s.percent >= intro){
        const d = s.until ? s.until.split('-').reverse().slice(0, 2).join('.') : '';
        return { pct: s.percent, label: (s.label || s.percent + '% הנחה') + (d ? ' · עד ' + d : ''), labelEn: s.percent + '% off' + (d ? ' until ' + d : '') };
      }
      return intro ? { pct: intro, label: intro + '% הנחה ברכישה הראשונה', labelEn: intro + '% off your first purchase' } : null;
    },
    introPrice(p, cur){ const o = this.off(p); return o && p.price[cur] ? this.fmt(p.price[cur] * (100 - o.pct) / 100, cur) : null },
    priceHTML(p, cur, en){ const ip = this.introPrice(p, cur); if(!ip) return this.price(p, cur).replace('חינם', en ? 'Free' : 'חינם');
      const o = this.off(p); return '<s class="was">' + this.price(p, cur) + '</s> ' + ip + '<span class="intro-tag">' + (en ? o.labelEn : o.label) + '</span>' },
    /* מסלולים נוספים שנוצרו בדף הניהול: כל אחד מבוסס על מסלול קיים (היכולות שלו), עם שם, מחיר ומגבלות משלו.
       cd = רק ללוח ספירה לאחור. hidden = כבר לא נמכר (אבל מי שקנה אותו ממשיך ליהנות ממנו). */
    addPlans(list){
      (Array.isArray(list) ? list : []).forEach(x => {
        if(!x || !/^x[a-z0-9]{1,12}$/.test(x.id || '')) return;
        const base = PLANS.find(p => p.id === x.base && !p.custom) || PLANS[3], old = PLANS.findIndex(p => p.id === x.id);
        const p = { ...base, id:x.id, name:String(x.name || 'מסלול'), tagline:String(x.tagline || ''), price:{ ils:+x.ils || 0, usd:+x.usd || 0 }, intro:0, best:false,
          downloads: x.downloads == null || x.downloads === '' ? base.downloads : +x.downloads,
          events: x.events == null || x.events === '' ? base.events : (+x.events > 0 ? +x.events : Infinity),
          features:{ ...base.features }, bullets: Array.isArray(x.bullets) && x.bullets.length ? x.bullets.map(String) : base.bullets.slice(),
          cd: !!x.cd, hidden: !x.on, custom:true, base: base.id };
        if(old >= 0) PLANS.splice(old, 1);
        PLANS.splice(PLANS.indexOf(base) + 1, 0, p);
      });
    },
    /* המחירים והמבצעים שנקבעו בדף הניהול (מהשרת). עד שהם מגיעים מוצגים המחירים שבקובץ הזה. */
    applyPricing(d){
      if(!d || !d.plans) return;
      if(d.extra) this.addPlans(d.extra);
      PLANS.forEach(p => { const o = d.plans[p.id]; if(!o) return;
        const ok = (v, d) => typeof v === 'number' && isFinite(v) && (v > 0 || !(d > 0));
        if(ok(o.ils, p.price.ils)) p.price.ils = o.ils; if(ok(o.usd, p.price.usd)) p.price.usd = o.usd; p.intro = +o.intro || 0; });
      this.sale = d.sale || null;
    },
    ready: null,
    /* מי שמסלול ממנו חסרה יכולת: המסלול הזול ביותר שכולל אותה */
    cheapestWith(feature){ return PLANS.find(p => p.id !== 'free' && (feature === 'events' ? p.events > this.current().events : feature === 'months' || feature === 'download' ? true : p.features[feature])) || PLANS[3] }
  };
  const LPo = window.MyLuachPlans;
  LPo.ready = (typeof fetch === 'function' && typeof location !== 'undefined' && /^https?:/.test(location.protocol))
    ? fetch('/api/pricing').then(r => r.ok ? r.json() : null).then(d => { LPo.applyPricing(d); return d }).catch(() => null)
    : Promise.resolve(null);
})();
