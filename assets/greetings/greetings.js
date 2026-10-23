/* ברכות והזמנות: הקטגוריות, העיצובים המובנים, וציור עיצוב על canvas.
   אותו ציור משמש לתצוגה בגלריה, לתצוגה החיה בעורך ולקובץ ההורדה, כך שמה שרואים הוא מה שמודפס.
   יחידות העיצוב: דף A4 ב-96dpi (794×1123). בהורדה מגדילים ל-300dpi (2480×3508).
   הטקסט בנוי מפסקאות (בלוקים) שזורמות אחת אחרי השנייה בתוך אזור הטקסט של העיצוב.
   הלקוח מוסיף, מוחק ומזיז פסקאות, ומשנה לכל אחת גופן, גודל, צבע, יישור ורווח מעליה. */
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

/* פסקת טקסט. k: תפקיד קבוע (לנוסחים מוכנים מהניהול). gap: רווח מעל הפסקה. צבע שמתחיל ב-@ לוקח את צבע העיצוב באותו שם */
function T(k, text, size, o){
  o = o || {};
  return { type: 'text', k: k || '', text: text, text2: o.text2 || '', cols: !!o.cols, font: o.font || 'Frank Ruhl Libre', size: size,
    bold: !!o.bold, color: o.color || '#14213d', align: o.align || 'center', lh: o.lh || 1.45, gap: o.gap == null ? 8 : o.gap };
}
/* קישוט מפריד */
function D(o){ o = o || {}; return { type: 'divider', style: o.style || 'flourish', color: o.color || '@GOLD', width: o.width || 0.5, gap: o.gap == null ? 10 : o.gap }; }

