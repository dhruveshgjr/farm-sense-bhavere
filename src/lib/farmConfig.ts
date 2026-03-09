export const FARM = {
  name: 'Bhavere',
  latitude: 19.78,
  longitude: 73.91,
  district: 'Nashik',
  state: 'Maharashtra',
} as const;

export const MANDIS = ['Nashik', 'Lasalgaon'] as const;

// Expanded list of Maharashtra mandis for manual entry
export const ALL_MANDIS = [
  'Nashik', 'Lasalgaon', 'Pune', 'Mumbai - Vashi', 'Solapur',
  'Ahmednagar', 'Aurangabad', 'Nagpur', 'Kolhapur', 'Satara',
  'Jalgaon', 'Dhule', 'Sangli', 'Nanded', 'Latur',
  'Pimpalgaon', 'Manmad', 'Sinnar', 'Dindori', 'Igatpuri',
  'Other'
] as const;

export interface CropConfig {
  name: string;
  localName: string; // kept for reference, not displayed
  commodityName: string;
  color: string;
}

export const CROPS: CropConfig[] = [
  { name: 'Banana', localName: 'केळ', commodityName: 'Banana', color: '#FFD600' },
  { name: 'Tomato', localName: 'टमाटर', commodityName: 'Tomato', color: '#E53935' },
  { name: 'Bitter Gourd', localName: 'करेला', commodityName: 'Bitter Gourd', color: '#43A047' },
  { name: 'Papaya', localName: 'पपई', commodityName: 'Papaya', color: '#FF9800' },
  { name: 'Onion', localName: 'कांदा', commodityName: 'Onion', color: '#8E24AA' },
];

// Price validation ranges (₹/quintal)
export const PRICE_RANGES: Record<string, { min: number; max: number }> = {
  'Tomato': { min: 200, max: 8000 },
  'Onion': { min: 300, max: 6000 },
  'Banana': { min: 500, max: 4000 },
  'Papaya': { min: 300, max: 3000 },
  'Bitter Gourd': { min: 500, max: 5000 },
};

// Fuzzy crop name matching
export function matchCropName(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  const aliases: Record<string, string> = {
    'tomato': 'Tomato',
    'onion': 'Onion',
    'banana': 'Banana',
    'papaya': 'Papaya',
    'bitter gourd': 'Bitter Gourd',
    'bittergourd': 'Bitter Gourd',
    'karela': 'Bitter Gourd',
    'kela': 'Banana',
    'kanda': 'Onion',
  };
  return aliases[normalized] || CROPS.find(c => c.commodityName.toLowerCase() === normalized)?.commodityName || null;
}

export const WEATHER_API_URL = `https://api.open-meteo.com/v1/forecast?latitude=${FARM.latitude}&longitude=${FARM.longitude}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,windspeed_10m_max,precipitation_probability_max,weathercode&timezone=Asia/Kolkata&forecast_days=10`;

export function getWeatherEmoji(code: number): string {
  if (code === 0) return '☀️';
  if (code <= 2) return '🌤';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫';
  if (code >= 51 && code <= 67) return '🌧';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌦';
  if (code >= 95 && code <= 99) return '⛈';
  return '🌤';
}

export const SEASONAL_CONTEXT: Record<string, { high: string; low: string }> = {
  'Tomato': { high: 'Mar-May, Jul-Aug', low: 'Nov-Jan' },
  'Onion': { high: 'Jul-Oct', low: 'Feb-Apr' },
  'Banana': { high: 'Jan-Apr', low: 'Aug-Oct' },
  'Papaya': { high: 'Mar-Jun', low: 'Oct-Dec' },
  'Bitter Gourd': { high: 'Nov-Feb', low: 'Aug-Sep' },
};
