import { CROPS, MANDIS } from '@/lib/farmConfig';
import { computeAlertLevel, computePctChange, getSellSignal, getSeasonalContext } from '@/lib/trendEngine';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';
import { getSettings } from '@/lib/settingsStore';

interface OpportunitiesSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
  distinctDays?: number;
}

export function OpportunitiesSection({ prices, isLoading, distinctDays = 0 }: OpportunitiesSectionProps) {
  const settings = getSettings();
  const filteredCrops = CROPS.filter(c => settings.enabledCrops.includes(c.commodityName));
  const month = new Date().getMonth() + 1;

  const opportunities: Array<{
    crop: string;
    mandi: string;
    price: number;
    pct: number;
    level: string;
    sellSignal: string;
    sellReason: string;
  }> = [];

  for (const crop of filteredCrops) {
    for (const mandi of MANDIS) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const level = computeAlertLevel(latest.modal_price, avg90);
      if (level === 'RED' || level === 'GREEN' || level === 'YELLOW') {
        const season = getSeasonalContext(crop.commodityName, month);
        const signal = getSellSignal(latest.modal_price, avg90, level, season.season);
        opportunities.push({
          crop: crop.name,
          mandi,
          price: latest.modal_price,
          pct: computePctChange(latest.modal_price, avg90),
          level,
          sellSignal: signal.signal,
          sellReason: signal.reason,
        });
      }
    }
  }

  const hasEnoughData = distinctDays >= 30;

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-opportunities">🎯 Market Opportunities & Alerts</div>
      <div className="p-3 space-y-2">
        {!hasEnoughData && prices.length > 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            Trend analysis needs 30 days of data. Currently tracking {distinctDays} day{distinctDays !== 1 ? 's' : ''}.
          </p>
        ) : opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            All crop prices within normal historical range this week.
          </p>
        ) : (
          opportunities.map((opp, i) => {
            const bgCls = opp.level === 'RED' ? 'alert-danger' : opp.level === 'GREEN' ? 'alert-info' : 'alert-warning';
            const signalColor = opp.sellSignal === 'SELL NOW' ? 'text-success' : opp.sellSignal === 'FORCED SELL' ? 'text-danger' : 'text-warning';
            return (
              <div key={i} className={bgCls}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold">{opp.crop}</span>
                    <span className="text-xs text-muted-foreground ml-1">@ {opp.mandi}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">₹{opp.price.toLocaleString()}</div>
                    <div className={`text-xs ${opp.pct >= 0 ? 'text-success' : 'text-danger'}`}>
                      {opp.pct >= 0 ? '+' : ''}{opp.pct.toFixed(1)}% vs 90d avg
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs">{opp.sellReason}</p>
                  <span className={`text-xs font-bold ${signalColor}`}>📊 {opp.sellSignal}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