var TEMPLATES = [
  { id: 'gate-wedding', title: 'שער מפואר', cat: 'wedding', kind: 'greeting', price: 0,
    bg: { svg: '/assets/greetings/bg/gate.svg?v=1' },
    area: { x: 200, y: 268, w: 394, h: 742 },
    colors: [
      { k: 'BG', label: 'צבע הרקע', def: '#14213d', options: [['#14213d','כחול לילה'],['#4a1420','בורדו'],['#123d33','ירוק אמרלד'],['#1c1c1c','שחור']] },
      { k: 'GOLD', label: 'צבע העיטורים', def: '#c9a24a', options: [['#c9a24a','זהב'],['#b9bcc4','כסף'],['#c98a5a','נחושת']] }
    ],
    blocks: [
      T('', 'בס״ד', 13, { align: 'right', color: '#6b5420', gap: 0 }),
      T('quote', '״קול ששון וקול שמחה״', 24, { font: 'Bellefair', color: '#8a6a22', gap: 8 }),
      T('title', 'מזל טוב', 56, { font: 'Suez One', gap: 0 }),
      T('intro', 'ברגשי גיל ושמחה נשגר ברכתנו\nלכבוד ידידנו היקר והנעלה', 17, { gap: 10 }),
      T('name', 'הרב ישראל ישראלי שליט״א', 30, { font: 'Suez One', color: '#8a6a22', gap: 6 }),
      D({ gap: 12 }),
      T('occasion', 'לרגל השמחה השרויה במעונו\nבנישואי בנו החתן היקר', 17, { gap: 10 }),
      T('name2', 'משה נ״י', 26, { font: 'Suez One', gap: 4 }),
      D({ style: 'dots', gap: 12 }),
      T('body', 'יהי רצון שיעלה הזיווג יפה, שתזכו לבנות יחד בית נאמן בישראל, ולראות דורות ישרים ומבורכים, מתוך שמחה, בריאות ונחת דקדושה.', 16, { lh: 1.75, gap: 12 }),
      T('signLabel', 'המברכים בשמחה ובהערכה', 15, { color: '#6b5420', gap: 26 }),
      T('sign', 'הנהלת בית הכנסת והמתפללים', 20, { bold: true, gap: 4 })
    ] },

  { id: 'vine-wedding', title: 'מסגרת גפן', cat: 'wedding', kind: 'invite', price: 0,
    bg: { svg: '/assets/greetings/bg/vine.svg?v=1' },
    area: { x: 130, y: 118, w: 534, h: 800 },
    colors: [
      { k: 'LEAF', label: 'צבע העלים', def: '#4f6b3a', options: [['#4f6b3a','ירוק זית'],['#2f5b63','ירוק-כחול'],['#7a5a3a','חום עתיק']] },
      { k: 'GOLD', label: 'צבע הקווים', def: '#b08d3c', options: [['#b08d3c','זהב'],['#9da3ab','כסף']] }
    ],
    blocks: [
      T('', 'בס״ד', 13, { align: 'right', color: '#5c6b4e', gap: 0 }),
      T('opener', 'בשבח והודיה לבורא עולם', 22, { font: 'Bellefair', color: '#8a6d2a', gap: 26 }),
      T('invite', 'אנו שמחים להזמינכם להשתתף\nבשמחת נישואי ילדינו היקרים', 18, { color: '#2f3a26', gap: 8 }),
      T('groom', 'משה נ״י', 44, { font: 'Suez One', color: '@LEAF', gap: 16 }),
      T('', 'עב״ג', 22, { font: 'Bellefair', color: '#8a6d2a', gap: 0 }),
      T('bride', 'שרה תחי׳', 44, { font: 'Suez One', color: '@LEAF', gap: 0 }),
      D({ gap: 18 }),
      T('details', 'שתתקיים אי״ה בשעה טובה ומוצלחת\nביום שלישי י״ב בכסלו תשפ״ז\nבאולם ״היכל הנגינה״, ירושלים', 18, { lh: 1.7, color: '#2f3a26', gap: 14 }),
      T('times', 'קבלת פנים 19:00 · חופה 19:30', 17, { color: '#5c6b4e', gap: 8 }),
      T('', 'הורי החתן', 14, { cols: true, text2: 'הורי הכלה', color: '#5c6b4e', gap: 46 }),
      T('', 'יעקב ורחל כהן', 19, { cols: true, text2: 'אברהם ולאה לוי', bold: true, color: '#2f3a26', gap: 2 })
    ] },

  { id: 'harps-barmitzvah', title: 'כינורות', cat: 'barmitzvah', kind: 'greeting', price: 0,
    bg: { svg: '/assets/greetings/bg/harps.svg?v=1' },
    area: { x: 140, y: 96, w: 514, h: 866, valign: 'top' },
    colors: [
      { k: 'MAIN', label: 'צבע המסגרת', def: '#6e1f2c', options: [['#6e1f2c','בורדו'],['#1d3557','כחול'],['#2f4a3a','ירוק']] },
      { k: 'GOLD', label: 'צבע העיטורים', def: '#b8933f', options: [['#b8933f','זהב'],['#9da3ab','כסף']] }
    ],
    blocks: [
      T('', 'בס״ד', 13, { align: 'right', color: '#7a4a52', gap: 0 }),
      T('quote', '״טוב להודות לה׳״', 22, { font: 'Bellefair', color: '#8a6d2a', gap: 50 }),
      T('title', 'מזל טוב', 58, { font: 'Suez One', color: '@MAIN', gap: 0 }),
      T('intro', 'ברגשי שמחה והוקרה נשגרת ברכתנו\nלכבוד ידידנו היקר והחשוב', 18, { color: '#3a1d22', gap: 34 }),
      T('name', 'ר׳ אהרן גולדברג הי״ו', 32, { font: 'Suez One', color: '@MAIN', gap: 6 }),
      T('', 'ולכל בני המשפחה', 17, { color: '#7a4a52', gap: 2 }),
      D({ gap: 12 }),
      T('occasion', 'לרגל הכנס בנו היקר\nלעול תורה ומצוות', 18, { color: '#3a1d22', gap: 10 }),
      T('name2', 'יוסף נ״י', 30, { font: 'Suez One', color: '#3a1d22', gap: 4 }),
      T('body', 'יהי רצון שיגדל לתורה, לחופה ולמעשים טובים, ותרוו ממנו ומכל יוצאי חלציכם רוב נחת ושמחה, מתוך בריאות ושפע ברכה.', 17, { lh: 1.8, color: '#3a1d22', gap: 24 }),
      T('signLabel', 'המברכים בלב שמח', 15, { color: '#7a4a52', gap: 120 }),
      T('sign', 'חברי הכולל', 21, { bold: true, color: '#3a1d22', gap: 4 })
    ] }
];

