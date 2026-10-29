/* ברכות והזמנות: הקטגוריות, העיצובים המובנים, וציור עיצוב על canvas.
   אותו ציור משמש לתצוגה בגלריה, לתצוגה החיה בעורך ולקובץ ההורדה, כך שמה שרואים הוא מה שמודפס.
   יחידות העיצוב: דף A4 ב-96dpi (794×1123). בהורדה מגדילים ל-300dpi (2480×3508).
   הטקסט בנוי מפסקאות (בלוקים) שזורמות אחת אחרי השנייה בתוך אזור הטקסט של העיצוב.
   הלקוח מוסיף, מוחק ומזיז פסקאות, ומשנה לכל אחת גופן, גודל, צבע, יישור ורווח מעליה. */
(function(){
'use strict';
var PW = 794, PH = 1123, W = PW, H = PH;
/* סוגי דפים: design = דף מעוצב (שטח לטקסט + נוסח מוכן), bg = דף רקע (כותבים על כל הדף), frame = דף עם מסגרת, own = דף שהלקוח מעלה */
var TYPES = [['design', 'דפים מעוצבים'], ['bg', 'דפי רקע'], ['frame', 'מסגרות'], ['own', 'דף משלכם']];
function typeOf(t){ return t.own ? 'own' : (t.type === 'bg' || t.type === 'frame') ? t.type : 'design'; }
function free(t){ return typeOf(t) !== 'design'; } /* דף שהטקסט שלו נבחר בנפרד, ואפשר לסובב אותו */
/* כיוון הדף: עיצוב שהועלה לרוחב (tpl.land, או תמונת רקע רחבה) נפתח לרוחב. בדף רקע / מסגרת / דף משלכם הלקוח יכול לסובב */
function natLand(tpl){ return !!(tpl && (tpl.land || (tpl.land == null && free(tpl) && tpl._imgLand))); }
function isLand(tpl, state){ var G = (state && state.page) || {}; return free(tpl) && G.land != null ? !!G.land : natLand(tpl); }
function dims(tpl, state){ var land = isLand(tpl, state); return land ? { W: PH, H: PW, land: true } : { W: PW, H: PH, land: false }; }
function useDims(tpl, state){ var d = dims(tpl, state); W = d.W; H = d.H; return d; }

var CATS = [
  ['wedding','חתונה'],['engagement','אירוסין / וורט'],['anniversary','יום נישואין'],['barmitzvah','בר מצווה'],['batmitzvah','בת מצווה'],
  ['birth','ברית / הולדת'],['birthday','יום הולדת'],['donors','תורמים והוקרה'],['torah','הכנסת ספר תורה'],['siyum','סיום מסכת'],
  ['home','חנוכת בית'],['business','פתיחת עסק'],['shul','חנוכת בית כנסת'],['shabbat','שבת התאחדות / אירוע תורני'],
  ['roshhashana','ראש השנה'],['yomkippur','יום כיפור'],['sukkot','סוכות'],['simchattorah','שמחת תורה'],['chanukah','חנוכה'],
  ['tubishvat','ט״ו בשבט'],['purim','פורים'],['pesach','פסח'],['lagbaomer','ל״ג בעומר'],['shavuot','שבועות'],['condolence','ניחום אבלים'],
  ['thanks','מכתבי תודה'],['certificate','תעודות']
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
  /* דף מעוצב של הלקוח: הלקוח מעלה את הרקע שלו לכל הדף, ובוחר בעצמו איפה יושב הטקסט */
  { id: 'own', title: 'דף מעוצב משלכם', cat: 'own', type: 'own', kind: 'greeting', price: 0, own: true, bg: { none: true },
    area: { x: 110, y: 150, w: 574, h: 823 }, colors: [], blocks: null },
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
    list.forEach(function(c){ var f = [c[0], 'my', c[3], c[5] ? 1 : 0, c[2], '/assets/greetings/fonts/' + c[1] + '?v=2', !!c[4], c[5] ? '/assets/greetings/fonts/' + c[5] + '?v=2' : null, c[6] || '']; FONTS.push(f); FONT_INFO[c[0]] = f; });
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
function bgImage(tpl, colors, thumb, hi){
  if (tpl.bg.none) return Promise.resolve(null);
  if (tpl.bg.img) {
    var u = (thumb && tpl.bg.thumb) || (hi && tpl.bg.hi) || tpl.bg.img; /* hi: קובץ באיכות גבוהה להדפסה בגדלים גדולים */
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
/* אזור הטקסט: בדף משלכם הלקוח קובע אותו (שוליים באחוזים) */
/* כמה רבעי סיבוב מסתובב הרקע (0-3). בלי הגדרה: מסובבים רק אם כיוון התמונה שונה מכיוון הדף */
function quarter(tpl, state){ var G = (state && state.page) || {}; if (G.rot != null) return ((G.rot % 4) + 4) % 4; return isLand(tpl, state) !== natImg(tpl) ? 1 : 0; }
function natImg(tpl){ return tpl._imgLand != null ? !!tpl._imgLand : natLand(tpl); }
function areaOf(tpl, state){
  var ty = typeOf(tpl);
  if (ty === 'design' && !tpl.noArea) return tpl.area;
  /* מסגרת, או דף רקע שסומן לו אזור בניהול: האזור שסומן, מסתובב יחד עם הדף */
  if ((ty === 'frame' || (ty === 'bg' && tpl.areaSet)) && !(state && state.area)) {
    /* אזור הטקסט של המסגרת מסתובב יחד עם המסגרת */
    /* האזור סומן בניהול על הדף כפי שהוא נראה שם; מסובבים רק לפי מה שהלקוח סובב מעבר לזה */
    var A = tpl.area, q = (quarter(tpl, state) - quarter(tpl, {}) + 4) % 4, nl = isLand(tpl, {}), Wn = nl ? PH : PW, Hn = nl ? PW : PH;
    if (q === 1) return { x: Hn - (A.y + A.h), y: A.x, w: A.h, h: A.w, valign: A.valign };
    if (q === 2) return { x: Wn - (A.x + A.w), y: Hn - (A.y + A.h), w: A.w, h: A.h, valign: A.valign };
    if (q === 3) return { x: A.y, y: Wn - (A.x + A.w), w: A.h, h: A.w, valign: A.valign };
    return A;
  }
  var a = (state && state.area) || (ty === 'bg' || ty === 'design' ? { t: 9, b: 9, r: 10, l: 10 } : ty === 'frame' ? { t: 18, b: 18, r: 18, l: 18 } : {}), t = (a.t == null ? 13 : a.t) / 100 * H, b = (a.b == null ? 13 : a.b) / 100 * H, r = (a.r == null ? 14 : a.r) / 100 * W, l = (a.l == null ? 14 : a.l) / 100 * W;
  return { x: l, y: t, w: Math.max(80, W - l - r), h: Math.max(80, H - t - b), valign: a.v === 'top' ? 'top' : 'center' };
}
/* שטח הטקסט (צבע / תמונה): אזור הטקסט + שוליים, וכל צד אפשר למשוך בנפרד (dt/db/dr/dl ביחידות הדף) */
function panelRect(tpl, state){
  var A0 = areaOf(tpl, state), P = (state && state.panel) || {}, pad = P.pad == null ? 14 : P.pad;
  var l = Math.max(0, A0.x - pad - (P.dl || 0)), r = Math.min(W, A0.x + A0.w + pad + (P.dr || 0));
  var t = Math.max(0, A0.y - pad - (P.dt || 0)), b = Math.min(H, A0.y + A0.h + pad + (P.db || 0));
  return { x: l, y: t, w: Math.max(30, r - l), h: Math.max(30, b - t) };
}
/* ידיות למשיכת גבולות השטח מעל התצוגה. cv: ה-canvas (בתוך אלמנט עם position:relative) */
function panelEdges(cv, tpl, getS, changed){ var _u = function(){ useDims(tpl, getS()); };
  var host = cv.parentNode, box = document.createElement('div'), on = false;
  box.className = 'pedge'; box.hidden = true;
  box.innerHTML = '<i data-e="t"></i><i data-e="b"></i><i data-e="r"></i><i data-e="l"></i><span>גוררים כל צד כדי להגדיל או להקטין</span>';
  if (!document.getElementById('pedge-css')) { var st = document.createElement('style'); st.id = 'pedge-css';
    st.textContent = '.pedge{position:absolute;border:2px dashed #e07a2f;z-index:4;pointer-events:none;box-sizing:border-box}.pedge>i{position:absolute;pointer-events:auto;background:#e07a2f;border-radius:6px;touch-action:none;box-shadow:0 0 0 2px #fff}' +
      '.pedge>i[data-e=t],.pedge>i[data-e=b]{left:50%;width:46px;height:12px;margin-left:-23px;cursor:ns-resize}.pedge>i[data-e=t]{top:-7px}.pedge>i[data-e=b]{bottom:-7px}' +
      '.pedge>i[data-e=r],.pedge>i[data-e=l]{top:50%;height:46px;width:12px;margin-top:-23px;cursor:ew-resize}.pedge>i[data-e=r]{right:-7px}.pedge>i[data-e=l]{left:-7px}' +
      '.pedge>span{position:absolute;top:6px;left:50%;transform:translateX(-50%);background:#e07a2f;color:#fff;font:700 12px Assistant,sans-serif;padding:2px 8px;border-radius:99px;white-space:nowrap}';
    document.head.appendChild(st); }
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  host.appendChild(box);
  function place(){ if (!on) return; _u(); var R = panelRect(tpl, getS());
    box.style.left = (R.x / W * 100) + '%'; box.style.top = (R.y / H * 100) + '%'; box.style.width = (R.w / W * 100) + '%'; box.style.height = (R.h / H * 100) + '%';
    var a = tshape(getS(), tpl).a; box.style.transform = a ? 'rotate(' + a + 'deg)' : ''; }
  box.querySelectorAll('i').forEach(function(h){
    h.addEventListener('pointerdown', function(e){
      e.preventDefault(); e.stopPropagation(); h.setPointerCapture(e.pointerId);
      _u(); var S = getS(), P = S.panel || (S.panel = { on: false, color: '#ffffff', op: 0.85, r: 20, pad: 14 }), ed = h.dataset.e, k0 = 'd' + ed, v0 = P[k0] || 0, x0 = e.clientX, y0 = e.clientY, sc = W / cv.getBoundingClientRect().width;
      function mv(ev){ var dx = (ev.clientX - x0) * sc, dy = (ev.clientY - y0) * sc;
        var d = ed === 't' ? -dy : ed === 'b' ? dy : ed === 'r' ? dx : -dx; P[k0] = Math.round(Math.max(-300, Math.min(600, v0 + d))); place(); changed(); }
      function up(){ h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); }
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up);
    });
  });
  return { toggle: function(v){ on = v == null ? !on : v; box.hidden = !on; place(); return on; }, place: place, get on(){ return on; } };
}
/* צורת שטח הטקסט: מלבן, אליפסה/עיגול, קשת למעלה, קשת למטה, מעוין. הטקסט נכנס למלבן שבתוך הצורה */
var TSHAPES = [['rect', '▭ מלבן'], ['ellipse', '⬭ אליפסה / עיגול'], ['arch', '⌒ קשת למעלה'], ['archb', '⌣ קשת למטה'], ['diamond', '◇ מעוין'], ['hex', '⬡ משושה']];
/* צורה ושיפוע: מה שהלקוח בחר, אחרת מה שנקבע בניהול לעיצוב (tpl.tshape) */
function tshape(state, tpl){ var t = (state && state.tshape) || (tpl && tpl.tshape) || {}; return { s: t.s || 'rect', a: Math.max(-45, Math.min(45, +t.a || 0)) }; }
function innerArea(A, sh){
  var s = sh.s, w = A.w, h = A.h, x = A.x, y = A.y;
  if (s === 'ellipse') { var kx = 0.76, ky = 0.74; return { x: x + w * (1 - kx) / 2, y: y + h * (1 - ky) / 2, w: w * kx, h: h * ky, valign: A.valign }; }
  if (s === 'diamond') { return { x: x + w * 0.25, y: y + h * 0.25, w: w * 0.5, h: h * 0.5, valign: A.valign }; }
  if (s === 'hex') { return { x: x + w * 0.12, y: y + h * 0.08, w: w * 0.76, h: h * 0.84, valign: A.valign }; }
  if (s === 'arch' || s === 'archb') { var r = Math.min(w / 2, h * 0.6), cut = r * 0.42; return { x: x + w * 0.04, y: s === 'arch' ? y + cut : y, w: w * 0.92, h: h - cut, valign: A.valign }; }
  return A;
}
function layout(ctx, tpl, state){
  var A = innerArea(areaOf(tpl, state), tshape(state, tpl)), blocks = state.blocks || [], user = state.scale || 1, items, total, f;
  for (f = user; f >= user * 0.45; f -= 0.02) {
    items = []; total = 0; var bad = false;
    blocks.forEach(function(b, i){
      if (b.hidden || b.abs) return;
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
var SHAPES = [['orig','מקורי (ללוגו)'],['circle','עיגול'],['square','ריבוע'],['oval','אליפסה'],['arch','קשת'],['rounded','מלבן מעוגל'],['rect','מלבן']];
function photoRatio(b){ return b.shape === 'circle' || b.shape === 'square' ? 1 : b.shape === 'arch' ? 1.3 : b.shape === 'oval' ? 1.25 : (b.ratio || 1.25); }
function shapePath(ctx, b, x, y, w, h){
  ctx.beginPath();
  if (b.shape === 'circle' || b.shape === 'oval') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  else if (b.shape === 'arch') { ctx.moveTo(x, y + h); ctx.lineTo(x, y + w / 2); ctx.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath(); }
  else { var r = b.shape === 'rounded' ? Math.min(w, h) * 0.08 : 0; ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
}
var photoCache = {};
function photoImg(src){
  if (!src) return Promise.resolve(null);
  if (!photoCache[src]) photoCache[src] = new Promise(function(ok){ var i = new Image(); if (/^https?:/.test(src)) i.crossOrigin = 'anonymous'; i.onload = function(){ ok(i) }; i.onerror = function(){ ok(null) }; i.src = src; });
  return photoCache[src];
}
function photoX(it){ var b = it.b; return b.align === 'right' ? it.x + it.w - it.pw : b.align === 'left' ? it.x : it.x + (it.w - it.pw) / 2; }
function drawPhoto(ctx, it, img, col){
  var b = it.b, w = it.pw, h = it.h, x = photoX(it), y = it.y;
  ctx.save();
  ctx.globalAlpha = b.op == null ? 1 : Math.max(0.05, Math.min(1, b.op));
  if (b.rot) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(b.rot * Math.PI / 180); ctx.translate(-(x + w / 2), -(y + h / 2)); }
  if (b.shape === 'orig' && img) { /* לוגו: כל התמונה, בלי חיתוך ובלי רקע */
    ctx.drawImage(img, x, y, w, h);
    if (b.border) { ctx.lineWidth = b.border; ctx.strokeStyle = col; ctx.strokeRect(x, y, w, h); }
    ctx.restore(); return;
  }
  shapePath(ctx, b, x, y, w, h);
  if (img) {
    ctx.save(); ctx.clip();
    var z = b.zoom || 1, k = Math.max(w / img.width, h / img.height) * z, iw = img.width * k, ih = img.height * k;
    var ox = (b.ox || 0) * (iw - w) / 2, oy = (b.oy || 0) * (ih - h) / 2;
    ctx.drawImage(img, x + (w - iw) / 2 + ox, y + (h - ih) / 2 + oy, iw, ih); ctx.restore();
  } else { ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill(); ctx.fillStyle = '#666'; ctx.font = '600 15px Assistant, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('כאן תופיע התמונה', x + w / 2, y + h / 2 + 5); }
  if (b.border) { shapePath(ctx, b, x, y, w, h); ctx.lineWidth = b.border; ctx.strokeStyle = col; ctx.stroke(); }
  ctx.restore();
}

/* סימן מים: MyLuach עם הסמל, בשורות אלכסוניות. כהה עם קו לבן, כך שנראה גם על רקע כהה */
var logoP = null;
function logoImg(){ if (!logoP) logoP = photoImg('/assets/logo.svg?v=2'); return logoP; }
function drawMark(ctx, logo, alpha){
  ctx.save(); ctx.globalAlpha = alpha; ctx.direction = 'ltr'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.font = '800 40px Assistant, Arial, sans-serif';
  var tw = ctx.measureText('MyLuach').width, unit = 46 + 10 + tw, gapX = 90, gapY = 170;
  ctx.translate(W / 2, H / 2); ctx.rotate(-Math.PI / 6);
  for (var row = -6, n = 0; row <= 6; row++, n++) {
    var y = row * gapY, shift = (n % 2) * (unit + gapX) / 2;
    for (var x = -W * 1.2 + shift; x < W * 1.2; x += unit + gapX) {
      if (logo) ctx.drawImage(logo, x, y - 23, 46, 46);
      ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.strokeText('MyLuach', x + 56, y + 2);
      ctx.fillStyle = '#16262b'; ctx.fillText('MyLuach', x + 56, y + 2);
    }
  }
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
  return catalog().then(function(){ return Promise.all([fontsReady(Object.keys(used)), bgImage(tpl, colors, opt.thumb, scale > 3.2), Promise.all((state.blocks || []).map(function(b){ return b.type === 'photo' ? photoImg(b.src).then(function(i){ photos[b.src] = i }) : null })), opt.watermark ? logoImg() : null, photoImg(state.ubg && state.ubg.src), photoImg(state.own && state.own.src)]) }).then(function(r){
    var img = r[1], oimg = r[5];
    /* כיוון תמונת הרקע (לדף שהועלה לרוחב) */
    /* סיבוב שנקבע בניהול (tpl.rot, ברבעי סיבוב): משנה גם את כיוון התמונה */
    var trot = (((tpl.rot || 0) % 4) + 4) % 4;
    if (img && img.width) tpl._imgLand = (img.width > img.height) !== (trot % 2 === 1); else if (tpl.own && oimg && oimg.width) tpl._imgLand = oimg.width > oimg.height;
    useDims(tpl, state);
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var PG = state.page || {};
    ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(PG.color || '') ? PG.color : '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    /* הרקע עם הגדרות הדף: שקיפות, בהירות, רוויה, גוון, היפוך. תמונה לאורך בדף לרוחב מסתובבת */
    function pageImg(im){
      var cw = canvas.width, ch = canvas.height, q0 = free(tpl) ? quarter(tpl, state) : 0, q = (q0 + (im === img ? trot : 0)) % 4, rot = q % 2 === 1;
      ctx.save();
      var f = []; if (PG.br != null && PG.br !== 100) f.push('brightness(' + PG.br + '%)'); if (PG.sat != null && PG.sat !== 100) f.push('saturate(' + PG.sat + '%)'); if (PG.hue) f.push('hue-rotate(' + PG.hue + 'deg)');
      if (f.length) ctx.filter = f.join(' ');
      ctx.globalAlpha = PG.op == null ? 1 : Math.max(0.05, Math.min(1, PG.op));
      ctx.translate(cw / 2, ch / 2); if (q) ctx.rotate(q * Math.PI / 2); ctx.scale(PG.fx ? -1 : 1, PG.fy ? -1 : 1);
      var bw = rot ? ch : cw, bh = rot ? cw : ch, kk = Math.max(bw / im.width, bh / im.height);
      ctx.drawImage(im, -im.width * kk / 2, -im.height * kk / 2, im.width * kk, im.height * kk);
      ctx.restore();
    }
    if (!img) { /* דף משלכם: הרקע שהלקוח העלה, או דף ריק עם הסבר */
      var oi = r[5];
      if (oi) pageImg(oi);
      else if (!opt.thumb || true) { ctx.save(); ctx.fillStyle = '#f3f1ea'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.strokeStyle = '#c9c2ad'; ctx.setLineDash([14 * scale, 10 * scale]); ctx.lineWidth = 3 * scale; ctx.strokeRect(30 * scale, 30 * scale, canvas.width - 60 * scale, canvas.height - 60 * scale);
        ctx.fillStyle = '#8a826b'; ctx.font = '700 ' + Math.round(30 * scale) + 'px Assistant, sans-serif'; ctx.textAlign = 'center'; ctx.direction = 'rtl'; ctx.fillText('כאן יופיע הדף שתעלו', canvas.width / 2, 90 * scale); ctx.restore(); }
    } else pageImg(img); /* תמונה שהועלתה: ממלאים את הדף בלי לעוות (חיתוך עדין בשוליים אם היחס שונה) */
    var ub = state.ubg && state.ubg.src ? state.ubg : null, uimg = r[4];
    if (false && ub && uimg && ub.mode === 'page') { /* תמונת רקע של הלקוח לכל הדף */
      ctx.save(); ctx.globalAlpha = ub.op == null ? 1 : ub.op;
      var k2 = Math.max(canvas.width / uimg.width, canvas.height / uimg.height); ctx.drawImage(uimg, (canvas.width - uimg.width * k2) / 2, (canvas.height - uimg.height * k2) / 2, uimg.width * k2, uimg.height * k2);
      ctx.restore();
    }
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (state.border && state.border.style) drawBorder(ctx, state.border, W, H);
    /* שטח הטקסט: צבע ו/או תמונה בתוך המסגרת, מאחורי הטקסט */
    var P = state.panel || {}, PR0 = panelRect(tpl, state);
    var px = PR0.x, py = PR0.y, pw = PR0.w, ph = PR0.h, rmax = Math.min(pw / 2, ph / 2), pr = rmax * ((P.r == null ? 20 : P.r) / 100), prb = rmax * ((P.rb == null ? (P.r == null ? 20 : P.r) : P.rb) / 100);
    var SH = tshape(state, tpl), pcx = px + pw / 2, pcy = py + ph / 2;
    var panelPath = function(){ ctx.beginPath();
      if (SH.s === 'ellipse') { ctx.ellipse(pcx, pcy, pw / 2, ph / 2, 0, 0, Math.PI * 2); }
      else if (SH.s === 'diamond') { ctx.moveTo(pcx, py); ctx.lineTo(px + pw, pcy); ctx.lineTo(pcx, py + ph); ctx.lineTo(px, pcy); }
      else if (SH.s === 'hex') { var hx = pw * 0.22; ctx.moveTo(px + hx, py); ctx.lineTo(px + pw - hx, py); ctx.lineTo(px + pw, pcy); ctx.lineTo(px + pw - hx, py + ph); ctx.lineTo(px + hx, py + ph); ctx.lineTo(px, pcy); }
      else if (SH.s === 'arch' || SH.s === 'archb') { var ar = Math.min(pw / 2, ph * 0.6), sy = ar / (pw / 2);
        if (SH.s === 'arch') { ctx.moveTo(px, py + ph); ctx.lineTo(px, py + ar); ctx.ellipse(pcx, py + ar, pw / 2, ar, 0, Math.PI, 0); ctx.lineTo(px + pw, py + ph); }
        else { ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw, py + ph - ar); ctx.ellipse(pcx, py + ph - ar, pw / 2, ar, 0, 0, Math.PI); ctx.lineTo(px, py); } }
      else { ctx.moveTo(px + pr, py); ctx.arcTo(px + pw, py, px + pw, py + ph, pr); ctx.arcTo(px + pw, py + ph, px, py + ph, prb); ctx.arcTo(px, py + ph, px, py, prb); ctx.arcTo(px, py, px + pw, py, pr); }
      ctx.closePath(); };
    /* שיפוע: השטח והטקסט מסתובבים סביב מרכז השטח */
    var tilt = SH.a * Math.PI / 180;
    function tiltOn(){ if (tilt) { ctx.translate(pcx, pcy); ctx.rotate(tilt); ctx.translate(-pcx, -pcy); } }
    ctx.save(); tiltOn();
    if (ub && uimg && ub.mode === 'area') {
      ctx.save(); panelPath(); ctx.clip(); ctx.globalAlpha = ub.op == null ? 1 : ub.op;
      var k3 = Math.max(pw / uimg.width, ph / uimg.height); ctx.drawImage(uimg, px + (pw - uimg.width * k3) / 2, py + (ph - uimg.height * k3) / 2, uimg.width * k3, uimg.height * k3);
      ctx.restore();
    }
    if (P.on && P.color) { ctx.save(); ctx.globalAlpha = P.op == null ? 0.85 : P.op; ctx.fillStyle = P.color; panelPath(); ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var items = layout(ctx, tpl, state);
    /* מדבקות ואלמנטים במיקום חופשי (מאחורי הטקסט) */
    var floats = [];
    (state.blocks || []).forEach(function(b, i){
      if (!b.abs || b.hidden || b.type !== 'photo') return;
      var w = Math.max(10, b.abs.w || 150), it = { i: i, b: b, x: b.abs.x || 0, y: b.abs.y || 0, w: w, pw: w, h: w * photoRatio(b), abs: true };
      drawPhoto(ctx, it, photos[b.src], colorOf(b.color, tpl, colors)); floats.push(it);
    });
    ctx.save(); tiltOn();
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
        lines.forEach(function(line, i){
          var yy = it.y + it.size * 0.95 + i * it.size * b.lh;
          if (!b.italic) { ctx.fillText(line, x, yy); return; }
          /* נטוי: הטיה של האותיות סביב קו הבסיס (גם לגופנים עבריים שאין להם גרסה נטויה) */
          ctx.save(); ctx.translate(x, yy); ctx.transform(1, 0, -0.21, 1, 0, 0); ctx.fillText(line, 0, 0); ctx.restore();
        });
      }
      if (b.cols) { col1(it.lines, it.x + it.w - it.width, it.width); col1(it.lines2, it.x, it.width); }
      else col1(it.lines, it.x, it.w);
    });
    ctx.restore();
    canvas._tilt = tilt ? { cx: pcx, cy: pcy, a: tilt } : null;
    if (opt.guide) { /* בניהול: קו מקווקו של הצורה ושל המקום שבו הטקסט נכנס */
      ctx.save(); tiltOn(); ctx.setLineDash([8, 6]); ctx.lineWidth = 2.5; ctx.strokeStyle = '#d6336c'; panelPath(); ctx.stroke();
      var IA = innerArea(areaOf(tpl, state), SH); ctx.strokeStyle = '#1f8a96'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]); ctx.strokeRect(IA.x, IA.y, IA.w, IA.h); ctx.restore(); }
    if (opt.watermark) drawMark(ctx, r[3], opt.watermark === 'faint' ? 0.08 : 0.17);
    canvas._items = items.concat(floats);
    return canvas;
  });
}

/* לחיצה על התצוגה: איזו פסקה נמצאת בנקודה (ביחידות העיצוב) */
function hit(canvas, x0, y0){
  var best = null, T = canvas._tilt;
  (canvas._items || []).forEach(function(it){
    var x = x0, y = y0;
    if (T && !it.abs) { var dx = x0 - T.cx, dy = y0 - T.cy, c = Math.cos(-T.a), sn = Math.sin(-T.a); x = T.cx + dx * c - dy * sn; y = T.cy + dx * sn + dy * c; }
    if (x >= it.x - 8 && x <= it.x + it.w + 8 && y >= it.y - 6 && y <= it.y + it.h + 6) {
      var d = it.abs ? -1 : Math.abs(y - (it.y + it.h / 2)); if (!best || d < best.d) best = { i: it.i, d: d };
    }
  });
  return best ? best.i : null;
}

function clone(o){ return JSON.parse(JSON.stringify(o)); }
function defaults(tpl){
  var s = { colors: {}, blocks: free(tpl) && !(tpl.blocks && tpl.blocks.length) ? [] : (tpl.blocks ? clone(tpl.blocks) : starter('greeting', '#14213d', '#8a6a22')), scale: 1 };
  (tpl.colors || []).forEach(function(c){ s.colors[c.k] = c.def; });
  return s;
}
function newText(tpl, after){
  var b = T('', '', 17, { gap: 10 });
  if (after && after.type === 'text') { b.font = after.font; b.color = after.color; b.size = Math.min(after.size, 22); }
  return b;
}
function newDivider(){ return D({ gap: 10 }); }
/* משטח מיקום קטן: קו אנכי ואופקי עם נקודה באמצע. נקודה כתומה מראה כמה השורה זזה מהמקום המקורי.
   לחיצה עליו מחזירה את השורה למקום המקורי */
function movePad(b, onReset){
  if (b.g0 == null) b.g0 = b.gap || 0;
  var K = 13 / 70, px = Math.max(-13, Math.min(13, (b.dx || 0) * K)), py = Math.max(-13, Math.min(13, ((b.gap || 0) - b.g0) * K)), moved = px || py;
  var bt = document.createElement('button'); bt.type = 'button'; bt.className = 'mpad';
  bt.title = moved ? 'לחיצה מחזירה למקום המקורי' : 'במקום המקורי'; bt.setAttribute('aria-label', bt.title);
  bt.innerHTML = '<svg viewBox="0 0 36 36" width="36" height="36" aria-hidden="true"><path d="M18 3v30M3 18h30" stroke="currentColor" stroke-opacity=".45" stroke-width="1.5"/>' +
    (moved ? '<path d="M18 18L' + (18 + px) + ' ' + (18 + py) + '" stroke="#e07a2f" stroke-width="1.5" stroke-dasharray="2 2"/>' : '') +
    '<circle cx="18" cy="18" r="4" fill="#fff" stroke="currentColor" stroke-width="1.5"/>' +
    (moved ? '<circle cx="' + (18 + px) + '" cy="' + (18 + py) + '" r="4.2" fill="#e07a2f"/>' : '') + '</svg>';
  bt.onclick = function(){ b.gap = b.g0; b.dx = 0; if (onReset) onReset(); };
  return bt;
}
/* לוח "רקע ושטח הטקסט" (משותף לשני העורכים): צבע לשטח הטקסט, ותמונת רקע של הלקוח */
function readImg(file, max, cb){
  var url = URL.createObjectURL(file), im = new Image();
  im.onload = function(){ var s = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); cb(c.toDataURL('image/jpeg', 0.85)); };
  im.onerror = function(){ URL.revokeObjectURL(url); };
  im.src = url;
}
function bgPanel(box, getS, changed, colorRow, tpl, edges){
  function el(t, c, x){ var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rng(label, min, max, val, fn){ var l = el('label', 'bgp-r', label), r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; r.oninput = function(){ fn(+r.value); changed(); }; l.appendChild(r); return l; }
  function draw(){
    var S = getS(); box.innerHTML = '';
    var ty = tpl ? typeOf(tpl) : 'design';
    var marg = ty === 'own' || ty === 'bg' || ty === 'frame' || (ty === 'design' && tpl.noArea);
    if (marg) {
      var O = S.own || {}, ar = S.area || (S.area = (ty === 'bg' && !tpl.areaSet) || ty === 'design' ? { t: 9, b: 9, r: 10, l: 10, v: 'center' } : ty === 'frame' || ty === 'bg' ? null : { t: 13, b: 13, r: 14, l: 14, v: 'center' });
      if (!ar) { var A0 = areaOf(tpl, S), d0 = dims(tpl, S); ar = S.area = { t: Math.round(A0.y / d0.H * 100), b: Math.round((d0.H - A0.y - A0.h) / d0.H * 100), r: Math.round((d0.W - A0.x - A0.w) / d0.W * 100), l: Math.round(A0.x / d0.W * 100), v: A0.valign === 'top' ? 'top' : 'center' }; }
    }
    if (marg) {
      if (ty === 'own') {
      box.appendChild(el('div', 'bgp-h', 'הדף שלכם'));
      var oi = document.createElement('input'); oi.type = 'file'; oi.accept = 'image/*'; oi.hidden = true; box.appendChild(oi);
      var ob = el('button', 'pill', O.src ? '✓ הדף הועלה · החלפה' : '⬆ העלאת הדף המעוצב שלכם'); ob.type = 'button';
      ob.onclick = function(){ oi.onchange = function(){ var f = oi.files[0]; if (!f) return; readImg(f, 2480, function(src){ S.own = { src: src }; changed(); draw(); }); oi.value = ''; }; oi.click(); };
      var orow = el('div', 'bgp-b'); orow.appendChild(ob); box.appendChild(orow);
      box.appendChild(el('div', 'bgp-n', 'תמונה בגודל A4 (לפחות 1240×1754 פיקסלים להדפסה טובה).'));
      }
      box.appendChild(el('div', 'bgp-h', 'איפה יושב הטקסט'));
      [['t', 'מרחק מלמעלה'], ['b', 'מרחק מלמטה'], ['r', 'מרחק מימין'], ['l', 'מרחק משמאל']].forEach(function(x){ box.appendChild(rng(x[1], 0, 45, ar[x[0]] == null ? 13 : ar[x[0]], function(v){ ar[x[0]] = v; })); });
      var vt = document.createElement('input'); vt.type = 'checkbox'; vt.checked = ar.v === 'top'; vt.id = 'bgpV' + Math.random().toString(36).slice(2, 6);
      var vl = el('label', '', 'הטקסט מתחיל מלמעלה (במקום באמצע)'); vl.htmlFor = vt.id; var vw = el('div', 'bgp-t'); vw.append(vt, vl); box.appendChild(vw);
      vt.onchange = function(){ ar.v = vt.checked ? 'top' : 'center'; changed(); };
    }
    /* צורה ושיפוע של שטח הטקסט */
    var TS = S.tshape || (S.tshape = clone((tpl && tpl.tshape) || {}));
    box.appendChild(el('div', 'bgp-h', 'צורת שטח הטקסט'));
    var sr = el('div', 'bgp-b');
    TSHAPES.forEach(function(x){ var b = el('button', 'pill', x[1]); b.type = 'button'; b.setAttribute('aria-pressed', String((TS.s || 'rect') === x[0])); b.onclick = function(){ TS.s = x[0]; if (x[0] !== 'rect' && S.panel && !S.panel.on && !(S.ubg && S.ubg.src)) { S.panel.on = true; } changed(); draw(); }; sr.appendChild(b); });
    box.appendChild(sr);
    box.appendChild(rng('שיפוע (מעלות)', -45, 45, TS.a || 0, function(v){ TS.a = Math.abs(v) < 2 ? 0 : v; }));
    if (TS.a) { var zr = el('div', 'bgp-b'), zb = el('button', 'pill', 'ישר, בלי שיפוע'); zb.type = 'button'; zb.onclick = function(){ TS.a = 0; changed(); draw(); }; zr.appendChild(zb); box.appendChild(zr); }
    var P = S.panel || (S.panel = { on: false, color: '#ffffff', op: 0.85, r: 20, pad: 14 });
    var t = el('div', 'bgp-t'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!P.on; cb.id = 'bgpOn' + Math.random().toString(36).slice(2, 6);
    var lb = el('label', '', 'צבע לשטח הטקסט'); lb.htmlFor = cb.id; t.append(cb, lb); box.appendChild(t);
    cb.onchange = function(){ P.on = cb.checked; changed(); draw(); };
    if (P.on) {
      box.appendChild(colorRow(P.color, function(c, live){ P.color = /^#/.test(c) ? c : P.color; changed(); if (!live) draw(); }));
      box.appendChild(rng('שקיפות', 10, 100, Math.round((P.op == null ? .85 : P.op) * 100), function(v){ P.op = v / 100; }));
      if ((TS.s || 'rect') === 'rect') {
      box.appendChild(rng('עיגול הפינות למעלה', 0, 100, P.r == null ? 20 : P.r, function(v){ P.r = v; }));
      box.appendChild(rng('עיגול הפינות למטה', 0, 100, P.rb == null ? (P.r == null ? 20 : P.r) : P.rb, function(v){ P.rb = v; }));
      }
      box.appendChild(rng('שוליים מסביב לטקסט', 0, 80, P.pad == null ? 14 : P.pad, function(v){ P.pad = v; }));
    }
    var U = S.ubg || {};
    box.appendChild(el('div', 'bgp-h', 'תמונת רקע לשטח הטקסט'));
    var row = el('div', 'bgp-b');
    var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.hidden = true; box.appendChild(inp);
    function pick(mode){ inp.onchange = function(){ var f = inp.files[0]; if (!f) return; readImg(f, 1600, function(src){ S.ubg = { src: src, mode: mode, op: 1 }; changed(); draw(); }); inp.value = ''; }; inp.click(); }
    var b1 = el('button', 'pill', U.src && U.mode === 'page' ? '✓ לכל הדף · החלפה' : 'העלאה לכל הדף'); b1.type = 'button'; b1.onclick = function(){ pick('page'); };
    var b2 = el('button', 'pill', U.src && U.mode === 'area' ? '✓ בשטח הטקסט · החלפה' : 'העלאה לשטח הטקסט'); b2.type = 'button'; b2.onclick = function(){ pick('area'); };
    row.append(b2);
    if (U.src) { var b3 = el('button', 'pill', 'הסרת התמונה'); b3.type = 'button'; b3.onclick = function(){ delete S.ubg; changed(); draw(); }; row.appendChild(b3); }
    box.appendChild(row);
    if (edges && (P.on || U.src)) {
      var er = el('div', 'bgp-b'), eb = el('button', 'pill', edges.on ? '✓ סיום שינוי הגבולות' : '✥ הגדלה והקטנה של השטח (גרירת הצדדים)'); eb.type = 'button';
      eb.onclick = function(){ edges.toggle(); draw(); }; er.appendChild(eb);
      if (P.dt || P.db || P.dr || P.dl) { var rb = el('button', 'pill', 'איפוס הגבולות'); rb.type = 'button'; rb.onclick = function(){ P.dt = P.db = P.dr = P.dl = 0; edges.place(); changed(); draw(); }; er.appendChild(rb); }
      box.appendChild(er);
    } else if (edges && edges.on) edges.toggle(false);
    if (U.src) box.appendChild(rng('שקיפות התמונה', 10, 100, Math.round((U.op == null ? 1 : U.op) * 100), function(v){ U.op = v / 100; }));
  }
  draw(); return draw;
}
/* הגדרות הדף: כיוון, היפוך, שקיפות, בהירות, רוויה, גוון, צבע בסיס */
/* בונה מסגרות: מסגרת לכל הדף, מצוירת (חדה בכל גודל הדפסה). B = { style, color ('gold' או #hex), s: עובי/גודל, m: מרחק מהקצה, op } */
/* צבעי מתכת ואבני חן למסגרות (מעבר צבע מבריק) */
var METALS = {
  gold: ['זהב', ['#f3d98a', '#b8892c', '#f0d27c', '#a87a22', '#e9c869']], rosegold: ['זהב ורוד', ['#f7d3c4', '#c9866f', '#f4c3ae', '#b06f5a', '#ecc0ad']],
  silver: ['כסף', ['#f2f4f7', '#9aa1ab', '#e9ecf0', '#8b929c', '#d9dde3']], copper: ['נחושת', ['#f2b98d', '#a65a2a', '#e8a070', '#8a4520', '#d98d5c']],
  bronze: ['ברונזה', ['#e2c08a', '#8c6a35', '#d4b07a', '#6e5226', '#c9a46a']], champagne: ['שמפניה', ['#fbf1da', '#d8c39a', '#f6e8c8', '#c4ab7c', '#efe0bd']],
  emerald: ['אמרלד', ['#8fe0b5', '#1d6b48', '#5cc795', '#0f4a30', '#46b383']], sapphire: ['ספיר', ['#9ec5f5', '#1f4f9a', '#6aa3e8', '#14336b', '#4f8ad6']],
  ruby: ['רובי', ['#f5a3b0', '#9e1b33', '#e5677d', '#6e0f22', '#d24a63']], amethyst: ['אמטיסט', ['#d9b8f2', '#6a2f9e', '#b98ae0', '#4a1d70', '#a070d0']],
  navy: ['כחול וזהב', ['#1d2f5a', '#c9a24a', '#1d2f5a', '#e6c76c', '#1d2f5a']], black: ['שחור מבריק', ['#5a5a5a', '#111111', '#3a3a3a', '#000000', '#2a2a2a']]
};
var BORDERS = [['double','קו כפול'],['thinthick','עבה ודק'],['triple','שלושה קווים'],['deco','ארט דקו'],['corners','פינות מעוטרות'],['flourish','סלסולים'],['meander','מפתח יווני'],['vine','גפן ועלים'],['pearls','פנינים'],['dots','קו ונקודות'],['diamonds','יהלומים'],['hearts','לבבות'],['magen','מגני דוד'],['stars','כוכבים'],['scallop','קשתות'],['rope','חבל קלוע']];
function drawBorder(ctx, B, PWd, PHd){
  var s = B.s || 1, m = B.m == null ? 28 : B.m, x0 = m, y0 = m, x1 = PWd - m, y1 = PHd - m, w = x1 - x0, h = y1 - y0;
  ctx.save(); ctx.globalAlpha = B.op == null ? 1 : B.op;
  var col, gs = METALS[B.color || 'gold'];
  if (gs) { col = ctx.createLinearGradient(0, 0, PWd, PHd); gs[1].forEach(function(c, i){ col.addColorStop(i / (gs[1].length - 1), c) }); }
  else col = B.color;
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  function rect(inset, lw){ ctx.lineWidth = lw; ctx.strokeRect(x0 + inset, y0 + inset, w - inset * 2, h - inset * 2); }
  /* מוטיב חוזר לאורך ארבע הצלעות. f(x, y, ang, i) מצייר מוטיב אחד שמרכזו בנקודה */
  function along(step, f, inset){
    inset = inset || 0; var X0 = x0 + inset, Y0 = y0 + inset, X1 = x1 - inset, Y1 = y1 - inset;
    [[X0, Y0, X1, Y0, 0], [X1, Y0, X1, Y1, 90], [X1, Y1, X0, Y1, 180], [X0, Y1, X0, Y0, 270]].forEach(function(e, ei){
      var L = Math.hypot(e[2] - e[0], e[3] - e[1]), n = Math.max(1, Math.round(L / step)), st = L / n;
      for (var i = 0; i < n; i++) { var t = (i + .5) * st / L; f(e[0] + (e[2] - e[0]) * t, e[1] + (e[3] - e[1]) * t, e[4], i, ei); }
    });
  }
  function at(x, y, ang, fn){ ctx.save(); ctx.translate(x, y); ctx.rotate(ang * Math.PI / 180); fn(); ctx.restore(); }
  function heart(sz){ ctx.beginPath(); ctx.moveTo(0, sz * .35); ctx.bezierCurveTo(-sz * .9, -sz * .25, -sz * .45, -sz * .95, 0, -sz * .4); ctx.bezierCurveTo(sz * .45, -sz * .95, sz * .9, -sz * .25, 0, sz * .35); ctx.fill(); }
  function star(r, pts, inner){ ctx.beginPath(); for (var k = 0; k < pts * 2; k++) { var rr = k % 2 ? r * inner : r, a = Math.PI * k / pts - Math.PI / 2; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function magen(r, lw){ ctx.lineWidth = lw; [0, Math.PI].forEach(function(o){ ctx.beginPath(); for (var k = 0; k < 3; k++) { var a = o - Math.PI / 2 + k * 2 * Math.PI / 3; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.stroke(); }); }
  function scrollC(sz){ ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(sz * .6, -sz * .1, sz * .9, sz * .35, sz * .55, sz * .55); ctx.bezierCurveTo(sz * .3, sz * .7, sz * .1, sz * .45, sz * .3, sz * .3); ctx.stroke(); }
  function corners(fn){ [[x0, y0, 0], [x1, y0, 90], [x1, y1, 180], [x0, y1, 270]].forEach(function(c){ at(c[0], c[1], c[2], fn); }); }
  var st = B.style;
  if (st === 'double') { rect(0, 3 * s); rect(9 * s, 3 * s); }
  else if (st === 'thinthick') { rect(0, 9 * s); rect(16 * s, 2 * s); }
  else if (st === 'triple') { rect(0, 2 * s); rect(7 * s, 5 * s); rect(16 * s, 2 * s); }
  else if (st === 'deco') {
    rect(0, 2.5 * s); rect(12 * s, 1.5 * s);
    corners(function(){ ctx.lineWidth = 2.5 * s; var a = 46 * s; ctx.beginPath(); ctx.moveTo(a, 0); ctx.lineTo(a, a * .5); ctx.lineTo(a * .5, a * .5); ctx.lineTo(a * .5, a); ctx.lineTo(0, a); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a * 1.5, 12 * s); ctx.lineTo(a * 1.5, a * 1.05); ctx.lineTo(a * 1.05, a * 1.05); ctx.lineTo(a * 1.05, a * 1.5); ctx.lineTo(12 * s, a * 1.5); ctx.stroke();
      ctx.fillRect(a * .62, a * .62, a * .26, a * .26); });
  }
  else if (st === 'corners') {
    rect(6 * s, 2 * s);
    corners(function(){ var a = 70 * s; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(0, a); ctx.quadraticCurveTo(0, 0, a, 0); ctx.stroke();
      ctx.save(); ctx.translate(16 * s, 16 * s); star(14 * s, 4, .35); ctx.restore();
      ctx.save(); ctx.translate(a * .62, a * .1); ctx.rotate(.2); scrollC(30 * s); ctx.restore(); ctx.save(); ctx.translate(a * .1, a * .62); ctx.scale(-1, 1); ctx.rotate(-Math.PI / 2 - .2); scrollC(30 * s); ctx.restore(); });
  }
  else if (st === 'flourish') {
    ctx.lineWidth = 2 * s; var g = 80 * s;
    ctx.beginPath(); ctx.moveTo(x0 + g, y0); ctx.lineTo(x1 - g, y0); ctx.moveTo(x1, y0 + g); ctx.lineTo(x1, y1 - g); ctx.moveTo(x1 - g, y1); ctx.lineTo(x0 + g, y1); ctx.moveTo(x0, y1 - g); ctx.lineTo(x0, y0 + g); ctx.stroke();
    corners(function(){ ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(g, 0); ctx.bezierCurveTo(g * .4, 0, g * .2, g * .25, g * .45, g * .45); ctx.bezierCurveTo(g * .6, g * .6, g * .75, g * .35, g * .55, g * .28); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, g); ctx.bezierCurveTo(0, g * .4, g * .25, g * .2, g * .45, g * .45); ctx.stroke(); ctx.beginPath(); ctx.arc(g * .18, g * .18, 6 * s, 0, 7); ctx.fill(); });
    [[ (x0 + x1) / 2, y0, 0], [(x0 + x1) / 2, y1, 180]].forEach(function(c){ at(c[0], c[1], c[2], function(){ ctx.lineWidth = 2.5 * s; [-1, 1].forEach(function(d){ ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(d * 20 * s, 18 * s, d * 45 * s, 10 * s, d * 40 * s, -2 * s); ctx.stroke(); }); ctx.save(); ctx.rotate(Math.PI / 4); ctx.fillRect(-6 * s, -6 * s, 12 * s, 12 * s); ctx.restore(); }); });
  }
  else if (st === 'meander') {
    var u = 9 * s; rect(-u * .2, 1.6 * s); rect(u * 5.2, 1.6 * s);
    ctx.lineWidth = 2 * s;
    along(u * 6, function(x, y, ang){ at(x, y + 0, ang, function(){ ctx.translate(0, u * 2.5); ctx.beginPath(); ctx.moveTo(-u * 3, u * 2); ctx.lineTo(-u * 3, -u * 2); ctx.lineTo(u * 1, -u * 2); ctx.lineTo(u * 1, u * 1); ctx.lineTo(-u * 1, u * 1); ctx.lineTo(-u * 1, -u * .5); ctx.stroke(); }); }, 0);
  }
  else if (st === 'vine') {
    ctx.lineWidth = 2 * s; rect(10 * s, 1.5 * s);
    along(42 * s, function(x, y, ang, i){ at(x, y, ang, function(){ var d = i % 2 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(-21 * s, 0); ctx.quadraticCurveTo(0, d * 10 * s, 21 * s, 0); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, d * 9 * s, 9 * s, 4 * s, d * .5, 0, 7); ctx.fill(); }); }, 0);
  }
  else if (st === 'pearls') { rect(14 * s, 1.5 * s); along(16 * s, function(x, y){ ctx.beginPath(); ctx.arc(x, y, 5.5 * s, 0, 7); ctx.fill(); }, 0); }
  else if (st === 'dots') { rect(0, 2 * s); rect(18 * s, 2 * s); along(18 * s, function(x, y){ ctx.beginPath(); ctx.arc(x, y, 2.6 * s, 0, 7); ctx.fill(); }, 9 * s); }
  else if (st === 'diamonds') { rect(0, 1.5 * s); rect(22 * s, 1.5 * s); along(22 * s, function(x, y, ang){ at(x, y, ang + 45, function(){ ctx.fillRect(-5 * s, -5 * s, 10 * s, 10 * s); }); }, 11 * s); }
  else if (st === 'hearts') { along(30 * s, function(x, y, ang){ at(x, y, ang, function(){ heart(11 * s); }); }, 0); rect(20 * s, 1.5 * s); }
  else if (st === 'magen') { rect(0, 1.5 * s); rect(32 * s, 1.5 * s); along(34 * s, function(x, y){ at(x, y, 0, function(){ magen(10 * s, 1.8 * s); }); }, 16 * s); }
  else if (st === 'stars') { along(30 * s, function(x, y){ at(x, y, 0, function(){ star(9 * s, 5, .45); }); }, 0); rect(18 * s, 1.5 * s); }
  else if (st === 'scallop') {
    ctx.lineWidth = 2.5 * s; rect(12 * s, 1.5 * s);
    along(26 * s, function(x, y, ang){ at(x, y, ang, function(){ ctx.beginPath(); ctx.arc(0, 0, 13 * s, Math.PI, 0); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -6 * s, 2.5 * s, 0, 7); ctx.fill(); }); }, 0);
  }
  else if (st === 'rope') { ctx.lineWidth = 2.2 * s; along(12 * s, function(x, y, ang){ at(x, y, ang + 35, function(){ ctx.beginPath(); ctx.ellipse(0, 0, 8 * s, 3.6 * s, 0, 0, 7); ctx.stroke(); }); }, 0); rect(14 * s, 1.2 * s); }
  ctx.restore();
}
function borderPanel(box, getS, changed, tpl, colorRow){
  function el(t, c, x){ var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rng(label, min, max, val, fn){ var l = el('label', 'bgp-r', label), r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; r.oninput = function(){ fn(+r.value); changed(); }; l.appendChild(r); return l; }
  function draw(){
    var S = getS(), B = S.border || {}; box.innerHTML = '';
    var cur = BORDERS.find(function(x){ return x[0] === B.style }), top = el('div', 'bgp-b');
    var tg = el('button', 'pill', (box._open ? '▴ ' : '▾ ') + (cur ? 'מסגרת: ' + cur[1] + ' · החלפה' : 'בחירת מסגרת')); tg.type = 'button'; tg.setAttribute('aria-expanded', String(!!box._open));
    tg.onclick = function(){ box._open = !box._open; draw(); }; top.appendChild(tg);
    if (cur) { var rm = el('button', 'pill', 'הסרת המסגרת'); rm.type = 'button'; rm.onclick = function(){ delete S.border; box._open = false; changed(); draw(); }; top.appendChild(rm); }
    box.appendChild(top);
    var g = el('div', 'bdg'); g.hidden = !box._open; box.appendChild(g);
    [['', 'בלי מסגרת']].concat(BORDERS).forEach(function(b){
      var bt = el('button', 'bdi'); bt.type = 'button'; bt.title = b[1]; bt.setAttribute('aria-label', b[1]); bt.setAttribute('aria-pressed', String((B.style || '') === b[0]));
      var c = document.createElement('canvas'); c.width = 84; c.height = 112; var x = c.getContext('2d'); x.fillStyle = '#fffdf7'; x.fillRect(0, 0, 84, 112);
      if (b[0]) { x.scale(84 / 397, 112 / 561); drawBorder(x, { style: b[0], color: B.color || 'gold', s: 1.1, m: 22 }, 397, 561); }
      else { x.strokeStyle = '#c8c2b0'; x.setLineDash([4, 4]); x.strokeRect(10, 10, 64, 92); }
      bt.append(c, el('small', '', b[1]));
      bt.onclick = function(){ if (!b[0]) delete S.border; else { S.border = Object.assign({ color: 'gold', s: 1.4, m: 30 }, S.border || {}, { style: b[0] }); } box._open = false; changed(); draw(); };
      g.appendChild(bt);
    });
    if (!B.style) return;
    box.appendChild(el('div', 'bgp-h', 'צבע המסגרת'));
    var cr = el('div', 'mtl'); Object.keys(METALS).forEach(function(k){ var m = METALS[k], b = el('button', 'mt'); b.type = 'button'; b.title = m[0]; b.setAttribute('aria-label', m[0]); b.setAttribute('aria-pressed', String((B.color || 'gold') === k));
      b.style.background = 'linear-gradient(135deg,' + m[1].join(',') + ')'; b.appendChild(el('small', '', m[0])); b.onclick = function(){ B.color = k; changed(); draw(); }; cr.appendChild(b); });
    box.appendChild(cr);
    box.appendChild(colorRow(/^#/.test(B.color || '') ? B.color : '', function(c, live){ if (/^#/.test(c)) B.color = c; else return; changed(); if (!live) draw(); }));
    box.appendChild(rng('עובי וגודל', 40, 250, Math.round((B.s || 1) * 100), function(v){ B.s = v / 100; }));
    box.appendChild(rng('מרחק מקצה הדף', 0, 140, B.m == null ? 28 : B.m, function(v){ B.m = v; }));
    box.appendChild(rng('שקיפות', 10, 100, Math.round((B.op == null ? 1 : B.op) * 100), function(v){ B.op = v / 100; }));
  }
  draw(); return draw;
}
function pagePanel(box, getS, changed, tpl, colorRow){
  function el(t, c, x){ var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function rng(label, min, max, val, fn){ var l = el('label', 'bgp-r', label), r = document.createElement('input'); r.type = 'range'; r.min = min; r.max = max; r.value = val; r.oninput = function(){ fn(+r.value); changed(); }; l.appendChild(r); return l; }
  function btn(t, on, fn){ var b = el('button', 'pill', t); b.type = 'button'; b.setAttribute('aria-pressed', String(!!on)); b.onclick = function(){ fn(); changed(); draw(); }; return b; }
  function draw(){
    var S = getS(), G = S.page || (S.page = {}); box.innerHTML = '';
    if (free(tpl)) {
      var L = isLand(tpl, S), q0 = quarter(tpl, S);
      /* לאורך / לרוחב: הרקע מסתובב 90° יחד עם הדף. סיבוב: כל לחיצה עוד 90° */
      var o = el('div', 'bgp-b');
      o.append(btn('▯ לאורך', !L, function(){ if (L) { G.rot = (q0 + 1) % 4; G.land = false; } }), btn('▭ לרוחב', L, function(){ if (!L) { G.rot = (q0 + 1) % 4; G.land = true; } }),
        btn('⟳ סיבוב 90°', false, function(){ G.rot = (q0 + 1) % 4; G.land = !L; }));
      box.appendChild(o);
    }
    var f = el('div', 'bgp-b'); f.append(btn('⇋ היפוך ימין־שמאל', G.fx, function(){ G.fx = !G.fx; }), btn('⇵ היפוך למעלה־למטה', G.fy, function(){ G.fy = !G.fy; })); box.appendChild(f);
    box.appendChild(rng('שקיפות הרקע', 5, 100, Math.round((G.op == null ? 1 : G.op) * 100), function(v){ G.op = v / 100; }));
    box.appendChild(rng('בהירות', 40, 160, G.br == null ? 100 : G.br, function(v){ G.br = v; }));
    box.appendChild(rng('עוצמת הצבעים', 0, 200, G.sat == null ? 100 : G.sat, function(v){ G.sat = v; }));
    box.appendChild(rng('שינוי גוון', -180, 180, G.hue || 0, function(v){ G.hue = v; }));
    if ((G.op != null && G.op < 1) || G.color) { box.appendChild(el('div', 'bgp-h', 'צבע מתחת לרקע')); box.appendChild(colorRow(G.color || '#ffffff', function(c, live){ if (/^#/.test(c)) G.color = c; changed(); if (!live) draw(); })); }
    if (G.fx || G.fy || G.land != null || G.rot || G.color || (G.op != null && G.op !== 1) || (G.br != null && G.br !== 100) || (G.sat != null && G.sat !== 100) || G.hue) {
      var rs = el('div', 'bgp-b'); rs.appendChild(btn('איפוס הגדרות הדף', false, function(){ S.page = {}; })); box.appendChild(rs);
    }
  }
  draw(); return draw;
}
function newSticker(it, tpl, state){
  var d = dims(tpl, state), w = Math.round(d.W * 0.28), r = it.r || 1, h = w * r;
  return { type: 'photo', src: it.url, shape: 'orig', ratio: r, abs: { x: Math.round((d.W - w) / 2), y: Math.round((d.H - h) / 2), w: w }, border: 0, op: 1, rot: 0, color: '#b08d3c', align: 'center', gap: 0, sticker: true };
}
function newPhoto(src){ return { type: 'photo', src: src || '', shape: 'circle', size: 0.38, zoom: 1, ox: 0, oy: 0, border: 3, color: '#b08d3c', align: 'center', gap: 12 }; }

/* פרטים אישיים שהלקוח ממלא פעם אחת, ומופיעים בכל העיצובים (נשמרים בדפדפן) */
var PERSONAL = [['name','שם המבורך / בעל השמחה'],['name2','שם נוסף (חתן / בן מצווה / תינוק)'],['groom','שם החתן'],['bride','שם הכלה'],['details','מועד ומקום'],['times','שעות'],['sign','חתימה (מי מברך / מזמין)']];
/* אילו שדות שייכים לכל אירוע, ובאיזה שם, בנפרד לברכה ולהזמנה (ברירת מחדל; בניהול אפשר לשנות לכל אירוע) */
function FD(gk, gl, ik, il){ return { greeting: { keys: gk, labels: gl || {} }, invite: { keys: ik || gk, labels: il || gl || {} } }; }
var SIGN_INV = 'חתימה (ההורים / המזמינים)';
var HOLI = FD(['name', 'sign'], { name: 'למי הברכה (לא חובה)', sign: 'חתימה (ממי הברכה)' }, ['name', 'details', 'times', 'sign'], { name: 'שם האירוע / המארגנים', sign: 'חתימה (המזמינים)' });
var FIELDS_DEF = {
  wedding: FD(['name', 'name2', 'sign'], { name: 'שם המבורך (למשל הורי החתן)', name2: 'שם החתן / הכלה', sign: 'חתימה (ממי הברכה)' }, ['groom', 'bride', 'details', 'times', 'sign'], { sign: SIGN_INV }),
  engagement: FD(['name', 'name2', 'sign'], { name: 'שם המבורך (למשל הורי החתן)', name2: 'שם החתן / הכלה', sign: 'חתימה (ממי הברכה)' }, ['groom', 'bride', 'details', 'times', 'sign'], { sign: SIGN_INV }),
  anniversary: FD(['name', 'sign'], { name: 'שמות בני הזוג' }, ['name', 'details', 'times', 'sign'], { name: 'שמות בני הזוג' }),
  barmitzvah: FD(['name', 'name2', 'sign'], { name: 'שם המבורך (למשל ההורים)', name2: 'שם בן המצווה' }, ['name2', 'details', 'times', 'sign'], { name2: 'שם בן המצווה', sign: SIGN_INV }),
  batmitzvah: FD(['name', 'name2', 'sign'], { name: 'שם המבורך (למשל ההורים)', name2: 'שם בת המצווה' }, ['name2', 'details', 'times', 'sign'], { name2: 'שם בת המצווה', sign: SIGN_INV }),
  birth: FD(['name', 'name2', 'sign'], { name: 'שמות ההורים', name2: 'שם התינוק / התינוקת' }, ['name2', 'details', 'times', 'sign'], { name2: 'שם התינוק / התינוקת', sign: SIGN_INV }),
  birthday: FD(['name', 'sign'], { name: 'שם בעל/ת יום ההולדת' }, ['name', 'details', 'times', 'sign'], { name: 'שם בעל/ת יום ההולדת' }),
  donors: FD(['name', 'sign'], { name: 'שם התורם / המשפחה' }),
  torah: FD(['name', 'sign'], { name: 'שם התורם / המשפחה' }, ['name', 'details', 'times', 'sign'], { name: 'שם התורם / המשפחה' }),
  siyum: FD(['name', 'sign'], { name: 'שם המסיים / הלומדים' }, ['name', 'details', 'times', 'sign'], { name: 'שם המסיים / הלומדים' }),
  home: FD(['name', 'sign'], { name: 'שם המשפחה' }, ['name', 'details', 'times', 'sign'], { name: 'שם המשפחה' }),
  business: FD(['name', 'name2', 'sign'], { name: 'שם בעל העסק', name2: 'שם העסק' }, ['name', 'name2', 'details', 'times', 'sign'], { name: 'שם בעל העסק', name2: 'שם העסק' }),
  shul: FD(['name', 'sign'], { name: 'שם בית הכנסת / הקהילה' }, ['name', 'details', 'times', 'sign'], { name: 'שם בית הכנסת / הקהילה' }),
  shabbat: FD(['name', 'sign'], { name: 'שם המבורך / המארגנים' }, ['name', 'details', 'times', 'sign'], { name: 'שם האירוע / המארגנים' }),
  roshhashana: HOLI, yomkippur: HOLI, sukkot: HOLI, simchattorah: HOLI, chanukah: HOLI, tubishvat: HOLI, purim: HOLI, pesach: HOLI, lagbaomer: HOLI, shavuot: HOLI,
  condolence: FD(['name', 'sign'], { name: 'שם האבל / המשפחה', sign: 'חתימה (המנחמים)' }),
  thanks: FD(['name', 'sign'], { name: 'למי התודה' }),
  certificate: FD(['name', 'sign'], { name: 'שם מקבל התעודה', sign: 'חתימה (מעניק התעודה)' })
};
var FIELDS_OVR = {};
/* השדות של אירוע: [[מפתח, שם], ...]. kind: 'greeting' / 'invite', או ריק = שניהם יחד. אירוע שלא הוגדר: כל השדות */
function fieldsFor(cat, kind){
  var c = FIELDS_OVR[cat] || FIELDS_DEF[cat];
  if (!c) return PERSONAL.slice();
  var ks = kind ? [kind] : ['greeting', 'invite'], keys = [], labels = {};
  ks.forEach(function(k){ var x = c[k] || {}; (x.keys || []).forEach(function(q){ if (keys.indexOf(q) < 0) keys.push(q); if (x.labels && x.labels[q] && !labels[q]) labels[q] = x.labels[q]; }); });
  if (!keys.length) return PERSONAL.slice();
  return PERSONAL.filter(function(x){ return keys.indexOf(x[0]) >= 0 }).map(function(x){ return [x[0], labels[x[0]] || x[1]]; });
}
var PROFILE_KEY = 'myluach-greet-profile';
function profile(){ try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}') || {} } catch (e) { return {} } }
function saveProfile(p){ try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)) } catch (e) {} }
function applyProfile(blocks, p, cat, kind){
  p = p || profile();
  var keys = (cat ? fieldsFor(cat, kind) : PERSONAL).map(function(x){ return x[0] });
  blocks.forEach(function(b){ if (b.type === 'text' && b.k && keys.indexOf(b.k) >= 0 && p[b.k] && String(p[b.k]).trim()) b.text = p[b.k]; });
  return blocks;
}

/* עיצובים וקטגוריות שנוספו בניהול, והגדרות הגופנים: נטענים פעם אחת מהשרת */
var remoteP = null, HIDDEN_CATS = {};
function load(){
  if (!remoteP) remoteP = Promise.all([fetch('/api/pricing?c=_greetings').then(function(r){ return r.json() }).catch(function(){ return {} }),
    fetch('/assets/greetings/stickers/pack.json?v=4').then(function(r){ return r.json() }).catch(function(){ return null }),
    fetch('/assets/backgrounds/pack.json?v=1').then(function(r){ return r.json() }).catch(function(){ return null }),
    fetch('/api/pricing?c=_lib').then(function(r){ return r.json() }).catch(function(){ return null })]).then(function(rr){
    var d = rr[0] || {}, pk = rr[1];
    /* רקעים משותפים ללוח השנה ולברכות: המאגר המובנה, ורקעים שהועלו למאגר התמונות של הלוח (קטגוריית "רקעים ומסגרות") */
    var bp = rr[2] || { cats: [], items: [] }, bgs = (bp.items || []).map(function(x){ return { id: 'pk-' + x.id, title: x.title, cat: 'bg-' + x.cat, img: x.img, hi: x.hi, thumb: x.thumb }; });
    (bp.cats || []).forEach(function(c){ if (!CATS.some(function(x){ return x[0] === 'bg-' + c.id })) CATS.push(['bg-' + c.id, c.name]); });
    ((rr[3] || {}).items || []).forEach(function(x){ if (x.cat === 'bg' && x.url) bgs.push({ id: 'cl-' + String(x.id).replace(/[^\w-]/g, '').slice(0, 40), title: x.title || 'רקע', cat: 'bg-lib', img: x.url, thumb: x.thumb || x.url }); });
    if (!CATS.some(function(x){ return x[0] === 'bg-lib' })) CATS.push(['bg-lib', 'מהמאגר של הלוח']);
    /* מדבקות מובנות באתר + מדבקות שהועלו בניהול */
    var st = d.stickers || { cats: [], items: [] };
    if (pk) d.stickers = { cats: (pk.cats || []).concat(st.cats || []), items: (pk.items || []).concat(st.items || []) };
    applySettings(d.fonts || {});
    PRESETS = d.presets || [];
    (d.cats || []).forEach(function(c){ var e = CATS.find(function(x){ return x[0] === c.id }); if (e) e[1] = c.name; else CATS.push([c.id, c.name]); });
    (d.hideCats || []).forEach(function(id){ HIDDEN_CATS[id] = 1; });
    FIELDS_OVR = d.fields || {};
    (d.templates || []).slice().sort(function(a, b){ return (a.order || 0) - (b.order || 0) }).forEach(function(t){
      if (TEMPLATES.some(function(x){ return x.id === t.id })) return;
      t.colors = []; t.remote = true; TEMPLATES.push(t);
    });
    bgs.forEach(function(x){
      if (TEMPLATES.some(function(t){ return t.id === x.id })) return;
      TEMPLATES.push({ id: x.id, title: x.title, cat: x.cat, kind: 'greeting', type: 'bg', price: 0, shared: true, remote: true, colors: [], blocks: [],
        bg: { img: x.img, hi: x.hi, thumb: x.thumb }, area: { x: 80, y: 110, w: 634, h: 903, valign: 'center' } });
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

/* כתיבה עצמית: כמה שורות פשוטות לעריכה */
function blankBlocks(main, accent){
  main = main || '#14213d'; accent = accent || '#8a6a22';
  return [T('', 'בס״ד', 13, { align: 'right', color: accent, gap: 0 }), T('title', 'כותרת', 48, { font: 'Suez One', color: main, gap: 30 }), D({ color: accent, gap: 14 }),
    T('body', 'כאן כותבים את הטקסט.\nאפשר להוסיף שורות, לשנות גופן, גודל וצבע.', 20, { color: main, lh: 1.7, gap: 14 }), T('sign', 'חתימה', 22, { bold: true, color: main, gap: 30 })];
}
/* נוסח מוכן לדף רקע / מסגרת: פסקאות ההתחלה של ברכה או הזמנה, עם הטקסט של הנוסח */
function presetBlocks(p, main, accent){
  var bl = starter(p.kind === 'invite' ? 'invite' : 'greeting', main || '#14213d', accent || '#8a6a22');
  bl.forEach(function(b){ if (b.k && p.fields[b.k] != null) b.text = p.fields[b.k]; });
  return bl.filter(function(b){ return b.type !== 'text' || !b.k || p.fields[b.k] != null || ['title', 'name', 'name2', 'groom', 'bride', 'sign'].indexOf(b.k) >= 0; });
}
/* פסקאות התחלה לעיצוב חדש מהניהול: נלקחות מהעיצובים המובנים, בצבע שנבחר */
function starter(kind, main, accent){
  var src = TEMPLATES.find(function(t){ return t.id === (kind === 'invite' ? 'vine-wedding' : 'gate-wedding') });
  return clone(src.blocks).map(function(b){
    if (b.type === 'divider') { b.color = accent; return b; }
    b.color = (b.color && (b.color.charAt(0) === '@' || /^#(8a6|6b5|8a6d|5c6|7a4)/i.test(b.color))) ? accent : main;
    return b;
  });
}

window.Greetings = { W: W, H: H, CATS: CATS, KINDS: KINDS, TEMPLATES: TEMPLATES, FONTS: FONTS, FONT_GROUPS: FONT_GROUPS, fontLabel: function(f){ var m = meta(f); return m ? m.label : f; }, catalog: catalog, applySettings: applySettings, meta: meta, pickList: pickList, fontCss: fontCss, loadFont: loadFont, FIELDS: FIELDS, DIVIDERS: DIVIDERS,
  catName: function(id){ var c = CATS.find(function(x){ return x[0] === id }); return c ? c[1] : id; },
  subTitle: function(t){ return /^bg-/.test(t.cat || '') ? 'דף רקע · ' + (CATS.find(function(x){ return x[0] === t.cat }) || [0, ''])[1] : KINDS[t.kind] + ' ל' + ((CATS.find(function(x){ return x[0] === t.cat }) || [0, t.cat])[1]); },
  get: function(id){ return TEMPLATES.find(function(t){ return t.id === id }); },
  render: render, load: load, starter: starter, variant: variant, cards: cards, hiddenCat: function(id){ return !!HIDDEN_CATS[id]; }, hit: hit, defaults: defaults, TYPES: TYPES, typeOf: typeOf, isLand: isLand, TSHAPES: TSHAPES, isFree: free, dims: dims, blankBlocks: blankBlocks, presetBlocks: presetBlocks, pagePanel: pagePanel, borderPanel: borderPanel, BORDERS: BORDERS, presets: function(){ return PRESETS; }, newText: newText, newDivider: newDivider, newPhoto: newPhoto, newSticker: newSticker, movePad: movePad, bgPanel: bgPanel, panelEdges: panelEdges, SHAPES: SHAPES, PERSONAL: PERSONAL, fieldsFor: fieldsFor, FIELDS_DEF: FIELDS_DEF, profile: profile, saveProfile: saveProfile, applyProfile: applyProfile, colorOf: colorOf, fontsReady: fontsReady };
})();
