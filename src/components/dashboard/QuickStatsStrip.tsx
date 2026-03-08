import { CROPS } from '@/lib/farmConfig';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';
import { computePctChange, getSeasonalContext } from '@/lib/trendEngine';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import type { WeatherDay } from '@/hooks/useWeather';

interface QuickStatsStripProps {
  prices: PriceRecord[];
  weather?: WeatherDay[];
}

const CROP_CALENDAR: Record<string, { harvest: number[] }> = {
  'Banana': { harvest: [4, 5] },
  'Tomato': { harvest: [1, 2, 3, 9, 10] },
  'Bitter Gourd': { harvest: [4, 5, 6, 8, 9] },
  'Papaya': { harvest: [3, 4, 5] },
  'Onion': { harvest: [2, 3, 4] },
};

export function QuickStatsStrip({ prices, weather }: QuickStatsStripProps) {
  const month = new Date().getMonth() + 1;

  // Weather stat
  let weatherText = '—';
  if (weather && weather.length >= 3) {
    const weekData = weather.slice(0, 7);
    const rainyDays = weekData.filter(d => d.rain_mm > 1).length;
    const maxTemp = Math.max(...weekData.map(d => d.temp_max));
    weatherText = `${maxTemp}°C max — ${rainyDays} rainy days`;
  }

  // Best price crop
  let bestPriceText = '—';
  let bestPct = -Infinity;
  for (const crop of CROPS) {
    const latest = getLatestPrice(prices, crop.commodityName, 'Nashik') || getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);
    if (latest && avg90) {
      const pct = computePctChange(latest.modal_price, avg90);
      if (pct > bestPct) {
        bestPct = pct;
        bestPriceText = `${crop.name} ▲${pct.toFixed(0)}%`;
      }
    }
  }
  if (bestPct <= 0) bestPriceText = 'All near average';

  // Alert count
  let alertCount = 0;
  if (weather) {
    const allAlerts = generateAllAdvisories(weather);
    const sorted = getPrioritySummary(allAlerts);
    alertCount = sorted.filter(a => a.level === 'DANGER' || a.level === 'WARNING').length;
  }

  // Calendar context
  let calText = '—';
  for (const crop of CROPS) {
    if (CROP_CALENDAR[crop.commodityName]?.harvest.includes(month)) {
      calText = `${crop.name} harvest season`;
      break;
    }
  }
  const season = CROPS.find(c => getSeasonalContext(c.commodityName, month).season === 'HIGH');
  if (calText === '—' && season) calText = `${season.name} high season`;

  const pills = [
    { emoji: '🌡️', text: weatherText, anchor: '#weather' },
    { emoji: '💰', text: `Best: ${bestPriceText}`, anchor: '#market' },
    { emoji: '⚠️', text: `${alertCount} active alerts`, anchor: '#advisory' },
    { emoji: '📅', text: calText, anchor: '#calendar' },
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