/* הגופנים שהלקוח יכול לבחור (Google Fonts, רישיון חופשי לשימוש מסחרי): [שם, שפה he/en, סוג, יש מודגש] */
var FONTS = [
  ["Alef", "he", "SANS_SERIF", 1],
  ["Amatic SC", "he", "HANDWRITING", 1],
  ["Assistant", "he", "SANS_SERIF", 1],
  ["Bellefair", "he", "SERIF", 0],
  ["Bona Nova", "he", "SERIF", 1],
  ["Bona Nova SC", "he", "SERIF", 1],
  ["David Libre", "he", "SERIF", 1],
  ["Frank Ruhl Libre", "he", "SERIF", 1],
  ["Fredoka", "he", "SANS_SERIF", 1],
  ["Gveret Levin", "he", "HANDWRITING", 0],
  ["Heebo", "he", "SANS_SERIF", 1],
  ["IBM Plex Sans Hebrew", "he", "SANS_SERIF", 1],
  ["Karantina", "he", "DISPLAY", 1],
  ["Miriam Libre", "he", "SANS_SERIF", 1],
  ["Noto Rashi Hebrew", "he", "SERIF", 1],
  ["Noto Sans Hebrew", "he", "SANS_SERIF", 1],
  ["Noto Serif Hebrew", "he", "SERIF", 1],
  ["Playpen Sans Hebrew", "he", "HANDWRITING", 1],
  ["Rubik", "he", "SANS_SERIF", 1],
  ["Rubik 80s Fade", "he", "DISPLAY", 0],
  ["Rubik Beastly", "he", "DISPLAY", 0],
  ["Rubik Broken Fax", "he", "DISPLAY", 0],
  ["Rubik Bubbles", "he", "DISPLAY", 0],
  ["Rubik Burned", "he", "DISPLAY", 0],
  ["Rubik Dirt", "he", "DISPLAY", 0],
  ["Rubik Distressed", "he", "DISPLAY", 0],
  ["Rubik Doodle Shadow", "he", "DISPLAY", 0],
  ["Rubik Doodle Triangles", "he", "DISPLAY", 0],
  ["Rubik Gemstones", "he", "DISPLAY", 0],
  ["Rubik Glitch", "he", "DISPLAY", 0],
  ["Rubik Glitch Pop", "he", "DISPLAY", 0],
  ["Rubik Iso", "he", "DISPLAY", 0],
  ["Rubik Lines", "he", "DISPLAY", 0],
  ["Rubik Maps", "he", "DISPLAY", 0],
  ["Rubik Marker Hatch", "he", "DISPLAY", 0],
  ["Rubik Maze", "he", "DISPLAY", 0],
  ["Rubik Microbe", "he", "DISPLAY", 0],
  ["Rubik Moonrocks", "he", "DISPLAY", 0],
  ["Rubik Pixels", "he", "DISPLAY", 0],
  ["Rubik Puddles", "he", "DISPLAY", 0],
  ["Rubik Scribble", "he", "DISPLAY", 0],
  ["Rubik Spray Paint", "he", "DISPLAY", 0],
  ["Rubik Storm", "he", "DISPLAY", 0],
  ["Rubik Vinyl", "he", "DISPLAY", 0],
  ["Rubik Wet Paint", "he", "DISPLAY", 0],
  ["Secular One", "he", "SANS_SERIF", 0],
  ["Solitreo", "he", "HANDWRITING", 0],
  ["Suez One", "he", "SERIF", 0],
  ["Varela Round", "he", "SANS_SERIF", 0],
  ["Great Vibes", "en", "HANDWRITING", 0],
  ["Parisienne", "en", "HANDWRITING", 0],
  ["Pinyon Script", "en", "HANDWRITING", 0],
  ["Alex Brush", "en", "HANDWRITING", 0],
  ["Allura", "en", "HANDWRITING", 0],
  ["Dancing Script", "en", "HANDWRITING", 1],
  ["Tangerine", "en", "HANDWRITING", 1],
  ["Italianno", "en", "HANDWRITING", 0],
  ["Cinzel", "en", "SERIF", 1],
  ["Cinzel Decorative", "en", "DISPLAY", 1],
  ["Playfair Display", "en", "SERIF", 1],
  ["Cormorant Garamond", "en", "SERIF", 1],
  ["EB Garamond", "en", "SERIF", 1],
  ["Libre Baskerville", "en", "SERIF", 1],
  ["Lora", "en", "SERIF", 1],
  ["Abril Fatface", "en", "DISPLAY", 0],
  ["Lobster", "en", "DISPLAY", 0],
  ["Pacifico", "en", "HANDWRITING", 0],
  ["Satisfy", "en", "HANDWRITING", 0],
  ["Sacramento", "en", "HANDWRITING", 0],
  ["Kaushan Script", "en", "HANDWRITING", 0],
  ["Monsieur La Doulaise", "en", "HANDWRITING", 0],
  ["Rouge Script", "en", "HANDWRITING", 0],
  ["Mrs Saint Delafield", "en", "HANDWRITING", 0],
  ["Herr Von Muellerhoff", "en", "HANDWRITING", 0],
  ["Lavishly Yours", "en", "HANDWRITING", 0],
  ["Ballet", "en", "HANDWRITING", 0],
  ["Birthstone", "en", "HANDWRITING", 0],
  ["Corinthia", "en", "HANDWRITING", 1],
  ["Water Brush", "en", "HANDWRITING", 0],
  ["Fleur De Leah", "en", "HANDWRITING", 0],
  ["Imperial Script", "en", "HANDWRITING", 0],
  ["Luxurious Script", "en", "HANDWRITING", 0],
  ["Marck Script", "en", "HANDWRITING", 0],
  ["Bodoni Moda", "en", "SERIF", 1],
  ["Josefin Sans", "en", "SANS_SERIF", 1],
  ["Montserrat", "en", "SANS_SERIF", 1],
  ["Raleway", "en", "SANS_SERIF", 1],
  ["Oswald", "en", "SANS_SERIF", 1],
  ["Bebas Neue", "en", "DISPLAY", 0],
  ["UnifrakturMaguntia", "en", "DISPLAY", 0],
  ["IM Fell English SC", "en", "SERIF", 0],
  ["Uncial Antiqua", "en", "DISPLAY", 0],
  ["Yeseva One", "en", "DISPLAY", 0],
  ["Petit Formal Script", "en", "HANDWRITING", 0],
  ["Cormorant SC", "en", "SERIF", 1],
  ["Forum", "en", "DISPLAY", 0],
  ["Marcellus SC", "en", "SERIF", 0]
];
var FONT_INFO = {}; FONTS.forEach(function(f){ FONT_INFO[f[0]] = f; });
var FONT_GROUPS = { my: { STAM: 'מיוחדים · סת״ם, רש״י וקודש', CLASSIC: 'מיוחדים · קלאסי', HAND: 'מיוחדים · כתב יד', OUTLINE: 'מיוחדים · חלול ומעוטר', DISPLAY: 'מיוחדים · כותרות', FUN: 'מיוחדים · שמח וצבעוני', NEW: 'מיוחדים · נוספים' },
  he: { SERIF: 'עברית · קלאסי', SANS_SERIF: 'עברית · מודרני', HANDWRITING: 'עברית · כתב יד', DISPLAY: 'עברית · מיוחד' },
  en: { SERIF: 'English · Classic', SANS_SERIF: 'English · Modern', HANDWRITING: 'English · Script', DISPLAY: 'English · Display' } };
