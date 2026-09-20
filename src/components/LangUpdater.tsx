'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect } from 'react';

export function LangUpdater() {
  const { language } = useLanguage();

  useEffect(() => {
    // The regional tag makes browser/CSS case conversion use Turkish dotted
    // and dotless-i rules for Turkish UI text. Technical identifiers remain
    // handled by their own code paths.
    document.documentElement.lang = language === 'tr' ? 'tr-TR' : 'en-US';
  }, [language]);

  return null;
}
