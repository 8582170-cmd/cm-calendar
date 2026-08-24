export const dictionaries = {
  he: {
    dir: 'rtl',
    weekdays: ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'],
    siteTitle: 'מחולל לוחות שנה עבריים',
    siteDescription: 'בנה לוח שנה עברי/לועזי אישי להדפסה',
    previewNotice:
      'זהו שלב 1 בפיתוח: תצוגת לוח חודשי בלבד, ללא התחברות ובלי שמירת אירועים.',
    gregorianViewLabel: 'תצוגה לועזית (עם תאריך עברי קטן מתחת)',
    hebrewViewLabel: 'תצוגה עברית (עם תאריך לועזי קטן מתחת)',
    languageToggle: 'English',
  },
  en: {
    dir: 'ltr',
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    siteTitle: 'Hebrew Calendar Builder',
    siteDescription: 'Build a personal printable Hebrew/Gregorian calendar',
    previewNotice:
      'This is development Phase 1: a monthly calendar preview only, no login and no saved events yet.',
    gregorianViewLabel: 'Gregorian view (with small Hebrew date below)',
    hebrewViewLabel: 'Hebrew view (with small Gregorian date below)',
    languageToggle: 'עברית',
  },
};

export function getDictionary(locale) {
  return dictionaries[locale] || dictionaries.he;
}
