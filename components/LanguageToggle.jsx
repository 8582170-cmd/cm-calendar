'use client';

import { useLocale } from '@/lib/LocaleContext';

export default function LanguageToggle() {
  const { dict, toggleLocale } = useLocale();

  return (
    <button
      onClick={toggleLocale}
      className="text-sm px-3 py-1 rounded border border-gray-400 hover:bg-gray-100 no-print"
    >
      {dict.languageToggle}
    </button>
  );
}
