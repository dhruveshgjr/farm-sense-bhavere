import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { WEATHER_API_URL } from '@/lib/farmConfig';
import { getLastDailyFetch } from '@/lib/cronManager';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface HealthItem {
  label: string;
  status: '✅' | '⚠️' | '🔴' | '⏳';
  detail: string;
}

export function SystemHealthCheck() {
  const [checks, setChecks] = useState<HealthItem[]>([]);
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);

  const runChecks = async () => {
    setRunning(true);
    const results: HealthItem[] = [];

    // 1. Open-Meteo
    try {
      const t0 = Date.now();
      const res = await fetch(WEATHER_API_URL);
      const ms = Date.now() - t0;
      if (res.ok) {
        results.push({ label: 'Weather API', status: '✅', detail: `Working (${ms}ms)` });
      } else {
        results.push({ label: 'Weather API', status: '🔴', detail: `HTTP ${res.status}` });
      }
    } catch {
      results.push({ label: 'Weather API', status: '🔴', detail: 'Failed — check internet' });
    }

    // 2. Price API via edge function
    try {
      const { data, error } = await supabase.functions.invoke('fetch-mandi-prices', {
        body: { commodity: 'Tomato', mandi: 'Nashik' },
      });
      if (error) {
        results.push({ label: 'Price API', status: '🔴', detail: 'Edge function error' });
      } else if (data?.cached) {
        results.push({ label: 'Price API', status: '⚠️', detail: `Using cached data (API key issue)` });
      } else if (data?.modal_price) {
        results.push({ label: 'Price API', status: '✅', detail: `Working — Tomato/Nashik: ₹${data.modal_price}/qtl` });
      } else {
        results.push({ label: 'Price API', status: '⚠️', detail: 'No data returned' });
      }
    } catch {
      results.push({ label: 'Price API', status: '🔴', detail: 'DATAGOV_API_KEY not set' });
    }

    // 3. Database
    try {
      const { count, error } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true });
      if (error) {
        results.push({ label: 'Database', status: '🔴', detail: 'Connection failed' });
      } else {
        const { data: days } = await supabase.from('daily_prices').select('price_date');
        const uniqueDays = new Set((days ?? []).map(r => r.price_date)).size;
        results.push({ label: 'Database', status: '✅', detail: `Connected — ${count ?? 0} records, ${uniqueDays} days` });
      }
    } catch {
      results.push({ label: 'Database', status: '🔴', detail: 'Connection failed' });
    }

    // 4. Price freshness
    try {
      const { data } = await supabase
        .from('daily_prices')
        .select('price_date')
        .order('price_date', { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        const lastDate = data[0].price_date;
        const today = new Date().toISOString().split('T')[0];
        if (lastDate === today) {
          results.push({ label: 'Price Freshness', status: '✅', detail: 'Last record: today' });
        } else {
          const diff = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
          results.push({
            label: 'Price Freshness',
            status: diff <= 1 ? '⚠️' : '🔴',
            detail: diff <= 1 ? "Yesterday's data" : `${diff} days old — run manual fetch`,
          });
        }
      } else {
        results.push({ label: 'Price Freshness', status: '🔴', detail: 'No price data' });
      }
    } catch {
      results.push({ label: 'Price Freshness', status: '🔴', detail: 'Check failed' });
    }

    // 5. Edge functions reachable
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
      const url = `https://${projectId}.supabase.co/functions/v1/fetch-all-prices`;
      const res = await fetch(url, { method: 'OPTIONS' });
      results.push({
        label: 'Edge Functions',
        status: res.ok || res.status === 204 ? '✅' : '⚠️',
        detail: res.ok || res.status === 204 ? 'Deployed and reachable' : `Status ${res.status}`,
      });
    } catch {
      results.push({ label: 'Edge Functions', status: '🔴', detail: 'Not responding' });
    }

    // 6. Auto-fetch
    const lastFetch = getLastDailyFetch();
    if (!lastFetch) {
      results.push({ label: 'Auto-fetch', status: '🔴', detail: 'Never run' });
    } else {
      const today = new Date(Date.now() + 5.5 * 3600000).toISOString().split('T')[0];
      if (lastFetch === today) {
        results.push({ label: 'Auto-fetch', status: '✅', detail: 'Ran today (IST)' });
      } else {
        const diff = Math.floor((Date.now() - new Date(lastFetch).getTime()) / 86400000);
        results.push({
          label: 'Auto-fetch',
          status: diff <= 1 ? '⚠️' : '🔴',
          detail: diff <= 1 ? 'Last ran yesterday' : `Not run in ${diff} days`,
        });
      }
    }

    setChecks(results);
    setRunning(false);
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card rounded-lg shadow-sm p-4">
        <CollapsibleTrigger className="flex items-center justify-between w-full">
          <h2 className="text-sm font-bold">🔧 System Status</h2>
          <span className="text-xs text-muted-foreground">{open ? '▼' : '▶'}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 space-y-2">
            <Button size="sm" onClick={runChecks} disabled={running} className="text-xs mb-2">
              {running ? 'Checking...' : 'Run Health Check'}
            </Button>
            {checks.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs border-b border-border/50 pb-1.5 last:border-0">
                <span>{c.status}</span>
                <span className="font-medium">{c.label}:</span>
                <span className="text-muted-foreground">{c.detail}</span>
              </div>
            ))}
            {checks.length === 0 && !running && (
              <p className="text-xs text-muted-foreground">Click "Run Health Check" to test all systems</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
