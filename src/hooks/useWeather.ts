import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { WEATHER_API_URL } from '@/lib/farmConfig';
import type { ForecastDay } from '@/lib/advisoryEngine';

interface OpenMeteoResponse {
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    relative_humidity_2m_max: number[];
    windspeed_10m_max: number[];
    precipitation_probability_max: number[];
    weathercode: number[];
  };
}

export interface WeatherDay extends ForecastDay {
  rain_prob_pct: number;
  weathercode: number;
}

async function fetchWeather(): Promise<WeatherDay[]> {
  // Check cache first
  const { data: cached } = await supabase
    .from('weather_cache')
    .select('*')
    .order('fetched_at', { ascending: false })
    .limit(1);

  const lastFetch = cached?.[0]?.fetched_at;
  const cacheAge = lastFetch ? (Date.now() - new Date(lastFetch).getTime()) / 1000 / 60 / 60 : Infinity;

  if (cacheAge < 3 && cached && cached.length >= 1) {
    const { data: allCached } = await supabase
      .from('weather_cache')
      .select('*')
      .order('forecast_date', { ascending: true })
      .limit(10);

    if (allCached && allCached.length > 0) {
      return allCached.map(c => ({
        forecast_date: c.forecast_date,
        temp_max: Number(c.temp_max),
        temp_min: Number(c.temp_min),
        rain_mm: Number(c.rain_mm),
        humidity_max: Number(c.humidity_max),
        wind_kmh: Number(c.wind_kmh),
        rain_prob_pct: Number(c.rain_prob_pct),
        weathercode: c.weathercode ?? 0,
      }));
    }
  }

  // Fetch fresh data, with fallback to cache
  try {
    const res = await fetch(WEATHER_API_URL);
    if (!res.ok) throw new Error('Weather API failed');
    const data: OpenMeteoResponse = await res.json();

    const days: WeatherDay[] = data.daily.time.map((t, i) => ({
      forecast_date: t,
      temp_max: data.daily.temperature_2m_max[i],
      temp_min: data.daily.temperature_2m_min[i],
      rain_mm: data.daily.precipitation_sum[i],
      humidity_max: data.daily.relative_humidity_2m_max[i],
      wind_kmh: data.daily.windspeed_10m_max[i],
      rain_prob_pct: data.daily.precipitation_probability_max[i],
      weathercode: data.daily.weathercode[i],
    }));

    // Cache to Supabase
    for (const day of days) {
      await supabase.from('weather_cache').upsert({
        forecast_date: day.forecast_date,
        temp_max: day.temp_max,
        temp_min: day.temp_min,
        rain_mm: day.rain_mm,
        humidity_max: day.humidity_max,
        wind_kmh: day.wind_kmh,
        rain_prob_pct: day.rain_prob_pct,
        weathercode: day.weathercode,
      }, { onConflict: 'forecast_date' });
    }

    return days;
  } catch {
    // Fallback to cached weather
    const { data: fallback } = await supabase
      .from('weather_cache')
      .select('*')
      .order('forecast_date', { ascending: true })
      .limit(10);

    if (fallback && fallback.length > 0) {
      return fallback.map(c => ({
        forecast_date: c.forecast_date,
        temp_max: Number(c.temp_max),
        temp_min: Number(c.temp_min),
        rain_mm: Number(c.rain_mm),
        humidity_max: Number(c.humidity_max),
        wind_kmh: Number(c.wind_kmh),
        rain_prob_pct: Number(c.rain_prob_pct),
        weathercode: c.weathercode ?? 0,
      }));
    }
    throw new Error('Weather unavailable');
  }
}

export function useWeather() {
  return useQuery({
    queryKey: ['weather'],
    queryFn: fetchWeather,
    staleTime: 3 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });
}
