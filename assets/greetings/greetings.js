/* ברכות והזמנות: הקטגוריות, העיצובים המובנים, וציור עיצוב על canvas.
   אותו ציור משמש לתצוגה בגלריה, לתצוגה החיה בעורך ולקובץ ההורדה, כך שמה שרואים הוא מה שמודפס.
   יחידות העיצוב: דף A4 ב-96dpi (794×1123). בהורדה מגדילים ל-300dpi (2480×3508). */
(function(){
'use strict';
var W = 794, H = 1123;

var CATS = [
  ['wedding','חתונה'],['engagement','אירוסין / וורט'],['anniversary','יום נישואין'],['barmitzvah','בר מצווה'],['batmitzvah','בת מצווה'],
  ['birth','ברית / הולדת'],['birthday','יום הולדת'],['donors','תורמים והוקרה'],['torah','הכנסת ספר תורה'],['siyum','סיום מסכת'],
  ['home','חנוכת בית'],['business','פתיחת עסק'],['shul','חנוכת בית כנסת'],['shabbat','שבת התאחדות / אירוע תורני'],
  ['roshhashana','ראש השנה'],['yomkippur','יום כיפור'],['sukkot','סוכות'],['simchattorah','שמחת תורה'],['chanukah','חנוכה'],
  ['tubishvat','ט״ו בשבט'],['purim','פורים'],['pesach','פסח'],['lagbaomer','ל״ג בעומר'],['shavuot','שבועות'],['condolence','ניחום אבלים']
];
var KINDS = { greeting: 'ברכה', invite: 'הזמנה' };

/* אזור טקסט: k מזהה, label לטופס, x y w h מיקום, font size weight color, align, lh גובה שורה, multi שדה רב-שורות, text ברירת מחדל */
function Z(k, label, y, h, size, o){
  o = o || {};
  return { k: k, label: label, x: o.x == null ? 207 : o.x, y: y, w: o.w == null ? 380 : o.w, h: h,
    font: o.font || 'Frank Ruhl Libre', size: size, weight: o.weight || 400, color: o.color || '#14213d',
    align: o.align || 'center', lh: o.lh || 1.45, multi: !!o.multi, text: o.text || '' };
}

var TEMPLATES = [
  { id: 'gate-wedding', title: 'שער מפואר', cat: 'wedding', kind: 'greeting', price: 0,
    bg: { svg: '/assets/greetings/bg/gate.svg?v=1' },
    colors: [
      { k: 'BG', label: 'צבע הרקע', def: '#14213d', options: [['#14213d','כחול לילה'],['#4a1420','בורדו'],['#123d33','ירוק אמרלד'],['#1c1c1c','שחור']] },
      { k: 'GOLD', label: 'צבע העיטורים', def: '#c9a24a', options: [['#c9a24a','זהב'],['#b9bcc4','כסף'],['#c98a5a','נחושת']] }
    ],
    zones: [
      Z('bsd','בס״ד',282,22,13,{x:520,w:70,align:'right',color:'#6b5420',text:'בס״ד'}),
      Z('quote','פסוק פתיחה',318,34,24,{x:237,w:320,font:'Bellefair',color:'#8a6a22',text:'״קול ששון וקול שמחה״'}),
      Z('title','כותרת',354,70,56,{x:217,w:360,font:'Suez One',text:'מזל טוב'}),
      Z('intro','פתיחה',432,58,17,{multi:true,text:'ברגשי גיל ושמחה נשגר ברכתנו\nלכבוד ידידנו היקר והנעלה'}),
      Z('name','שם המבורך',494,44,30,{font:'Suez One',color:'#8a6a22',text:'הרב ישראל ישראלי שליט״א'}),
      Z('occasion','לרגל',544,56,17,{multi:true,text:'לרגל השמחה השרויה במעונו\nבנישואי בנו החתן היקר'}),
      Z('name2','שם החתן',602,38,26,{font:'Suez One',text:'משה נ״י'}),
      Z('body','גוף הברכה',652,200,16,{x:222,w:350,lh:1.75,multi:true,text:'יהי רצון שיעלה הזיווג יפה, שתזכו לבנות יחד בית נאמן בישראל, ולראות דורות ישרים ומבורכים, מתוך שמחה, בריאות ונחת דקדושה.'}),
      Z('signLabel','לפני החתימה',872,24,15,{color:'#6b5420',text:'המברכים בשמחה ובהערכה'}),
      Z('sign','חתימה',900,64,20,{weight:700,multi:true,text:'הנהלת בית הכנסת והמתפללים'})
    ] },

  { id: 'vine-wedding', title: 'מסגרת גפן', cat: 'wedding', kind: 'invite', price: 0,
    bg: { svg: '/assets/greetings/bg/vine.svg?v=1' },
    colors: [
      { k: 'LEAF', label: 'צבע העלים', def: '#4f6b3a', options: [['#4f6b3a','ירוק זית'],['#2f5b63','ירוק-כחול'],['#7a5a3a','חום עתיק']] },
      { k: 'GOLD', label: 'צבע הקווים', def: '#b08d3c', options: [['#b08d3c','זהב'],['#9da3ab','כסף']] }
    ],
    zones: [
      Z('bsd','בס״ד',120,22,13,{x:600,w:70,align:'right',color:'#5c6b4e',text:'בס״ד'}),
      Z('opener','פתיחה',180,34,22,{x:140,w:514,font:'Bellefair',color:'#8a6d2a',text:'בשבח והודיה לבורא עולם'}),
      Z('invite','הזמנה',220,64,18,{x:160,w:474,multi:true,color:'#2f3a26',text:'אנו שמחים להזמינכם להשתתף\nבשמחת נישואי ילדינו היקרים'}),
      Z('groom','שם החתן',300,64,44,{x:140,w:514,font:'Suez One',color:'#3d5530',text:'משה נ״י'}),
      Z('conj','בין השמות',368,30,22,{x:140,w:514,font:'Bellefair',color:'#8a6d2a',text:'עב״ג'}),
      Z('bride','שם הכלה',402,64,44,{x:140,w:514,font:'Suez One',color:'#3d5530',text:'שרה תחי׳'}),
      Z('details','מועד ומקום',500,100,18,{x:140,w:514,lh:1.75,multi:true,color:'#2f3a26',text:'שתתקיים אי״ה בשעה טובה ומוצלחת\nביום שלישי י״ב בכסלו תשפ״ז\nבאולם ״היכל הנגינה״, ירושלים'}),
      Z('times','שעות',606,30,17,{x:140,w:514,color:'#5c6b4e',text:'קבלת פנים 19:00 · חופה 19:30'}),
      Z('p1Label','כותרת הורי החתן',800,24,14,{x:400,w:254,color:'#5c6b4e',text:'הורי החתן'}),
      Z('p1','הורי החתן',826,64,19,{x:400,w:254,weight:700,multi:true,color:'#2f3a26',text:'יעקב ורחל כהן'}),
      Z('p2Label','כותרת הורי הכלה',800,24,14,{x:140,w:254,color:'#5c6b4e',text:'הורי הכלה'}),
      Z('p2','הורי הכלה',826,64,19,{x:140,w:254,weight:700,multi:true,color:'#2f3a26',text:'אברהם ולאה לוי'})
    ] },

  { id: 'harps-barmitzvah', title: 'כינורות', cat: 'barmitzvah', kind: 'greeting', price: 0,
    bg: { svg: '/assets/greetings/bg/harps.svg?v=1' },
    colors: [
      { k: 'MAIN', label: 'צבע המסגרת', def: '#6e1f2c', options: [['#6e1f2c','בורדו'],['#1d3557','כחול'],['#2f4a3a','ירוק']] },
      { k: 'GOLD', label: 'צבע העיטורים', def: '#b8933f', options: [['#b8933f','זהב'],['#9da3ab','כסף']] }
    ],
    zones: [
      Z('bsd','בס״ד',96,22,13,{x:610,w:70,align:'right',color:'#7a4a52',text:'בס״ד'}),
      Z('quote','פסוק פתיחה',176,34,22,{x:257,w:280,font:'Bellefair',color:'#8a6d2a',text:'״טוב להודות לה׳״'}),
      Z('title','כותרת',212,74,58,{x:247,w:300,font:'Suez One',color:'#6e1f2c',text:'מזל טוב'}),
      Z('intro','פתיחה',318,62,18,{x:142,w:510,multi:true,color:'#3a1d22',text:'ברגשי שמחה והוקרה נשגרת ברכתנו\nלכבוד ידידנו היקר והחשוב'}),
      Z('name','שם המבורך',386,46,32,{x:142,w:510,font:'Suez One',color:'#6e1f2c',text:'ר׳ אהרן גולדברג הי״ו'}),
      Z('family','משפחה',436,26,17,{x:142,w:510,color:'#7a4a52',text:'ולכל בני המשפחה'}),
      Z('occasion','לרגל',472,60,18,{x:142,w:510,multi:true,color:'#3a1d22',text:'לרגל הכנס בנו היקר\nלעול תורה ומצוות'}),
      Z('name2','שם בן המצווה',538,44,30,{x:142,w:510,font:'Suez One',color:'#3a1d22',text:'יוסף נ״י'}),
      Z('body','גוף הברכה',596,170,17,{x:162,w:470,lh:1.8,multi:true,color:'#3a1d22',text:'יהי רצון שיגדל לתורה, לחופה ולמעשים טובים, ותרוו ממנו ומכל יוצאי חלציכם רוב נחת ושמחה, מתוך בריאות ושפע ברכה.'}),
      Z('signLabel','לפני החתימה',862,24,15,{x:142,w:510,color:'#7a4a52',text:'המברכים בלב שמח'}),
      Z('sign','חתימה',890,56,21,{x:142,w:510,weight:700,multi:true,color:'#3a1d22',text:'חברי הכולל'})
    ] }
];

/* הגופנים שהלקוח יכול לבחור לכל שורה */
var FONTS = [
  ['Frank Ruhl Libre','פרנק רוהל (קלאסי)'],['Suez One','סואץ (כותרות)'],['Bellefair','בלפייר (עדין)'],['David Libre','דוד'],
  ['Noto Serif Hebrew','נוטו סריף'],['Secular One','סקולר (מודגש)'],['Assistant','אסיסטנט (נקי)'],['Heebo','היבו (מודרני)'],
  ['Noto Rashi Hebrew','כתב רש״י'],['Amatic SC','אמטיק (כתב יד)']
];
var FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@400;700&family=Suez+One&family=Bellefair&family=David+Libre:wght@400;700&family=Noto+Serif+Hebrew:wght@400;700&family=Secular+One&family=Assistant:wght@400;700&family=Heebo:wght@400;700&family=Noto+Rashi+Hebrew:wght@400;700&family=Amatic+SC:wght@400;700&display=swap';

/* שדות קבועים שמשותפים לעיצובים, כדי שנוסח מוכן מהניהול ימלא את השדות המתאימים בכל עיצוב */
var FIELDS = [
  ['quote','פסוק / שורת פתיחה'],['title','כותרת'],['intro','פתיחה'],['name','שם המבורך'],['occasion','לרגל'],
  ['name2','שם נוסף (חתן / בן מצווה)'],['body','גוף הברכה'],['signLabel','לפני החתימה'],['sign','חתימה'],
  ['opener','פתיחת ההזמנה'],['invite','נוסח ההזמנה'],['details','מועד ומקום'],['times','שעות']
];

var fontLoads = {};
function loadFont(f, w){
  var key = f + w;
  if (!fontLoads[key]) fontLoads[key] = document.fonts.load(w + ' 20px "' + f + '"', 'אבג abc 123').catch(function(){});
  return fontLoads[key];
}
function fontsReady(list){
  var ps = [];
  (list || ['Frank Ruhl Libre','Suez One','Bellefair']).forEach(function(f){ ps.push(loadFont(f, 400), loadFont(f, 700)); });
  return Promise.all(ps);
}

var svgCache = {}, imgCache = {};
function bgImage(tpl, colors){
  if (tpl.bg.img) {
    var u = tpl.bg.img;
    if (!imgCache[u]) imgCache[u] = new Promise(function(ok, bad){ var i = new Image(); i.crossOrigin = 'anonymous'; i.onload = function(){ ok(i) }; i.onerror = bad; i.src = u; });
    return imgCache[u];
  }
  var src = tpl.bg.svg;
  if (!svgCache[src]) svgCache[src] = fetch(src).then(function(r){ return r.text() });
  return svgCache[src].then(function(txt){
    (tpl.colors || []).forEach(function(c){ txt = txt.split('%' + c.k + '%').join(colors[c.k] || c.def); });
    var key = src + '|' + JSON.stringify(colors);
    if (!imgCache[key]) imgCache[key] = new Promise(function(ok, bad){
      var i = new Image(); i.onload = function(){ ok(i) }; i.onerror = bad;
      i.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(txt);
    });
    return imgCache[key];
  });
}

/* האזור אחרי השינויים של הלקוח: גופן, גודל, צבע, הדגשה, יישור, הזזה, מרווח שורות */
function eff(z, st){
  st = st || {};
  var hh = z.h * Math.max(1, st.size || 1);
  return { k: z.k, x: z.x + (st.dx || 0), y: z.y + (st.dy || 0) - (hh - z.h) / 2, w: z.w, h: hh,
    font: st.font || z.font, size: z.size * (st.size || 1), weight: st.bold == null ? z.weight : (st.bold ? 700 : 400),
    color: st.color || z.color, align: st.align || z.align, lh: z.lh * (st.lh || 1), hidden: !!st.hidden };
}
function fontStr(z, size){ return (z.weight >= 600 ? 700 : 400) + ' ' + size + 'px "' + z.font + '", "Frank Ruhl Libre", serif'; }

/* שבירת שורות לפי רוחב האזור; אם לא נכנס, מקטינים את הגופן עד שהכל נכנס לגובה */
function layout(ctx, z, text){
  var paras = String(text || '').split('\n'), size, lines;
  for (size = z.size; size >= Math.max(6, z.size * 0.4); size -= 0.5) {
    ctx.font = fontStr(z, size);
    lines = []; var wide = false;
    paras.forEach(function(p){
      var words = p.split(/\s+/).filter(Boolean), line = '';
      if (!words.length) { lines.push(''); return; }
      words.forEach(function(w){
        var t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width <= z.w || !line) line = t; else { lines.push(line); line = w; }
        if (ctx.measureText(line).width > z.w) wide = true;
      });
      lines.push(line);
    });
    var lh = size * z.lh, total = lines.length * lh - (lh - size);
    if (!wide && total <= z.h + 0.5) return { size: size, lines: lines, lh: lh, total: total };
  }
  return { size: size, lines: lines, lh: size * z.lh, total: lines.length * size * z.lh };
}

/* state: { colors:{K:#hex}, texts:{k:text}, style:{k:{font,size,color,bold,align,dx,dy,lh,hidden}} }
   opt: { scale, watermark, selected: k } */
function render(canvas, tpl, state, opt){
  opt = opt || {};
  var scale = opt.scale || 1;
  state = state || {};
  var colors = state.colors || {}, texts = state.texts || {}, style = state.style || {};
  var used = {};
  tpl.zones.forEach(function(z){ used[(style[z.k] && style[z.k].font) || z.font] = 1; });
  return Promise.all([fontsReady(Object.keys(used)), bgImage(tpl, colors)]).then(function(r){
    var img = r[1];
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    tpl.zones.forEach(function(z0){
      var z = eff(z0, style[z0.k]);
      var t = texts[z.k] != null ? texts[z.k] : z0.text;
      if (opt.selected === z.k) {
        ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5 / scale * 2; ctx.strokeStyle = '#1f8a96';
        ctx.strokeRect(z.x - 4, z.y - 3, z.w + 8, z.h + 6); ctx.restore();
      }
      if (z.hidden || !String(t).trim()) return;
      var L = layout(ctx, z, t);
      ctx.fillStyle = z.color;
      ctx.textAlign = z.align;
      var x = z.align === 'right' ? z.x + z.w : z.align === 'left' ? z.x : z.x + z.w / 2;
      var y = z.y + (z.h - L.total) / 2 + L.size * 0.9;
      L.lines.forEach(function(line, i){ ctx.fillText(line, x, y + i * L.lh); });
    });
    if (opt.watermark) {
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#000'; ctx.font = '700 46px "Frank Ruhl Libre", serif'; ctx.textAlign = 'center';
      for (var yy = 160; yy < H; yy += 220) { ctx.save(); ctx.translate(W / 2, yy); ctx.rotate(-0.42); ctx.fillText('MyLuach · תצוגה מקדימה', 0, 0); ctx.restore(); }
      ctx.restore();
    }
    return canvas;
  });
}

/* לחיצה על התצוגה: איזה אזור טקסט נמצא בנקודה (ביחידות העיצוב) */
function hit(tpl, state, x, y){
  var style = (state && state.style) || {}, best = null;
  tpl.zones.forEach(function(z0){
    var z = eff(z0, style[z0.k]);
    if (x >= z.x - 6 && x <= z.x + z.w + 6 && y >= z.y - 6 && y <= z.y + z.h + 6) {
      var a = z.w * z.h; if (!best || a < best.a) best = { k: z.k, a: a };
    }
  });
  return best && best.k;
}

function defaults(tpl){
  var s = { colors: {}, texts: {}, style: {} };
  (tpl.colors || []).forEach(function(c){ s.colors[c.k] = c.def; });
  tpl.zones.forEach(function(z){ s.texts[z.k] = z.text; });
  return s;
}

window.Greetings = { W: W, H: H, CATS: CATS, KINDS: KINDS, TEMPLATES: TEMPLATES, FONTS: FONTS, FONTS_CSS: FONTS_CSS, FIELDS: FIELDS, hit: hit, eff: eff,
  catName: function(id){ var c = CATS.find(function(x){ return x[0] === id }); return c ? c[1] : id; },
  get: function(id){ return TEMPLATES.find(function(t){ return t.id === id }); },
  render: render, defaults: defaults, fontsReady: fontsReady };
})();
