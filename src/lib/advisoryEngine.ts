export type AlertLevel = 'DANGER' | 'WARNING' | 'INFO';

export type ForecastDay = {
  forecast_date: string;
  temp_max: number;
  temp_min: number;
  rain_mm: number;
  humidity_max: number;
  wind_kmh: number;
};

export type CropAlert = {
  crop: string;
  level: AlertLevel;
  title: string;
  detail: string;
  action: string;
  day_date?: string;
};

function fmtDate(d: string) {
  const dt = new Date(d);
  return `${dt.getDate()}/${dt.getMonth() + 1}`;
}

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

  // Humidity streak
  for (let i = 0; i <= forecast.length - 3; i++) {
    if (forecast[i].humidity_max > 85 && forecast[i + 1].humidity_max > 85 && forecast[i + 2].humidity_max > 85) {
      alerts.push({ crop: 'Banana', level: 'WARNING', title: `High humidity streak starts ${fmtDate(forecast[i].forecast_date)}`, detail: `3+ consecutive days with humidity above 85%.`, action: 'Scout for Sigatoka leaf spot. Spray Mancozeb if symptoms appear.', day_date: forecast[i].forecast_date });
      break;
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
  // Hot dry spell
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
  const order: Record<AlertLevel, number> = { DANGER: 0, WARNING: 1, INFO: 2 };
  return all.sort((a, b) => order[a.level] - order[b.level]);
}
