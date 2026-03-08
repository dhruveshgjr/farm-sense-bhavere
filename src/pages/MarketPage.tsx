import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CROPS } from '@/lib/farmConfig';
import { usePriceHistory, type PriceRecord } from '@/hooks/usePrices';
import { computeVolatility } from '@/lib/trendEngine';
import { MandiComparison } from '@/components/dashboard/MandiComparison';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 365 },
];

const MarketPage = () => {
  const [range, setRange] = useState(30);
  const { data: prices = [], isLoading } = usePriceHistory(range);

  useEffect(() => { document.title = 'KisanMitra — Market Prices'; }, []);

  const exportCsv = (commodity: string) => {
    const rows = prices.filter(p => p.commodity === commodity);
    const csv = ['Date,Mandi,Min,Modal,Max', ...rows.map(r =>
      `${r.price_date},${r.mandi},${r.min_price ?? ''},${r.modal_price},${r.max_price ?? ''}`
    )].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${commodity}_prices.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <AppHeader />
      <main className="container mx-auto px-3 py-4 max-w-2xl space-y-4">
        <div className="flex gap-2">
          {RANGES.map(r => (
            <Button key={r.label} size="sm" variant={range === r.days ? 'default' : 'outline'} onClick={() => setRange(r.days)} className="text-xs">{r.label}</Button>
          ))}
        </div>

        <MandiComparison prices={prices} />

        {CROPS.map(crop => {
          const cropPrices = prices.filter(p => p.commodity === crop.commodityName).sort((a, b) => a.price_date.localeCompare(b.price_date));
          const chartPrices = cropPrices.map(p => ({ date: new Date(p.price_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), price: p.modal_price, mandi: p.mandi }));
          const arrivalData = cropPrices.filter(p => p.arrivals_qtl && p.arrivals_qtl > 0).map(p => ({ date: new Date(p.price_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), arrivals: p.arrivals_qtl }));
          const vol = computeVolatility(cropPrices.map(p => p.modal_price));
          const volColor = vol.label === 'High' ? 'text-danger' : vol.label === 'Medium' ? 'text-warning' : 'text-success';

          return (
            <div key={crop.name} className="bg-card rounded-lg shadow-sm overflow-hidden">
              <div className="section-header section-header-market flex items-center justify-between">
                <span>{crop.name} ({crop.localName})<span className={`ml-2 text-[10px] ${volColor}`}>Vol: {vol.score.toFixed(0)}% ({vol.label})</span></span>
                <button onClick={() => exportCsv(crop.commodityName)} className="text-[10px] underline opacity-80">Export CSV</button>
              </div>
              <div className="p-3">
                {isLoading ? <Skeleton className="h-48 w-full" /> : chartPrices.length >= 7 ? (
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartPrices}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="price" stroke={crop.color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : chartPrices.length > 0 ? (
                  <div className="h-48 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                    <span className="text-2xl mb-2">📊</span>
                    <span className="text-sm">Chart available after 7 days of price data</span>
                    <span className="text-xs mt-1">Currently: {chartPrices.length} days collected</span>
                  </div>
                ) : <p className="text-sm text-muted-foreground text-center py-8">No price data available</p>}

                {arrivalData.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold mb-1">Daily Arrivals at Mandi (Quintals)</h4>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={arrivalData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                          <YAxis tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Bar dataKey="arrivals" fill="hsl(var(--info))" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {chartPrices.length > 0 && (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-border"><th className="text-left py-1">Date</th><th className="text-left py-1">Mandi</th><th className="text-right py-1">Price (₹/qtl)</th></tr></thead>
                      <tbody>
                        {prices.filter(p => p.commodity === crop.commodityName).slice(0, 10).map(p => (
                          <tr key={p.id} className="border-b border-border/50">
                            <td className="py-1">{new Date(p.price_date).toLocaleDateString('en-IN')}</td>
                            <td className="py-1">{p.mandi}</td>
                            <td className="text-right py-1 font-medium">₹{p.modal_price.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </main>
      <BottomNav />
    </div>
  );
};

export default MarketPage;
