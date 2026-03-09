import type { ForecastDay, CropAlert, SprayWindow, DiseaseRisk } from './advisoryEngine';
import type { PriceRecord } from '@/hooks/usePrices';
import { getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { computePctChange, computeAlertLevel, getSeasonalContext, getSellSignal } from './trendEngine';
import { CROPS, getWeatherEmoji } from './farmConfig';

export interface FarmReport {
  text: string;
  generatedAt: string;
  sections: string[];
}

interface ReportConfidence {
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
}

function computeReportConfidence(prices: PriceRecord[], forecast: ForecastDay[]): ReportConfidence {
  const hasForecast = forecast && forecast.length >= 7;
  const priceCount = prices.length;
  const recentPrices = prices.filter(p => {
    const age = (Date.now() - new Date(p.price_date).getTime()) / 86400000;
    return age <= 3;
  }).length;

  if (hasForecast && recentPrices >= 5) return { level: 'HIGH', reason: 'Fresh weather + recent price data' };
  if (hasForecast && priceCount > 0) return { level: 'MEDIUM', reason: 'Weather is fresh, prices may be stale' };
  return { level: 'LOW', reason: 'Limited data — import fresh prices for better accuracy' };
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtDateFull(date: Date): string {
  return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function buildWeatherSection(forecast: ForecastDay[]): string {
  if (!forecast || forecast.length === 0) {
    return `☁️ *WEATHER OVERVIEW*\n━━━━━━━━━━━━━━━━━━━━━\n• No weather data available\n`;
  }

  const totalRain = forecast.reduce((sum, d) => sum + d.rain_mm, 0);
  const rainyDays = forecast.filter(d => d.rain_mm > 1).length;
  const minTemp = Math.min(...forecast.map(d => d.temp_min));
  const maxTemp = Math.max(...forecast.map(d => d.temp_max));
  const maxWind = Math.max(...forecast.map(d => d.wind_kmh));
  const maxWindDay = forecast.find(d => d.wind_kmh === maxWind);

  let riskLevel = 'LOW';
  let riskReason = 'Stable conditions expected';
  
  if (totalRain > 100 || rainyDays >= 5) {
    riskLevel = 'HIGH';
    riskReason = `Heavy rain expected (${totalRain.toFixed(0)}mm) — waterlogging risk for all crops`;
  } else if (totalRain > 50 || maxWind > 30) {
    riskLevel = 'MODERATE';
    riskReason = totalRain > 50 
      ? `Moderate rain (${totalRain.toFixed(0)}mm) — plan field operations around dry windows`
      : `Strong winds (${maxWind}km/h) — stake tall crops, avoid spraying`;
  }

  return `☁️ *WEATHER OVERVIEW (Next ${forecast.length} Days)*
━━━━━━━━━━━━━━━━━━━━━
• Total rainfall: ${totalRain.toFixed(0)}mm across ${rainyDays} rainy days
• Temperature: ${Math.round(minTemp)}°C to ${Math.round(maxTemp)}°C
• Max wind: ${Math.round(maxWind)}km/h on ${maxWindDay ? fmtDate(maxWindDay.forecast_date) : 'N/A'}
• Risk level: ${riskLevel}
• Reason: ${riskReason}`;
}

function buildSpraySection(sprayWindows: SprayWindow[]): string {
  if (!sprayWindows || sprayWindows.length === 0) {
    return `🧪 *SPRAY CALENDAR*\n━━━━━━━━━━━━━━━━━━━━━\n• No forecast data for spray planning\n`;
  }

  const suitable = sprayWindows.filter(w => w.suitable);
  const unsuitable = sprayWindows.filter(w => !w.suitable);

  let text = `🧪 *SPRAY CALENDAR*\n━━━━━━━━━━━━━━━━━━━━━\n`;

  if (suitable.length > 0) {
    const best = suitable[0];
    text += `✅ Best spray day: ${fmtDate(best.date)} — ${best.reason}\n`;
    if (suitable.length > 1) {
      const others = suitable.slice(1, 3).map(w => fmtDate(w.date)).join(', ');
      text += `✅ Also suitable: ${others}\n`;
    }
  } else {
    text += `⚠️ No suitable spray window in forecast\n`;
  }

  // Show top 2 unsuitable days
  unsuitable.slice(0, 2).forEach(w => {
    text += `❌ Avoid: ${fmtDate(w.date)} — ${w.reason}\n`;
  });

  return text.trim();
}

function buildDiseaseSection(diseaseRisks: DiseaseRisk[]): string {
  let text = `🦠 *DISEASE ALERTS*\n━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!diseaseRisks || diseaseRisks.length === 0) {
    text += `✅ No significant disease risks this week.\n`;
    return text;
  }

  diseaseRisks.forEach(risk => {
    text += `⚠️ *${risk.crop} — ${risk.disease}* (${risk.probability}% risk)
   Trigger: ${risk.trigger}
   Action: ${risk.prevention}
   Deadline: ${risk.treatmentWindow}
`;
  });

  return text.trim();
}

function buildMarketSection(prices: PriceRecord[], currentMonth: number): string {
  let text = `💰 *MARKET INTELLIGENCE*\n━━━━━━━━━━━━━━━━━━━━━\n`;

  if (!prices || prices.length === 0) {
    text += `• No price data available — import prices for market signals\n`;
    return text;
  }

  const CROP_EMOJI: Record<string, string> = {
    'Tomato': '🍅', 'Onion': '🧅', 'Banana': '🍌', 'Bitter Gourd': '🥒', 'Papaya': '🍈',
  };

  const sellAlerts: string[] = [];

  for (const crop of CROPS) {
    const mainMandi = crop.commodityName === 'Onion' ? 'Lasalgaon' : 'Nashik';
    const latest = getLatestPrice(prices, crop.commodityName, mainMandi);
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);

    if (!latest) continue;

    const pct = avg90 ? computePctChange(latest.modal_price, avg90) : 0;
    const alertLevel = computeAlertLevel(latest.modal_price, avg90);
    const season = getSeasonalContext(crop.commodityName, currentMonth);
    const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);

    const pctStr = avg90 ? (pct >= 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`) : 'N/A';
    
    let reason = '';
    if (signal.signal === 'SELL NOW') {
      reason = `Price spike + ${season.season === 'HIGH' ? 'peak season' : 'favorable market'}. Sell before prices normalize.`;
    } else if (signal.signal === 'FORCED SELL') {
      reason = `Prices crashing. Minimize losses by selling immediately.`;
    } else if (signal.signal === 'HOLD') {
      reason = `Price near average. Wait for better opportunity or seasonal peak.`;
    } else if (signal.signal === 'WAIT') {
      reason = `${season.season === 'LOW' ? 'Off-season' : 'Market'} prices below average. Hold if storage permits.`;
    } else {
      reason = signal.reason || 'Insufficient data for recommendation.';
    }

    const emoji = CROP_EMOJI[crop.commodityName] || '🌾';
    text += `${emoji} *${crop.commodityName}* — ₹${latest.modal_price.toLocaleString()}/qtl at ${mainMandi}
   vs 90-day avg: ${pctStr}
   Signal: ${signal.signal}
   Reason: ${reason}
`;

    if (signal.signal === 'SELL NOW' || signal.signal === 'FORCED SELL') {
      sellAlerts.push(`🔔 *SELL ALERT: ${crop.commodityName}* at ${mainMandi} — ₹${latest.modal_price.toLocaleString()}/qtl is ${pctStr} vs average.`);
    }
  }

  if (sellAlerts.length > 0) {
    text += '\n' + sellAlerts.join('\n');
  }

  return text.trim();
}

function buildActionsSection(
  alerts: CropAlert[],
  diseaseRisks: DiseaseRisk[],
  sprayWindows: SprayWindow[],
  prices: PriceRecord[],
  currentMonth: number
): string {
  const actions: { action: string; crop: string; why: string; priority: number }[] = [];

  // Priority 1: Disease risks with HIGH probability
  diseaseRisks.filter(r => r.risk === 'HIGH').forEach(risk => {
    actions.push({
      action: `Apply ${risk.prevention.split(' ')[1] || 'fungicide'}`,
      crop: risk.crop,
      why: `${risk.disease} risk at ${risk.probability}% due to ${risk.trigger.split(' ').slice(0, 5).join(' ')}`,
      priority: 1
    });
  });

  // Priority 2: SELL NOW signals
  for (const crop of CROPS) {
    const mainMandi = crop.commodityName === 'Onion' ? 'Lasalgaon' : 'Nashik';
    const latest = getLatestPrice(prices, crop.commodityName, mainMandi);
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);
    const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
    const season = getSeasonalContext(crop.commodityName, currentMonth);
    const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);

    if (signal.signal === 'SELL NOW' && latest) {
      const pct = avg90 ? computePctChange(latest.modal_price, avg90) : 0;
      actions.push({
        action: 'Sell immediately',
        crop: crop.commodityName,
        why: `Price ₹${latest.modal_price.toLocaleString()} is ${pct.toFixed(0)}% above average — best window`,
        priority: 2
      });
    }
  }

  // Priority 3: DANGER alerts
  alerts.filter(a => a.level === 'DANGER').forEach(alert => {
    actions.push({
      action: alert.action,
      crop: alert.crop,
      why: alert.detail,
      priority: 3
    });
  });

  // Priority 4: Spray window action
  const bestSpray = sprayWindows.find(w => w.suitable);
  if (bestSpray) {
    actions.push({
      action: `Schedule spraying for ${fmtDate(bestSpray.date)}`,
      crop: 'All crops',
      why: `Best conditions: ${bestSpray.reason}`,
      priority: 4
    });
  }

  // Priority 5: WARNING alerts
  alerts.filter(a => a.level === 'WARNING').slice(0, 2).forEach(alert => {
    actions.push({
      action: alert.action,
      crop: alert.crop,
      why: alert.detail,
      priority: 5
    });
  });

  // Sort by priority and take top 3
  actions.sort((a, b) => a.priority - b.priority);
  const top3 = actions.slice(0, 3);

  if (top3.length === 0) {
    top3.push({
      action: 'Routine monitoring',
      crop: 'All crops',
      why: 'No critical issues detected — maintain regular field inspections',
      priority: 10
    });
  }

  let text = `🎯 *TODAY'S TOP 3 ACTIONS*\n━━━━━━━━━━━━━━━━━━━━━\n`;
  top3.forEach((a, i) => {
    text += `${i + 1}. ${a.action} — ${a.crop} — ${a.why}\n`;
  });

  return text.trim();
}

