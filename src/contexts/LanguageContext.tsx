import { createContext, useState, useCallback, type ReactNode } from 'react';
import { t as translate, setLanguage as persistLang, type Lang } from '@/lib/i18n';

interface LanguageContextType {
  language: Lang;
  setLanguage: (l: Lang) => void;
  t: (key: string) => string;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Lang>(
    () => (localStorage.getItem('kisanmitra_language') as Lang) || 'en'
  );

  const setLanguage = useCallback((lang: Lang) => {
    setLanguageState(lang);
    persistLang(lang);
  }, []);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
