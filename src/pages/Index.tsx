import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { MarketPulseSection } from '@/components/dashboard/MarketPulseSection';
import { PriceTrendsSection } from '@/components/dashboard/PriceTrendsSection';
import { AdvisorySection } from '@/components/dashboard/AdvisorySection';
import { OpportunitiesSection } from '@/components/dashboard/OpportunitiesSection';
import { PriceAlertBanner } from '@/components/dashboard/PriceAlertBanner';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, useFetchPrices, useDistinctPriceDays } from '@/hooks/usePrices';
import { toast } from '@/hooks/use-toast';

const Index = () => {
  const weather = useWeather();
  const prices = usePrices();
  const fetchPricesMutation = useFetchPrices();
  const { data: distinctDays = 0 } = useDistinctPriceDays();
  const [refreshLabel, setRefreshLabel] = useState('');

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
    } catch (err: any) {
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

        <WeatherSection
          data={weather.data}
          isLoading={weather.isLoading}
          lastFetched={weather.dataUpdatedAt ? new Date(weather.dataUpdatedAt).toISOString() : null}
        />
        <MarketPulseSection
          prices={prices.data ?? []}
          isLoading={prices.isLoading}
          onFetchPrices={() => fetchPricesMutation.mutate()}
          isFetching={fetchPricesMutation.isPending}
          lastUpdated={lastUpdated}
        />
        <PriceTrendsSection prices={prices.data ?? []} isLoading={prices.isLoading} />
        <AdvisorySection forecast={weather.data} isLoading={weather.isLoading} />
        <OpportunitiesSection prices={prices.data ?? []} isLoading={prices.isLoading} distinctDays={distinctDays} />

        <footer className="text-center text-[10px] text-muted-foreground py-4 print:block">
          Data: Open-Meteo (weather) • data.gov.in (prices) • Prices are last-cached — verify before decisions
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