function buildPriorityLine(
  alerts: CropAlert[],
  diseaseRisks: DiseaseRisk[],
  prices: PriceRecord[],
  currentMonth: number
): string {
  // Check for HIGH disease risks first
  const highRisk = diseaseRisks.find(r => r.risk === 'HIGH');
  if (highRisk) {
    return `Spray ${highRisk.crop} for ${highRisk.disease} BEFORE rain starts — ${highRisk.probability}% disease risk.`;
  }

  // Check for SELL NOW signals
  for (const crop of CROPS) {
    const mainMandi = crop.commodityName === 'Onion' ? 'Lasalgaon' : 'Nashik';
    const latest = getLatestPrice(prices, crop.commodityName, mainMandi);
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);
    const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
    const season = getSeasonalContext(crop.commodityName, currentMonth);
    const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);

    if (signal.signal === 'SELL NOW' && latest) {
      return `Sell ${crop.commodityName} today — price ₹${latest.modal_price.toLocaleString()} is at seasonal high.`;
    }
  }

  // Check for DANGER alerts
  const danger = alerts.find(a => a.level === 'DANGER');
  if (danger) {
    return `${danger.crop}: ${danger.action} — ${danger.title}`;
  }

  // Check for WARNING alerts
  const warning = alerts.find(a => a.level === 'WARNING');
  if (warning) {
    return `${warning.crop}: ${warning.action}`;
  }

  return 'No critical actions today — continue routine farm operations.';
}

