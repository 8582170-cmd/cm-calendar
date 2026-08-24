import './globals.css';
import { cookies } from 'next/headers';
import { LocaleProvider } from '@/lib/LocaleContext';
import { getDictionary } from '@/lib/i18n';

export const metadata = {
  title: 'מחולל לוחות שנה עבריים',
  description: 'בנה לוח שנה עברי/לועזי אישי להדפסה',
};

export default function RootLayout({ children }) {
  // ה-cookie 'locale' כבר נקבע ע"י middleware.js (לפי מדינת המבקר),
  // אלא אם המשתמש עצמו כבר בחר שפה בעבר - ואז זה מכבד את הבחירה שלו.
  const initialLocale = cookies().get('locale')?.value || 'he';
  const dict = getDictionary(initialLocale);

  return (
    <html lang={initialLocale} dir={dict.dir}>
      <body>
        <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
