import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { t } from '@/lib/i18n';

export function SetupBanner() {
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
        <span>📊 Add price data to activate sell signals and market intelligence</span>
        <div className="flex items-center gap-2">
          <Link to="/import" className="underline font-bold whitespace-nowrap">Import Data →</Link>
          <Link to="/settings" className="underline whitespace-nowrap text-xs opacity-80">or Settings</Link>
        </div>
      </div>
    );
  }

  return null;
}
