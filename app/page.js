'use client';

import { useState } from 'react';
import Link from 'next/link';
import CalendarMonthView from '@/components/CalendarMonthView';
import LanguageToggle from '@/components/LanguageToggle';
import LocationPicker from '@/components/LocationPicker';
import { useLocale } from '@/lib/LocaleContext';
import { HDate } from '@hebcal/core';
import { getZmanimForDate, getAdjacentHebrewMonth, ZMAN_GROUPS, ZMAN_LABELS } from '@/lib/hebcal';

export default function HomePage({ searchParams }) {
  const { dict, locale } = useLocale();
  const today = new Date();
  const hToday = new HDate(today);
  const [location, setLocation] = useState(null);

  // מצב תצוגה: 'gregorian' (ברירת מחדל) או 'hebrew' - נשמר ב-URL כדי
  // שכל שילוב יהיה כתובת אינטרנט קבועה שאפשר לשתף / שגוגל יכול לאנדקס
  const view = searchParams?.view === 'hebrew' ? 'hebrew' : 'gregorian';

  // חישוב חודש/שנה נוכחיים מה-URL, עם נפילה חזרה לחודש הנוכחי האמיתי
  let year, month;
  if (view === 'gregorian') {
    year = parseInt(searchParams?.year, 10) || today.getFullYear();
    month = parseInt(searchParams?.month, 10) || today.getMonth() + 1;
  } else {
    year = parseInt(searchParams?.year, 10) || hToday.getFullYear();
    month = parseInt(searchParams?.month, 10) || hToday.getMonth();
  }

  // חישוב חודש הבא/קודם, לקישורי הניווט
  let prevParams, nextParams;
  if (view === 'gregorian') {
    const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
    const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
    prevParams = prev;
    nextParams = next;
  } else {
    prevParams = getAdjacentHebrewMonth(year, month, -1);
    nextParams = getAdjacentHebrewMonth(year, month, 1);
  }

  const zmanim = location ? getZmanimForDate(today, location) : null;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-start mb-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1f3a5f' }}>
          {dict.siteTitle}
        </h1>
        <LanguageToggle />
      </div>
      <p className="text-sm text-gray-600 mb-4">{dict.previewNotice}</p>

      {/* ניווט: חודש קודם / הבא, ומעבר בין תצוגה עברית ללועזית - כל אחד
          קישור URL אמיתי (Link), לא רק כפתור - כדי שגוגל יוכל לאנדקס כל
          חודש בנפרד וגם כדי שהמשתמש יוכל להעתיק/לשתף כתובת של חודש ספציפי */}
      <div className="flex items-center justify-between mb-4 no-print">
        <Link
          href={`/?view=${view}&year=${prevParams.year}&month=${prevParams.month}`}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          &larr; הקודם
        </Link>

        <div className="flex gap-2 text-sm">
          <Link
            href={`/?view=gregorian`}
            className={`px-3 py-1 rounded ${view === 'gregorian' ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
          >
            תצוגה לועזית
          </Link>
          <Link
            href={`/?view=hebrew`}
            className={`px-3 py-1 rounded ${view === 'hebrew' ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
          >
            תצוגה עברית
          </Link>
        </div>

        <Link
          href={`/?view=${view}&year=${nextParams.year}&month=${nextParams.month}`}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          הבא &rarr;
        </Link>
      </div>

      <section className="mb-8">
        <CalendarMonthView calendarType={view} year={year} month={month} />
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-2">בחירת מיקום לחישוב זמני הלכה</h2>
        <LocationPicker value={location} onChange={setLocation} />
      </section>

      {zmanim && (
        <section className="mb-8">
          <h2 className="font-semibold mb-2">זמני היום ({location.name})</h2>
          {!location.tzid ? (
            <p className="text-sm text-red-600">
              חסר אזור זמן למיקום הזה - חזור להזנה הידנית והשלם אותו כדי לראות זמנים מדויקים.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 text-sm border rounded p-4">
              {ZMAN_GROUPS.flatMap((group) => group.keys).map((key) =>
                zmanim[key] ? (
                  <div key={key} className="flex justify-between border-b py-1">
                    <span className="text-gray-600">{ZMAN_LABELS[key]}</span>
                    <span className="font-mono">
                      {zmanim[key].toLocaleTimeString(locale === 'he' ? 'he-IL' : 'en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ) : null
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
