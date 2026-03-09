import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { BottomNav } from '@/components/BottomNav';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SetupBanner } from '@/components/SetupBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, getLatestPrice, getAvgPrice, useFetchPrices } from '@/hooks/usePrices';
import { generateAllAdvisories, getPrioritySummary, computeSprayWindows, computeDiseaseRisks } from '@/lib/advisoryEngine';
import { computePctChange, computeAlertLevel, getSeasonalContext, getSellSignal } from '@/lib/trendEngine';
import { CROPS, getWeatherEmoji } from '@/lib/farmConfig';
import { formatLastUpdated } from '@/lib/timeFormat';
import { getSignalText, formatNumber } from '@/lib/i18n';
import { supabase } from '@/integrations/supabase/client';
import { generateSmartAdvice } from '@/lib/smartAdvisor';
import { generateWhatsAppReport } from '@/lib/reportGenerator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

const TodayPage = () => {
  const { data: weather, dataUpdatedAt } = useWeather();
  const { data: prices = [] } = usePrices();
  const fetchMutation = useFetchPrices();
  const { toast } = useToast();
  const [aiPriority, setAiPriority] = useState<string | null>(null);
  const [prioritySource, setPrioritySource] = useState<'ai' | 'smart' | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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
  const dayName = today.toLocaleDateString('en-IN', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
  const todayWeather = weather?.[0];
  const month = today.getMonth() + 1;

  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };

  // Generate full report
  const report = useMemo(() => {
    const forecast = weather || [];
    const allAlerts = generateAllAdvisories(forecast);
    const alerts = getPrioritySummary(allAlerts);
    const sprayWindows = computeSprayWindows(forecast);
    const diseaseRisks = computeDiseaseRisks(forecast);
    return generateWhatsAppReport(forecast, prices, alerts, sprayWindows, diseaseRisks, month);
  }, [weather, prices, month]);

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
    if (aiPriority) return { text: aiPriority, source: (prioritySource || 'smart') as 'ai' | 'smart' | 'danger' | 'warning' | 'clear' };
    const topDanger = sorted.find(a => a.level === 'DANGER');
    if (topDanger) return { text: `${topDanger.crop}: ${topDanger.action}`, source: 'danger' as const };
    const topWarning = sorted.find(a => a.level === 'WARNING');
    if (topWarning) return { text: `${topWarning.crop}: ${topWarning.action}`, source: 'warning' as const };
    return { text: 'No critical actions today — normal farm operations', source: 'clear' as const };
  };
  const priority = getTodaysPriority();

  const sourceBadge: Record<string, string> = {
    ai: '🤖 AI generated',
    smart: '🧠 Smart Advisor',
    danger: '🔴 Critical alert',
    warning: '🟡 Weather warning',
    clear: '✅ Clear',
  };

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toISOString() : null;
  const hasPrices = prices.length > 0;

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(report.text);
      toast({
        title: "Report copied!",
        description: "Paste in WhatsApp to share with your family.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please try the WhatsApp share button instead.",
        variant: "destructive",
      });
    }
  };

  const handleShareWhatsApp = () => {
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?text=${encodeURIComponent(report.text)}`
      : `https://wa.me/?text=${encodeURIComponent(report.text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <SetupBanner />
      <OfflineBanner />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <div className="text-center pt-2">
          <h1 className="text-xl font-bold">{dayName}, {dateStr}</h1>
          <p className="text-sm text-muted-foreground">Bhavere, Nashik 📍</p>
        </div>

        {/* HERO: Today's Priority */}
        <div className="rounded-xl p-4 text-primary-foreground" style={{ background: 'linear-gradient(135deg, hsl(120 39% 24%), hsl(120 30% 35%))' }}>
          <div className="text-[10px] uppercase tracking-wider opacity-80 mb-1">🎯 Today's Priority</div>
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
            <div className="text-[9px] text-muted-foreground mt-0.5">Weather Today</div>
          </div>

          {/* Best Sell */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{bestCrop?.emoji || '💰'}</div>
            {bestCrop ? (
              <>
                <div className="text-sm font-bold">₹{formatNumber(bestCrop.price)}</div>
                <div className={`text-[10px] font-bold px-1 py-0.5 rounded-full inline-block ${
                  bestCrop.signalColor === 'green' ? 'bg-success/20 text-success' :
                  bestCrop.signalColor === 'blue' ? 'bg-info/20 text-info' :
                  'bg-muted text-muted-foreground'
                }`}>{getSignalText(bestCrop.signal)}</div>
                <div className="text-[9px] text-muted-foreground">→ {bestCrop.mandi}</div>
              </>
            ) : (
              <div className="text-[10px] text-muted-foreground">{hasPrices ? '—' : 'Fetch prices to see signals'}</div>
            )}
            <div className="text-[9px] text-muted-foreground mt-0.5">Best Sell Today</div>
          </div>

          {/* Top Alert */}
          <div className="bg-card rounded-lg p-3 shadow-sm text-center">
            <div className="text-2xl mb-1">{topAlert ? (topAlert.level === 'DANGER' ? '🔴' : '🟡') : '✅'}</div>
            <div className="text-xs font-bold leading-tight line-clamp-2">{topAlert ? topAlert.crop : 'No alerts'}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">Top Alert</div>
          </div>
        </div>

        {/* Share Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleCopyReport} 
            className="bg-card text-foreground hover:bg-muted border border-border"
            variant="outline"
          >
            <Copy className="h-4 w-4 mr-2" />
            📋 Copy Report
          </Button>
          <Button 
            onClick={handleShareWhatsApp}
            className="bg-success text-success-foreground hover:bg-success/90"
          >
            <Share2 className="h-4 w-4 mr-2" />
            📱 WhatsApp
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link to="/dashboard" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">📊</span><span className="text-sm font-medium">Full Dashboard</span>
          </Link>
          <Link to="/market" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">💰</span><span className="text-sm font-medium">Market Prices</span>
          </Link>
          <Link to="/advisory" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">🌱</span><span className="text-sm font-medium">All Advisories</span>
          </Link>
          <Link to="/import" className="bg-primary text-primary-foreground rounded-xl p-4 flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-2xl">📥</span><span className="text-sm font-medium">Import Data</span>
          </Link>
        </div>

        {/* Report Preview Toggle */}
        <button 
          onClick={() => setShowPreview(!showPreview)}
          className="w-full flex items-center justify-between p-3 bg-muted rounded-lg text-sm font-medium"
        >
          <span>📄 Preview Full Report</span>
          {showPreview ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Report Preview */}
        {showPreview && (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <ScrollArea className="h-80">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-words text-foreground">
                {report.text}
              </pre>
            </ScrollArea>
          </div>
        )}

        <div className="text-center text-[10px] text-muted-foreground flex items-center justify-center gap-2">
          <span>Last updated: {lastUpdated ? formatLastUpdated(lastUpdated) : '—'}</span>
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
