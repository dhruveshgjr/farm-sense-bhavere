import { memo } from 'react';
import { CROPS } from '@/lib/farmConfig';
import { getLatestPrice, type PriceRecord } from '@/hooks/usePrices';
import { getCropName } from '@/lib/i18n';

interface MandiComparisonProps {
  prices: PriceRecord[];
}

export const MandiComparison = memo(function MandiComparison({ prices }: MandiComparisonProps) {
  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };

  const comparisons = CROPS.map(crop => {
    const nashik = getLatestPrice(prices, crop.commodityName, 'Nashik');
    const lasalgaon = getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
    if (!nashik?.modal_price || !lasalgaon?.modal_price) return null;

    const maxPrice = Math.max(nashik.modal_price, lasalgaon.modal_price);
    const diff = ((lasalgaon.modal_price - nashik.modal_price) / nashik.modal_price) * 100;
    const better = Math.abs(diff) < 5 ? 'similar' : diff > 0 ? 'Lasalgaon' : 'Nashik';

    return {
      crop: crop.commodityName,
      emoji: CROP_EMOJI[crop.commodityName] || '🌾',
      nashikPrice: nashik.modal_price,
      lasalgaonPrice: lasalgaon.modal_price,
      maxPrice,
      diff,
      better,
    };
  }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[0]>[];

  if (comparisons.length === 0) return null;

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-market">🔄 Mandi Price Comparison — Where to Sell?</div>
      <div className="p-3 space-y-3">
        {comparisons.map((c: any) => {
          const nashikPct = (c.nashikPrice / c.maxPrice) * 100;
          const lasalgaonPct = (c.lasalgaonPrice / c.maxPrice) * 100;

          return (
            <div key={c.crop} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span>{c.emoji}</span>
                <span className="text-sm font-semibold">{getCropName(c.crop)}</span>
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-20 text-muted-foreground">Nashik</span>
                  <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.better === 'Nashik' ? 'bg-success' : 'bg-info/60'}`}
                      style={{ width: `${nashikPct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                      ₹{c.nashikPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-20 text-muted-foreground">Lasalgaon</span>
                  <div className="flex-1 bg-muted rounded-full h-4 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.better === 'Lasalgaon' ? 'bg-success' : 'bg-info/60'}`}
                      style={{ width: `${lasalgaonPct}%` }}
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium">
                      ₹{c.lasalgaonPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-medium">
                {c.better === 'similar'
                  ? '→ Prices similar at both mandis'
                  : c.better === 'Lasalgaon'
                  ? `→ Sell at Lasalgaon today (+${c.diff.toFixed(1)}%)`
                  : `→ Sell at Nashik today (${c.diff.toFixed(1)}%)`}
              </p>
            </div>
          );
        })}
        <p className="text-[9px] text-muted-foreground border-t border-border pt-2">
          📍 Lasalgaon: ~65km from Bhavere (NH60 via Shirpur road) — transport cost ≈ ₹150-200/quintal
        </p>
      </div>
    </div>
  );
});
