import { supabase } from '@/integrations/supabase/client';

const LAST_FETCH_KEY = 'kisanmitra_last_daily_fetch';

function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
}

export function getLastDailyFetch(): string | null {
  return localStorage.getItem(LAST_FETCH_KEY);
}

export function isDataStale(): boolean {
  const last = getLastDailyFetch();
  if (!last) return true;
  return last !== getTodayIST();
}

export function isDaysMissed(): number {
  const last = getLastDailyFetch();
  if (!last) return 999;
  const lastDate = new Date(last);
  const now = new Date();
  const diff = Math.floor((now.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
  return diff;
}

export function initClientCron() {
  const todayStr = getTodayIST();
  const lastFetch = getLastDailyFetch();

  if (lastFetch === todayStr) return;

  setTimeout(async () => {
    console.log('[KisanMitra] Running daily auto-fetch...');
    try {
      const { data, error } = await supabase.functions.invoke('fetch-all-prices');
      if (error) throw error;
      localStorage.setItem(LAST_FETCH_KEY, todayStr);
      console.log('[KisanMitra] Daily fetch complete:', data);
    } catch (e) {
      console.error('[KisanMitra] Daily fetch failed:', e);
    }
  }, 3000);
}
