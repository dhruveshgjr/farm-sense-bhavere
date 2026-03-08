import { useState, useEffect, memo } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { MarketPulseSection } from '@/components/dashboard/MarketPulseSection';
import { PriceTrendsSection } from '@/components/dashboard/PriceTrendsSection';
import { AdvisorySection } from '@/components/dashboard/AdvisorySection';
import { OpportunitiesSection } from '@/components/dashboard/OpportunitiesSection';
import { PriceAlertBanner } from '@/components/dashboard/PriceAlertBanner';
import { QuickStatsStrip } from '@/components/dashboard/QuickStatsStrip';
import { AIAdvisorSection } from '@/components/dashboard/AIAdvisorSection';
import { SupplyIntelSection } from '@/components/dashboard/SupplyIntelSection';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InstallBanner } from '@/components/InstallBanner';
import { OnboardingOverlay } from '@/components/OnboardingOverlay';
import { StaleFetchBanner } from '@/components/StaleFetchBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, useFetchPrices, useDistinctPriceDays } from '@/hooks/usePrices';
import { toast } from '@/hooks/use-toast';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { smartCheckAndNotify } from '@/lib/notificationManager';
import { computeAlertLevel, computePctChange, getSeasonalContext, getSellSignal } from '@/lib/trendEngine';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const weather = useWeather();
  const prices = usePrices();
  const fetchPricesMutation = useFetchPrices();
  const { data: distinctDays = 0 } = useDistinctPriceDays();
  const [refreshLabel, setRefreshLabel] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => { document.title = 'KisanMitra — Dashboard'; }, []);

  useEffect(() => {
    if (localStorage.getItem('kisanmitra_onboarded') === 'true') {
      setCheckingOnboarding(false);
      return;
    }
    async function check() {
      const [{ count: priceCount }, { count: weatherCount }] = await Promise.all([
        supabase.from('daily_prices').select('*', { count: 'exact', head: true }),
        supabase.from('weather_cache').select('*', { count: 'exact', head: true }),
      ]);
      if ((priceCount ?? 0) === 0 && (weatherCount ?? 0) === 0) {
        setShowOnboarding(true);
      }
      setCheckingOnboarding(false);
    }
    check();
  }, []);

  // Smart notifications
  useEffect(() => {
    if (!weather.data || !prices.data) return;
    const allAlerts = generateAllAdvisories(weather.data);
    const sorted = getPrioritySummary(allAlerts);
    const trends = CROPS.flatMap(crop =>
      MANDIS.map(mandi => {
        const latest = getLatestPrice(prices.data!, crop.commodityName, mandi);
        const avg90 = getAvgPrice(prices.data!, crop.commodityName, 90);
        if (!latest || !avg90) return null;
        const pct = computePctChange(latest.modal_price, avg90);
        return { alert_level: computeAlertLevel(latest.modal_price, avg90), commodity: crop.commodityName, mandi, current_price: latest.modal_price, pct_vs_90d: pct };
      })
    ).filter(Boolean) as any[];
    smartCheckAndNotify(sorted, trends);
  }, [weather.data, prices.data]);

  // Build trends for AI advisor
  const month = new Date().getMonth() + 1;
  const trendData = prices.data ? CROPS.flatMap(crop =>
    MANDIS.map(mandi => {
      const latest = getLatestPrice(prices.data!, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices.data!, crop.commodityName, 90);
      if (!latest || !avg90) return null;
      const alertLevel = computeAlertLevel(latest.modal_price, avg90);
      const season = getSeasonalContext(crop.commodityName, month);
      const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);
      return { commodity: crop.commodityName, mandi, current_price: latest.modal_price, pct_vs_90d: computePctChange(latest.modal_price, avg90), sell_signal: signal.signal };
    })
  ).filter(Boolean) as any[] : [];

  const allAlerts = weather.data ? getPrioritySummary(generateAllAdvisories(weather.data)) : [];

  const handleRefresh = async () => {
    setRefreshLabel('Fetching weather + prices...');
    try {
      await weather.refetch();
      const result = await fetchPricesMutation.mutateAsync();
      if (result.error) {
        toast({ title: '⚠️ Price fetch failed', description: 'API key not configured.', variant: 'destructive' });
      } else {
        toast({ title: '✅ Data updated', description: `Weather ✓, prices: ${result.success}/10 fetched` });
      }
    } catch {
      toast({ title: '⚠️ Price fetch failed', description: 'API key not configured.', variant: 'destructive' });
    } finally {
      setRefreshLabel('');
    }
  };

  if (checkingOnboarding) return null;
  if (showOnboarding) {
    return <OnboardingOverlay onComplete={() => { setShowOnboarding(false); weather.refetch(); }} />;
  }

  const hasPrices = (prices.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <InstallBanner />
      <OfflineBanner />
      <AppHeader onRefresh={handleRefresh} isRefreshing={weather.isFetching || fetchPricesMutation.isPending} refreshLabel={refreshLabel} prices={prices.data ?? []} weather={weather.data} />
      <main className="container mx-auto px-3 py-4 space-y-4 max-w-2xl">
        <QuickStatsStrip prices={prices.data ?? []} weather={weather.data} />
        <StaleFetchBanner />

        {!hasPrices && !prices.isLoading && (
          <div className="bg-warning/20 border border-warning rounded-lg p-3 text-sm">
            ⚠️ No price history yet. Click <strong>'Fetch Latest Prices'</strong> to load today's mandi data.
          </div>
        )}

        <PriceAlertBanner prices={prices.data ?? []} />

        <ErrorBoundary section="AI Advisor">
          <AIAdvisorSection weather={weather.data} prices={prices.data ?? []} alerts={allAlerts} trends={trendData} />
        </ErrorBoundary>

        <ErrorBoundary section="Weather">
          <WeatherSection data={weather.data} isLoading={weather.isLoading} lastFetched={weather.dataUpdatedAt ? new Date(weather.dataUpdatedAt).toISOString() : null} />
        </ErrorBoundary>

        <ErrorBoundary section="Market Pulse">
          <MarketPulseSection prices={prices.data ?? []} isLoading={prices.isLoading} onFetchPrices={() => fetchPricesMutation.mutate()} isFetching={fetchPricesMutation.isPending} lastUpdated={prices.data?.[0]?.fetched_at} />
        </ErrorBoundary>

        <ErrorBoundary section="Price Trends">
          <PriceTrendsSection prices={prices.data ?? []} isLoading={prices.isLoading} />
        </ErrorBoundary>

        <ErrorBoundary section="Supply Intelligence">
          <SupplyIntelSection />
        </ErrorBoundary>

        <ErrorBoundary section="Advisory">
          <AdvisorySection forecast={weather.data} isLoading={weather.isLoading} />
        </ErrorBoundary>

        <ErrorBoundary section="Opportunities">
          <OpportunitiesSection prices={prices.data ?? []} isLoading={prices.isLoading} distinctDays={distinctDays} />
        </ErrorBoundary>

        <footer className="text-center text-[10px] text-muted-foreground py-4 print:block">
          Data: Open-Meteo (weather) • data.gov.in (prices) • Prices are last-cached — verify before decisions
        </footer>
      </main>
      <BottomNav />
    </div>
  );
};

export default Index;
