/**
 * שכבת עזר סביב @hebcal/core ו-@hebcal/zmanim.
 *
 * הערה חשובה: קובץ זה נכתב מול תיעוד הספרייה (hebcal.github.io/api)
 * ולא הורץ בפועל בסביבת הפיתוח הזו (אין גישת רשת כאן להתקין npm packages).
 * לפני השימוש הראשון בפרויקט אצלך: `npm install` ואז להריץ `npm run dev`
 * ולוודא שכל הפונקציות מחזירות נתונים כצפוי - ייתכנו הבדלים קטנים בין
 * גרסאות הספרייה (למשל שמות שדות). אם משהו לא עובד, שלח לי את הודעת
 * השגיאה ונתקן ביחד.
 */

import { HDate, HebrewCalendar, Location, GeoLocation, Zmanim } from '@hebcal/core';
import { gematriya } from '@hebcal/hdate';

// ---------------------------------------------------------------
// מיקומים נפוצים (אפשר להרחיב את הרשימה)
// ---------------------------------------------------------------
export const COMMON_LOCATIONS = [
  { id: 'jerusalem', name: 'ירושלים', lat: 31.7683, lng: 35.2137, tzid: 'Asia/Jerusalem', elevation: 800 },
  { id: 'telaviv', name: 'תל אביב', lat: 32.0853, lng: 34.7818, tzid: 'Asia/Jerusalem', elevation: 5 },
  { id: 'bnei_brak', name: 'בני ברק', lat: 32.0807, lng: 34.8338, tzid: 'Asia/Jerusalem', elevation: 30 },
  { id: 'haifa', name: 'חיפה', lat: 32.7940, lng: 34.9896, tzid: 'Asia/Jerusalem', elevation: 20 },
  { id: 'beer_sheva', name: 'באר שבע', lat: 31.2530, lng: 34.7915, tzid: 'Asia/Jerusalem', elevation: 280 },
];

// locationInput יכול להיות:
// - מחרוזת מזהה מתוך COMMON_LOCATIONS (למשל 'jerusalem')
// - אובייקט חופשי { name, lat, lng, tzid } - מגיע מ-LocationPicker
//   (מרשימה, מחיפוש כתובת, או מהזנה ידנית)
export function getLocation(locationInput) {
  if (locationInput && typeof locationInput === 'object' && 'lat' in locationInput) {
    const { name, lat, lng, tzid, elevation = 0 } = locationInput;
    return new GeoLocation(name || '', lat, lng, elevation, tzid || 'Asia/Jerusalem');
  }
  const loc = COMMON_LOCATIONS.find((l) => l.id === locationInput) || COMMON_LOCATIONS[0];
  // סדר הפרמטרים המדויק של GeoLocation לפי תיעוד @hebcal/core:
  // (name, latitude, longitude, elevation, timeZoneId)
  return new GeoLocation(loc.name, loc.lat, loc.lng, loc.elevation, loc.tzid);
}

// ---------------------------------------------------------------
// המרת תאריך לועזי -> עברי, עם תצוגה בעברית (יום+חודש+שנה מלאים)
// שימושי לתוויות מלאות, אבל לא לתא יומי בטבלה - שם רוצים רק את היום
// ---------------------------------------------------------------
export function gregorianToHebrewLabel(date) {
  const hd = new HDate(date);
  return hd.renderGematriya(); // למשל: "ט"ו בחשון תשפ"ז"
}

// רק היום העברי בגימטריה, בלי חודש ובלי שנה - בדיוק בשביל תא בטבלה
// (חודש+שנה מוצגים פעם אחת בכותרת שמעל הטבלה, לא בכל תא)
export function gregorianToHebrewDayLabel(date) {
  const hd = new HDate(date);
  return gematriya(hd.getDate());
}

// שם החודש העברי + השנה בגימטריה, לכותרת שמעל הטבלה
const HEBREW_MONTH_NAME_HE = {
  Nisan: 'ניסן',
  Iyyar: 'אייר',
  Sivan: 'סיון',
  Tamuz: 'תמוז',
  Av: 'אב',
  Elul: 'אלול',
  Tishrei: 'תשרי',
  Cheshvan: 'חשון',
  Kislev: 'כסלו',
  Tevet: 'טבת',
  "Sh'vat": 'שבט',
  Adar: 'אדר',
  'Adar I': "אדר א'",
  'Adar II': "אדר ב'",
};

export function getHebrewMonthYearLabel(hebrewYear, hebrewMonth) {
  const hd = new HDate(1, hebrewMonth, hebrewYear);
  const engName = hd.getMonthName();
  const heName = HEBREW_MONTH_NAME_HE[engName] || engName;
  return `${heName} ${gematriya(hebrewYear)}`;
}

