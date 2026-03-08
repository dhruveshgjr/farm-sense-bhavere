import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CROPS } from '@/lib/farmConfig';
import { usePriceHistory, type PriceRecord } from '@/hooks/usePrices';
import { computeVolatility } from '@/lib/trendEngine';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

const HistoryPage = () => {
  const { data: prices = [], isLoading } = usePriceHistory(365);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(CROPS.map(c => c.commodityName));
  const [visibleRows, setVisibleRows] = useState(50);
  const [reports, setReports] = useState<any[]>([]);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  useEffect(() => {
    document.title = 'KisanMitra — Price History';
    supabase.from('report_history').select('*').order('generated_at', { ascending: false }).limit(100)
      .then(({ data }) => setReports(data ?? []));
  }, []);

  const toggleCrop = (commodity: string) => {
    setSelectedCrops(prev => prev.includes(commodity) ? prev.filter(c => c !== commodity) : [...prev, commodity]);
  };

  const dateMap = new Map<string, Record<string, number>>();
  prices.forEach(p => {
    const key = p.price_date;
    if (!dateMap.has(key)) dateMap.set(key, {});
    const entry = dateMap.get(key)!;
    if (!entry[p.commodity] || p.modal_price > entry[p.commodity]) entry[p.commodity] = p.modal_price;
  });

  const chartData = Array.from(dateMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, vals]) => ({
    date: new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), ...vals,
  }));

  const allPrices = prices.map(p => p.modal_price);
  const highest = allPrices.length ? Math.max(...allPrices) : 0;
  const lowest = allPrices.length ? Math.min(...allPrices) : 0;
  const highestCrop = prices.find(p => p.modal_price === highest);
  const lowestCrop = prices.find(p => p.modal_price === lowest);
  const uniqueDays = new Set(prices.map(p => p.price_date)).size;

  const volatilities = CROPS.map(crop => {
    const cropPrices = prices.filter(p => p.commodity === crop.commodityName).map(p => p.modal_price);
    return { crop: crop.name, ...computeVolatility(cropPrices) };
  });

  const firstReportDate = reports.length > 0 ? new Date(reports[reports.length - 1].generated_at).toLocaleDateString('en-IN') : '—';

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <Tabs defaultValue="prices">
          <TabsList className="w-full">
            <TabsTrigger value="prices" className="flex-1 text-xs">📊 Price History</TabsTrigger>
            <TabsTrigger value="timeline" className="flex-1 text-xs">📅 Report Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="prices" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Highest Price', value: highest ? `₹${highest.toLocaleString()}` : '—', sub: highestCrop?.commodity },
                { label: 'Lowest Price', value: lowest ? `₹${lowest.toLocaleString()}` : '—', sub: lowestCrop?.commodity },
                { label: 'Total Records', value: prices.length.toString(), sub: 'data points' },
                { label: 'Days Tracked', value: uniqueDays.toString(), sub: 'unique days' },
              ].map(s => (
                <div key={s.label} className="bg-card rounded-lg p-3 shadow-sm">
                  <div className="text-[10px] text-muted-foreground">{s.label}</div>
                  <div className="text-lg font-bold">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground">{s.sub}</div>
                </div>
              ))}
            </div>

            <div className="bg-card rounded-lg shadow-sm p-3">
              <h3 className="text-xs font-bold mb-2">📊 Price Volatility (30-day)</h3>
              <div className="grid grid-cols-2 gap-2">
                {volatilities.map(v => {
                  const colorCls = v.label === 'High' ? 'text-danger' : v.label === 'Medium' ? 'text-warning' : 'text-success';
                  return (
                    <div key={v.crop} className="flex items-center justify-between text-xs border border-border rounded px-2 py-1.5">
                      <span>{v.crop}</span>
                      <span className={`font-bold ${colorCls}`}>{v.score.toFixed(1)}% ({v.label})</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-3">
              <h3 className="text-xs font-bold mb-2">📅 Year-on-Year Comparison</h3>
              {uniqueDays < 365 ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Comparison available after 1 year of data</p>
                  <div className="flex items-center gap-2">
                    <Progress value={(uniqueDays / 365) * 100} className="flex-1 h-2" />
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{uniqueDays}/365 days</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Year-on-year data available.</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {CROPS.map(crop => (
                <label key={crop.name} className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <Checkbox checked={selectedCrops.includes(crop.commodityName)} onCheckedChange={() => toggleCrop(crop.commodityName)} />
                  <span style={{ color: crop.color }}>●</span><span>{crop.name}</span>
                </label>
              ))}
            </div>

            <div className="bg-card rounded-lg shadow-sm overflow-hidden">
              <div className="section-header section-header-trends">📊 Price History — All Crops</div>
              <div className="p-3">
                {isLoading ? <Skeleton className="h-64 w-full" /> : chartData.length >= 7 ? (
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                        {CROPS.filter(c => selectedCrops.includes(c.commodityName)).map(crop => (
                          <Line key={crop.commodityName} type="monotone" dataKey={crop.commodityName} stroke={crop.color} strokeWidth={2} dot={false} name={crop.name} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : chartData.length > 0 ? (
                  <div className="h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm">Chart available after 7 days of price data</span>
                    <span className="text-xs mt-1">Currently: {chartData.length} days collected</span>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-12">No price history data yet.</p>}
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm overflow-hidden">
              <div className="section-header section-header-market">📋 All Price Records</div>
              <div className="p-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border"><th className="text-left py-1.5">Date</th><th className="text-left py-1.5">Crop</th><th className="text-left py-1.5">Mandi</th><th className="text-right py-1.5">Price (₹)</th></tr></thead>
                  <tbody>
                    {prices.slice(0, visibleRows).map(p => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-1">{new Date(p.price_date).toLocaleDateString('en-IN')}</td>
                        <td className="py-1">{p.commodity}</td><td className="py-1">{p.mandi}</td>
                        <td className="text-right py-1 font-medium">₹{p.modal_price.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prices.length > visibleRows && (
                  <div className="text-center mt-3">
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => setVisibleRows(v => v + 50)}>
                      Load More ({prices.length - visibleRows} remaining)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4 mt-4">
            <div className="bg-card rounded-lg shadow-sm p-3">
              <p className="text-xs text-muted-foreground">📅 Tracking since {firstReportDate} — {reports.length} days of intelligence</p>
            </div>

            {reports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No reports yet. Reports are generated automatically on daily fetch.</p>
            ) : (
              <div className="space-y-2">
                {reports.map(report => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(report.notes || '{}'); } catch {}
                  const date = new Date(report.generated_at);
                  const isSelected = selectedReport?.id === report.id;

                  return (
                    <div key={report.id}>
                      <button
                        onClick={() => setSelectedReport(isSelected ? null : report)}
                        className="w-full bg-card rounded-lg shadow-sm p-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium">{date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="text-[10px] text-muted-foreground">{date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div className="flex gap-2 text-xs">
                            {parsed.danger_alerts > 0 && <span className="bg-danger/20 text-danger px-1.5 py-0.5 rounded-full">🔴 {parsed.danger_alerts}</span>}
                            {parsed.red_price_alerts > 0 && <span className="bg-warning/20 text-foreground px-1.5 py-0.5 rounded-full">💰 {parsed.red_price_alerts}</span>}
                            {parsed.fetched > 0 && <span className="text-muted-foreground">📊 {parsed.fetched} fetched</span>}
                          </div>
                        </div>
                      </button>
                      {isSelected && (
                        <div className="bg-muted rounded-lg p-3 mt-1 text-xs">
                          <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(parsed, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
