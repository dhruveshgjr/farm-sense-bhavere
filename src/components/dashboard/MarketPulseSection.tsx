import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, type PriceRecord } from '@/hooks/usePrices';
import { getSeasonalContext } from '@/lib/trendEngine';
import { formatLastUpdated } from '@/lib/timeFormat';
import { ManualPriceEntry } from './ManualPriceEntry';
import { getSettings } from '@/lib/settingsStore';

interface MarketPulseSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
  onFetchPrices: () => void;
  isFetching: boolean;
  lastUpdated?: string;
}

function SeasonBadge({ commodity }: { commodity: string }) {
  const month = new Date().getMonth() + 1;
  const ctx = getSeasonalContext(commodity, month);
  const cls = ctx.season === 'HIGH'
    ? 'bg-success/20 text-success'
    : ctx.season === 'LOW'
    ? 'bg-danger/20 text-danger'
    : 'bg-muted text-muted-foreground';
  return <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{ctx.season}</span>;
}

export function MarketPulseSection({ prices, isLoading, onFetchPrices, isFetching, lastUpdated }: MarketPulseSectionProps) {
  const settings = getSettings();
  const filteredCrops = CROPS.filter(c => settings.enabledCrops.includes(c.commodityName));
  const filteredMandis = MANDIS.filter(m => settings.enabledMandis.includes(m));

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-market">💰 Market Pulse — Current Mandi Prices</div>

      <div className="p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1 text-xs font-semibold">Crop</th>
                {filteredMandis.map(m => (
                  <th key={m} className="text-right py-2 px-1 text-xs font-semibold">{m} (₹/qtl)</th>
                ))}
                <th className="text-center py-2 px-1 text-xs font-semibold">Season</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrops.map(crop => (
                <tr key={crop.name} className="border-b border-border/50">
                  <td className="py-2 px-1">
                    <div className="font-medium text-sm">{crop.name}</div>
                    <div className="text-[10px] text-muted-foreground">{crop.localName}</div>
                  </td>
                  {filteredMandis.map(mandi => {
                    const price = getLatestPrice(prices, crop.commodityName, mandi);
                    return (
                      <td key={mandi} className="text-right py-2 px-1">
                        {isLoading ? (
                          <Skeleton className="h-5 w-16 ml-auto" />
                        ) : price ? (
                          <div>
                            <div className="font-bold">₹{price.modal_price.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground hidden min-[400px]:block">
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
                  <td className="text-center py-2 px-1">
                    <SeasonBadge commodity={crop.commodityName} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <Button size="sm" onClick={onFetchPrices} disabled={isFetching} className="text-xs">
              {isFetching ? 'Fetching...' : 'Fetch Latest Prices'}
            </Button>
            <ManualPriceEntry />
          </div>
          <span className="text-[10px] text-muted-foreground">
            {lastUpdated ? `Last sync: ${formatLastUpdated(lastUpdated)}` : 'Prices from data.gov.in / Agmarknet'}
          </span>
        </div>
      </div>
    </div>
  );
}