var DIVIDERS = [['flourish','סלסול'],['dots','נקודות'],['diamond','יהלום'],['line','קו'],['double','קו כפול']];

/* תפקידים קבועים של פסקאות, כדי שנוסח מוכן מהניהול ימלא את הפסקאות המתאימות בכל עיצוב */
var FIELDS = [
  ['quote','פסוק / שורת פתיחה'],['title','כותרת'],['intro','פתיחה'],['name','שם המבורך'],['occasion','לרגל'],
  ['name2','שם נוסף (חתן / בן מצווה)'],['body','גוף הברכה'],['signLabel','לפני החתימה'],['sign','חתימה'],
  ['opener','פתיחת ההזמנה'],['invite','נוסח ההזמנה'],['groom','שם החתן'],['bride','שם הכלה'],['details','מועד ומקום'],['times','שעות']
];

/* אוסף הגופנים שהועלו לאתר: נטען מ-catalog.json. [מזהה, קובץ, תווית, סוג, מוצג כברירת מחדל]
   בדף הניהול (סטודיו רקעים ← גופנים) קובעים לכל גופן אם הוא מוצג ללקוחות, את השם ואת הסוג. */
var catalogP = null, OVR = {};
function catalog(){
  if (!catalogP) catalogP = fetch('/assets/greetings/fonts/catalog.json?v=3').then(function(r){ return r.json() }).then(function(list){
    list.forEach(function(c){ var f = [c[0], 'my', c[3], c[5] ? 1 : 0, c[2], '/assets/greetings/fonts/' + c[1], !!c[4], c[5] ? '/assets/greetings/fonts/' + c[5] : null, c[6] || '']; FONTS.push(f); FONT_INFO[c[0]] = f; });
    return FONTS;
  }).catch(function(){ return FONTS; });
  return catalogP;
}
function applySettings(map){ OVR = map || {}; }
function meta(id){
  var f = FONT_INFO[id]; if (!f) return null;
  var o = OVR[id] || {};
  return { id: id, lang: f[1], cat: o.cat || f[2], label: o.label || f[4] || id, on: o.on != null ? !!o.on : (f[1] === 'my' ? !!f[6] : true), local: f[1] === 'my', maker: f[1] === 'my' ? (f[8] || '') : 'Google Fonts (חינמי)' };
}
function pickList(all){ return FONTS.map(function(f){ return meta(f[0]) }).filter(function(m){ return m && (all || m.on) }); }

