
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import { AppTexts } from '@/constants/AppTexts';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  texts: typeof AppTexts.en;
  isRTL: boolean;
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState(false);

  const texts = AppTexts[language];

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    const shouldBeRTL = lang === 'ar';
    
    if (shouldBeRTL !== isRTL) {
      setIsRTL(shouldBeRTL);
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    setLanguage(newLang);
  };

  useEffect(() => {
    setIsRTL(I18nManager.isRTL);
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        texts,
        isRTL,
        toggleLanguage,
        setLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
