import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { WeatherSection } from '@/components/dashboard/WeatherSection';
import { MarketPulseSection } from '@/components/dashboard/MarketPulseSection';
import { PriceTrendsSection } from '@/components/dashboard/PriceTrendsSection';
import { AdvisorySection } from '@/components/dashboard/AdvisorySection';
import { OpportunitiesSection } from '@/components/dashboard/OpportunitiesSection';
import { useWeather } from '@/hooks/useWeather';
import { usePrices, useFetchPrices } from '@/hooks/usePrices';

const Index = () => {
  const weather = useWeather();
  const prices = usePrices();
  const fetchPricesMutation = useFetchPrices();

  const handleRefresh = () => {
    weather.refetch();
    fetchPricesMutation.mutate();
  };

  const lastUpdated = prices.data?.[0]?.fetched_at;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader
        onRefresh={handleRefresh}
        isRefreshing={weather.isFetching || fetchPricesMutation.isPending}
      />

      <main className="container mx-auto px-3 py-4 space-y-4 max-w-2xl">
        <WeatherSection data={weather.data} isLoading={weather.isLoading} />
        <MarketPulseSection
          prices={prices.data ?? []}
          isLoading={prices.isLoading}
          onFetchPrices={() => fetchPricesMutation.mutate()}
          isFetching={fetchPricesMutation.isPending}
          lastUpdated={lastUpdated}
        />
        <PriceTrendsSection prices={prices.data ?? []} isLoading={prices.isLoading} />
        <AdvisorySection forecast={weather.data} isLoading={weather.isLoading} />
        <OpportunitiesSection prices={prices.data ?? []} isLoading={prices.isLoading} />

        <footer className="text-center text-[10px] text-muted-foreground py-4">
          Data: Open-Meteo (weather) • data.gov.in (prices) • Prices are last-cached — verify before decisions
        </footer>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
