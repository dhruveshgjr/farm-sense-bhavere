import { Skeleton } from '@/components/ui/skeleton';
import { getWeatherEmoji } from '@/lib/farmConfig';
import type { WeatherDay } from '@/hooks/useWeather';

interface WeatherSectionProps {
  data?: WeatherDay[];
  isLoading: boolean;
}

export function WeatherSection({ data, isLoading }: WeatherSectionProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-weather">🌤 10-Day Weather Forecast — Bhavere</div>
        <div className="p-4 flex gap-3 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="min-w-[100px] h-[140px] rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) return null;

  const weekData = data.slice(0, 7);
  const totalRain = weekData.reduce((s, d) => s + d.rain_mm, 0);
  const maxTemp = Math.max(...data.map(d => d.temp_max));
  const maxWind = Math.max(...data.map(d => d.wind_kmh));
  const rainyDays = weekData.filter(d => d.rain_mm > 1).length;

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-weather">🌤 10-Day Weather Forecast — Bhavere</div>

      <div className="p-3 overflow-x-auto">
        <div className="flex gap-2" style={{ minWidth: 'max-content' }}>
          {data.map((day) => {
            const dt = new Date(day.forecast_date);
            const label = `${dt.getDate()}/${dt.getMonth() + 1}`;
            const cardClass = day.rain_mm > 50
              ? 'weather-card-rain-heavy'
              : day.rain_mm >= 10
              ? 'weather-card-rain-moderate'
              : 'border border-border';

            return (
              <div
                key={day.forecast_date}
                className={`rounded-lg p-2.5 min-w-[90px] text-center ${cardClass}`}
              >
                <div className="text-xs font-medium text-muted-foreground">{label}</div>
                <div className="text-2xl my-1">{getWeatherEmoji(day.weathercode)}</div>
                <div className="text-sm font-semibold">
                  {Math.round(day.temp_min)}–{Math.round(day.temp_max)}°C
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  💧 {day.rain_mm.toFixed(1)}mm
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {Math.round(day.rain_prob_pct)}% • 💨{Math.round(day.wind_kmh)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-3 pb-3">
        <div className="bg-muted rounded-md p-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>🌧 Total rain: <strong>{totalRain.toFixed(1)}mm</strong></span>
          <span>🌡 Max temp: <strong>{maxTemp}°C</strong></span>
          <span>💨 Max wind: <strong>{maxWind}km/h</strong></span>
          <span>☔ Rainy days: <strong>{rainyDays}/7</strong></span>
        </div>
      </div>
    </div>
  );
}
