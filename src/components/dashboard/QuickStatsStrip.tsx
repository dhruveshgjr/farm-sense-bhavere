import { CROPS } from '@/lib/farmConfig';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';
import { computePctChange } from '@/lib/trendEngine';
import { generateAllAdvisories, getPrioritySummary, computeSprayWindows } from '@/lib/advisoryEngine';
import type { WeatherDay } from '@/hooks/useWeather';

interface QuickStatsStripProps {
  prices: PriceRecord[];
  weather?: WeatherDay[];
}


export function QuickStatsStrip({ prices, weather }: QuickStatsStripProps) {
  const month = new Date().getMonth() + 1;

  // Total rain next 10d
  const weekData = weather ? weather.slice(0, 10) : [];
  const totalRain = weekData.reduce((sum, d) => sum + (d.rain_mm || 0), 0);

  // Next spray day
  const sprayWindows = weather ? computeSprayWindows(weather) : [];
  const nextSpray = sprayWindows.find(w => w.suitable);
  const nextSprayDay = nextSpray ? new Date(nextSpray.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'None';

  // Best sell
  let bestSellText = '—';
  let bestPct = -Infinity;
  for (const crop of CROPS) {
    const latest = getLatestPrice(prices, crop.commodityName, 'Nashik') || getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);
    if (latest && avg90) {
      const pct = computePctChange(latest.modal_price, avg90);
      if (pct > bestPct) {
        bestPct = pct;
        bestSellText = `${crop.commodityName} ₹${latest.modal_price}`;
      }
    }
  }
  if (bestPct <= 0 && bestSellText === '—') bestSellText = 'None';

  // Alert count
  let alertCount = 0;
  if (weather) {
    const allAlerts = generateAllAdvisories(weather);
    const sorted = getPrioritySummary(allAlerts);
    alertCount = sorted.filter(a => a.level === 'DANGER' || a.level === 'WARNING').length;
  }

  const pills = [
    { emoji: '🌧', text: `Total rain 10d: ${totalRain.toFixed(0)}mm`, anchor: '#weather' },
    { emoji: '🧪', text: `Next spray: ${nextSprayDay}`, anchor: '#calendar' },
    { emoji: '💰', text: `Best sell: ${bestSellText}`, anchor: '#market' },
    { emoji: '⚠️', text: `Active alerts: ${alertCount}`, anchor: '#advisory' },
  ];

  return (
    <div className="overflow-x-auto -mx-3 px-3">
      <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
        {pills.map((pill, i) => (
          <a
            key={i}
            href={pill.anchor}
            className="bg-primary text-primary-foreground rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap flex items-center gap-1.5 hover:opacity-90 transition-opacity"
          >
            <span>{pill.emoji}</span>
            <span>{pill.text}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
