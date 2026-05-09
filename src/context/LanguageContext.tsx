// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import { Language, translations } from '@/lib/i18n';
import { CurrencyCode } from '@/lib/currency';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations['sw']) => string;
  currency: CurrencyCode;
  setCurrency: (currency: CurrencyCode) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>('sw');
  const [currency, setCurrency] = useState<CurrencyCode>('TZS');

  // Stable translation function (prevents re-renders when lang doesn't change)
  const t = useMemo(() => {
    return (key: keyof typeof translations['sw']): string => {
      return translations[lang][key] ?? key;
    };
  }, [lang]);

  const handleSetLang = useCallback((newLang: Language) => {
    setLang(newLang);
    // Government services should always default to TZS
  }, []);

  const handleSetCurrency = useCallback((newCurrency: CurrencyCode) => {
    setCurrency(newCurrency);
  }, []);

  // Memoized context value (prevents child re-renders)
  const contextValue = useMemo(() => ({
    lang,
    setLang: handleSetLang,
    t,
    currency,
    setCurrency: handleSetCurrency,
  }), [lang, t, currency, handleSetLang, handleSetCurrency]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}