// חודש עברי הבא/קודם - כולל מעבר שנה ומעבר שנה מעוברת (13 חודשים) בצורה
// בטוחה, בעזרת מספר יום מוחלט (abs) במקום חשבון ידני על מספרי חודשים
export function getAdjacentHebrewMonth(year, month, direction /* 1 = הבא, -1 = קודם */) {
  if (direction === 1) {
    const daysInMonth = new HDate(1, month, year).daysInMonth();
    const lastDay = new HDate(daysInMonth, month, year);
    const nextDay = new HDate(lastDay.abs() + 1);
    return { year: nextDay.getFullYear(), month: nextDay.getMonth() };
  }
  const firstDay = new HDate(1, month, year);
  const prevDay = new HDate(firstDay.abs() - 1);
  return { year: prevDay.getFullYear(), month: prevDay.getMonth() };
}

// ---------------------------------------------------------------
// בניית רשת ימים לחודש לועזי (לתצוגה חודשית, calendar_type = 'gregorian')
// כל תא מכיל גם את התאריך העברי המקביל (לכתיבה קטנה מתחת)
// ---------------------------------------------------------------
export function buildGregorianMonthGrid(year, month /* 1-12 */) {
  const firstOfMonth = new Date(year, month - 1, 1);
  const startWeekday = firstOfMonth.getDay(); // 0=ראשון
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];

  // ריפוד בתחילת הרשת (ימים מהחודש הקודם)
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    cells.push({
      gregorianDate: date,
      gregorianDay: day,
      hebrewLabel: gregorianToHebrewDayLabel(date),
      holidays: getHolidaysForDate(date),
    });
  }

  // ריפוד בסוף הרשת עד שורה שלמה
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return chunkIntoWeeks(cells);
}

// ---------------------------------------------------------------
// בניית רשת ימים לחודש עברי (לתצוגה חודשית, calendar_type = 'hebrew')
// כל תא מכיל גם את התאריך הלועזי המקביל (לכתיבה קטנה מתחת)
// ---------------------------------------------------------------
export function buildHebrewMonthGrid(hebrewYear, hebrewMonth /* מספר חודש עברי, ר' HDate.monthNum */) {
  const hd = new HDate(1, hebrewMonth, hebrewYear);
  const daysInMonth = hd.daysInMonth();
  const firstGregorian = hd.greg();
  const startWeekday = firstGregorian.getDay();

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);

  for (let day = 1; day <= daysInMonth; day++) {
    const hdate = new HDate(day, hebrewMonth, hebrewYear);
    const gregorianDate = hdate.greg();
    cells.push({
      hebrewDay: day,
      hebrewDayGematriya: gematriya(day), // רק היום, למשל "ט"ו" - בלי חודש ושנה
      gregorianDate,
      gregorianLabel: gregorianDate.getDate(), // מספר לועזי קטן מתחת
      holidays: getHolidaysForDate(gregorianDate),
    });
  }

  while (cells.length % 7 !== 0) cells.push(null);

  return chunkIntoWeeks(cells);
}

