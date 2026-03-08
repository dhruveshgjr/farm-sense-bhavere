export type PriceAlertLevel = 'RED' | 'YELLOW' | 'GREEN' | 'NORMAL' | 'NO_DATA';

export function computeAlertLevel(currentPrice: number | null, avg90d: number | null): PriceAlertLevel {
  if (!avg90d || !currentPrice) return 'NO_DATA';
  const pct = ((currentPrice - avg90d) / avg90d) * 100;
  if (pct <= -30) return 'RED';
  if (pct <= -15) return 'YELLOW';
  if (pct >= 30) return 'GREEN';
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