var fontLoads = {}, cssLoads = {};
function fontCss(f){
  var info0 = FONT_INFO[f];
  if (!cssLoads[f] && info0 && info0[5]) {
    var st = document.createElement('style');
    st.textContent = '@font-face{font-family:"' + f + '";src:url(' + info0[5] + ') format("woff");font-weight:400;font-display:swap}' + (info0[7] ? '@font-face{font-family:"' + f + '";src:url(' + info0[7] + ') format("woff");font-weight:700;font-display:swap}' : '');
    document.head.appendChild(st); cssLoads[f] = Promise.resolve();
  }
  if (!cssLoads[f]) cssLoads[f] = new Promise(function(ok){
    var info = FONT_INFO[f], l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=' + f.replace(/ /g, '+') + (info && info[3] ? ':wght@400;700' : '') + '&display=swap';
    l.onload = l.onerror = function(){ ok() }; document.head.appendChild(l);
  });
  return cssLoads[f];
}
function loadFont(f, w){
  var key = f + w;
  if (!fontLoads[key]) fontLoads[key] = fontCss(f).then(function(){ return document.fonts.load(w + ' 20px "' + f + '"', 'אבג abc 123') }).catch(function(){});
  return fontLoads[key];
}
function fontsReady(list){
  var ps = [];
  (list || ['Frank Ruhl Libre','Suez One','Bellefair']).forEach(function(f){ ps.push(loadFont(f, 400)); if (FONT_INFO[f] && FONT_INFO[f][3]) ps.push(loadFont(f, 700)); });
  return Promise.all(ps);
}

