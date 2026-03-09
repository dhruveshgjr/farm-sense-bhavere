import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DataConfidenceBannerProps {
  priceCount: number;
}

export function DataConfidenceBanner({ priceCount }: DataConfidenceBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [weatherAge, setWeatherAge] = useState<number | null>(null);
  const [recentPriceCount, setRecentPriceCount] = useState(0);

  useEffect(() => {
    async function check() {
      // Check weather freshness
      const { data: wc } = await supabase
        .from('weather_cache')
        .select('fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(1);
      
      if (wc?.[0]?.fetched_at) {
        const hrs = (Date.now() - new Date(wc[0].fetched_at).getTime()) / 3600000;
        setWeatherAge(hrs);
      }

      // Check recent price count (last 3 days)
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const { data: dp } = await supabase
        .from('daily_prices')
        .select('id')
        .gte('price_date', threeDaysAgo.toISOString().split('T')[0]);
      
      setRecentPriceCount(dp?.length || 0);
    }
    check();
  }, [priceCount]);

  if (dismissed) return null;

  const getStatus = (): { level: 'high' | 'medium' | 'low'; icon: string; text: string; className: string } => {
    const weatherFresh = weatherAge !== null && weatherAge < 6;
    const weatherRecent = weatherAge !== null && weatherAge < 24;
    const hasRecentPrices = recentPriceCount >= 5;
    const hasAnyPrices = priceCount > 0;

    if (weatherFresh && hasRecentPrices) {
      return {
        level: 'high',
        icon: '🟢',
        text: 'Data is fresh — Report confidence: HIGH',
        className: 'bg-success/10 border-success/30 text-success',
      };
    }

    if (weatherRecent && hasAnyPrices) {
      return {
        level: 'medium',
        icon: '🟡',
        text: 'Weather is fresh, prices are stale — Import latest prices for better accuracy',
        className: 'bg-warning/10 border-warning/30 text-warning',
      };
    }

    return {
      level: 'low',
      icon: '🔴',
      text: 'Data is stale — Refresh weather and import prices from Settings',
      className: 'bg-destructive/10 border-destructive/30 text-destructive',
    };
  };

  const status = getStatus();

  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs mb-3 ${status.className}`}>
      <div className="flex items-center gap-2">
        <span>{status.icon}</span>
        <span>{status.text}</span>
        {status.level !== 'high' && (
          <Link to="/import" className="underline font-medium ml-1 hover:no-underline">
            Import Data
          </Link>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 hover:bg-background/50 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}