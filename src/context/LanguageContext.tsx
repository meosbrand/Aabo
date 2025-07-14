
"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations, TranslationKeys } from '@/lib/translations';

type Language = 'en' | 'pidgin';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: keyof TranslationKeys) => {
    // This is a placeholder, the real logic will be to pick from translations object
    return translations[key][language];
  }, [language]);

  const providerValue = {
    language,
    setLanguage,
    t: translations,
  };

  return (
    <LanguageContext.Provider value={providerValue}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
