'use client';

import { useState } from 'react';
import { COMMON_LOCATIONS } from '@/lib/hebcal';

/**
 * בחירת מיקום לחישוב זמני הלכה - שלוש דרכים:
 * 1. רשימה של ערים נפוצות (COMMON_LOCATIONS מתוך lib/hebcal.js)
 * 2. חיפוש כתובת חופשי דרך OpenStreetMap Nominatim (חינמי, בלי מפתח API)
 * 3. הזנה ידנית של קו רוחב/אורך + אזור זמן
 *
 * קורא ל-onChange({ name, lat, lng, tzid }) בכל פעם שנבחר מיקום סופי.
 */
export default function LocationPicker({ value, onChange }) {
  const [mode, setMode] = useState('list'); // 'list' | 'search' | 'manual'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // הזנה ידנית - שדות זמניים עד שהמשתמש לוחץ "אשר"
  const [manualLat, setManualLat] = useState(value?.lat ?? '');
  const [manualLng, setManualLng] = useState(value?.lng ?? '');
  const [manualTzid, setManualTzid] = useState(value?.tzid ?? 'Asia/Jerusalem');
  const [manualName, setManualName] = useState(value?.name ?? '');

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      // Nominatim - שירות החיפוש החינמי של OpenStreetMap. חשוב: מדיניות
      // השימוש שלהם מבקשת לא להציף אותם בבקשות (מקסימום בקשה אחת בשנייה),
      // מה שמתאים בדיוק לשימוש כאן (חיפוש בודד כשמשתמש קובע הגדרות לוח,
      // לא קריאה חוזרת). אין צורך במפתח API.
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&accept-language=he&q=${encodeURIComponent(
        searchQuery
      )}`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'he' },
      });
      if (!res.ok) throw new Error('שגיאת רשת');
      const data = await res.json();
      setSearchResults(data);
      if (data.length === 0) {
        setSearchError('לא נמצאו תוצאות. נסה לחפש בצורה מדויקת יותר (עיר, מדינה).');
      }
    } catch (err) {
      setSearchError('החיפוש נכשל. אפשר לנסות שוב, או לבחור "הזנה ידנית" ולהזין קואורדינטות בעצמך.');
    } finally {
      setSearching(false);
    }
  }

  function chooseSearchResult(result) {
    // Nominatim לא מחזיר אזור זמן - צריך לנחש לפי מיקום גס, או להשאיר
    // את המשתמש לבחור. כאן פתרון פשוט: אם נראה כמו ישראל, ברירת מחדל
    // Asia/Jerusalem; אחרת משאירים לו להזין ידנית באזור הזמן.
    const looksLikeIsrael = result.display_name?.includes('ישראל') || result.display_name?.includes('Israel');
    onChange({
      name: result.display_name,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      tzid: looksLikeIsrael ? 'Asia/Jerusalem' : '', // אם לא ישראל, נבקש מהמשתמש להזין ידנית
    });
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setSearchError('קו רוחב וקו אורך חייבים להיות מספרים');
      return;
    }
    onChange({
      name: manualName || `${lat}, ${lng}`,
      lat,
      lng,
      tzid: manualTzid,
    });
  }

  return (
    <div className="border rounded p-4 space-y-4">
      <div className="flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setMode('list')}
          className={`px-3 py-1 rounded ${mode === 'list' ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
        >
          רשימת ערים
        </button>
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`px-3 py-1 rounded ${mode === 'search' ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
        >
          חיפוש כתובת
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-3 py-1 rounded ${mode === 'manual' ? 'bg-blue-900 text-white' : 'bg-gray-100'}`}
        >
          הזנה ידנית (קו רוחב/אורך)
        </button>
      </div>

      {value && (
        <p className="text-sm text-gray-600">
          מיקום נבחר כרגע: <span className="font-semibold">{value.name}</span>
          {' '}({value.lat?.toFixed(4)}, {value.lng?.toFixed(4)})
          {!value.tzid && (
            <span className="text-red-600"> - חסר אזור זמן, השלם אותו בהזנה הידנית</span>
          )}
        </p>
      )}

      {mode === 'list' && (
        <div className="grid grid-cols-2 gap-2">
          {COMMON_LOCATIONS.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => onChange({ name: loc.name, lat: loc.lat, lng: loc.lng, tzid: loc.tzid })}
              className="text-right border rounded px-3 py-2 hover:bg-gray-50"
            >
              {loc.name}
            </button>
          ))}
        </div>
      )}

      {mode === 'search' && (
        <div>
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="לדוגמה: רחוב הרצל 10, חיפה"
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-blue-900 text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {searching ? 'מחפש...' : 'חפש'}
            </button>
          </form>

          {searchError && <p className="text-sm text-red-600 mt-2">{searchError}</p>}

          {searchResults.length > 0 && (
            <ul className="mt-3 divide-y border rounded">
              {searchResults.map((result) => (
                <li key={result.place_id}>
                  <button
                    type="button"
                    onClick={() => chooseSearchResult(result)}
                    className="w-full text-right px-3 py-2 hover:bg-gray-50 text-sm"
                  >
                    {result.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">שם המיקום (לתצוגה בלבד)</label>
            <input
              type="text"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="לדוגמה: הבית שלי"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm mb-1">קו רוחב (Latitude)</label>
              <input
                type="text"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                placeholder="32.0853"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm mb-1">קו אורך (Longitude)</label>
              <input
                type="text"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                placeholder="34.7818"
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-1">אזור זמן (Timezone)</label>
            <input
              type="text"
              value={manualTzid}
              onChange={(e) => setManualTzid(e.target.value)}
              placeholder="Asia/Jerusalem"
              className="w-full border rounded px-3 py-2"
            />
            <p className="text-xs text-gray-500 mt-1">
              לישראל: Asia/Jerusalem. למדינות אחרות אפשר לחפש "IANA timezone" + שם המדינה.
            </p>
          </div>
          {searchError && <p className="text-sm text-red-600">{searchError}</p>}
          <button type="submit" className="bg-blue-900 text-white px-4 py-2 rounded">
            אשר מיקום
          </button>
        </form>
      )}
    </div>
  );
}
