export interface FarmSettings {
  enabledCrops: string[];
  enabledMandis: string[];
  crashThreshold: number;
  spikeThreshold: number;
}

const DEFAULTS: FarmSettings = {
  enabledCrops: ['Banana', 'Tomato', 'Bitter Gourd', 'Papaya', 'Onion'],
  enabledMandis: ['Nashik', 'Lasalgaon'],
  crashThreshold: 30,
  spikeThreshold: 30,
};

const KEY = 'kisanmitra_settings';

export function getSettings(): FarmSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(settings: Partial<FarmSettings>) {
  const current = getSettings();
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...settings }));
}
