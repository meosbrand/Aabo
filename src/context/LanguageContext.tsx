
"use client";

import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { translations, TranslationKeys } from '@/lib/translations';

/**
 * Type definition for the available languages.
 */
type Language = 'en' | 'pidgin';

/**
 * Interface defining the shape of the LanguageContext.
 */
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: TranslationKeys;
}

/**
 * The React Context for managing the application's language state.
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * The provider component that wraps the application to make the language context available.
 * It manages the current language state and provides a function to update it.
 * @param {{ children: ReactNode }} props - The component props.
 * @returns {JSX.Element} The LanguageProvider component.
 */
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // State to hold the current language, defaulting to 'en'.
  const [language, setLanguage] = useState<Language>('en');

  // The translation object is passed directly. The consuming component will select the appropriate language.
  const t = translations;

  /**
   * The value provided to the context consumers.
   */
  const providerValue = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={providerValue}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * A custom hook to easily access the LanguageContext.
 * @throws {Error} If used outside of a LanguageProvider.
 * @returns {LanguageContextType} The language context.
 */
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
