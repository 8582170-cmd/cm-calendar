import { NextResponse } from 'next/server';

/**
 * רץ בקצה הרשת (Edge) לפני כל בקשה. Vercel מספק אוטומטית את המדינה
 * של המבקר דרך geo.country (על בסיס ה-IP), בלי צורך בכל שירות חיצוני.
 * אם המשתמש כבר בחר שפה בעבר (יש cookie), לא נוגעים בזה - הבחירה שלו קובעת.
 */
export function middleware(request) {
  const existingLocale = request.cookies.get('locale');
  if (existingLocale) {
    return NextResponse.next();
  }

  // geo זמין רק כשהאתר פרוס ב-Vercel. בפיתוח מקומי (npm run dev) זה יהיה
  // undefined, ואז נבחר עברית כברירת מחדל בטוחה.
  const country = request.geo?.country;
  const defaultLocale = country === 'IL' || !country ? 'he' : 'en';

  const response = NextResponse.next();
  response.cookies.set('locale', defaultLocale, {
    maxAge: 60 * 60 * 24 * 365, // שנה
    path: '/',
  });
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
