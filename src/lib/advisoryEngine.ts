export type AlertLevel = 'DANGER' | 'WARNING' | 'INFO';

export type ForecastDay = {
  forecast_date: string;
  temp_max: number;
  temp_min: number;
  rain_mm: number;
  humidity_max: number;
  wind_kmh: number;
  weathercode?: number;
};

export type CropAlert = {
  crop: string;
  level: AlertLevel;
  title: string;
  detail: string;
  action: string;
  day_date?: string;
};

export type SprayWindow = {
  date: string;
  suitable: boolean;
  reason: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
};

export type DiseaseRisk = {
  crop: string;
  disease: string;
  risk: 'HIGH' | 'MEDIUM' | 'LOW';
  probability: number;
  trigger: string;
  prevention: string;
  treatmentWindow: string;
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ==================== SPRAY WINDOW LOGIC ====================

export function computeSprayWindows(forecast: ForecastDay[]): SprayWindow[] {
  return forecast.map(day => {
    // A day is suitable for spraying if:
    // 1. Rain < 5mm (spray won't wash off)
    // 2. Wind < 20 km/h (spray won't drift)
    // 3. Humidity between 40-85% (spray absorbs properly)
    // 4. No rain expected next day either (need 6-8 hours drying time)

    const nextDay = forecast.find(d => {
      const curr = new Date(day.forecast_date);
      const next = new Date(d.forecast_date);
      return (next.getTime() - curr.getTime()) === 86400000;
    });

    const lowRain = (day.rain_mm || 0) < 5;
    const lowWind = (day.wind_kmh || 0) < 20;
    const goodHumidity = (day.humidity_max || 60) >= 40 && (day.humidity_max || 60) <= 85;
    const nextDayDry = !nextDay || (nextDay.rain_mm || 0) < 10;

    const suitable = lowRain && lowWind && goodHumidity && nextDayDry;

    let reason = '';
    let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';

    if (!lowRain) {
      reason = `Rain ${Math.round(day.rain_mm || 0)}mm — spray will wash off`;
      confidence = 'LOW';
    } else if (!lowWind) {
      reason = `Wind ${Math.round(day.wind_kmh || 0)}km/h — spray drift risk`;
      confidence = 'LOW';
    } else if (!goodHumidity) {
      reason = (day.humidity_max || 60) < 40
        ? `Humidity ${Math.round(day.humidity_max || 0)}% — too dry, poor absorption`
        : `Humidity ${Math.round(day.humidity_max || 0)}% — too humid, slow drying`;
      confidence = 'MEDIUM';
    } else if (!nextDayDry) {
      reason = `Rain expected tomorrow (${Math.round(nextDay?.rain_mm || 0)}mm) — insufficient drying time`;
      confidence = 'MEDIUM';
    } else {
      reason = 'Good conditions: low rain, moderate wind, proper humidity';
      confidence = 'HIGH';
    }

    return { date: day.forecast_date, suitable, reason, confidence };
  });
}

// ==================== DISEASE RISK SCORING ====================

export function computeDiseaseRisks(forecast: ForecastDay[]): DiseaseRisk[] {
  const risks: DiseaseRisk[] = [];

  // Tomato Late Blight: triggered by 15-28°C + humidity >80% for 2+ consecutive days
  let tomatoBlightDays = 0;
  for (const day of forecast) {
    if ((day.temp_min || 0) >= 13 && (day.temp_max || 0) <= 30 && (day.humidity_max || 0) > 80) {
      tomatoBlightDays++;
      if (tomatoBlightDays >= 2) {
        risks.push({
          crop: 'Tomato',
          disease: 'Late Blight (Phytophthora)',
          risk: tomatoBlightDays >= 3 ? 'HIGH' : 'MEDIUM',
          probability: Math.min(95, 50 + tomatoBlightDays * 15),
          trigger: `${tomatoBlightDays} consecutive days of 13-30°C + humidity >80%`,
          prevention: 'Apply Metalaxyl + Mancozeb (Ridomil Gold) at 2g/L. Spray BEFORE symptoms appear.',
          treatmentWindow: `Spray before ${fmtDateLong(day.forecast_date)}`
        });
        break;
      }
    } else {
      tomatoBlightDays = 0;
    }
  }

  // Onion Purple Blotch: humidity >80% + temp 20-35°C + rain
  for (const day of forecast) {
    if ((day.humidity_max || 0) > 80 && (day.temp_max || 0) >= 20 && (day.temp_max || 0) <= 38 && (day.rain_mm || 0) > 3) {
      risks.push({
        crop: 'Onion',
        disease: 'Purple Blotch (Alternaria)',
        risk: (day.rain_mm || 0) > 15 ? 'HIGH' : 'MEDIUM',
        probability: Math.min(90, 40 + Math.round((day.rain_mm || 0) * 2)),
        trigger: `Humidity ${Math.round(day.humidity_max || 0)}% + rain ${Math.round(day.rain_mm || 0)}mm on ${fmtDateLong(day.forecast_date)}`,
        prevention: 'Spray Mancozeb (Dithane M-45) at 2.5g/L or Iprodione. Avoid overhead irrigation.',
        treatmentWindow: `Spray 1-2 days before ${fmtDateLong(day.forecast_date)}`
      });
      break;
    }
  }

  // Banana Sigatoka: 3+ consecutive days humidity >85%
  let sigatokaDays = 0;
  for (const day of forecast) {
    if ((day.humidity_max || 0) > 85) {
      sigatokaDays++;
      if (sigatokaDays >= 3) {
        risks.push({
          crop: 'Banana',
          disease: 'Sigatoka Leaf Spot',
          risk: sigatokaDays >= 5 ? 'HIGH' : 'MEDIUM',
          probability: Math.min(85, 40 + sigatokaDays * 10),
          trigger: `${sigatokaDays} consecutive days with humidity >85%`,
          prevention: 'Spray Propiconazole (Tilt) at 1ml/L or Mancozeb at 2.5g/L. Remove infected leaves.',
          treatmentWindow: `Spray within 2 days`
        });
        break;
      }
    } else {
      sigatokaDays = 0;
    }
  }

  // Bitter Gourd Powdery Mildew: high humidity + warm dry nights
  for (const day of forecast) {
    if ((day.humidity_max || 0) > 80 && (day.temp_min || 0) > 18 && (day.rain_mm || 0) < 5) {
      risks.push({
        crop: 'Bitter Gourd',
        disease: 'Powdery Mildew',
        risk: 'MEDIUM',
        probability: 55,
        trigger: `Warm humid night (${Math.round(day.temp_min || 0)}°C, ${Math.round(day.humidity_max || 0)}% humidity) on ${fmtDateLong(day.forecast_date)}`,
        prevention: 'Spray Wettable Sulphur (Sulfex) at 3g/L or Triadimefon at 1g/L.',
        treatmentWindow: `Spray before ${fmtDateLong(day.forecast_date)}`
      });
      break;
    }
  }

  // Papaya PRSV: rain + warm + aphid-favorable conditions
  for (const day of forecast) {
    if ((day.rain_mm || 0) > 10 && (day.temp_max || 0) > 25 && (day.humidity_max || 0) > 75) {
      risks.push({
        crop: 'Papaya',
        disease: 'PRSV (Papaya Ringspot Virus)',
        risk: 'HIGH',
        probability: 60,
        trigger: `Warm wet conditions (${Math.round(day.temp_max || 0)}°C, ${Math.round(day.rain_mm || 0)}mm rain) favor aphid vectors`,
        prevention: 'Spray mineral oil (1%) to deter aphids. Scout for mosaic patterns. Remove infected plants IMMEDIATELY.',
        treatmentWindow: `Monitor daily from ${fmtDateLong(day.forecast_date)}`
      });
      break;
    }
  }

  return risks;
}

// ==================== EXISTING ALERT RULES (UNCHANGED) ====================

function bananaRules(forecast: ForecastDay[]): CropAlert[] {
  const alerts: CropAlert[] = [];

  for (const day of forecast) {
    if (day.wind_kmh > 40) {
      alerts.push({ crop: 'Banana', level: 'DANGER', title: `Strong winds ${day.wind_kmh}km/h on ${fmtDate(day.forecast_date)}`, detail: `Wind speed of ${day.wind_kmh}km/h expected.`, action: 'Stake all plants and secure bunch covers before this date.', day_date: day.forecast_date });
    }
    if (day.rain_mm > 50) {
      alerts.push({ crop: 'Banana', level: 'WARNING', title: `Heavy rain ${day.rain_mm}mm on ${fmtDate(day.forecast_date)}`, detail: `Expected rainfall: ${day.rain_mm}mm.`, action: 'Check all drainage channels. Do not irrigate on this day.', day_date: day.forecast_date });
    }
    if (day.temp_min < 10) {
      alerts.push({ crop: 'Banana', level: 'WARNING', title: `Cold night ${day.temp_min}°C on ${fmtDate(day.forecast_date)}`, detail: `Minimum temperature dropping to ${day.temp_min}°C.`, action: 'Wrap pseudostems of young plants with dry leaves.', day_date: day.forecast_date });
    }
  }

  // Humidity streak — sliding window of 3 consecutive days
  for (let i = 0; i <= forecast.length - 3; i++) {
    if (forecast[i].humidity_max > 85 && forecast[i + 1].humidity_max > 85 && forecast[i + 2].humidity_max > 85) {
      alerts.push({ crop: 'Banana', level: 'WARNING', title: `High humidity streak starts ${fmtDate(forecast[i].forecast_date)}`, detail: `3+ consecutive days with humidity above 85%.`, action: 'Scout for Sigatoka leaf spot. Spray Mancozeb if symptoms appear.', day_date: forecast[i].forecast_date });
      break; // Only one alert
    }
  }

  // Dry spell
  const dryDays = forecast.filter(d => d.rain_mm < 2).length;
  if (dryDays >= 8) {
    alerts.push({ crop: 'Banana', level: 'INFO', title: `Dry spell: ${dryDays} of 10 days with minimal rain`, detail: `Most days have very little rainfall forecast.`, action: 'Increase irrigation frequency for next 10 days.' });
  }

  return alerts;
}

function tomatoRules(forecast: ForecastDay[]): CropAlert[] {
  const alerts: CropAlert[] = [];
  for (const day of forecast) {
    if (day.temp_min >= 15 && day.temp_min <= 25 && day.humidity_max > 80) {
      alerts.push({ crop: 'Tomato', level: 'DANGER', title: `Late blight conditions on ${fmtDate(day.forecast_date)} (${day.temp_min}°C, ${day.humidity_max}%)`, detail: `Temperature and humidity favor late blight.`, action: 'Apply Metalaxyl + Mancozeb immediately. Do not wait for symptoms.', day_date: day.forecast_date });
    }
    if (day.rain_mm > 10) {
      alerts.push({ crop: 'Tomato', level: 'WARNING', title: `Rain ${day.rain_mm}mm on ${fmtDate(day.forecast_date)} — spray window closes`, detail: `Rain expected will wash off sprays.`, action: 'Do NOT spray pesticides or fungicides on this date or the day before.', day_date: day.forecast_date });
    }
    if (day.temp_max > 40) {
      alerts.push({ crop: 'Tomato', level: 'WARNING', title: `Heat stress ${day.temp_max}°C on ${fmtDate(day.forecast_date)}`, detail: `Very high temperatures expected.`, action: 'Irrigate in early morning or evening only.', day_date: day.forecast_date });
    }
    if (day.temp_min < 12) {
      alerts.push({ crop: 'Tomato', level: 'INFO', title: `Cold night ${day.temp_min}°C — poor fruit set likely`, detail: `Low temperatures affect pollination.`, action: 'Monitor fruit set. Consider boron/calcium foliar spray.', day_date: day.forecast_date });
    }
  }
  return alerts;
}

function karelaRules(forecast: ForecastDay[]): CropAlert[] {
  const alerts: CropAlert[] = [];
  for (const day of forecast) {
    if (day.humidity_max > 85) {
      alerts.push({ crop: 'Bitter Gourd', level: 'WARNING', title: `Powdery mildew risk on ${fmtDate(day.forecast_date)} (humidity ${day.humidity_max}%)`, detail: `High humidity increases disease pressure.`, action: 'Spray Wettable Sulphur (0.3%) or Triadimefon preventively.', day_date: day.forecast_date });
    }
    if (day.rain_mm > 30) {
      alerts.push({ crop: 'Bitter Gourd', level: 'WARNING', title: `Heavy rain ${day.rain_mm}mm — trellis and drainage check`, detail: `Heavy rain can damage trellis and waterlog beds.`, action: 'Check trellis anchors. Clear drainage around raised beds before this date.', day_date: day.forecast_date });
    }
  }
  // Hot dry spell — count all days (not necessarily consecutive) with temp_max > 38 AND rain_mm < 2
  let hotDryCount = 0;
  for (const day of forecast) {
    if (day.temp_max > 38 && day.rain_mm < 2) hotDryCount++;
  }
  if (hotDryCount >= 3) {
    alerts.push({ crop: 'Bitter Gourd', level: 'INFO', title: `Hot dry spell: ${hotDryCount} days forecast`, detail: `Multiple hot dry days ahead.`, action: 'Irrigate every 3-4 days. Consistent moisture needed for fruit quality.' });
  }
  return alerts;
}

function papayaRules(forecast: ForecastDay[]): CropAlert[] {
  const alerts: CropAlert[] = [];
  for (const day of forecast) {
    if (day.rain_mm > 20 && day.humidity_max > 80) {
      alerts.push({ crop: 'Papaya', level: 'DANGER', title: `PRSV disease pressure high on ${fmtDate(day.forecast_date)}`, detail: `Warm wet conditions favor PRSV spread.`, action: 'Scout all plants for mosaic/leaf distortion. Spray mineral oil (1%) to deter aphids. Remove infected plants immediately.', day_date: day.forecast_date });
    }
    if (day.temp_max > 40) {
      alerts.push({ crop: 'Papaya', level: 'WARNING', title: `Heat stress ${day.temp_max}°C on ${fmtDate(day.forecast_date)}`, detail: `Extreme heat can damage fruit.`, action: 'Mulch around trunk base. Irrigate in morning.', day_date: day.forecast_date });
    }
    if (day.temp_min < 12) {
      alerts.push({ crop: 'Papaya', level: 'WARNING', title: `Cold stress ${day.temp_min}°C on ${fmtDate(day.forecast_date)}`, detail: `Cold temperatures stress papaya plants.`, action: 'Avoid overhead irrigation on cold nights. Harvest mature fruits.', day_date: day.forecast_date });
    }
    if (day.wind_kmh > 40) {
      alerts.push({ crop: 'Papaya', level: 'WARNING', title: `Wind ${day.wind_kmh}km/h — stem support needed`, detail: `Strong winds can topple fruit-heavy plants.`, action: 'Prop fruit-heavy stems with bamboo supports.', day_date: day.forecast_date });
    }
  }
  return alerts;
}

function onionRules(forecast: ForecastDay[]): CropAlert[] {
  const alerts: CropAlert[] = [];
  for (const day of forecast) {
    if (day.humidity_max > 80 && day.rain_mm > 5) {
      alerts.push({ crop: 'Onion', level: 'DANGER', title: `Purple blotch + downy mildew risk on ${fmtDate(day.forecast_date)}`, detail: `Humid wet conditions favor fungal diseases.`, action: 'Spray Iprodione or Mancozeb preventively. Avoid overhead irrigation.', day_date: day.forecast_date });
    }
    if (day.rain_mm > 40) {
      alerts.push({ crop: 'Onion', level: 'WARNING', title: `Heavy rain ${day.rain_mm}mm — bulb rot risk`, detail: `Excessive water causes bulb rot.`, action: 'Ensure ridge/furrow drainage is fully clear. Avoid irrigation for 5 days after.', day_date: day.forecast_date });
    }
    if (day.temp_max > 38) {
      alerts.push({ crop: 'Onion', level: 'INFO', title: `High temp ${day.temp_max}°C — bulb splitting risk`, detail: `High temperatures can cause bulb splitting.`, action: 'Light irrigation in morning to cool soil.', day_date: day.forecast_date });
    }
  }
  return alerts;
}

export function generateAllAdvisories(forecast: ForecastDay[]): Record<string, CropAlert[]> {
  return {
    'Banana': bananaRules(forecast),
    'Tomato': tomatoRules(forecast),
    'Bitter Gourd': karelaRules(forecast),
    'Papaya': papayaRules(forecast),
    'Onion': onionRules(forecast),
  };
}

export function getPrioritySummary(allAlerts: Record<string, CropAlert[]>): CropAlert[] {
  const all = Object.values(allAlerts).flat();
  // Deduplicate: same crop + same title → keep earliest
  const seen = new Map<string, CropAlert>();
  for (const alert of all) {
    const key = `${alert.crop}::${alert.title}`;
    if (!seen.has(key)) {
      seen.set(key, alert);
    }
  }
  const deduped = Array.from(seen.values());
  const order: Record<AlertLevel, number> = { DANGER: 0, WARNING: 1, INFO: 2 };
  return deduped.sort((a, b) => order[a.level] - order[b.level]);
}
