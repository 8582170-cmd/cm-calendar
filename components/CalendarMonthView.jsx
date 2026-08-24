'use client';

import { buildGregorianMonthGrid, buildHebrewMonthGrid, ZMAN_LABELS } from '@/lib/hebcal';
import { useLocale } from '@/lib/LocaleContext';

/**
 * מציגה חודש אחד של הלוח - עברי או לועזי - כטבלה.
 *
 * props:
 *  - calendarType: 'hebrew' | 'gregorian'
 *  - year, month: לפי הסוג (שנה עברית+חודש עברי, או שנה לועזית+חודש 1-12)
 *  - events: מערך אירועים אישיים שכבר סוננו לחודש הזה (מגיע מ-Supabase)
 *  - colorPrimary, colorSecondary: צבעי העיצוב שהמשתמש בחר
 *  - showZmanim: בוליאני
 *  - showSecondaryDate: האם להציג את התאריך השני (הקטן) בכל תא.
 *    false = לוח "טהור" בסוג אחד בלבד (למשל לועזי בלבד, בלי תאריך עברי כלל).
 */
export default function CalendarMonthView({
  calendarType = 'gregorian',
  year,
  month,
  events = [],
  colorPrimary = '#1f3a5f',
  colorSecondary = '#c9a24b',
  showSecondaryDate = true,
}) {
  const { dict } = useLocale();
  const weeks =
    calendarType === 'hebrew'
      ? buildHebrewMonthGrid(year, month)
      : buildGregorianMonthGrid(year, month);

  // מיפוי מהיר של אירועים לפי תאריך לועזי (YYYY-MM-DD) לתצוגה מהירה בתא
  const eventsByDate = {};
  for (const ev of events) {
    const key = ev.gregorianDate; // מצופה שכבר חושב מראש ברמת הדף שקורא לקומפוננטה
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  }

  return (
    <table
      className="w-full border-collapse text-right"
      style={{ borderColor: colorPrimary }}
    >
      <thead>
        <tr style={{ backgroundColor: colorPrimary, color: 'white' }}>
          {dict.weekdays.map((label) => (
            <th key={label} className="p-2 border text-sm font-semibold">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((cell, di) => (
              <td
                key={di}
                className="align-top border p-1 h-24 w-1/7"
                style={{ borderColor: colorSecondary }}
              >
                {cell && (
                  <DayCell
                    cell={cell}
                    calendarType={calendarType}
                    events={eventsByDate}
                    showSecondaryDate={showSecondaryDate}
                  />
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DayCell({ cell, calendarType, events, showSecondaryDate }) {
  const dateKey =
    calendarType === 'hebrew'
      ? cell.gregorianDate.toISOString().slice(0, 10)
      : cell.gregorianDate.toISOString().slice(0, 10);
  const dayEvents = events[dateKey] || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-baseline">
        <span className="text-lg font-bold">
          {calendarType === 'hebrew' ? cell.hebrewDayGematriya : cell.gregorianDay}
        </span>
        {showSecondaryDate && (
          <span className="text-[10px] text-gray-500">
            {calendarType === 'hebrew' ? cell.gregorianLabel : cell.hebrewLabel}
          </span>
        )}
      </div>

      {cell.holidays?.length > 0 && (
        <div className="text-[11px] text-red-700 font-medium mt-0.5">
          {cell.holidays.join(', ')}
        </div>
      )}

      {dayEvents.map((ev) => (
        <div
          key={ev.id}
          className="text-[11px] mt-0.5 truncate"
          style={{ color: ev.event_color || '#333' }}
          title={ev.title}
        >
          • {ev.title}
        </div>
      ))}
    </div>
  );
}
