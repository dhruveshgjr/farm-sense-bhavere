import { useState, useCallback, useEffect } from 'react';
import { t as translate, getLanguage, setLanguage as setLang, type Lang } from '@/lib/i18n';

// Simple event-based reactivity for language changes across components
const listeners = new Set<(lang: Lang) => void>();

function notifyAll(lang: Lang) {
  listeners.forEach(fn => fn(lang));
}

export function useLanguage() {
  const [language, setLanguageState] = useState<Lang>(getLanguage());

  useEffect(() => {
    const handler = (lang: Lang) => setLanguageState(lang);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const setLanguage = useCallback((lang: Lang) => {
    setLang(lang);
    setLanguageState(lang);
    notifyAll(lang);
  }, []);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return { language, setLanguage, t };
}
