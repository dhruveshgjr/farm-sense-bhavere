import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { MarketPulseSection } from '@/components/dashboard/MarketPulseSection';
import { PriceTrendsSection } from '@/components/dashboard/PriceTrendsSection';
import { AdvisorySection } from '@/components/dashboard/AdvisorySection';
import { OpportunitiesSection } from '@/components/dashboard/OpportunitiesSection';
import { PriceAlertBanner } from '@/components/dashboard/PriceAlertBanner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { InstallBanner } from '@/components/InstallBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, useFetchPrices, useDistinctPriceDays } from '@/hooks/usePrices';
import { toast } from '@/hooks/use-toast';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { checkAndNotify } from '@/components/NotificationSettings';
import { useEffect } from 'react';

const Index = () => {
  const weather = useWeather();
  const prices = usePrices();
  const fetchPricesMutation = useFetchPrices();
  const { data: distinctDays = 0 } = useDistinctPriceDays();
  const [refreshLabel, setRefreshLabel] = useState('');

  // Check for notifications on load
  useEffect(() => {
    if (weather.data) {
      const allAlerts = generateAllAdvisories(weather.data);
      const sorted = getPrioritySummary(allAlerts);
      checkAndNotify(sorted);
    }
  }, [weather.data]);

  const handleRefresh = async () => {
    setRefreshLabel('Fetching weather + prices...');
    try {
      await weather.refetch();
      const result = await fetchPricesMutation.mutateAsync();
      if (result.error) {
        toast({
          title: '⚠️ Price fetch failed',
          description: 'API key not configured. Add DATAGOV_API_KEY in Cloud secrets.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: '✅ Data updated',
          description: `Weather ✓, prices: ${result.success}/10 fetched, ${result.cached} cached`,
        });
      }
    } catch {
      toast({
        title: '⚠️ Price fetch failed',
        description: 'API key not configured. Add DATAGOV_API_KEY in Cloud secrets.',
        variant: 'destructive',
      });
    } finally {
      setRefreshLabel('');
    }
  };

  const lastUpdated = prices.data?.[0]?.fetched_at;
  const hasPrices = (prices.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <InstallBanner />
      <OfflineBanner />
      <AppHeader
        onRefresh={handleRefresh}
        isRefreshing={weather.isFetching || fetchPricesMutation.isPending}
        refreshLabel={refreshLabel}
        prices={prices.data ?? []}
        weather={weather.data}
      />

      <main className="container mx-auto px-3 py-4 space-y-4 max-w-2xl">
        {!hasPrices && !prices.isLoading && (
          <div className="bg-warning/20 border border-warning rounded-lg p-3 text-sm">
            ⚠️ No price history yet. Click <strong>'Fetch Latest Prices'</strong> to load today's mandi data.
            Trend analysis will become available after 7 days of data.
          </div>
        )}

        <PriceAlertBanner prices={prices.data ?? []} />

        <ErrorBoundary section="Weather">
          <WeatherSection
            data={weather.data}
            isLoading={weather.isLoading}
            lastFetched={weather.dataUpdatedAt ? new Date(weather.dataUpdatedAt).toISOString() : null}
          />
        </ErrorBoundary>

        <ErrorBoundary section="Market Pulse">
          <MarketPulseSection
            prices={prices.data ?? []}
            isLoading={prices.isLoading}
            onFetchPrices={() => fetchPricesMutation.mutate()}
            isFetching={fetchPricesMutation.isPending}
            lastUpdated={lastUpdated}
          />
        </ErrorBoundary>

        <ErrorBoundary section="Price Trends">
          <PriceTrendsSection prices={prices.data ?? []} isLoading={prices.isLoading} />
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
