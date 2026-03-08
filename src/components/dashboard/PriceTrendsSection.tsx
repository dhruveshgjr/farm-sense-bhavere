import { CROPS } from '@/lib/farmConfig';
import { computeAlertLevel, computePctChange } from '@/lib/trendEngine';
import { getAvgPrice, type PriceRecord, getLatestPrice } from '@/hooks/usePrices';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceTrendsSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
}

function AlertBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    RED: 'bg-danger text-primary-foreground',
    YELLOW: 'bg-warning text-foreground',
    GREEN: 'bg-success text-primary-foreground',
    NORMAL: 'bg-muted text-muted-foreground',
    NO_DATA: 'bg-muted text-muted-foreground',
  };
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${styles[level] || styles.NORMAL}`}>
      {level}
    </span>
  );
}

export function PriceTrendsSection({ prices, isLoading }: PriceTrendsSectionProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-trends">📈 Price Trend Analysis</div>
        <div className="p-4 grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-trends">📈 Price Trend Analysis</div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {CROPS.map(crop => {
          const latest = getLatestPrice(prices, crop.commodityName, 'Nashik') ||
                         getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
          const avg30 = getAvgPrice(prices, crop.commodityName, 30);
          const avg90 = getAvgPrice(prices, crop.commodityName, 90);
          const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
          const pctChange = latest && avg30 ? computePctChange(latest.modal_price, avg30) : 0;

          const cropPrices = prices
            .filter(p => p.commodity === crop.commodityName)
            .sort((a, b) => a.price_date.localeCompare(b.price_date))
            .slice(-30)
            .map(p => ({ date: p.price_date, price: p.modal_price }));

          return (
            <div key={crop.name} className="border border-border rounded-lg p-2">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <span className="text-xs font-semibold">{crop.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{crop.localName}</span>
                </div>
                <AlertBadge level={alertLevel} />
              </div>

              {latest ? (
                <div className="text-xs">
                  <span className="font-bold">₹{latest.modal_price.toLocaleString()}</span>
                  <span className={`ml-1 ${pctChange >= 0 ? 'text-success' : 'text-danger'}`}>
                    {pctChange >= 0 ? '↑' : '↓'}{Math.abs(pctChange).toFixed(1)}%
                  </span>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No price data</div>
              )}

              {cropPrices.length > 1 && (
                <div className="h-10 mt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={cropPrices}>
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke={crop.color}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
