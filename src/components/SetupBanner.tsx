import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';

export function SetupBanner() {
  const { t } = useLanguage();
  const [state, setState] = useState<'loading' | 'need-data' | 'ok'>('loading');

  useEffect(() => {
    async function check() {
      try {
        // Only check if we have enough price data (no longer need API key check)
        const { count } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true });
        if ((count ?? 0) < 10) {
          setState('need-data');
          return;
        }
        setState('ok');
      } catch {
        setState('ok');
      }
    }
    check();
  }, []);

  if (state === 'loading' || state === 'ok') return null;

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
