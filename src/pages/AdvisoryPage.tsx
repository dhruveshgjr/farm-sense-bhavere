import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { useWeather } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary, type CropAlert } from '@/lib/advisoryEngine';
import { AlertCard } from '@/components/dashboard/AdvisorySection';
import { CropCalendar } from '@/components/dashboard/CropCalendar';
import { CROPS, SEASONAL_CONTEXT } from '@/lib/farmConfig';
import { getSeasonalContext } from '@/lib/trendEngine';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const SEVERITY_FILTERS = ['All', 'DANGER', 'WARNING', 'INFO'] as const;

const AdvisoryPage = () => {
  const { data: forecast, isLoading } = useWeather();
  const [cropFilter, setCropFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState<string>('All');

  const allAlerts = forecast ? generateAllAdvisories(forecast) : {};
  let sorted = getPrioritySummary(allAlerts);

  if (cropFilter !== 'All') {
    sorted = sorted.filter(a => a.crop === cropFilter);
  }
  if (severityFilter !== 'All') {
    sorted = sorted.filter(a => a.level === severityFilter);
  }

  const currentMonth = new Date().getMonth() + 1;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        {/* Crop filter */}
        <div className="flex gap-1.5 flex-wrap">
          <Button size="sm" variant={cropFilter === 'All' ? 'default' : 'outline'} onClick={() => setCropFilter('All')} className="text-xs">All Crops</Button>
          {CROPS.map(c => (
            <Button key={c.name} size="sm" variant={cropFilter === c.name ? 'default' : 'outline'} onClick={() => setCropFilter(c.name)} className="text-xs">{c.name}</Button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex gap-1.5">
          {SEVERITY_FILTERS.map(s => (
            <Button key={s} size="sm" variant={severityFilter === s ? 'default' : 'outline'} onClick={() => setSeverityFilter(s)} className="text-xs">
              {s === 'DANGER' ? '🔴 Danger' : s === 'WARNING' ? '🟡 Warning' : s === 'INFO' ? '🔵 Info' : 'All'}
            </Button>
          ))}
        </div>

        {/* Alerts */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.length === 0 ? (
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <span className="text-sm">✅ No alerts match your filters</span>
              </div>
            ) : (
              sorted.map((alert, i) => <AlertCard key={i} alert={alert} />)
            )}
          </div>
        )}

        {/* Seasonal context */}
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          <div className="section-header section-header-advisory">📅 Seasonal Calendar Context</div>
          <div className="p-3 space-y-2">
            {CROPS.map(crop => {
              const ctx = getSeasonalContext(crop.commodityName, currentMonth);
              const seasonColor = ctx.season === 'HIGH' ? 'text-success' : ctx.season === 'LOW' ? 'text-danger' : 'text-muted-foreground';
              const seasonal = SEASONAL_CONTEXT[crop.name];
              return (
                <div key={crop.name} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                  <div>
                    <span className="text-sm font-medium">{crop.name}</span>
                    <span className="text-xs text-muted-foreground ml-1">({crop.localName})</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold ${seasonColor}`}>{ctx.season}</span>
                    {seasonal && (
                      <div className="text-[10px] text-muted-foreground">
                        High: {seasonal.high} • Low: {seasonal.low}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Crop Calendar */}
        <CropCalendar />
      </main>
      <BottomNav />
    </div>
  );
};

export default AdvisoryPage;