export function generateWhatsAppReport(
  forecast: ForecastDay[],
  prices: PriceRecord[],
  alerts: CropAlert[],
  sprayWindows: SprayWindow[],
  diseaseRisks: DiseaseRisk[],
  currentMonth: number
): FarmReport {
  const today = new Date();
  const dateStr = fmtDateFull(today);
  const confidence = computeReportConfidence(prices, forecast);

  const sections: string[] = [];

  // Header
  const header = `🌾 *KISANMITRA DAILY REPORT*
📍 Bhavere Farm, Nashik
📅 ${dateStr}
━━━━━━━━━━━━━━━━━━━━━`;
  sections.push(header);

  // Weather
  const weatherSection = buildWeatherSection(forecast);
  sections.push(weatherSection);

  // Spray Calendar
  const spraySection = buildSpraySection(sprayWindows);
  sections.push(spraySection);

  // Disease Alerts
  const diseaseSection = buildDiseaseSection(diseaseRisks);
  sections.push(diseaseSection);

  // Market Intelligence
  const marketSection = buildMarketSection(prices, currentMonth);
  sections.push(marketSection);

  // Top 3 Actions
  const actionsSection = buildActionsSection(alerts, diseaseRisks, sprayWindows, prices, currentMonth);
  sections.push(actionsSection);

  // One-line priority
  const priorityLine = buildPriorityLine(alerts, diseaseRisks, prices, currentMonth);
  const prioritySection = `📌 *ONE-LINE PRIORITY*\n${priorityLine}`;
  sections.push(prioritySection);

  // Footer
  const footer = `━━━━━━━━━━━━━━━━━━━━━
🌾 KisanMitra — Bhavere Farm Intelligence
Data: Open-Meteo (weather), Manual research (prices)
Report confidence: ${confidence.level} — ${confidence.reason}`;
  sections.push(footer);

  const text = sections.join('\n\n');

  return {
    text,
    generatedAt: today.toISOString(),
    sections
  };
}
