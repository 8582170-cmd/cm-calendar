'use client';

import CalendarMonthView from '@/components/CalendarMonthView';
import LanguageToggle from '@/components/LanguageToggle';
import { useLocale } from '@/lib/LocaleContext';
import { HDate } from '@hebcal/core';

export default function HomePage() {
  const { dict } = useLocale();
  const today = new Date();
  const hToday = new HDate(today);

  return (
    <main className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-start mb-1">
        <h1 className="text-2xl font-bold" style={{ color: '#1f3a5f' }}>
          {dict.siteTitle}
        </h1>
        <LanguageToggle />
      </div>
      <p className="text-sm text-gray-600 mb-6">{dict.previewNotice}</p>

      <section className="mb-8">
        <h2 className="font-semibold mb-2">{dict.gregorianViewLabel}</h2>
        <CalendarMonthView
          calendarType="gregorian"
          year={today.getFullYear()}
          month={today.getMonth() + 1}
        />
      </section>

      <section>
        <h2 className="font-semibold mb-2">{dict.hebrewViewLabel}</h2>
        <CalendarMonthView
          calendarType="hebrew"
          year={hToday.getFullYear()}
          month={hToday.getMonth()}
        />
      </section>
    </main>
  );
}