function chunkIntoWeeks(cells) {
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

// ---------------------------------------------------------------
// חגים/מועדים ליום נתון
// ---------------------------------------------------------------
export function getHolidaysForDate(date) {
  const events = HebrewCalendar.getHolidaysOnDate(date) || [];
  return events.map((ev) => ev.render('he'));
}

// ---------------------------------------------------------------
// זמני הלכה ליום נתון, לפי מיקום ושיטה
// method: 'gra' | 'mga' | 'baal_hatanya' | 'chazon_shamayim' (בהמשך נוסיף מיפוי מדויק)
// ---------------------------------------------------------------
export function getZmanimForDate(date, locationInput, requestedTimes = []) {
  const location = getLocation(locationInput);
  const zman = new Zmanim(location, date, false);

  // רשימה מקיפה של כל הזמנים הנתמכים ב-@hebcal/core (מתועדים ב-
  // https://hebcal.github.io/api/core/classes/Zmanim.html). לא נכללות כאן
  // פונקציות שמחזירות טיפוס שונה מ-Date (כמו זמני קידוש לבנה ומולד,
  // שמחזירים Temporal.ZonedDateTime) - אלה שייכים ללוח חודשי ולא לזמני יום.
  //
  // הערה על גר"א מול בעל התניא: כרגע ה-Zmanim נוצר עם useElevation=false,
  // ולכן ערכי הגר"א וה"תניא" יוצאים זהים במספרים (שתי השיטות מחשבות "יום
  // הלכתי" ברמת פני הים ללא גובה). הם עדיין מופיעים כאן כשני זמנים
  // נפרדים כי זה עדיין מספרים לוגית שונה, וכי ברגע שנוסיף תמיכה בחישוב
  // לפי גובה (elevation) - למשל לירושלים - הם יתחילו להיות שונים בפועל.
  const ALL_TIMES = {
    // ---- עלות השחר / דמדומי בוקר ----
    alot_hashachar: () => zman.alotHaShachar(), // 16.1 מעלות
    alot_hashachar_72: () => zman.alotHaShachar72(), // 72 דק' לפני הנץ
    alos_baal_hatanya: () => zman.alosBaalHatanya(), // 16.9 מעלות
    dawn: () => zman.dawn(), // עלות אזרחית, 6 מעלות

    // ---- הנץ החמה ----
    netz: () => zman.sunrise(),
    netz_sea_level: () => zman.seaLevelSunrise(),

    // ---- משיכיר (זמן טלית ותפילין) ----
    misheyakir: () => zman.misheyakir(), // 11.5 מעלות
    misheyakir_machmir: () => zman.misheyakirMachmir(), // 10.2 מעלות, שיטה מחמירה

    // ---- סוף זמן קריאת שמע ----
    sof_zman_shma_gra: () => zman.sofZmanShma(),
    sof_zman_shma_baal_hatanya: () => zman.sofZmanShmaBaalHatanya(),
    sof_zman_shma_mga: () => zman.sofZmanShmaMGA(), // 72 דק'
    sof_zman_shma_mga_16_1: () => zman.sofZmanShmaMGA16Point1(), // 16.1 מעלות
    sof_zman_shma_mga_19_8: () => zman.sofZmanShmaMGA19Point8(), // 19.8 מעלות

    // ---- סוף זמן תפילה ----
    sof_zman_tfila_gra: () => zman.sofZmanTfilla(),
    sof_zman_tfila_baal_hatanya: () => zman.sofZmanTfilaBaalHatanya(),
    sof_zman_tfila_mga: () => zman.sofZmanTfillaMGA(), // 72 דק'
    sof_zman_tfila_mga_16_1: () => zman.sofZmanTfillaMGA16Point1(),
    sof_zman_tfila_mga_19_8: () => zman.sofZmanTfillaMGA19Point8(),

    // ---- סוף זמן ביעור חמץ (ערב פסח) ----
    sof_zman_biur_chametz_gra: () => zman.sofZmanBiurChametzGRA(),

    // ---- חצות ----
    chatzot: () => zman.chatzot(), // חצות היום
    chatzot_night: () => zman.chatzotNight(), // חצות הלילה
    gregeve: () => zman.gregEve(), // שקיעת אתמול (לצורך חישוב חצות הלילה)

    // ---- מנחה ----
    mincha_gedola: () => zman.minchaGedola(),
    mincha_gedola_baal_hatanya: () => zman.minchaGedolaBaalHatanya(),
    mincha_gedola_mga: () => zman.minchaGedolaMGA(),
    mincha_ketana: () => zman.minchaKetana(),
    mincha_ketana_baal_hatanya: () => zman.minchaKetanaBaalHatanya(),
    mincha_ketana_mga: () => zman.minchaKetanaMGA(),
    plag_hamincha: () => zman.plagHaMincha(),
    plag_hamincha_baal_hatanya: () => zman.plagHaminchaBaalHatanya(),

    // ---- בין השמשות ----
    bein_hashmashos: () => zman.beinHaShmashos(),

    // ---- שקיעת החמה ----
    shkia: () => zman.sunset(),
    shkia_sea_level: () => zman.seaLevelSunset(),
    dusk: () => zman.dusk(), // שקיעה אזרחית, 6 מעלות

    // ---- צאת הכוכבים (כל הגרסאות) ----
    tzet_3_small_stars: () => zman.tzeit(), // ברירת מחדל: 8.5 מעלות, 3 כוכבים קטנים
    tzet_3_medium_stars: () => zman.tzeit(7.083), // 3 כוכבים בינוניים
    tzet_baal_hatanya: () => zman.tzaisBaalHatanya(), // 6 מעלות
  };

  const times = requestedTimes.length ? requestedTimes : Object.keys(ALL_TIMES);
  const result = {};
  for (const key of times) {
    if (ALL_TIMES[key]) {
      try {
        result[key] = ALL_TIMES[key]();
      } catch (e) {
        result[key] = null; // חלק מהזמנים לא רלוונטיים בכל התאריכים/מיקומים
      }
    }
  }
  return result;
}

// תוויות בעברית לכל זמן, לשימוש בממשק ובלוח המודפס
export const ZMAN_LABELS = {
  alot_hashachar: 'עלות השחר (16.1°)',
  alot_hashachar_72: 'עלות השחר (72 דק\')',
  alos_baal_hatanya: 'עלות השחר (בעל התניא)',
  dawn: 'עלות אזרחית',

  netz: 'הנץ החמה',
  netz_sea_level: 'הנץ החמה (רמת פני הים)',

  misheyakir: 'משיכיר (טלית ותפילין)',
  misheyakir_machmir: 'משיכיר - שיטה מחמירה',

  sof_zman_shma_gra: 'סוף זמן ק"ש (גר"א)',
  sof_zman_shma_baal_hatanya: 'סוף זמן ק"ש (בעל התניא)',
  sof_zman_shma_mga: 'סוף זמן ק"ש (מג"א, 72 דק\')',
  sof_zman_shma_mga_16_1: 'סוף זמן ק"ש (מג"א, 16.1°)',
  sof_zman_shma_mga_19_8: 'סוף זמן ק"ש (מג"א, 19.8°)',

  sof_zman_tfila_gra: 'סוף זמן תפילה (גר"א)',
  sof_zman_tfila_baal_hatanya: 'סוף זמן תפילה (בעל התניא)',
  sof_zman_tfila_mga: 'סוף זמן תפילה (מג"א, 72 דק\')',
  sof_zman_tfila_mga_16_1: 'סוף זמן תפילה (מג"א, 16.1°)',
  sof_zman_tfila_mga_19_8: 'סוף זמן תפילה (מג"א, 19.8°)',

  sof_zman_biur_chametz_gra: 'סוף זמן ביעור חמץ (גר"א)',

  chatzot: 'חצות היום',
  chatzot_night: 'חצות הלילה',
  gregeve: 'שקיעה - אתמול בערב',

  mincha_gedola: 'מנחה גדולה (גר"א)',
  mincha_gedola_baal_hatanya: 'מנחה גדולה (בעל התניא)',
  mincha_gedola_mga: 'מנחה גדולה (מג"א)',
  mincha_ketana: 'מנחה קטנה (גר"א)',
  mincha_ketana_baal_hatanya: 'מנחה קטנה (בעל התניא)',
  mincha_ketana_mga: 'מנחה קטנה (מג"א)',
  plag_hamincha: 'פלג המנחה (גר"א)',
  plag_hamincha_baal_hatanya: 'פלג המנחה (בעל התניא)',

  bein_hashmashos: 'בין השמשות',

  shkia: 'שקיעת החמה',
  shkia_sea_level: 'שקיעת החמה (רמת פני הים)',
  dusk: 'שקיעה אזרחית',

  tzet_3_small_stars: 'צאת הכוכבים (3 כוכבים קטנים)',
  tzet_3_medium_stars: 'צאת הכוכבים (3 כוכבים בינוניים)',
  tzet_baal_hatanya: 'צאת הכוכבים (בעל התניא)',
};

// קיבוץ הזמנים לקטגוריות - שימושי לתפריט בחירה בממשק (checkboxes מקובצים)
export const ZMAN_GROUPS = [
  { label: 'עלות השחר', keys: ['alot_hashachar', 'alot_hashachar_72', 'alos_baal_hatanya', 'dawn'] },
  { label: 'הנץ החמה', keys: ['netz', 'netz_sea_level'] },
  { label: 'משיכיר', keys: ['misheyakir', 'misheyakir_machmir'] },
  {
    label: 'סוף זמן קריאת שמע',
    keys: ['sof_zman_shma_gra', 'sof_zman_shma_baal_hatanya', 'sof_zman_shma_mga', 'sof_zman_shma_mga_16_1', 'sof_zman_shma_mga_19_8'],
  },
  {
    label: 'סוף זמן תפילה',
    keys: ['sof_zman_tfila_gra', 'sof_zman_tfila_baal_hatanya', 'sof_zman_tfila_mga', 'sof_zman_tfila_mga_16_1', 'sof_zman_tfila_mga_19_8'],
  },
  { label: 'ביעור חמץ', keys: ['sof_zman_biur_chametz_gra'] },
  { label: 'חצות', keys: ['chatzot', 'chatzot_night'] },
  {
    label: 'מנחה ופלג המנחה',
    keys: ['mincha_gedola', 'mincha_gedola_baal_hatanya', 'mincha_gedola_mga', 'mincha_ketana', 'mincha_ketana_baal_hatanya', 'mincha_ketana_mga', 'plag_hamincha', 'plag_hamincha_baal_hatanya'],
  },
  { label: 'בין השמשות', keys: ['bein_hashmashos'] },
  { label: 'שקיעת החמה', keys: ['shkia', 'shkia_sea_level', 'dusk'] },
  { label: 'צאת הכוכבים', keys: ['tzet_3_small_stars', 'tzet_3_medium_stars', 'tzet_baal_hatanya'] },
];
