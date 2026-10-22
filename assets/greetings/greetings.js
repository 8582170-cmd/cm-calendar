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
/* אוסף גופנים מיוחדים שהועלו לאתר (קבצים מקומיים): [שם, 'my', סוג, 0, תווית בעברית, כתובת] */
FONTS = FONTS.concat([
  ["ml-bn-hanuka", "my", "FUN", 0, "חנוכייה", "/assets/greetings/fonts/ml-bn-hanuka.woff"],
  ["ml-fbafarsek", "my", "DISPLAY", 0, "אפרסק", "/assets/greetings/fonts/ml-fbafarsek.woff"],
  ["ml-fbafikoman", "my", "DISPLAY", 0, "אפיקומן", "/assets/greetings/fonts/ml-fbafikoman.woff"],
  ["ml-fbalaska", "my", "HAND", 0, "אלסקה", "/assets/greetings/fonts/ml-fbalaska.woff"],
  ["ml-fbashkenazy", "my", "STAM", 0, "אשכנזי", "/assets/greetings/fonts/ml-fbashkenazy.woff"],
  ["ml-fbavukado", "my", "HAND", 0, "אבוקדו", "/assets/greetings/fonts/ml-fbavukado.woff"],
  ["ml-fbbokea", "my", "DISPLAY", 0, "בוקע (שחוק)", "/assets/greetings/fonts/ml-fbbokea.woff"],
  ["ml-fbcaligraphpatiach", "my", "HAND", 0, "קליגרף פתיח", "/assets/greetings/fonts/ml-fbcaligraphpatiach.woff"],
  ["ml-fbdanakama", "my", "HAND", 0, "דנה קמה", "/assets/greetings/fonts/ml-fbdanakama.woff"],
  ["ml-fbdvashvehalav", "my", "HAND", 0, "דבש וחלב", "/assets/greetings/fonts/ml-fbdvashvehalav.woff"],
  ["ml-fbempatica", "my", "HAND", 0, "אמפתיה", "/assets/greetings/fonts/ml-fbempatica.woff"],
  ["ml-fbkapriza", "my", "HAND", 0, "קפריזה", "/assets/greetings/fonts/ml-fbkapriza.woff"],
  ["ml-fbkorkynet", "my", "HAND", 0, "קורקינט", "/assets/greetings/fonts/ml-fbkorkynet.woff"],
  ["ml-fbmaarav", "my", "HAND", 0, "מערב", "/assets/greetings/fonts/ml-fbmaarav.woff"],
  ["ml-fbmelatef", "my", "HAND", 0, "מלטף", "/assets/greetings/fonts/ml-fbmelatef.woff"],
  ["ml-fbmoskito", "my", "DISPLAY", 0, "מוסקיטו", "/assets/greetings/fonts/ml-fbmoskito.woff"],
  ["ml-fbpashtut", "my", "HAND", 0, "פשטות", "/assets/greetings/fonts/ml-fbpashtut.woff"],
  ["ml-fbpere", "my", "DISPLAY", 0, "פרא (שחוק)", "/assets/greetings/fonts/ml-fbpere.woff"],
  ["ml-fbrashy", "my", "STAM", 0, "רשי", "/assets/greetings/fonts/ml-fbrashy.woff"],
  ["ml-fbtako", "my", "HAND", 0, "טאקו", "/assets/greetings/fonts/ml-fbtako.woff"],
  ["ml-fbtip", "my", "DISPLAY", 0, "טיפ", "/assets/greetings/fonts/ml-fbtip.woff"],
  ["ml-fbtzelofan", "my", "DISPLAY", 0, "צלופן", "/assets/greetings/fonts/ml-fbtzelofan.woff"],
  ["ml-fbyamhamelach", "my", "CLASSIC", 0, "ים המלח", "/assets/greetings/fonts/ml-fbyamhamelach.woff"],
  ["ml-guttman-calligraphic", "my", "CLASSIC", 0, "קליגרפי", "/assets/greetings/fonts/ml-guttman-calligraphic.woff"],
  ["ml-guttman-drogolin", "my", "CLASSIC", 0, "דרוגולין", "/assets/greetings/fonts/ml-guttman-drogolin.woff"],
  ["ml-guttman-mantova-decor", "my", "OUTLINE", 0, "מנטובה מעוטר", "/assets/greetings/fonts/ml-guttman-mantova-decor.woff"],
  ["ml-guttman-rashi", "my", "STAM", 0, "רש״י", "/assets/greetings/fonts/ml-guttman-rashi.woff"],
  ["ml-guttman-stam", "my", "STAM", 0, "סת״ם", "/assets/greetings/fonts/ml-guttman-stam.woff"],
  ["ml-guttman-stam1", "my", "STAM", 0, "סת״ם 2", "/assets/greetings/fonts/ml-guttman-stam1.woff"],
  ["ml-guttman-vilna", "my", "CLASSIC", 0, "וילנא", "/assets/greetings/fonts/ml-guttman-vilna.woff"],
  ["ml-guttman-yad", "my", "HAND", 0, "כתב יד", "/assets/greetings/fonts/ml-guttman-yad.woff"],
  ["ml-guttman-yad-brush", "my", "HAND", 0, "כתב יד מכחול", "/assets/greetings/fonts/ml-guttman-yad-brush.woff"],
  ["ml-guttman-aram", "my", "CLASSIC", 0, "ארם", "/assets/greetings/fonts/ml-guttman-aram.woff"],
  ["ml-guttman-soncino", "my", "CLASSIC", 0, "שונצינו", "/assets/greetings/fonts/ml-guttman-soncino.woff"],
  ["ml-guttman-toledo", "my", "CLASSIC", 0, "טולדו", "/assets/greetings/fonts/ml-guttman-toledo.woff"],
  ["ml-hadassah-friedlaender", "my", "CLASSIC", 0, "הדסה פרידלנדר", "/assets/greetings/fonts/ml-hadassah-friedlaender.woff"],
  ["ml-megababemf", "my", "HAND", 0, "מגהבייב", "/assets/greetings/fonts/ml-megababemf.woff"],
  ["ml-shirmf", "my", "HAND", 0, "שיר", "/assets/greetings/fonts/ml-shirmf.woff"],
  ["ml-sivan", "my", "HAND", 0, "סיון", "/assets/greetings/fonts/ml-sivan.woff"],
  ["ml-adarbold", "my", "DISPLAY", 0, "אדר", "/assets/greetings/fonts/ml-adarbold.woff"],
  ["ml-aharoni-bold-mangle", "my", "DISPLAY", 0, "אהרוני שבור", "/assets/greetings/fonts/ml-aharoni-bold-mangle.woff"],
  ["ml-ahronhalul", "my", "OUTLINE", 0, "אהרוני חלול", "/assets/greetings/fonts/ml-ahronhalul.woff"],
  ["ml-alexandramf", "my", "HAND", 0, "אלכסנדרה", "/assets/greetings/fonts/ml-alexandramf.woff"],
  ["ml-alichalul", "my", "OUTLINE", 0, "אליק חלול", "/assets/greetings/fonts/ml-alichalul.woff"],
  ["ml-alicinline", "my", "OUTLINE", 0, "אליק מקווקו", "/assets/greetings/fonts/ml-alicinline.woff"],
  ["ml-amaricainline", "my", "OUTLINE", 0, "אמריקה מקווקו", "/assets/greetings/fonts/ml-amaricainline.woff"],
  ["ml-ashiris-tnoim", "my", "STAM", 0, "תגין (אותיות עם כתרים)", "/assets/greetings/fonts/ml-ashiris-tnoim.woff"],
  ["ml-autographmf", "my", "HAND", 0, "אוטוגרף", "/assets/greetings/fonts/ml-autographmf.woff"],
  ["ml-avisaginline", "my", "OUTLINE", 0, "אבישג מקווקו", "/assets/greetings/fonts/ml-avisaginline.woff"],
  ["ml-baldad-ktav-halulm", "my", "OUTLINE", 0, "בלדד חלול", "/assets/greetings/fonts/ml-baldad-ktav-halulm.woff"],
  ["ml-balddktav", "my", "HAND", 0, "בלדד כתב", "/assets/greetings/fonts/ml-balddktav.woff"],
  ["ml-barakybold", "my", "HAND", 0, "ברקי", "/assets/greetings/fonts/ml-barakybold.woff"],
  ["ml-bearyitalic", "my", "CLASSIC", 0, "בארי נטוי", "/assets/greetings/fonts/ml-bearyitalic.woff"],
  ["ml-benhor", "my", "HAND", 0, "בנחור מכחול", "/assets/greetings/fonts/ml-benhor.woff"],
  ["ml-bimiamin", "my", "HAND", 0, "בנימין", "/assets/greetings/fonts/ml-bimiamin.woff"],
  ["ml-carboletmf", "my", "DISPLAY", 0, "קרבולט", "/assets/greetings/fonts/ml-carboletmf.woff"],
  ["ml-copyfaxmf", "my", "DISPLAY", 0, "צילום פקס", "/assets/greetings/fonts/ml-copyfaxmf.woff"],
  ["ml-derormf", "my", "HAND", 0, "דרור", "/assets/greetings/fonts/ml-derormf.woff"],
  ["ml-dfusinline", "my", "OUTLINE", 0, "דפוס מקווקו", "/assets/greetings/fonts/ml-dfusinline.woff"],
  ["ml-edgartalmf", "my", "HAND", 0, "אדגר טל", "/assets/greetings/fonts/ml-edgartalmf.woff"],
  ["ml-egomfsplit", "my", "DISPLAY", 0, "אגו חצוי", "/assets/greetings/fonts/ml-egomfsplit.woff"],
  ["ml-enigmamfoutline", "my", "OUTLINE", 0, "אניגמה חלול", "/assets/greetings/fonts/ml-enigmamfoutline.woff"],
  ["ml-esheetmf", "my", "HAND", 0, "אשית", "/assets/greetings/fonts/ml-esheetmf.woff"],
  ["ml-eventovmf", "my", "DISPLAY", 0, "אירועטוב", "/assets/greetings/fonts/ml-eventovmf.woff"],
  ["ml-gadi", "my", "CLASSIC", 0, "גדי", "/assets/greetings/fonts/ml-gadi.woff"],
  ["ml-gdaliiaktavitalic", "my", "HAND", 0, "גדליה כתב", "/assets/greetings/fonts/ml-gdaliiaktavitalic.woff"],
  ["ml-gdon", "my", "DISPLAY", 0, "גדעון", "/assets/greetings/fonts/ml-gdon.woff"],
  ["ml-gdonmec", "my", "OUTLINE", 0, "גדעון חלול", "/assets/greetings/fonts/ml-gdonmec.woff"],
  ["ml-gilgal-ultra-outline", "my", "OUTLINE", 0, "גלגל חלול", "/assets/greetings/fonts/ml-gilgal-ultra-outline.woff"],
  ["ml-ginat", "my", "DISPLAY", 0, "גינת", "/assets/greetings/fonts/ml-ginat.woff"],
  ["ml-ginat-halul-m", "my", "OUTLINE", 0, "גינת חלול", "/assets/greetings/fonts/ml-ginat-halul-m.woff"],
  ["ml-graffitimf", "my", "HAND", 0, "גרפיטי", "/assets/greetings/fonts/ml-graffitimf.woff"],
  ["ml-hafganamf", "my", "HAND", 0, "הפגנה", "/assets/greetings/fonts/ml-hafganamf.woff"],
  ["ml-hagayhalul-m", "my", "OUTLINE", 0, "חגי חלול", "/assets/greetings/fonts/ml-hagayhalul-m.woff"],
  ["ml-hefkerutmf", "my", "HAND", 0, "הפקרות", "/assets/greetings/fonts/ml-hefkerutmf.woff"],
  ["ml-hoogomf", "my", "HAND", 0, "הוגו", "/assets/greetings/fonts/ml-hoogomf.woff"],
  ["ml-ivricana-outline", "my", "OUTLINE", 0, "עבריקנה חלול", "/assets/greetings/fonts/ml-ivricana-outline.woff"],
  ["ml-iw-drorit", "my", "HAND", 0, "דרורית", "/assets/greetings/fonts/ml-iw-drorit.woff"],
  ["ml-iw-sharon", "my", "HAND", 0, "שרון", "/assets/greetings/fonts/ml-iw-sharon.woff"],
  ["ml-iw-shoham", "my", "HAND", 0, "שוהם", "/assets/greetings/fonts/ml-iw-shoham.woff"],
  ["ml-jeansmf", "my", "DISPLAY", 0, "ג׳ינס", "/assets/greetings/fonts/ml-jeansmf.woff"],
  ["ml-klafmf", "my", "STAM", 0, "קלף", "/assets/greetings/fonts/ml-klafmf.woff"],
  ["ml-korida", "my", "CLASSIC", 0, "קורידה", "/assets/greetings/fonts/ml-korida.woff"],
  ["ml-ktura", "my", "DISPLAY", 0, "קטורה", "/assets/greetings/fonts/ml-ktura.woff"],
  ["ml-lital", "my", "DISPLAY", 0, "ליטל", "/assets/greetings/fonts/ml-lital.woff"],
  ["ml-litammf", "my", "DISPLAY", 0, "ליטם (מחוספס)", "/assets/greetings/fonts/ml-litammf.woff"],
  ["ml-madiitalic", "my", "HAND", 0, "מעדי נטוי", "/assets/greetings/fonts/ml-madiitalic.woff"],
  ["ml-maholmesovv", "my", "HAND", 0, "מחול", "/assets/greetings/fonts/ml-maholmesovv.woff"],
  ["ml-mfx-adama", "my", "HAND", 0, "אדמה", "/assets/greetings/fonts/ml-mfx-adama.woff"],
  ["ml-mfx-adler", "my", "HAND", 0, "אדלר", "/assets/greetings/fonts/ml-mfx-adler.woff"],
  ["ml-mfx-andrelamusia", "my", "DISPLAY", 0, "אנדרלמוסיה", "/assets/greetings/fonts/ml-mfx-andrelamusia.woff"],
  ["ml-mfx-beeranit", "my", "HAND", 0, "בארנית", "/assets/greetings/fonts/ml-mfx-beeranit.woff"],
  ["ml-mfx-crippy", "my", "DISPLAY", 0, "טפטוף", "/assets/greetings/fonts/ml-mfx-crippy.woff"],
  ["ml-mfx-dudek", "my", "HAND", 0, "דודק", "/assets/greetings/fonts/ml-mfx-dudek.woff"],
  ["ml-mfx-gugihollow", "my", "OUTLINE", 0, "גוגי חלול", "/assets/greetings/fonts/ml-mfx-gugihollow.woff"],
  ["ml-mfx-leeor", "my", "HAND", 0, "ליאור", "/assets/greetings/fonts/ml-mfx-leeor.woff"],
  ["ml-mfx-lehava-medium", "my", "HAND", 0, "להבה", "/assets/greetings/fonts/ml-mfx-lehava-medium.woff"],
  ["ml-mfx-mabsut", "my", "FUN", 0, "מבסוט", "/assets/greetings/fonts/ml-mfx-mabsut.woff"],
  ["ml-mfx-michal", "my", "HAND", 0, "מיכל", "/assets/greetings/fonts/ml-mfx-michal.woff"],
  ["ml-mfx-musahollow", "my", "OUTLINE", 0, "מוסה חלול", "/assets/greetings/fonts/ml-mfx-musahollow.woff"],
  ["ml-mfx-nekudot", "my", "DISPLAY", 0, "נקודות", "/assets/greetings/fonts/ml-mfx-nekudot.woff"],
  ["ml-mfx-rovny", "my", "HAND", 0, "רובני", "/assets/greetings/fonts/ml-mfx-rovny.woff"],
  ["ml-mfx-segal", "my", "HAND", 0, "סגל מכחול", "/assets/greetings/fonts/ml-mfx-segal.woff"],
  ["ml-mfx-shocoladehalav", "my", "FUN", 0, "שוקולד חלב", "/assets/greetings/fonts/ml-mfx-shocoladehalav.woff"],
  ["ml-mfx-tushtushbold", "my", "DISPLAY", 0, "טושטוש", "/assets/greetings/fonts/ml-mfx-tushtushbold.woff"],
  ["ml-moolitalmf", "my", "HAND", 0, "מולי טל", "/assets/greetings/fonts/ml-moolitalmf.woff"],
  ["ml-mstam", "my", "STAM", 0, "סת״ם מסורתי", "/assets/greetings/fonts/ml-mstam.woff"],
  ["ml-narkistammymf", "my", "HAND", 0, "נרקיס תמי", "/assets/greetings/fonts/ml-narkistammymf.woff"],
  ["ml-nephilimoutlinemf", "my", "OUTLINE", 0, "נפילים חלול", "/assets/greetings/fonts/ml-nephilimoutlinemf.woff"],
  ["ml-pandamf", "my", "HAND", 0, "פנדה", "/assets/greetings/fonts/ml-pandamf.woff"],
  ["ml-pasim", "my", "DISPLAY", 0, "פסים", "/assets/greetings/fonts/ml-pasim.woff"],
  ["ml-pmeiri", "my", "STAM", 0, "מאירי", "/assets/greetings/fonts/ml-pmeiri.woff"],
  ["ml-rashi", "my", "STAM", 0, "רש״י קלאסי", "/assets/greetings/fonts/ml-rashi.woff"],
  ["ml-rashx", "my", "STAM", 0, "רש״י מודגש", "/assets/greetings/fonts/ml-rashx.woff"],
  ["ml-remingtonmf", "my", "DISPLAY", 0, "מכונת כתיבה", "/assets/greetings/fonts/ml-remingtonmf.woff"],
  ["ml-rmzsofer", "my", "STAM", 0, "סופר (סת״ם עם תגין)", "/assets/greetings/fonts/ml-rmzsofer.woff"],
  ["ml-staamhasofermf", "my", "STAM", 0, "סת״ם הסופר", "/assets/greetings/fonts/ml-staamhasofermf.woff"],
  ["ml-stempamf", "my", "DISPLAY", 0, "סטמפה", "/assets/greetings/fonts/ml-stempamf.woff"],
  ["ml-tah", "my", "HAND", 0, "טח", "/assets/greetings/fonts/ml-tah.woff"],
  ["ml-tml-3d", "my", "FUN", 0, "תלת־ממד", "/assets/greetings/fonts/ml-tml-3d.woff"],
  ["ml-tml-big", "my", "FUN", 0, "מכחול גדול", "/assets/greetings/fonts/ml-tml-big.woff"],
  ["ml-tml-bread", "my", "FUN", 0, "לחם", "/assets/greetings/fonts/ml-tml-bread.woff"],
  ["ml-tml-cocoa", "my", "FUN", 0, "קקאו", "/assets/greetings/fonts/ml-tml-cocoa.woff"],
  ["ml-tml-cold", "my", "FUN", 0, "שלג", "/assets/greetings/fonts/ml-tml-cold.woff"],
  ["ml-tml-ding", "my", "FUN", 0, "דינג", "/assets/greetings/fonts/ml-tml-ding.woff"],
  ["ml-tml-double", "my", "OUTLINE", 0, "כפול", "/assets/greetings/fonts/ml-tml-double.woff"],
  ["ml-tml-fire", "my", "FUN", 0, "אש", "/assets/greetings/fonts/ml-tml-fire.woff"],
  ["ml-tml-gel", "my", "FUN", 0, "ג׳ל", "/assets/greetings/fonts/ml-tml-gel.woff"],
  ["ml-tml-holly", "my", "FUN", 0, "חג", "/assets/greetings/fonts/ml-tml-holly.woff"],
  ["ml-tml-lovly", "my", "FUN", 0, "לבבות", "/assets/greetings/fonts/ml-tml-lovly.woff"],
  ["ml-tml-moon", "my", "OUTLINE", 0, "ירח", "/assets/greetings/fonts/ml-tml-moon.woff"],
  ["ml-tml-music", "my", "FUN", 0, "מוזיקה", "/assets/greetings/fonts/ml-tml-music.woff"],
  ["ml-tml-neon", "my", "OUTLINE", 0, "ניאון", "/assets/greetings/fonts/ml-tml-neon.woff"],
  ["ml-tml-pacman", "my", "FUN", 0, "פקמן", "/assets/greetings/fonts/ml-tml-pacman.woff"],
  ["ml-tml-paint", "my", "FUN", 0, "צבע נוזל", "/assets/greetings/fonts/ml-tml-paint.woff"],
  ["ml-tml-rope", "my", "FUN", 0, "חבל", "/assets/greetings/fonts/ml-tml-rope.woff"],
  ["ml-tml-solo", "my", "FUN", 0, "סולו", "/assets/greetings/fonts/ml-tml-solo.woff"],
  ["ml-tml-stars", "my", "FUN", 0, "כוכבים", "/assets/greetings/fonts/ml-tml-stars.woff"],
  ["ml-tml-strip", "my", "FUN", 0, "פסים 2", "/assets/greetings/fonts/ml-tml-strip.woff"],
  ["ml-tml-suger", "my", "FUN", 0, "סוכר", "/assets/greetings/fonts/ml-tml-suger.woff"],
  ["ml-tml-wood", "my", "FUN", 0, "עץ", "/assets/greetings/fonts/ml-tml-wood.woff"],
  ["ml-toptype-tam", "my", "HAND", 0, "תם", "/assets/greetings/fonts/ml-toptype-tam.woff"],
  ["ml-toptype-toledo-hollow", "my", "OUTLINE", 0, "טולדו חלול", "/assets/greetings/fonts/ml-toptype-toledo-hollow.woff"],
  ["ml-toptype-yad", "my", "HAND", 0, "כתב יד עדין", "/assets/greetings/fonts/ml-toptype-yad.woff"],
  ["ml-torah", "my", "STAM", 0, "תורה", "/assets/greetings/fonts/ml-torah.woff"],
  ["ml-uncieli-outline", "my", "OUTLINE", 0, "אונציאלי חלול", "/assets/greetings/fonts/ml-uncieli-outline.woff"],
  ["ml-vettohollowmf", "my", "OUTLINE", 0, "וטו חלול", "/assets/greetings/fonts/ml-vettohollowmf.woff"],
  ["ml-vettomfrounded", "my", "FUN", 0, "וטו מעוגל", "/assets/greetings/fonts/ml-vettomfrounded.woff"],
  ["ml-yal", "my", "HAND", 0, "יעל", "/assets/greetings/fonts/ml-yal.woff"]
]);
var FONT_INFO = {}; FONTS.forEach(function(f){ FONT_INFO[f[0]] = f; });
var FONT_GROUPS = { my: { STAM: 'מיוחדים · סת״ם, רש״י וקודש', CLASSIC: 'מיוחדים · קלאסי', HAND: 'מיוחדים · כתב יד', OUTLINE: 'מיוחדים · חלול ומעוטר', DISPLAY: 'מיוחדים · כותרות', FUN: 'מיוחדים · שמח וצבעוני' },
  he: { SERIF: 'עברית · קלאסי', SANS_SERIF: 'עברית · מודרני', HANDWRITING: 'עברית · כתב יד', DISPLAY: 'עברית · מיוחד' },
  en: { SERIF: 'English · Classic', SANS_SERIF: 'English · Modern', HANDWRITING: 'English · Script', DISPLAY: 'English · Display' } };
