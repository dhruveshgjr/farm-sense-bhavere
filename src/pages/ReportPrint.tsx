import { useEffect } from 'react';
import { CROPS, MANDIS, getWeatherEmoji } from '@/lib/farmConfig';
import { usePrices, getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { useWeather } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { computeAlertLevel, computePctChange, getSellSignal, getSeasonalContext } from '@/lib/trendEngine';

const ReportPrint = () => {
  const { data: prices = [] } = usePrices();
  const { data: weather } = useWeather();
  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const month = new Date().getMonth() + 1;

  useEffect(() => {
    const timer = setTimeout(() => window.print(), 1500);
    return () => clearTimeout(timer);
  }, []);

  const allAlerts = weather ? generateAllAdvisories(weather) : {};
  const sorted = getPrioritySummary(allAlerts);

  const weekData = weather?.slice(0, 7) ?? [];
  const totalRain = weekData.reduce((s, d) => s + d.rain_mm, 0);
  const rainyDays = weekData.filter(d => d.rain_mm > 1).length;

  return (
    <div className="max-w-[210mm] mx-auto p-6 text-foreground bg-background print:p-0">
      {/* Page 1 */}
      <div>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">🌾 KisanMitra — Weekly Farm Report</h1>
          <p className="text-sm text-muted-foreground">Bhavere, Nashik | {today}</p>
        </div>

        {/* Weather */}
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b-2 border-primary pb-1 mb-3">🌤 Weather Forecast</h2>
          {weather && weather.length > 0 ? (
            <div>
              <div className="grid grid-cols-5 gap-2 mb-3">
                {weather.slice(0, 5).map(day => (
                  <div key={day.forecast_date} className="border border-border rounded p-2 text-center text-xs">
                    <div className="font-medium">{new Date(day.forecast_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                    <div className="text-lg">{getWeatherEmoji(day.weathercode)}</div>
                    <div>{Math.round(day.temp_min)}–{Math.round(day.temp_max)}°C</div>
                    <div className="text-muted-foreground">💧{day.rain_mm.toFixed(1)}mm</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Summary: {totalRain.toFixed(1)}mm total rain, {rainyDays} rainy days in next 7 days
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Weather data unavailable</p>
          )}
        </section>

        {/* Market Pulse */}
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b-2 border-primary pb-1 mb-3">💰 Market Pulse — Mandi Prices</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-2">Crop</th>
                {MANDIS.map(m => <th key={m} className="text-right py-2">{m} (₹/qtl)</th>)}
                <th className="text-center py-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {CROPS.map(crop => {
                const latest = getLatestPrice(prices, crop.commodityName, 'Nashik') || getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
                const avg90 = getAvgPrice(prices, crop.commodityName, 90);
                const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
                const season = getSeasonalContext(crop.commodityName, month);
                const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);
                return (
                  <tr key={crop.name} className="border-b border-border">
                    <td className="py-2">{crop.name} ({crop.localName})</td>
                    {MANDIS.map(mandi => {
                      const p = getLatestPrice(prices, crop.commodityName, mandi);
                      return <td key={mandi} className="text-right py-2 font-medium">{p ? `₹${p.modal_price.toLocaleString()}` : '—'}</td>;
                    })}
                    <td className="text-center py-2 font-bold">{signal.signal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>

      {/* Page 2 */}
      <div className="page-break">
        <section className="mb-6">
          <h2 className="text-lg font-bold border-b-2 border-primary pb-1 mb-3">⚠️ Advisory Alerts</h2>
          {sorted.length === 0 ? (
            <p className="text-sm">✅ No active alerts this week</p>
          ) : (
            <div className="space-y-2">
              {sorted.slice(0, 10).map((alert, i) => (
                <div key={i} className="border border-border rounded p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{alert.level === 'DANGER' ? '🔴' : alert.level === 'WARNING' ? '🟡' : '🔵'}</span>
                    <span className="font-semibold">{alert.crop}: {alert.title}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">Action: {alert.action}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-bold border-b-2 border-primary pb-1 mb-3">📊 Sell Signals Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            {CROPS.map(crop => {
              const latest = getLatestPrice(prices, crop.commodityName, 'Nashik') || getLatestPrice(prices, crop.commodityName, 'Lasalgaon');
              const avg90 = getAvgPrice(prices, crop.commodityName, 90);
              const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
              const season = getSeasonalContext(crop.commodityName, month);
              const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);
              const pct = latest && avg90 ? computePctChange(latest.modal_price, avg90) : 0;
              return (
                <div key={crop.name} className="border border-border rounded p-2 text-xs">
                  <div className="font-semibold">{crop.name}</div>
                  <div>Price: {latest ? `₹${latest.modal_price.toLocaleString()}` : '—'}</div>
                  <div>vs 90d avg: {avg90 ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}</div>
                  <div className="font-bold mt-1">{signal.signal} — {signal.reason}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
        KisanMitra — Bhavere, Nashik | {today} | Generated automatically
      </footer>
    </div>
  );
};

export default ReportPrint;
