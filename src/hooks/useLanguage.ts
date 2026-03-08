import { useState, useCallback } from 'react';
import { t as translate, getLanguage, setLanguage as setLang, type Lang } from '@/lib/i18n';

export function useLanguage() {
  const [language, setLanguageState] = useState<Lang>(getLanguage());

  const setLanguage = useCallback((lang: Lang) => {
    setLang(lang);
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return { language, setLanguage, t };
}
