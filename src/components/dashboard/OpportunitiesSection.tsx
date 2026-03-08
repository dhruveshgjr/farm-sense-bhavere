import { CROPS, MANDIS } from '@/lib/farmConfig';
import { computeAlertLevel, computePctChange } from '@/lib/trendEngine';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';

interface OpportunitiesSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
}

export function OpportunitiesSection({ prices, isLoading }: OpportunitiesSectionProps) {
  const opportunities: Array<{
    crop: string;
    mandi: string;
    price: number;
    pct: number;
    level: string;
  }> = [];

  for (const crop of CROPS) {
    for (const mandi of MANDIS) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const level = computeAlertLevel(latest.modal_price, avg90);
      if (level === 'RED' || level === 'GREEN' || level === 'YELLOW') {
        opportunities.push({
          crop: crop.name,
          mandi,
          price: latest.modal_price,
          pct: computePctChange(latest.modal_price, avg90),
          level,
        });
      }
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-opportunities">🎯 Market Opportunities & Alerts</div>
      <div className="p-3 space-y-2">
        {opportunities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">
            All crop prices within normal historical range this week.
          </p>
        ) : (
          opportunities.map((opp, i) => {
            const bgCls = opp.level === 'RED' ? 'alert-danger' : opp.level === 'GREEN' ? 'alert-info' : 'alert-warning';
            const action = opp.level === 'RED'
              ? `${opp.crop} prices have crashed. Consider holding stock if possible.`
              : opp.level === 'GREEN'
              ? `${opp.crop} prices are spiking! Good time to sell at ${opp.mandi}.`
              : `${opp.crop} prices are softening. Monitor closely before selling.`;

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
                <p className="text-xs mt-1">{action}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
