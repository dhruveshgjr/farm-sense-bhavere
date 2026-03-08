import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SetupBanner } from '@/components/SetupBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, getLatestPrice, getAvgPrice, useFetchPrices } from '@/hooks/usePrices';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { computePctChange, computeAlertLevel, getSeasonalContext, getSellSignal } from '@/lib/trendEngine';
import { CROPS, getWeatherEmoji } from '@/lib/farmConfig';
import { formatLastUpdated } from '@/lib/timeFormat';
import { useLanguage } from '@/hooks/useLanguage';
import { getSignalText, formatNumber } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { generateSmartAdvice } from '@/lib/smartAdvisor';

const TodayPage = () => {
  const { t, language } = useLanguage();
  const { data: weather, dataUpdatedAt } = useWeather();
  const { data: prices = [] } = usePrices();
  const fetchMutation = useFetchPrices();
  const [aiPriority, setAiPriority] = useState<string | null>(null);
  const [prioritySource, setPrioritySource] = useState<'ai' | 'smart' | null>(null);

  useEffect(() => { document.title = 'KisanMitra — Today\'s Brief'; }, []);

  // Try AI cache first, then use Smart Advisor
  useEffect(() => {
    supabase.from('ai_advice_cache').select('advice_text').order('generated_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]?.advice_text) {
          const match = data[0].advice_text.match(/TODAY'S PRIORITY:\s*(.+?)(?:\n|$)/i);
          if (match) {
            setAiPriority(match[1].trim());
            setPrioritySource('ai');
            return;
          }
        }
        // No AI cache — use Smart Advisor
        if (weather) {
          const allAlerts = getPrioritySummary(generateAllAdvisories(weather));
          const month = new Date().getMonth() + 1;
          const smart = generateSmartAdvice(weather, prices, allAlerts, month);
          if (smart.todays_priority) {
            setAiPriority(smart.todays_priority);
            setPrioritySource('smart');
          }
        }
      });
  }, [weather, prices]);

  const today = new Date();
  const dayName = today.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', { day: 'numeric', month: 'long' });
  const todayWeather = weather?.[0];
  const month = today.getMonth() + 1;

  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };

  // Best sell: crop with SELL NOW signal, or highest % above 90d avg
  let bestCrop: { name: string; emoji: string; price: number; pct: number; mandi: string; signal: string; signalColor: string } | null = null;
  for (const crop of CROPS) {
    for (const mandi of ['Nashik', 'Lasalgaon'] as const) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const pct = computePctChange(latest.modal_price, avg90);
      const alertLevel = computeAlertLevel(latest.modal_price, avg90);
      const season = getSeasonalContext(crop.commodityName, month);
      const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);

      const isBetter = !bestCrop ||
        (signal.signal === 'SELL NOW' && bestCrop.signal !== 'SELL NOW') ||
        (signal.signal === bestCrop.signal && pct > bestCrop.pct);

      if (isBetter) {
        bestCrop = { name: crop.commodityName, emoji: CROP_EMOJI[crop.commodityName] || '🌾', price: latest.modal_price, pct, mandi, signal: signal.signal, signalColor: signal.color };
      }
    }
  }

  const allAlerts = weather ? generateAllAdvisories(weather) : {};
  const sorted = getPrioritySummary(allAlerts);
  const topAlert = sorted[0];

  // Priority fallback chain
  const getTodaysPriority = () => {
    if (aiPriority) return { text: aiPriority, source: 'ai' as const };
    const topDanger = sorted.find(a => a.level === 'DANGER');
    if (topDanger) return { text: `${topDanger.crop}: ${topDanger.action}`, source: 'danger' as const };
    const topWarning = sorted.find(a => a.level === 'WARNING');
    if (topWarning) return { text: `${topWarning.crop}: ${topWarning.action}`, source: 'warning' as const };
    return { text: t('today.clearDay'), source: 'clear' as const };
  };
  const priority = getTodaysPriority();

  const sourceBadge: Record<string, string> = {
    ai: t('today.aiGenerated'),
    danger: t('today.criticalAlert'),
    warning: t('today.weatherWarning'),
    clear: t('today.clear'),
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;
  const hasPrices = prices.length > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <SetupBanner />
      <OfflineBanner />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <div className="text-center pt-2">
          <h1 className="text-xl font-bold">{dayName}, {dateStr}</h1>
          <p className="text-sm text-muted-foreground">{t('misc.bhavereNashik')} 📍</p>
        </div>

        {/* HERO: Today's Priority */}
        <div className="rounded-xl p-4 text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(120 39% 24%), hsl(120 30% 35%))' }}>
          <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">🎯 {t('today.priority')}</div>
          <p className="text-base font-bold leading-snug">{priority.text}</p>
          <span className="text-[9px] opacity-70 mt-1 inline-block">{sourceBadge[priority.source]}</span>
        </div>

        {/* 3 Key Numbers */}
        <div className="grid grid-cols-3 gap-2">
          {/* Weather */}
          <div className={`bg-card rounded-lg p-3 shadow-sm text-center ${todayWeather && todayWeather.rain_mm > 50 ? 'ring-2 ring-destructive' : ''}`}>
            <div className="text-2xl mb-1">{todayWeather ? getWeatherEmoji(todayWeather.weathercode) : '☁️'}</div>
            <div className="text-sm font-bold">{todayWeather ? `${Math.round(todayWeather.temp_min)}–${Math.round(todayWeather.temp_max)}°C` : '—'}</div>
            <div className="text-[10px] text-muted-foreground">{todayWeather ? (todayWeather.rain_mm > 0 ? `💧 ${todayWeather.rain_mm.toFixed(0)}mm` : 'No rain') : '—'}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.weatherToday')}</div>
          </div>

          {/* Best Sell */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{bestCrop?.emoji || '💰'}</div>
            {bestCrop ? (
              <>
                <div className="text-sm font-bold">₹{formatNumber(bestCrop.price, language)}</div>
                <div className={`text-[10px] font-bold px-1 py-0.5 rounded-full inline-block ${
                  bestCrop.signalColor === 'green' ? 'bg-success/20 text-success' :
                  bestCrop.signalColor === 'blue' ? 'bg-info/20 text-info' :
                  'bg-muted text-muted-foreground'
                }`}>{getSignalText(bestCrop.signal, language)}</div>
                <div className="text-[9px] text-muted-foreground">→ {bestCrop.mandi}</div>
              </>
            ) : (
              <div className="text-[10px] text-muted-foreground">{hasPrices ? '—' : t('today.addApiKey')}</div>
            )}
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.bestSell')}</div>
          </div>

          {/* Top Alert */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{topAlert ? (topAlert.level === 'DANGER' ? '🔴' : '🟡') : '✅'}</div>
            <div className="text-xs font-bold leading-tight line-clamp-2">{topAlert ? topAlert.crop : t('today.noAlerts')}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{t('today.topAlert')}</div>
          </div>
        </div>

        {/* Quick Actions */}
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
            const text = `🌾 KisanMitra — ${dateStr}\n📍 ${t('misc.bhavereNashik')}\n\n🎯 ${priority.text}`;
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
