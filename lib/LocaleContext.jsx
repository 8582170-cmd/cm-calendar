'use client';

import { createContext, useContext, useState } from 'react';
import { getDictionary } from './i18n';

const LocaleContext = createContext(null);

export function LocaleProvider({ initialLocale, children }) {
  const [locale, setLocale] = useState(initialLocale);

  function toggleLocale() {
    const next = locale === 'he' ? 'en' : 'he';
    setLocale(next);
    // שנה לשנה - אותה תוקף כמו ברירת המחדל שנקבעת ב-middleware
    document.cookie = `locale=${next}; max-age=${60 * 60 * 24 * 365}; path=/`;
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
  }

  const dict = getDictionary(locale);

  return (
    <LocaleContext.Provider value={{ locale, dict, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale חייב לרוץ בתוך LocaleProvider');
  }
  return ctx;
}
