import { useState } from 'react';
import { X } from 'lucide-react';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { computeAlertLevel, computePctChange } from '@/lib/trendEngine';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';

interface PriceAlertBannerProps {
  prices: PriceRecord[];
}

export function PriceAlertBanner({ prices }: PriceAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const alerts: Array<{ key: string; level: 'RED' | 'GREEN'; crop: string; mandi: string; price: number; pct: number }> = [];

  for (const crop of CROPS) {
    for (const mandi of MANDIS) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const level = computeAlertLevel(latest.modal_price, avg90);
      if (level === 'RED' || level === 'GREEN') {
        const key = `${crop.commodityName}-${mandi}-${level}`;
        if (!dismissed.has(key)) {
          alerts.push({
            key,
            level,
            crop: crop.commodityName,
            mandi,
            price: latest.modal_price,
            pct: computePctChange(latest.modal_price, avg90),
          });
        }
      }
    }
  }

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map(a => (
        <div
          key={a.key}
          className={`rounded-lg px-3 py-2 flex items-start justify-between gap-2 text-sm ${
            a.level === 'RED'
              ? 'bg-danger text-primary-foreground'
              : 'bg-success text-primary-foreground'
          }`}
        >
          <span>
            {a.level === 'RED'
              ? `🔴 PRICE CRASH: ${a.crop} at ${a.mandi} is ₹${a.price.toLocaleString()}/qtl — ${Math.abs(a.pct).toFixed(0)}% below 90-day average. Consider holding stock or delaying planting.`
              : `💰 PRICE SPIKE: ${a.crop} at ${a.mandi} is ₹${a.price.toLocaleString()}/qtl — ${a.pct.toFixed(0)}% above 90-day average. Rare opportunity — sell mature stock now.`}
          </span>
          <button
            onClick={() => setDismissed(prev => new Set(prev).add(a.key))}
            className="shrink-0 mt-0.5 opacity-80 hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
