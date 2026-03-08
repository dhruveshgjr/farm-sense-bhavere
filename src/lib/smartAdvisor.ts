import type { ForecastDay, CropAlert } from '@/lib/advisoryEngine';
import type { PriceRecord } from '@/hooks/usePrices';
import { computeAlertLevel, computePctChange, getSeasonalContext, getSellSignal } from '@/lib/trendEngine';
import { getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { CROPS, MANDIS } from '@/lib/farmConfig';

export interface SmartAdvice {
  weather_risk: string;
  market_intelligence: string;
  top_3_actions: string;
  todays_priority: string;
  generated_at: string;
  source: 'smart-advisor';
}

// Crop planting/harvest calendar for seasonal actions
const CROP_CALENDAR: Record<string, { plant: number[]; harvest: number[] }> = {
  'Banana': { plant: [6, 7, 8], harvest: [1, 2, 3, 4] },
  'Tomato': { plant: [6, 7, 10, 11], harvest: [3, 4, 5, 12, 1] },
  'Bitter Gourd': { plant: [2, 3, 6, 7], harvest: [4, 5, 8, 9] },
  'Papaya': { plant: [2, 3, 9, 10], harvest: [3, 4, 5, 6] },
  'Onion': { plant: [10, 11, 12], harvest: [2, 3, 4] },
};

export function generateSmartAdvice(
  forecast: ForecastDay[],
  prices: PriceRecord[],
  alerts: CropAlert[],
  currentMonth: number
): SmartAdvice {
  return {
    weather_risk: buildWeatherRisk(forecast),
    market_intelligence: buildMarketIntel(prices, currentMonth),
    top_3_actions: buildTop3Actions(forecast, prices, alerts, currentMonth),
    todays_priority: buildTodaysPriority(prices, alerts, currentMonth),
    generated_at: new Date().toISOString(),
    source: 'smart-advisor',
  };
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function buildWeatherRisk(forecast: ForecastDay[]): string {
  if (!forecast || forecast.length === 0) return 'No weather data available. Fetch weather to enable risk analysis.';

  const totalRain = forecast.reduce((s, d) => s + (d.rain_mm || 0), 0);
  const maxWind = Math.max(...forecast.map(d => d.wind_kmh || 0));
  const maxTemp = Math.max(...forecast.map(d => d.temp_max || 0));
  const rainyDays = forecast.filter(d => (d.rain_mm || 0) > 5).length;

  let sentence1 = '';
  if (totalRain > 100) {
    sentence1 = `HIGH RISK: Heavy rainfall of ${Math.round(totalRain)}mm expected over next 10 days. Drainage and root-rot prevention is critical for all crops.`;
  } else if (maxWind > 40) {
    sentence1 = `HIGH RISK: Strong winds of ${Math.round(maxWind)}km/h expected. Banana and Papaya stems need immediate support.`;
  } else if (maxTemp > 40) {
    sentence1 = `MODERATE RISK: Heat stress with ${Math.round(maxTemp)}°C expected. Increase irrigation frequency for all crops.`;
  } else if (rainyDays > 5) {
    sentence1 = `MODERATE RISK: ${rainyDays} rainy days ahead — disease pressure will be high. Prepare fungicide sprays.`;
  } else {
    sentence1 = `LOW RISK: Weather conditions are favorable this week. Good window for spraying and field operations.`;
  }

  // Find most extreme event
  let sentence2 = '';
  const maxRainDay = forecast.reduce((max, d) => (d.rain_mm || 0) > (max.rain_mm || 0) ? d : max, forecast[0]);
  const maxWindDay = forecast.reduce((max, d) => (d.wind_kmh || 0) > (max.wind_kmh || 0) ? d : max, forecast[0]);
  const maxTempDay = forecast.reduce((max, d) => (d.temp_max || 0) > (max.temp_max || 0) ? d : max, forecast[0]);

  if ((maxRainDay.rain_mm || 0) > 20) {
    sentence2 = `Heaviest rain: ${Math.round(maxRainDay.rain_mm)}mm on ${fmtDate(maxRainDay.forecast_date)}.`;
  } else if ((maxWindDay.wind_kmh || 0) > 30) {
    sentence2 = `Strongest wind: ${Math.round(maxWindDay.wind_kmh)}km/h on ${fmtDate(maxWindDay.forecast_date)}.`;
  } else if ((maxTempDay.temp_max || 0) > 35) {
    sentence2 = `Hottest day: ${Math.round(maxTempDay.temp_max)}°C on ${fmtDate(maxTempDay.forecast_date)}.`;
  } else {
    sentence2 = `No extreme weather events in the forecast.`;
  }

  return `${sentence1} ${sentence2}`;
}

function buildMarketIntel(prices: PriceRecord[], currentMonth: number): string {
  if (!prices || prices.length === 0) {
    return 'No market data available yet. Fetch prices from Settings to activate market intelligence.';
  }

  const cropStats: { commodity: string; mandi: string; price: number; pct: number; alertLevel: string; signal: string }[] = [];

  for (const crop of CROPS) {
    for (const mandi of MANDIS) {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) continue;
      const pct = computePctChange(latest.modal_price, avg90);
      const alertLevel = computeAlertLevel(latest.modal_price, avg90);
      const season = getSeasonalContext(crop.commodityName, currentMonth);
      const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);
      cropStats.push({ commodity: crop.commodityName, mandi, price: latest.modal_price, pct, alertLevel, signal: signal.signal });
    }
  }

  if (cropStats.length === 0) return 'Price data exists but no averages available yet. Need 7+ days of history for trend analysis.';

  // Best sell opportunity
  const best = [...cropStats].sort((a, b) => b.pct - a.pct)[0];
  const sentence1 = `Best sell opportunity: ${best.commodity} at ₹${Math.round(best.price)}/qtl in ${best.mandi} (${best.pct > 0 ? '+' : ''}${best.pct.toFixed(1)}% above 90-day average).`;

  // Worst performing
  const worst = [...cropStats].sort((a, b) => a.pct - b.pct)[0];
  const sentence2 = worst.pct < -5
    ? `Avoid selling: ${worst.commodity} — prices are ${Math.abs(worst.pct).toFixed(1)}% below average, likely to recover.`
    : `All crops holding above average levels.`;

  // Action recommendation
  const sellNow = cropStats.filter(c => c.signal === 'SELL NOW');
  const sentence3 = sellNow.length > 0
    ? `Immediate action recommended for ${sellNow.map(c => c.commodity).filter((v, i, a) => a.indexOf(v) === i).join(', ')}.`
    : `All prices within normal range — hold for better rates.`;

  return `${sentence1} ${sentence2} ${sentence3}`;
}

