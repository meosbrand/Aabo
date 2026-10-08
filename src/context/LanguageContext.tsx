"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

/**
 * Type definition for the available languages.
 */
export type Language = 'en' | 'pidgin';

const STORAGE_KEY = 'aabo.language';

/**
 * Interface defining the shape of the LanguageContext.
 */
interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
}

/**
 * The React Context for managing the application's language state.
 */
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

/**
 * The provider component that wraps the application to make the language context available.
 * The chosen language is remembered in localStorage (best effort).
 * @param {{ children: ReactNode, initialLanguage?: Language }} props - The component props.
 * @returns {JSX.Element} The LanguageProvider component.
 */
export const LanguageProvider = ({ children, initialLanguage = 'en' }: { children: ReactNode; initialLanguage?: Language }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  // Restore the remembered language after hydration.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'pidgin') setLanguageState(saved);
    } catch {
      // Storage can be unavailable (private mode); English is fine.
    }
  }, []);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
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
