import { memo } from 'react';
import { computeSprayWindows, type ForecastDay, type SprayWindow } from '@/lib/advisoryEngine';
import { getWeatherEmoji } from '@/lib/farmConfig';

interface SprayCalendarSectionProps {
  forecast?: ForecastDay[];
}

export const SprayCalendarSection = memo(function SprayCalendarSection({ forecast }: SprayCalendarSectionProps) {
  if (!forecast || forecast.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-weather">🧪 Spray Calendar — Next 10 Days</div>
        <div className="p-4 text-center text-muted-foreground text-sm">
          Loading weather data for spray window analysis...
        </div>
      </div>
    );
  }

  const sprayWindows = computeSprayWindows(forecast);
  const firstSuitable = sprayWindows.find(w => w.suitable);
  const suitableCount = sprayWindows.filter(w => w.suitable).length;

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-weather">🧪 Spray Calendar — Next 10 Days</div>
      <div className="p-3 space-y-3">
        {/* Horizontal scrollable calendar */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {sprayWindows.map((window, i) => {
            const day = forecast[i];
            const dateObj = new Date(window.date);
            const dayLabel = dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            const weekday = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });

            return (
              <div
                key={window.date}
                className={`flex-shrink-0 w-20 rounded-lg p-2 border text-center ${
                  window.suitable
                    ? 'bg-success/10 border-success/30'
                    : 'bg-destructive/10 border-destructive/30'
                }`}
              >
                <div className="text-[10px] text-muted-foreground">{weekday}</div>
                <div className="text-xs font-semibold">{dayLabel}</div>
                <div className="text-lg my-1">{day ? getWeatherEmoji(day.weathercode || 0) : '☁️'}</div>
                <div className={`text-[10px] font-bold ${window.suitable ? 'text-success' : 'text-destructive'}`}>
                  {window.suitable ? '✅ SPRAY' : '❌ NO'}
                </div>
                <div className={`text-[8px] px-1 py-0.5 rounded mt-1 ${
                  window.confidence === 'HIGH' ? 'bg-success/20 text-success' :
                  window.confidence === 'MEDIUM' ? 'bg-warning/20 text-warning' :
                  'bg-destructive/20 text-destructive'
                }`}>
                  {window.confidence}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="border-t border-border pt-2">
          {firstSuitable ? (
            <div className="flex items-start gap-2">
              <span className="text-success text-lg">🎯</span>
              <div>
                <p className="text-sm font-medium">
                  Best spray window: <strong>{new Date(firstSuitable.date).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}</strong>
                </p>
                <p className="text-xs text-muted-foreground">{firstSuitable.reason}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {suitableCount} of {sprayWindows.length} days suitable for spraying
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span className="text-warning text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-warning">No suitable spray window in 10-day forecast</p>
                <p className="text-xs text-muted-foreground">
                  Consider adjusting schedule or using rain-fast formulations. 
                  Check forecast daily for changes.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[9px] text-muted-foreground border-t border-border pt-2">
          <span>🌧 Rain &lt;5mm</span>
          <span>💨 Wind &lt;20km/h</span>
          <span>💧 Humidity 40-85%</span>
          <span>☔ No rain next day</span>
        </div>
      </div>
    </div>
  );
});
