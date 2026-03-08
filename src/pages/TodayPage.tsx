import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { computeAlertLevel, computePctChange, getSellSignal, getSeasonalContext } from '@/lib/trendEngine';
import { CROPS, getWeatherEmoji } from '@/lib/farmConfig';
import { formatLastUpdated } from '@/lib/timeFormat';
import { useFetchPrices } from '@/hooks/usePrices';
import { t } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';

const TodayPage = () => {
  const { data: weather, dataUpdatedAt } = useWeather();
  const { data: prices = [] } = usePrices();
  const fetchMutation = useFetchPrices();
  const month = new Date().getMonth() + 1;

  useEffect(() => {
    document.title = 'KisanMitra — Today\'s Brief';
  }, []);

  const today = new Date();
  const dayName = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });

  // Today's weather
  const todayWeather = weather?.[0];

  // Best sell crop
  let bestCrop: { name: string; emoji: string; price: number; pct: number; mandi: string } | null = null;
  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };

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

  // Top alert
  const allAlerts = weather ? generateAllAdvisories(weather) : {};
  const sorted = getPrioritySummary(allAlerts);
  const topAlert = sorted[0];

  // AI priority (or top danger alert action)
  let priorityText = t('today.clearDay');
  if (topAlert?.level === 'DANGER') {
    priorityText = `${topAlert.crop}: ${topAlert.action}`;
  } else if (topAlert) {
    priorityText = `${topAlert.crop}: ${topAlert.action}`;
  }

  // Check for cached AI advice priority
  const [aiPriority, setAiPriority] = useState<string | null>(null);
  useEffect(() => {
    supabase
      .from('ai_advice_cache')
      .select('advice_text')
      .order('generated_at', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]?.advice_text) {
          const text = data[0].advice_text;
          const priorityMatch = text.match(/(?:TODAY'S PRIORITY|Priority)[:\s]*(.+?)(?:\n|$)/i);
          if (priorityMatch) setAiPriority(priorityMatch[1].trim());
        }
      });
  }, []);

  const displayPriority = aiPriority || priorityText;

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <OfflineBanner />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        {/* Date + Location */}
        <div className="text-center pt-2">
          <h1 className="text-xl font-bold">{dayName}, {dateStr}</h1>
          <p className="text-sm text-muted-foreground">{t('misc.bhavereNashik')} 📍</p>
        </div>

        {/* Priority Card */}
        <div className="rounded-xl p-4 text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(120 39% 24%), hsl(120 30% 35%))' }}>
          <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">🎯 {t('today.priority')}</div>
          <p className="text-base font-bold leading-snug">{displayPriority}</p>
        </div>

        {/* 3 Key Numbers */}
        <div className="grid grid-cols-3 gap-2">
          {/* Weather today */}
          <div className={`bg-card rounded-lg p-3 shadow-sm text-center ${todayWeather && todayWeather.rain_mm > 50 ? 'ring-2 ring-danger' : ''}`}>
            <div className="text-2xl mb-1">{todayWeather ? getWeatherEmoji(todayWeather.weathercode) : '☁️'}</div>
            <div className="text-sm font-bold">
              {todayWeather ? `${Math.round(todayWeather.temp_min)}–${Math.round(todayWeather.temp_max)}°C` : '—'}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {todayWeather ? (todayWeather.rain_mm > 0 ? `💧 ${todayWeather.rain_mm.toFixed(0)}mm` : 'No rain') : '—'}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.weatherToday')}</div>
          </div>

          {/* Best sell */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{bestCrop?.emoji || '💰'}</div>
            <div className="text-sm font-bold">
              {bestCrop ? `₹${bestCrop.price.toLocaleString()}` : '—'}
            </div>
            <div className={`text-[10px] ${bestCrop && bestCrop.pct >= 0 ? 'text-success' : 'text-danger'}`}>
              {bestCrop ? `${bestCrop.pct >= 0 ? '▲' : '▼'}${Math.abs(bestCrop.pct).toFixed(0)}%` : ''}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.bestSell')}</div>
          </div>

          {/* Top alert */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">
              {topAlert ? (topAlert.level === 'DANGER' ? '🔴' : '🟡') : '✅'}
            </div>
            <div className="text-xs font-bold leading-tight line-clamp-2">
              {topAlert ? topAlert.crop : t('today.noAlerts')}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5 line-clamp-1">
              {topAlert ? topAlert.title.slice(0, 30) : ''}
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.topAlert')}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { to: '/dashboard', icon: '📊', label: t('today.fullDashboard') },
            { to: '/market', icon: '💰', label: t('today.marketPrices') },
            { to: '/advisory', icon: '🌱', label: t('today.allAdvisories') },
            { to: '#share', icon: '📱', label: t('today.shareReport'), isAction: true },
          ].map(item => (
            item.isAction ? (
              <button
                key={item.label}
                onClick={() => {
                  // WhatsApp share
                  const text = `🌾 KisanMitra — ${dateStr}\n📍 ${t('misc.bhavereNashik')}\n\n🎯 ${displayPriority}`;
                  const encoded = encodeURIComponent(text);
                  const url = /Android|iPhone/i.test(navigator.userAgent) ? `whatsapp://send?text=${encoded}` : `https://wa.me/?text=${encoded}`;
                  window.open(url, '_blank');
                }}
                className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 text-left hover:opacity-90 transition-opacity"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ) : (
              <Link
                key={item.to}
                to={item.to}
                className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          ))}
        </div>

        {/* Footer */}
        <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
          <span>{t('today.lastUpdated')}: {lastUpdated ? formatLastUpdated(lastUpdated) : '—'}</span>
          <span>•</span>
          <button
            className="underline"
            onClick={() => fetchMutation.mutate()}
            disabled={fetchMutation.isPending}
          >
            {fetchMutation.isPending ? '...' : 'Refresh'}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default TodayPage;

import { useState } from 'react';
