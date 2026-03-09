import { memo, Fragment } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, getAvgPrice, isStalePrice, type PriceRecord } from '@/hooks/usePrices';
import { getSeasonalContext, getSellSignal, computeAlertLevel } from '@/lib/trendEngine';
import { formatLastUpdated } from '@/lib/timeFormat';
import { ManualPriceEntry } from './ManualPriceEntry';
import { getSettings } from '@/lib/settingsStore';
import { getSignalText } from '@/lib/i18n';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';

interface MarketPulseSectionProps {
  prices: PriceRecord[];
  isLoading: boolean;
  onFetchPrices: () => void;
  isFetching: boolean;
  lastUpdated?: string;
}

function SellSignalBadge({ prices, commodity }: { prices: PriceRecord[]; commodity: string }) {
  const latest = getLatestPrice(prices, commodity, 'Nashik') || getLatestPrice(prices, commodity, 'Lasalgaon');
  const avg90 = getAvgPrice(prices, commodity, 90);
  const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
  const month = new Date().getMonth() + 1;
  const season = getSeasonalContext(commodity, month);
  const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);

  const colorMap: Record<string, string> = {
    green: 'bg-success/20 text-success',
    blue: 'bg-info/20 text-info',
    yellow: 'bg-warning/20 text-foreground',
    red: 'bg-destructive/20 text-destructive',
    grey: 'bg-muted text-muted-foreground',
  };

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${colorMap[signal.color]}`}>
        {getSignalText(signal.signal)}
      </span>
      {avg90 && (
        <span className="text-[9px] text-muted-foreground">90d: ₹{Math.round(avg90).toLocaleString()}</span>
      )}
    </div>
  );
}

function SignalReasonRow({ prices, commodity }: { prices: PriceRecord[]; commodity: string }) {
  const latest = getLatestPrice(prices, commodity, 'Nashik') || getLatestPrice(prices, commodity, 'Lasalgaon');
  const avg90 = getAvgPrice(prices, commodity, 90);
  const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
  const month = new Date().getMonth() + 1;
  const season = getSeasonalContext(commodity, month);
  const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);

  if (!signal.reason || signal.signal === 'NO DATA') return null;

  return (
    <tr className="border-b border-border/30">
      <td colSpan={MANDIS.length + 2} className="py-1 px-2">
        <span className="text-[10px] italic text-muted-foreground">↳ {signal.reason}</span>
      </td>
    </tr>
  );
}

function DataQualityBadge({ commodity, mandi, prices }: { commodity: string; mandi: string; prices: PriceRecord[] }) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recent = prices.filter(p => p.commodity === commodity && p.mandi === mandi && new Date(p.price_date) >= sevenDaysAgo);
  if (recent.length === 0 && prices.some(p => p.commodity === commodity && p.mandi === mandi)) {
    return <span className="text-[9px] text-warning ml-1">⚠️ No recent data</span>;
  }
  return null;
}

export const MarketPulseSection = memo(function MarketPulseSection({ prices, isLoading, onFetchPrices, isFetching, lastUpdated }: MarketPulseSectionProps) {
  const settings = getSettings();
  const filteredCrops = CROPS.filter(c => settings.enabledCrops.includes(c.commodityName));
  const filteredMandis = MANDIS.filter(m => settings.enabledMandis.includes(m));

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-market">💰 Market Pulse — Current Mandi Prices</div>
        <div className="p-3">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-1"><Skeleton className="h-3 w-12" /></th>
                {filteredMandis.map(m => <th key={m} className="text-right py-2 px-1"><Skeleton className="h-3 w-16 ml-auto" /></th>)}
                <th className="text-center py-2 px-1"><Skeleton className="h-3 w-12 mx-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 px-1"><Skeleton className="h-4 w-20" /><Skeleton className="h-2 w-12 mt-1" /></td>
                  {filteredMandis.map((_, j) => <td key={j} className="text-right py-2 px-1"><Skeleton className="h-5 w-16 ml-auto" /></td>)}
                  <td className="text-center py-2 px-1"><Skeleton className="h-4 w-16 mx-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Empty state - no price data
  if (prices.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-market">💰 Market Pulse — Current Mandi Prices</div>
        <div className="p-6 text-center">
          <div className="text-3xl mb-3">📥</div>
          <p className="text-sm text-muted-foreground mb-4">
            No price data yet. Go to Import Data to add your first mandi prices, then watch the magic happen!
          </p>
          <Link to="/import">
            <Button size="sm" className="text-xs">
              Import Price Data
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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
                <th className="text-center py-2 px-1 text-xs font-semibold">Signal</th>
              </tr>
            </thead>
            <tbody>
              {filteredCrops.map(crop => (
                <>
                  <tr key={crop.name} className="border-b border-border/50">
                    <td className="py-2 px-1">
                      <div className="font-medium text-sm">{crop.name}</div>
                      <div className="text-[10px] text-muted-foreground">{crop.localName}</div>
                    </td>
                    {filteredMandis.map(mandi => {
                      const price = getLatestPrice(prices, crop.commodityName, mandi);
                      const stale = price ? isStalePrice(price) : false;
                      return (
                        <td key={mandi} className="text-right py-2 px-1">
                          {price ? (
                            <div>
                              <div className="font-bold flex items-center justify-end gap-1">
                                ₹{price.modal_price.toLocaleString()}
                                {stale && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[10px] cursor-help">ℹ️</span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Price from {formatLastUpdated(price.fetched_at)} — may not reflect today's market</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                              <div className="text-[10px] text-muted-foreground hidden min-[400px]:block">
                                {price.min_price && price.max_price ? `₹${price.min_price}–${price.max_price}` : '—'}
                              </div>
                              {price.arrivals_qtl && (
                                <div className="text-[9px] text-muted-foreground">📦 {price.arrivals_qtl}qtl</div>
                              )}
                              <DataQualityBadge commodity={crop.commodityName} mandi={mandi} prices={prices} />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">No data</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="text-center py-2 px-1">
                      <SellSignalBadge prices={prices} commodity={crop.commodityName} />
                    </td>
                  </tr>
                  <SignalReasonRow key={`${crop.name}-reason`} prices={prices} commodity={crop.commodityName} />
                </>
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
});