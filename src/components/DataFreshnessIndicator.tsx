import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatLastUpdated } from '@/lib/timeFormat';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface DataFreshnessIndicatorProps {
  onRefresh?: () => void;
}

export function DataFreshnessIndicator({ onRefresh }: DataFreshnessIndicatorProps) {
  const [weatherAge, setWeatherAge] = useState<string | null>(null);
  const [priceAge, setPriceAge] = useState<string | null>(null);
  const [maxAgeHours, setMaxAgeHours] = useState(Infinity);

  useEffect(() => {
    async function check() {
      const { data: wc } = await supabase
        .from('weather_cache')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1);
      if (wc?.[0]?.fetched_at) {
        setWeatherAge(wc[0].fetched_at);
        const hrs = (Date.now() - new Date(wc[0].fetched_at).getTime()) / 3600000;
        setMaxAgeHours(prev => Math.max(hrs, prev === Infinity ? hrs : prev));
      }

      const { data: dp } = await supabase
        .from('daily_prices')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1);
      if (dp?.[0]?.fetched_at) {
        setPriceAge(dp[0].fetched_at);
        const hrs = (Date.now() - new Date(dp[0].fetched_at).getTime()) / 3600000;
        setMaxAgeHours(prev => Math.max(hrs, prev));
      }
    }
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStatus = () => {
    if (maxAgeHours === Infinity) return { dot: '🔴', label: 'Stale' };
    if (maxAgeHours < 1) return { dot: '🟢', label: 'Live' };
    if (maxAgeHours < 6) return { dot: '🟡', label: 'Recent' };
    if (maxAgeHours < 24) return { dot: '🟠', label: 'Aging' };
    return { dot: '🔴', label: 'Stale' };
  };

  const status = getStatus();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-primary-foreground/80 hover:text-primary-foreground transition-colors">
          <span>{status.dot}</span>
          <span className="hidden sm:inline">{status.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Weather:</span>
            <span>{weatherAge ? formatLastUpdated(weatherAge) : 'No data'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Prices:</span>
            <span>{priceAge ? formatLastUpdated(priceAge) : 'No data'}</span>
          </div>
          {onRefresh && (
            <Button size="sm" onClick={onRefresh} className="w-full text-xs mt-2">
              Refresh Now
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
