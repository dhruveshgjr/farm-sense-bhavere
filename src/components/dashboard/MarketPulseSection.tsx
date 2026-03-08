import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, type PriceRecord } from '@/hooks/usePrices';

interface MarketPulseSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
  onFetchPrices: () => void;
  isFetching: boolean;
  lastUpdated?: string;
}

export function MarketPulseSection({ prices, isLoading, onFetchPrices, isFetching, lastUpdated }: MarketPulseSectionProps) {
  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-market">💰 Market Pulse — Current Mandi Prices</div>

      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1 text-xs font-semibold">Crop</th>
                {MANDIS.map(m => (
                  <th key={m} className="text-right py-2 px-1 text-xs font-semibold">{m} (₹/qtl)</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CROPS.map(crop => (
                <tr key={crop.name} className="border-b border-border/50">
                  <td className="py-2 px-1">
                    <div className="font-medium text-sm">{crop.name}</div>
                    <div className="text-[10px] text-muted-foreground">{crop.localName}</div>
                  </td>
                  {MANDIS.map(mandi => {
                    const price = getLatestPrice(prices, crop.commodityName, mandi);
                    return (
                      <td key={mandi} className="text-right py-2 px-1">
                        {isLoading ? (
                          <Skeleton className="h-5 w-16 ml-auto" />
                        ) : price ? (
                          <div>
                            <div className="font-bold">₹{price.modal_price.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {price.min_price && price.max_price
                                ? `₹${price.min_price}–${price.max_price}`
                                : '—'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No data</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <Button size="sm" onClick={onFetchPrices} disabled={isFetching} className="text-xs">
            {isFetching ? 'Fetching...' : 'Fetch Latest Prices'}
          </Button>
          <span className="text-[10px] text-muted-foreground">
            {lastUpdated ? `Last sync: ${new Date(lastUpdated).toLocaleString('en-IN')}` : 'Prices from data.gov.in / Agmarknet'}
          </span>
        </div>
      </div>
    </div>
  );
}