function buildTop3Actions(forecast: ForecastDay[], prices: PriceRecord[], alerts: CropAlert[], currentMonth: number): string {
  const actions: string[] = [];

  // Action 1: Highest-priority DANGER alert
  const dangerAlert = alerts.find(a => a.level === 'DANGER');
  if (dangerAlert) {
    actions.push(`1. ${dangerAlert.action} — ${dangerAlert.crop} (${dangerAlert.title}${dangerAlert.day_date ? ', ' + fmtDate(dangerAlert.day_date) : ''})`);
  }

  // Action 2: Best market action
  if (prices && prices.length > 0) {
    let bestSell: { commodity: string; mandi: string; price: number; pct: number } | null = null;
    for (const crop of CROPS) {
      for (const mandi of MANDIS) {
        const latest = getLatestPrice(prices, crop.commodityName, mandi);
        const avg90 = getAvgPrice(prices, crop.commodityName, 90);
        if (!latest || !avg90) continue;
        const pct = computePctChange(latest.modal_price, avg90);
        const alertLevel = computeAlertLevel(latest.modal_price, avg90);
        const season = getSeasonalContext(crop.commodityName, currentMonth);
        const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);
        if (signal.signal === 'SELL NOW' && (!bestSell || pct > bestSell.pct)) {
          bestSell = { commodity: crop.commodityName, mandi, price: latest.modal_price, pct };
        }
      }
    }
    if (bestSell) {
      actions.push(`${actions.length + 1}. Sell ${bestSell.commodity} at ${bestSell.mandi} today — ₹${Math.round(bestSell.price)}/qtl is ${bestSell.pct.toFixed(1)}% above average.`);
    } else {
      const warningAlert = alerts.find(a => a.level === 'WARNING' && a !== dangerAlert);
      if (warningAlert) {
        actions.push(`${actions.length + 1}. ${warningAlert.action} — ${warningAlert.crop}`);
      }
    }
  }

  // Action 3: Seasonal or weather-based
  if (actions.length < 3) {
    let seasonalAction = '';
    for (const crop of CROPS) {
      const cal = CROP_CALENDAR[crop.commodityName];
      if (!cal) continue;
      if (cal.plant.includes(currentMonth)) {
        seasonalAction = `${actions.length + 1}. Begin ${crop.commodityName} nursery preparation — planting window opens this month.`;
        break;
      }
      if (cal.harvest.includes(currentMonth)) {
        seasonalAction = `${actions.length + 1}. Plan ${crop.commodityName} harvest logistics — peak season pricing active.`;
        break;
      }
    }
    if (seasonalAction) {
      actions.push(seasonalAction);
    } else {
      actions.push(`${actions.length + 1}. Conduct routine field inspection and check irrigation systems.`);
    }
  }

  // Fill remaining
  while (actions.length < 3) {
    const remainingWarnings = alerts.filter(a => a.level === 'WARNING');
    const unused = remainingWarnings.find(a => !actions.some(act => act.includes(a.crop)));
    if (unused) {
      actions.push(`${actions.length + 1}. ${unused.action} — ${unused.crop}`);
    } else {
      actions.push(`${actions.length + 1}. Monitor weather forecasts and plan field activities accordingly.`);
    }
  }

  // If no alerts AND no price data
  if (alerts.length === 0 && (!prices || prices.length === 0)) {
    return '1. Configure data sources in Settings.\n2. Click \'Load 90-Day History\' to bootstrap price data.\n3. Check back tomorrow for your first full intelligence report.';
  }

  return actions.slice(0, 3).join('\n');
}

function buildTodaysPriority(prices: PriceRecord[], alerts: CropAlert[], currentMonth: number): string {
  // DANGER alert first
  const danger = alerts.find(a => a.level === 'DANGER');
  if (danger) return danger.action;

  // SELL NOW signal
  if (prices && prices.length > 0) {
    for (const crop of CROPS) {
      for (const mandi of MANDIS) {
        const latest = getLatestPrice(prices, crop.commodityName, mandi);
        const avg90 = getAvgPrice(prices, crop.commodityName, 90);
        if (!latest || !avg90) continue;
        const pct = computePctChange(latest.modal_price, avg90);
        const alertLevel = computeAlertLevel(latest.modal_price, avg90);
        const season = getSeasonalContext(crop.commodityName, currentMonth);
        const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);
        if (signal.signal === 'SELL NOW') {
          return `Sell ${crop.commodityName} at ${mandi} — price is ${pct.toFixed(1)}% above average.`;
        }
      }
    }
  }

  // WARNING alert
  const warning = alerts.find(a => a.level === 'WARNING');
  if (warning) return warning.action;

  return 'All clear — good day for routine field inspection and irrigation check.';
}