var DIVIDERS = [['flourish','סלסול'],['dots','נקודות'],['diamond','יהלום'],['line','קו'],['double','קו כפול']];

/* תפקידים קבועים של פסקאות, כדי שנוסח מוכן מהניהול ימלא את הפסקאות המתאימות בכל עיצוב */
var FIELDS = [
  ['quote','פסוק / שורת פתיחה'],['title','כותרת'],['intro','פתיחה'],['name','שם המבורך'],['occasion','לרגל'],
  ['name2','שם נוסף (חתן / בן מצווה)'],['body','גוף הברכה'],['signLabel','לפני החתימה'],['sign','חתימה'],
  ['opener','פתיחת ההזמנה'],['invite','נוסח ההזמנה'],['groom','שם החתן'],['bride','שם הכלה'],['details','מועד ומקום'],['times','שעות']
];

var fontLoads = {}, cssLoads = {};
function fontCss(f){
  var info0 = FONT_INFO[f];
  if (!cssLoads[f] && info0 && info0[5]) {
    var st = document.createElement('style');
    st.textContent = '@font-face{font-family:"' + f + '";src:url(' + info0[5] + ') format("woff");font-display:swap}';
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
  items.forEach(function(it){ it.y = A.y + off + it.top; it.x = A.x; it.w = A.w; });
  return items;
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
  return Promise.all([fontsReady(Object.keys(used)), bgImage(tpl, colors)]).then(function(r){
    var img = r[1];
    canvas.width = Math.round(W * scale); canvas.height = Math.round(H * scale);
    var ctx = canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.direction = 'rtl'; ctx.textBaseline = 'alphabetic';
    var items = layout(ctx, tpl, state);
    items.forEach(function(it){
      var b = it.b, col = colorOf(b.color, tpl, colors);
      if (opt.selected === it.i) {
        ctx.save(); ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = '#1f8a96';
        ctx.strokeRect(it.x - 6, it.y - 4, it.w + 12, it.h + 8); ctx.restore();
      }
      if (b.type === 'divider') { drawDivider(ctx, it, col); return; }
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

window.Greetings = { W: W, H: H, CATS: CATS, KINDS: KINDS, TEMPLATES: TEMPLATES, FONTS: FONTS, FONT_GROUPS: FONT_GROUPS, fontLabel: function(f){ var i = FONT_INFO[f]; return (i && i[4]) || f; }, fontCss: fontCss, loadFont: loadFont, FIELDS: FIELDS, DIVIDERS: DIVIDERS,
  catName: function(id){ var c = CATS.find(function(x){ return x[0] === id }); return c ? c[1] : id; },
  get: function(id){ return TEMPLATES.find(function(t){ return t.id === id }); },
  render: render, hit: hit, defaults: defaults, newText: newText, newDivider: newDivider, colorOf: colorOf, fontsReady: fontsReady };
})();
