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

import { HDate, HebrewCalendar, Location, Event, flags } from '@hebcal/core';
import { Zmanim } from '@hebcal/zmanim';

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

export function getLocation(locationId) {
  const loc = COMMON_LOCATIONS.find((l) => l.id === locationId) || COMMON_LOCATIONS[0];
  return new Location(loc.lat, loc.lng, true, loc.tzid, loc.name, 'IL', loc.elevation);
}

// ---------------------------------------------------------------
// המרת תאריך לועזי -> עברי, עם תצוגה בעברית
// ---------------------------------------------------------------
export function gregorianToHebrewLabel(date) {
  const hd = new HDate(date);
  return hd.renderGematriya(); // למשל: "ט"ו בחשון תשפ"ז"
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
      hebrewLabel: gregorianToHebrewLabel(date),
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
      hebrewDayGematriya: hdate.renderGematriya(true), // רק היום, למשל "ט"ו"
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
export function getZmanimForDate(date, locationId, requestedTimes = []) {
  const location = getLocation(locationId);
  const zman = new Zmanim(location, date, false);

  // מיפוי בין מזהה פנימי לפונקציה בספרייה - נרחיב בהמשך לפי השיטה שנבחרה
  const ALL_TIMES = {
    alot_hashachar: () => zman.alotHaShachar(),
    netz: () => zman.sunrise(),
    sof_zman_shma_gra: () => zman.sofZmanShma(),
    sof_zman_shma_mga: () => zman.sofZmanShmaMGA(),
    sof_zman_tfila_gra: () => zman.sofZmanTfila(),
    chatzot: () => zman.chatzot(),
    mincha_gedola: () => zman.minchaGedola(),
    mincha_ketana: () => zman.minchaKetana(),
    shkia: () => zman.sunset(),
    tzet_hakochavim: () => zman.tzeit(),
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
  alot_hashachar: 'עלות השחר',
  netz: 'הנץ החמה',
  sof_zman_shma_gra: 'סוף זמן ק"ש (גר"א)',
  sof_zman_shma_mga: 'סוף זמן ק"ש (מג"א)',
  sof_zman_tfila_gra: 'סוף זמן תפילה (גר"א)',
  chatzot: 'חצות היום',
  mincha_gedola: 'מנחה גדולה',
  mincha_ketana: 'מנחה קטנה',
  shkia: 'שקיעת החמה',
  tzet_hakochavim: 'צאת הכוכבים',
};
