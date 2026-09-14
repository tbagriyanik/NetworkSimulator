// src/contexts/LanguageContext.tsx
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Import translation JSON files
import en from '@/locales/en.json';
import tr from '@/locales/tr.json';

export type Language = 'tr' | 'en';

// Translations type representing the translation key-value map used throughout the UI.
export type Translations = any;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/** Detects the browser language and maps it to a supported language. */
function getSystemLanguage(): Language {
  const browserLang = navigator.language.toLowerCase();
  return browserLang.startsWith('tr') ? 'tr' : 'en';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');
  const [mounted, setMounted] = useState(false);

  // Initialise language from storage or system on mount
  useEffect(() => {
    const saved = localStorage.getItem('language') as Language | null;
    if (saved && (saved === 'tr' || saved === 'en')) {
      setLanguage(saved);
    } else {
      const systemLang = getSystemLanguage();
      setLanguage(systemLang);
      localStorage.setItem('language', systemLang);
    }
    setMounted(true);
  }, []);

  // Determine current translations based on language
  const translationsMap: Record<Language, Translations> = { en, tr };
  const t: Translations = translationsMap[language];

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('language', lang);
  };

  if (!mounted) return <></>;

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