var svgCache = {}, imgCache = {};
function bgImage(tpl, colors, thumb){
  if (tpl.bg.img) {
    var u = (thumb && tpl.bg.thumb) || tpl.bg.img;
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

function colorOf(c, tpl, colors){
  if (c && c.charAt(0) === '@') { var k = c.slice(1), d = (tpl.colors || []).find(function(x){ return x.k === k }); return colors[k] || (d && d.def) || '#000'; }
  return c || '#000';
}
function fontStr(b, size){ return (b.bold ? 700 : 400) + ' ' + size + 'px "' + b.font + '", "Frank Ruhl Libre", serif'; }

/* שבירת שורות לפי רוחב; wide = מילה אחת רחבה מהשורה */
function wrap(ctx, b, text, width, size){
  ctx.font = fontStr(b, size);
  var lines = [], wide = false;
  String(text || '').split('\n').forEach(function(p){
    var words = p.split(/\s+/).filter(Boolean), line = '';
    if (!words.length) { lines.push(''); return; }
    words.forEach(function(w){
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width <= width || !line) line = t; else { lines.push(line); line = w; }
      if (ctx.measureText(line).width > width) wide = true;
    });
    lines.push(line);
  });
  return { lines: lines, wide: wide };
}

/* פריסת כל הפסקאות באזור הטקסט. אם לא נכנס, מקטינים הכל באותו יחס */
function layout(ctx, tpl, state){
  var A = tpl.area, blocks = state.blocks || [], user = state.scale || 1, items, total, f;
  for (f = user; f >= user * 0.45; f -= 0.02) {
    items = []; total = 0; var bad = false;
    blocks.forEach(function(b, i){
      if (b.hidden) return;
      var gap = (b.gap || 0) * f, it = { i: i, b: b, top: total + gap };
      if (b.type === 'divider') { it.h = 22 * Math.min(1, f + 0.2); }
      else if (b.type === 'photo') { it.pw = A.w * (b.size || 0.4) * f; it.h = it.pw * photoRatio(b); }
      else {
        var size = b.size * f, colGap = 24, width = b.cols ? (A.w - colGap) / 2 : A.w;
        var a = wrap(ctx, b, b.text, width, size), c = b.cols ? wrap(ctx, b, b.text2, width, size) : { lines: [], wide: false };
        if (a.wide || c.wide) bad = true;
        var n = Math.max(a.lines.length, c.lines.length, 1);
        it.size = size; it.lines = a.lines; it.lines2 = c.lines; it.width = width; it.colGap = colGap;
        it.h = (n - 1) * size * b.lh + size * 1.2;
      }
      total = it.top + it.h; items.push(it);
    });
    if (!bad && total <= A.h) break;
  }
  var off = A.valign === 'top' ? 0 : Math.max(0, (A.h - total) / 2);
  items.forEach(function(it){ it.y = A.y + off + it.top; it.x = A.x + (it.b.dx || 0); it.w = A.w; });
  return items;
}

/* תמונה שהלקוח העלה: צורה, גודל, זום והזזה בתוך המסגרת */
var SHAPES = [['circle','עיגול'],['arch','קשת'],['rounded','מלבן מעוגל'],['rect','מלבן'],['oval','אליפסה']];
function photoRatio(b){ return b.shape === 'circle' ? 1 : b.shape === 'arch' ? 1.3 : b.shape === 'oval' ? 1.25 : (b.ratio || 1.25); }
function shapePath(ctx, b, x, y, w, h){
  ctx.beginPath();
  if (b.shape === 'circle' || b.shape === 'oval') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (b.shape === 'arch') { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  else { var r = b.shape === 'rounded' ? Math.min(w, h) * 0.08 : 0; ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
var photoCache = {};
function photoImg(src){
  if (!src) return Promise.resolve(null);
  if (!photoCache[src]) photoCache[src] = new Promise(function(ok){ var i = new Image(); i.onload = function(){ ok(i) }; i.onerror = function(){ ok(null) }; i.src = src; });
  return photoCache[src];
}
function photoX(it){ var b = it.b; return b.align === 'right' ? it.x + it.w - it.pw : b.align === 'left' ? it.x : it.x + (it.w - it.pw) / 2; }
function drawPhoto(ctx, it, img, col){
  var b = it.b, w = it.pw, h = it.h, x = photoX(it), y = it.y;
  ctx.save(); shapePath(ctx, b, x, y, w, h);
  if (img) {
    ctx.save(); ctx.clip();
    var z = b.zoom || 1, k = Math.max(w / img.width, h / img.height) * z, iw = img.width * k, ih = img.height * k;
    var ox = (b.ox || 0) * (iw - w) / 2, oy = (b.oy || 0) * (ih - h) / 2;
    ctx.drawImage(img, x + (w - iw) / 2 + ox, y + (h - ih) / 2 + oy, iw, ih); ctx.restore();
  } else { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill(); ctx.fillStyle = '#666'; ctx.font = '600 15px Assistant, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('כאן תופיע התמונה', x + w / 2, y + h / 2 + 5); }
  if (b.border) { shapePath(ctx, b, x, y, w, h); ctx.lineWidth = b.border; ctx.strokeStyle = col; ctx.stroke(); }
  ctx.restore();
}

function drawDivider(ctx, it, col){
  var b = it.b, cx = it.x + it.w / 2, cy = it.y + it.h / 2, half = it.w * (b.width || 0.5) / 2;
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 1.2; ctx.lineCap = 'round';
  function line(x1, x2, y){ ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke(); }
  if (b.style === 'line') line(cx - half, cx + half, cy);
  else if (b.style === 'double') { line(cx - half, cx + half, cy - 2.5); line(cx - half, cx + half, cy + 2.5); }
  else if (b.style === 'dots') {
    line(cx - half, cx - 18, cy); line(cx + 18, cx + half, cy);
    [[0, 3.2], [-10, 2], [10, 2]].forEach(function(d){ ctx.beginPath(); ctx.arc(cx + d[0], cy, d[1], 0, Math.PI * 2); ctx.fill(); });
  } else if (b.style === 'diamond') {
    line(cx - half, cx - 14, cy); line(cx + 14, cx + half, cy);
    ctx.beginPath(); ctx.moveTo(cx, cy - 8); ctx.lineTo(cx + 9, cy); ctx.lineTo(cx, cy + 8); ctx.lineTo(cx - 9, cy); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - half, cy, 2, 0, Math.PI * 2); ctx.arc(cx + half, cy, 2, 0, Math.PI * 2); ctx.fill();
  } else { /* סלסול */
    line(cx - half, cx - 34, cy); line(cx + 34, cx + half, cy);
    [-1, 1].forEach(function(s){
      ctx.beginPath(); ctx.moveTo(cx + s * 34, cy);
      ctx.bezierCurveTo(cx + s * 26, cy - 10, cx + s * 12, cy - 9, cx + s * 10, cy - 2);
      ctx.bezierCurveTo(cx + s * 9, cy + 4, cx + s * 16, cy + 6, cx + s * 19, cy + 1);
      ctx.stroke();
    });
    ctx.beginPath(); ctx.moveTo(cx, cy - 7); ctx.lineTo(cx + 6, cy); ctx.lineTo(cx, cy + 7); ctx.lineTo(cx - 6, cy); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

/* state: { colors:{K:#hex}, blocks:[...], scale } · opt: { scale, watermark, selected: index }
   מחזיר את ה-canvas; ב-canvas._items נשמרים מיקומי הפסקאות (לזיהוי לחיצה) */
function render(canvas, tpl, state, opt){
  opt = opt || {};
  var scale = opt.scale || 1;
  state = state || {};
  var colors = state.colors || {}, used = {};
  (state.blocks || []).forEach(function(b){ if (b.font) used[b.font] = 1; });
  var photos = {};
  return catalog().then(function(){ return Promise.all([fontsReady(Object.keys(used)), bgImage(tpl, colors, opt.thumb), Promise.all((state.blocks || []).map(function(b){ return b.type === 'photo' ? photoImg(b.src).then(function(i){ photos[b.src] = i }) : null }))]) }).then(function(r){
    var img = r[1];
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (tpl.bg.img) { /* תמונה שהועלתה: ממלאים את הדף בלי לעוות (חיתוך עדין בשוליים אם היחס שונה) */
      var k = Math.max(canvas.width / img.width, canvas.height / img.height), iw = img.width * k, ih = img.height * k;
      ctx.drawImage(img, (canvas.width - iw) / 2, (canvas.height - ih) / 2, iw, ih);
    } else ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var items = layout(ctx, tpl, state);
    items.forEach(function(it){
      var b = it.b, col = colorOf(b.color, tpl, colors);
      if (opt.selected === it.i && !opt.noFrame) {
        ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f8a96';
        ctx.strokeRect(it.x - 6, it.y - 4, it.w + 12, it.h + 8); ctx.restore();
      }
      if (opt.skip === it.i) return;
      if (b.type === 'divider') { drawDivider(ctx, it, col); return; }
      if (b.type === 'photo') { drawPhoto(ctx, it, photos[b.src], col); return; }
      ctx.font = fontStr(b, it.size); ctx.fillStyle = col;
      function col1(lines, x0, w){
        ctx.textAlign = b.align;
        var x = b.align === 'right' ? x0 + w : b.align === 'left' ? x0 : x0 + w / 2;
        lines.forEach(function(line, i){ ctx.fillText(line, x, it.y + it.size * 0.95 + i * it.size * b.lh); });
      }
      if (b.cols) { col1(it.lines, it.x + it.w - it.width, it.width); col1(it.lines2, it.x, it.width); }
      else col1(it.lines, it.x, it.w);
    });
    if (opt.watermark) {
      ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#000'; ctx.font = '700 46px "Frank Ruhl Libre", serif'; ctx.textAlign = 'center';
      for (var yy = 160; yy < H; yy += 220) { ctx.save(); ctx.translate(W / 2, yy); ctx.rotate(-0.42); ctx.fillText('MyLuach · תצוגה מקדימה', 0, 0); ctx.restore(); }
      ctx.restore();
    }
    canvas._items = items;
    return canvas;
  });
}

/* לחיצה על התצוגה: איזו פסקה נמצאת בנקודה (ביחידות העיצוב) */
function hit(canvas, x, y){
  var best = null;
  (canvas._items || []).forEach(function(it){
    if (x >= it.x - 8 && x <= it.x + it.w + 8 && y >= it.y - 6 && y <= it.y + it.h + 6) {
      var d = Math.abs(y - (it.y + it.h / 2)); if (!best || d < best.d) best = { i: it.i, d: d };
    }
  });
  return best ? best.i : null;
}

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function defaults(tpl){
  var s = { colors: {}, blocks: clone(tpl.blocks), scale: 1 };
  (tpl.colors || []).forEach(function(c){ s.colors[c.k] = c.def; });
  return s;
}
function newText(tpl, after){
  var b = T('', '', 17, { gap: 10 });
  if (after && after.type === 'text') { b.font = after.font; b.color = after.color; b.size = Math.min(after.size, 22); }
  return b;
}
function newDivider(){ return D({ gap: 10 }); }
function newPhoto(src){ return { type: 'photo', src: src || '', shape: 'circle', size: 0.38, zoom: 1, ox: 0, oy: 0, border: 3, color: '#b08d3c', align: 'center', gap: 12 }; }

/* פרטים אישיים שהלקוח ממלא פעם אחת, ומופיעים בכל העיצובים (נשמרים בדפדפן) */
var PERSONAL = [['name','שם המבורך / בעל השמחה'],['name2','שם נוסף (חתן / בן מצווה / תינוק)'],['groom','שם החתן'],['bride','שם הכלה'],['details','מועד ומקום'],['times','שעות'],['sign','חתימה (מי מברך / מזמין)']];
var PROFILE_KEY = 'myluach-greet-profile';
function profile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {} } catch (e) { return {} } }
function saveProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch (e) {} }
function applyProfile(blocks, p){
  p = p || profile();
  blocks.forEach(function(b){ if (b.type === 'text' && b.k && PERSONAL.some(function(x){ return x[0] === b.k }) && p[b.k] && String(p[b.k]).trim()) b.text = p[b.k]; });
  return blocks;
}

/* עיצובים וקטגוריות שנוספו בניהול, והגדרות הגופנים: נטענים פעם אחת מהשרת */
var remoteP = null, HIDDEN_CATS = {};
function load(){
  if (!remoteP) remoteP = fetch('/api/pricing?c=_greetings').then(function(r){ return r.json() }).catch(function(){ return {} }).then(function(d){
    d = d || {};
    applySettings(d.fonts || {});
    PRESETS = d.presets || [];
    (d.cats || []).forEach(function(c){ var e = CATS.find(function(x){ return x[0] === c.id }); if (e) e[1] = c.name; else CATS.push([c.id, c.name]); });
    (d.hideCats || []).forEach(function(id){ HIDDEN_CATS[id] = 1; });
    (d.templates || []).slice().sort(function(a, b){ return (a.order || 0) - (b.order || 0) }).forEach(function(t){
      if (TEMPLATES.some(function(x){ return x.id === t.id })) return;
      t.colors = []; t.remote = true; TEMPLATES.push(t);
    });
    return d;
  });
  return remoteP;
}
/* אותו רקע באירוע נוסף: מחזיר עותק של העיצוב עם האירוע, הסוג והנוסח של הווריאציה */
var PRESETS = [];
function variant(tpl, i){
  var v = (tpl.variants || [])[i]; if (!v) return tpl;
  var t = Object.assign({}, tpl, { cat: v.cat, kind: v.kind, blocks: clone(tpl.blocks), variantOf: tpl.id, variant: i });
  var p = PRESETS.find(function(x){ return x.id === v.preset });
  if (p) t.blocks.forEach(function(b){ if (b.k && p.fields[b.k] != null) b.text = p.fields[b.k]; });
  return t;
}
/* כל הכרטיסים לגלריה: כל עיצוב באירוע הראשי ובכל אירוע נוסף */
function cards(){
  var out = [];
  TEMPLATES.forEach(function(t){ out.push({ t: t, v: -1, cat: t.cat, kind: t.kind }); (t.variants || []).forEach(function(v, i){ out.push({ t: t, v: i, cat: v.cat, kind: v.kind }); }); });
  return out;
}

/* פסקאות התחלה לעיצוב חדש מהניהול: נלקחות מהעיצובים המובנים, בצבע שנבחר */
function starter(kind, main, accent){
  var src = kind === 'invite' ? TEMPLATES[1] : TEMPLATES[0];
  return clone(src.blocks).map(function(b){
    if (b.type === 'divider') { b.color = accent; return b; }
    b.color = (b.color && (b.color.charAt(0) === '@' || /^#(8a6|6b5|8a6d|5c6|7a4)/i.test(b.color))) ? accent : main;
    return b;
  });
}

window.Greetings = { W: W, H: H, CATS: CATS, KINDS: KINDS, TEMPLATES: TEMPLATES, FONTS: FONTS, FONT_GROUPS: FONT_GROUPS, fontLabel: function(f){ var m = meta(f); return m ? m.label : f; }, catalog: catalog, applySettings: applySettings, meta: meta, pickList: pickList, fontCss: fontCss, loadFont: loadFont, FIELDS: FIELDS, DIVIDERS: DIVIDERS,
  catName: function(id){ var c = CATS.find(function(x){ return x[0] === id }); return c ? c[1] : id; },
  get: function(id){ return TEMPLATES.find(function(t){ return t.id === id }); },
  render: render, load: load, starter: starter, variant: variant, cards: cards, hiddenCat: function(id){ return !!HIDDEN_CATS[id]; }, hit: hit, defaults: defaults, newText: newText, newDivider: newDivider, newPhoto: newPhoto, SHAPES: SHAPES, PERSONAL: PERSONAL, profile: profile, saveProfile: saveProfile, applyProfile: applyProfile, colorOf: colorOf, fontsReady: fontsReady };
})();
