import { getSettings } from '@/lib/settingsStore';

export type PriceAlertLevel = 'RED' | 'YELLOW' | 'GREEN' | 'NORMAL' | 'NO_DATA';

export function computeAlertLevel(currentPrice: number | null, avg90d: number | null): PriceAlertLevel {
  if (!avg90d || !currentPrice || currentPrice <= 0) return 'NO_DATA';
  const settings = getSettings();
  const pct = ((currentPrice - avg90d) / avg90d) * 100;
  if (pct <= -settings.crashThreshold) return 'RED';
  if (pct <= -(settings.crashThreshold / 2)) return 'YELLOW';
  if (pct >= settings.spikeThreshold) return 'GREEN';
  return 'NORMAL';
}

export function computePctChange(currentPrice: number, avg: number): number {
  if (!avg) return 0;
  return ((currentPrice - avg) / avg) * 100;
}

const SEASONAL_MONTHS: Record<string, { high: number[]; low: number[] }> = {
  'Tomato': { high: [3, 4, 5, 7, 8], low: [11, 12, 1] },
  'Onion': { high: [7, 8, 9, 10], low: [2, 3, 4] },
  'Banana': { high: [1, 2, 3, 4], low: [8, 9, 10] },
  'Papaya': { high: [3, 4, 5, 6], low: [10, 11, 12] },
  'Bitter Gourd': { high: [11, 12, 1, 2], low: [8, 9] },
};

export function getSeasonalContext(commodity: string, currentMonth: number): { season: 'HIGH' | 'LOW' | 'NEUTRAL'; note: string } {
  const data = SEASONAL_MONTHS[commodity];
  if (!data) return { season: 'NEUTRAL', note: 'No seasonal data available.' };
  if (data.high.includes(currentMonth)) return { season: 'HIGH', note: `${commodity} is in its high-price season.` };
  if (data.low.includes(currentMonth)) return { season: 'LOW', note: `${commodity} is in its low-price season.` };
  return { season: 'NEUTRAL', note: `${commodity} is in a neutral price period.` };
}

export type SellSignal = {
  signal: 'SELL NOW' | 'HOLD' | 'WAIT' | 'FORCED SELL' | 'NO DATA';
  color: 'green' | 'blue' | 'yellow' | 'red' | 'grey';
  reason: string;
};

export function getSellSignal(
  currentPrice: number | null,
  avg90d: number | null,
  alertLevel: PriceAlertLevel,
  seasonContext: 'HIGH' | 'LOW' | 'NEUTRAL'
): SellSignal {
  if (!currentPrice || currentPrice <= 0) return { signal: 'NO DATA', color: 'grey', reason: 'No price data available' };
  if (!avg90d) return { signal: 'NO DATA', color: 'grey', reason: 'Insufficient price history' };

  if (alertLevel === 'GREEN' && seasonContext === 'HIGH')
    return { signal: 'SELL NOW', color: 'green', reason: 'Price spike + peak season' };
  if (alertLevel === 'GREEN' && seasonContext !== 'LOW')
    return { signal: 'SELL NOW', color: 'green', reason: 'Price above average' };
  if (alertLevel === 'RED' && seasonContext === 'LOW')
    return { signal: 'FORCED SELL', color: 'red', reason: 'Price crash + off season' };
  if (alertLevel === 'RED')
    return { signal: 'WAIT', color: 'yellow', reason: 'Price dip — should recover' };
  if (alertLevel === 'YELLOW')
    return { signal: 'WAIT', color: 'yellow', reason: 'Price softening' };
  if (seasonContext === 'HIGH')
    return { signal: 'SELL NOW', color: 'green', reason: 'Peak season pricing' };
  return { signal: 'HOLD', color: 'blue', reason: 'Price within normal range' };
}

export function computeVolatility(prices: number[]): { score: number; label: 'Low' | 'Medium' | 'High' } {
  if (prices.length < 2) return { score: 0, label: 'Low' };
  const mean = prices.reduce((s, p) => s + p, 0) / prices.length;
  if (mean === 0) return { score: 0, label: 'Low' };
  const variance = prices.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / prices.length;
  const stddev = Math.sqrt(variance);
  const score = (stddev / mean) * 100;
  const label = score < 10 ? 'Low' : score < 25 ? 'Medium' : 'High';
  return { score, label };
}

export function computeArrivalTrend(arrivals: { date: string; qty: number }[]): { trend: 'INCREASING' | 'DECREASING' | 'STABLE'; weekOnWeekPct: number } {
  if (arrivals.length < 7) return { trend: 'STABLE', weekOnWeekPct: 0 };
  const sorted = [...arrivals].sort((a, b) => b.date.localeCompare(a.date));
  const thisWeek = sorted.slice(0, 7).reduce((s, a) => s + a.qty, 0) / Math.min(7, sorted.length);
  const lastWeek = sorted.slice(7, 14).reduce((s, a) => s + a.qty, 0) / Math.min(7, sorted.slice(7, 14).length || 1);
  if (lastWeek === 0) return { trend: 'STABLE', weekOnWeekPct: 0 };
  const pct = ((thisWeek - lastWeek) / lastWeek) * 100;
  const trend = pct > 15 ? 'INCREASING' : pct < -15 ? 'DECREASING' : 'STABLE';
  return { trend, weekOnWeekPct: pct };
}
