import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { useWeather } from '@/hooks/useWeather';
import { usePrices } from '@/hooks/usePrices';
import { generateAllAdvisories, getPrioritySummary, computeSprayWindows, computeDiseaseRisks } from '@/lib/advisoryEngine';
import { generateWhatsAppReport } from '@/lib/reportGenerator';
import { AIAdvisorSection } from '@/components/dashboard/AIAdvisorSection';
import { CROPS, MANDIS, getWeatherEmoji, matchCropName, PRICE_RANGES } from '@/lib/farmConfig';
import { computePctChange, computeAlertLevel, getSellSignal, getSeasonalContext } from '@/lib/trendEngine';
import { getLatestPrice, getAvgPrice } from '@/hooks/usePrices';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function ResearchPage() {
  const { data: weather } = useWeather();
  const { data: prices = [] } = usePrices();
  const queryClient = useQueryClient();
  const month = new Date().getMonth() + 1;

  const [bulkText, setBulkText] = useState('');
  const [importing, setImporting] = useState(false);

  const forecast = weather || [];
  const allAlerts = generateAllAdvisories(forecast);
  const alerts = getPrioritySummary(allAlerts);
  const sprayWindows = computeSprayWindows(forecast);
  const diseaseRisks = computeDiseaseRisks(forecast);
  const report = generateWhatsAppReport(forecast, prices, alerts, sprayWindows, diseaseRisks, month);

  const trendData = CROPS.flatMap(crop =>
    MANDIS.map(mandi => {
      const latest = getLatestPrice(prices, crop.commodityName, mandi);
      const avg90 = getAvgPrice(prices, crop.commodityName, 90);
      if (!latest || !avg90) return null;
      const alertLevel = computeAlertLevel(latest.modal_price, avg90);
      const season = getSeasonalContext(crop.commodityName, month);
      const signal = getSellSignal(latest.modal_price, avg90, alertLevel, season.season);
      return { commodity: crop.commodityName, mandi, current_price: latest.modal_price, pct_vs_90d: computePctChange(latest.modal_price, avg90), sell_signal: signal.signal, alert_level: alertLevel };
    })
  ).filter(Boolean) as any[];

  function parseDate(input: string): string | null {
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const d = new Date(input);
      if (!isNaN(d.getTime())) return input;
    }
    const parts = input.split(/[\/\-]/);
    if (parts.length === 3) {
      const [a, b, c] = parts;
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
    return null;
  }

  const handleImportAndRefresh = async () => {
    if (!bulkText.trim()) return;
    setImporting(true);
    const lines = bulkText.trim().split('\n').filter(l => l.trim());
    let imported = 0;
    for (const line of lines) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      if (parts.length < 4) continue;
      const [cropRaw, mandiRaw, priceRaw, dateRaw] = parts.map(p => p.trim());
      const matchedCrop = matchCropName(cropRaw);
      if (!matchedCrop) continue;
      const price = parseFloat(priceRaw.replace(/[₹,]/g, ''));
      if (isNaN(price)) continue;
      const range = PRICE_RANGES[matchedCrop];
      if (range && (price < range.min || price > range.max)) continue;
      const parsedDate = parseDate(dateRaw);
      if (!parsedDate) continue;

      try {
        const { error } = await supabase.from('daily_prices').upsert({
          price_date: parsedDate,
          commodity: matchedCrop,
          mandi: mandiRaw,
          modal_price: price,
          source: 'bulk-import',
        }, { onConflict: 'price_date,commodity,mandi' });
        if (!error) imported++;
      } catch {}
    }
    
    setBulkText('');
    setImporting(false);
    queryClient.invalidateQueries({ queryKey: ['prices'] });
    toast({ title: '✅ Intelligence Refreshed', description: `${imported} valid price records imported.` });
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(report.text);
    toast({ title: 'Copied to clipboard' });
  };

  const handleShareWhatsApp = () => {
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?text=${encodeURIComponent(report.text)}`
      : `https://wa.me/?text=${encodeURIComponent(report.text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader prices={prices} weather={weather} />
      <main className="container mx-auto px-3 py-4 max-w-7xl">
        <h1 className="text-xl font-bold mb-4">🔬 Research Desk</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Column 1: Weather & Climate */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h2 className="font-bold text-sm mb-3">Weather & Climate (10-day)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-1 font-medium">Date</th>
                      <th className="pb-1 font-medium">Temp</th>
                      <th className="pb-1 font-medium">Rain</th>
                      <th className="pb-1 font-medium">Wind</th>
                      <th className="pb-1 font-medium">Hum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecast.slice(0, 10).map(d => (
                      <tr key={d.forecast_date} className="border-b last:border-0 border-border/50">
                        <td className="py-1.5">{new Date(d.forecast_date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})} {getWeatherEmoji(d.weathercode ?? 0)}</td>
                        <td className="py-1.5">{Math.round(d.temp_min)}–{Math.round(d.temp_max)}°C</td>
                        <td className="py-1.5 text-blue-500 font-medium">{d.rain_mm.toFixed(1)}mm</td>
                        <td className="py-1.5">{Math.round(d.wind_kmh)}km/h</td>
                        <td className="py-1.5">{d.humidity_max}%</td>
                      </tr>
                    ))}
                    {forecast.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-muted-foreground">Loading weather...</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h2 className="font-bold text-sm mb-3">Spray Calendar</h2>
              <div className="space-y-2 text-xs">
                {sprayWindows.slice(0, 7).map(w => (
                  <div key={w.date} className="flex justify-between items-center border-b border-border/50 pb-1.5 last:border-0">
                    <span className="font-medium">{new Date(w.date).toLocaleDateString('en-IN', {day:'numeric', month:'short'})}</span>
                    <span className={w.suitable ? 'text-success font-medium bg-success/10 px-2 py-0.5 rounded' : 'text-destructive bg-destructive/10 px-2 py-0.5 rounded'}>
                      {w.suitable ? '✅ ' : '❌ '}{w.reason}
                    </span>
                  </div>
                ))}
                {sprayWindows.length === 0 && <div className="text-muted-foreground">No forecast data</div>}
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h2 className="font-bold text-sm mb-3">Disease Risk</h2>
              <div className="space-y-2 text-xs">
                {diseaseRisks.length > 0 ? diseaseRisks.map((r, i) => (
                  <div key={i} className="bg-muted/30 p-2 rounded">
                    <div className="font-bold text-destructive">{r.crop} — {r.disease} ({r.probability}%)</div>
                    <div className="text-muted-foreground mt-0.5">Trigger: {r.trigger}</div>
                  </div>
                )) : <div className="text-muted-foreground">✅ No high risks detected.</div>}
              </div>
            </div>
          </div>

          {/* Column 2: Market & Prices */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg p-4 border shadow-sm h-full">
              <h2 className="font-bold text-sm mb-3">Market & Prices</h2>
              <div className="space-y-4">
                {CROPS.map(crop => (
                  <div key={crop.commodityName} className="border border-border/50 rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-3 py-2 font-bold text-sm flex justify-between items-center">
                      <span>{crop.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">90d avg: ₹{Math.round(getAvgPrice(prices, crop.commodityName, 90) || 0)}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {MANDIS.map(mandi => {
                        const latest = getLatestPrice(prices, crop.commodityName, mandi);
                        const avg90 = getAvgPrice(prices, crop.commodityName, 90);
                        const pct = latest && avg90 ? computePctChange(latest.modal_price, avg90) : null;
                        const alertLevel = computeAlertLevel(latest?.modal_price ?? null, avg90);
                        const season = getSeasonalContext(crop.commodityName, month);
                        const signal = getSellSignal(latest?.modal_price ?? null, avg90, alertLevel, season.season);
                        
                        const trendArrow = pct === null ? '—' : pct > 5 ? '↑' : pct < -5 ? '↓' : '→';
                        const trendColor = pct === null ? 'text-muted-foreground' : pct > 5 ? 'text-success' : pct < -5 ? 'text-destructive' : 'text-warning';

                        return (
                          <div key={mandi} className="flex flex-col text-xs bg-background p-2 rounded border border-border/30">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-medium text-muted-foreground">{mandi}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm">₹{latest?.modal_price || '—'}</span>
                                <span className={`font-bold ${trendColor}`}>{trendArrow} {pct !== null ? `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%` : ''}</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-start mt-1">
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] whitespace-nowrap ${
                                signal.signal.includes('SELL') ? 'bg-success/10 text-success' : // Sell is a good thing for farmer
                                signal.signal === 'HOLD' ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'
                              }`}>{signal.signal}</span>
                              <span className="text-muted-foreground text-[10px] ml-2 text-right leading-tight">{signal.reason}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 3: Intelligence & Actions */}
          <div className="space-y-4">
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <AIAdvisorSection weather={forecast} prices={prices} alerts={alerts} trends={trendData} />
            </div>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <h2 className="font-bold text-sm mb-3">Top Alerts</h2>
              <div className="space-y-2 text-xs">
                {alerts.length > 0 ? alerts.slice(0, 5).map((a, i) => (
                  <div key={i} className="p-2 border rounded border-border/50">
                    <div className="font-bold flex items-center gap-1">
                      {a.level === 'DANGER' ? '🔴' : a.level === 'WARNING' ? '🟡' : '🔵'}
                      {a.crop}: {a.title}
                    </div>
                    <div className="mt-1 font-medium">{a.action}</div>
                  </div>
                )) : <div className="text-muted-foreground">✅ No active alerts.</div>}
              </div>
            </div>

            <div className="bg-card rounded-lg p-4 border shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-sm">Report Preview</h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleCopyReport}>Copy</Button>
                  <Button size="sm" className="h-7 text-xs bg-[#25D366] hover:bg-[#1DA851] text-white" onClick={handleShareWhatsApp}>WhatsApp</Button>
                </div>
              </div>
              <textarea 
                className="w-full h-[300px] text-[11px] font-mono p-3 border rounded bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary" 
                readOnly 
                value={report.text} 
              />
            </div>
          </div>
        </div>

        {/* Bottom Quick Import */}
        <div className="bg-card rounded-lg p-4 border shadow-sm mt-6">
          <h2 className="font-bold text-sm mb-2">Quick Import & Refresh</h2>
          <p className="text-xs text-muted-foreground mb-3">Paste multiple prices (Crop, Mandi, Price, Date) to instantly update all intelligence above.</p>
          <Textarea
            placeholder={`Tomato, Nashik, 2500, 2026-03-08\nOnion, Lasalgaon, 1800, 2026-03-08`}
            value={bulkText}
            onChange={e => setBulkText(e.target.value)}
            className="min-h-[100px] font-mono text-xs mb-3"
          />
          <Button onClick={handleImportAndRefresh} disabled={importing || !bulkText.trim()} className="w-full sm:w-auto">
            {importing ? 'Importing...' : '📥 Import & Refresh Intelligence'}
          </Button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
