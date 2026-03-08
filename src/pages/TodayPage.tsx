import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, getLatestPrice, getAvgPrice, useFetchPrices } from '@/hooks/usePrices';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { computePctChange } from '@/lib/trendEngine';
import { CROPS, getWeatherEmoji } from '@/lib/farmConfig';
import { formatLastUpdated } from '@/lib/timeFormat';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

const TodayPage = () => {
  const { data: weather, dataUpdatedAt } = useWeather();
  const { data: prices = [] } = usePrices();
  const fetchMutation = useFetchPrices();
  const [aiPriority, setAiPriority] = useState<string | null>(null);

  useEffect(() => { document.title = 'KisanMitra — Today\'s Brief'; }, []);

  useEffect(() => {
    supabase.from('ai_advice_cache').select('advice_text').order('generated_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]?.advice_text) {
          const match = data[0].advice_text.match(/(?:TODAY'S PRIORITY|Priority)[:\s]*(.+?)(?:\n|$)/i);
          if (match) setAiPriority(match[1].trim());
        }
      });
  }, []);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  const todayWeather = weather?.[0];

  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };
  let bestCrop: { name: string; emoji: string; price: number; pct: number; mandi: string } | null = null;
  for (const crop of CROPS) {
    for (const mandi of ['Nashik', 'Lasalgaon'] as const) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const pct = computePctChange(latest.modal_price, avg90);
      if (!bestCrop || pct > bestCrop.pct) {
        bestCrop = { name: crop.commodityName, emoji: CROP_EMOJI[crop.commodityName] || '🌾', price: latest.modal_price, pct, mandi };
      }
    }
  }

  const allAlerts = weather ? generateAllAdvisories(weather) : {};
  const sorted = getPrioritySummary(allAlerts);
  const topAlert = sorted[0];

  let priorityText = t('today.clearDay');
  if (topAlert) priorityText = `${topAlert.crop}: ${topAlert.action}`;
  const displayPriority = aiPriority || priorityText;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <OfflineBanner />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <div className="text-center pt-2">
          <h1 className="text-xl font-bold">{dayName}, {dateStr}</h1>
          <p className="text-sm text-muted-foreground">{t('misc.bhavereNashik')} 📍</p>
        </div>

        <div className="rounded-xl p-4 text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(120 39% 24%), hsl(120 30% 35%))' }}>
          <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">🎯 {t('today.priority')}</div>
          <p className="text-base font-bold leading-snug">{displayPriority}</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className={`bg-card rounded-lg p-3 shadow-sm text-center ${todayWeather && todayWeather.rain_mm > 50 ? 'ring-2 ring-danger' : ''}`}>
            <div className="text-2xl mb-1">{todayWeather ? getWeatherEmoji(todayWeather.weathercode) : '☁️'}</div>
            <div className="text-sm font-bold">{todayWeather ? `${Math.round(todayWeather.temp_min)}–${Math.round(todayWeather.temp_max)}°C` : '—'}</div>
            <div className="text-[10px] text-muted-foreground">{todayWeather ? (todayWeather.rain_mm > 0 ? `💧 ${todayWeather.rain_mm.toFixed(0)}mm` : 'No rain') : '—'}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.weatherToday')}</div>
          </div>
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{bestCrop?.emoji || '💰'}</div>
            <div className="text-sm font-bold">{bestCrop ? `₹${bestCrop.price.toLocaleString()}` : '—'}</div>
            <div className={`text-[10px] ${bestCrop && bestCrop.pct >= 0 ? 'text-success' : 'text-danger'}`}>{bestCrop ? `${bestCrop.pct >= 0 ? '▲' : '▼'}${Math.abs(bestCrop.pct).toFixed(0)}%` : ''}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.bestSell')}</div>
          </div>
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{topAlert ? (topAlert.level === 'DANGER' ? '🔴' : '🟡') : '✅'}</div>
            <div className="text-xs font-bold leading-tight line-clamp-2">{topAlert ? topAlert.crop : t('today.noAlerts')}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.topAlert')}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link to="/dashboard" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">📊</span><span className="text-sm font-medium">{t('today.fullDashboard')}</span>
          </Link>
          <Link to="/market" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">💰</span><span className="text-sm font-medium">{t('today.marketPrices')}</span>
          </Link>
          <Link to="/advisory" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">🌱</span><span className="text-sm font-medium">{t('today.allAdvisories')}</span>
          </Link>
          <button onClick={() => {
            const text = `🌾 KisanMitra — ${dateStr}\n📍 ${t('misc.bhavereNashik')}\n\n🎯 ${displayPriority}`;
            const url = /Android|iPhone/i.test(navigator.userAgent) ? `whatsapp://send?text=${encodeURIComponent(text)}` : `https://wa.me/?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
          }} className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity text-left">
            <span className="text-2xl">📱</span><span className="text-sm font-medium">{t('today.shareReport')}</span>
          </button>
        </div>

        <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
          <span>{t('today.lastUpdated')}: {lastUpdated ? formatLastUpdated(lastUpdated) : '—'}</span>
          <span>•</span>
          <button className="underline" onClick={() => fetchMutation.mutate()} disabled={fetchMutation.isPending}>
            {fetchMutation.isPending ? '...' : 'Refresh'}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default TodayPage;
