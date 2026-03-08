import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

export function SetupBanner() {
  const { t } = useLanguage();
  const [state, setState] = useState<'loading' | 'need-key' | 'need-data' | 'ok'>('loading');

  useEffect(() => {
    async function check() {
      try {
        // Check if DATAGOV_API_KEY is set
        const { data: secretData } = await supabase.functions.invoke('check-secrets', {
          body: { keys: ['DATAGOV_API_KEY'] },
        });

        if (!secretData?.DATAGOV_API_KEY) {
          setState('need-key');
          return;
        }

        // Check price count
        const { count } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true });
        if ((count ?? 0) < 10) {
          setState('need-data');
          return;
        }

        setState('ok');
      } catch {
        setState('ok'); // Don't block UI on check failure
      }
    }
    check();
  }, []);

  if (state === 'loading' || state === 'ok') return null;

  if (state === 'need-key') {
    return (
      <div className="sticky top-0 z-[60] px-4 py-2.5 text-sm font-medium text-primary-foreground flex items-center justify-between gap-2 flex-wrap"
        style={{ backgroundColor: 'hsl(45 100% 47%)' }}>
        <span className="text-foreground">{t('setup.needApiKey')}</span>
        <Link to="/settings" className="underline font-bold text-foreground whitespace-nowrap">{t('setup.openSettings')}</Link>
      </div>
    );
  }

  if (state === 'need-data') {
    return (
      <div className="sticky top-0 z-[60] px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-2 flex-wrap"
        style={{ backgroundColor: 'hsl(211 80% 42%)', color: 'white' }}>
        <span>{t('setup.needHistory')}</span>
        <Link to="/settings" className="underline font-bold whitespace-nowrap">{t('setup.goToSettings')}</Link>
      </div>
    );
  }

  return null;
}
