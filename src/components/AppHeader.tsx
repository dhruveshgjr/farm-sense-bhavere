import { RefreshCw, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, getAvgPrice, type PriceRecord } from '@/hooks/usePrices';
import type { WeatherDay } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';
import { getWeatherEmoji } from '@/lib/farmConfig';
import { computeAlertLevel, getSellSignal, getSeasonalContext } from '@/lib/trendEngine';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';

interface AppHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;
  prices?: PriceRecord[];
  weather?: WeatherDay[];
}

const navItems = [
  { to: '/', label: 'Today' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/import', label: 'Import' },
  { to: '/market', label: 'Market' },
  { to: '/advisory', label: 'Advisory' },
  { to: '/settings', label: 'Settings' },
];

const CROP_EMOJI: Record<string, string> = {
  'Tomato': '🍅', 'Onion': '🧅', 'Banana': '🍌', 'Bitter Gourd': '🥒', 'Papaya': '🍈',
};

function buildWhatsAppReport(prices: PriceRecord[], weather?: WeatherDay[]): string {
  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const month = today.getMonth() + 1;

  let text = `🌾 *KisanMitra Report — ${dateStr}*\n📍 Bhavere, Nashik\n━━━━━━━━━━━━━━━━\n💰 *Today's Mandi Prices*\n━━━━━━━━━━━━━━━━\n`;

  for (const crop of CROPS) {
    const mainMandi = crop.commodityName === 'Onion' ? 'Lasalgaon' : 'Nashik';
    const p = getLatestPrice(prices, crop.commodityName, mainMandi);
    const avg30 = getAvgPrice(prices, crop.commodityName, 30);
    let arrow = '→';
    if (p && avg30) {
      const pct = ((p.modal_price - avg30) / avg30) * 100;
      arrow = pct > 5 ? '▲' : pct < -5 ? '▼' : '→';
    }
    const emoji = CROP_EMOJI[crop.commodityName] || '🌾';
    text += `${emoji} ${crop.name} (${mainMandi}): ${p ? `₹${p.modal_price.toLocaleString()}/qtl ${arrow}` : 'N/A'}\n`;
  }

  if (weather && weather.length >= 3) {
    text += `\n━━━━━━━━━━━━━━━━\n🌤 *Weather (Next 3 Days)*\n━━━━━━━━━━━━━━━━\n`;
    for (let i = 0; i < 3; i++) {
      const d = weather[i];
      const dt = new Date(d.forecast_date);
      const label = dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      text += `${getWeatherEmoji(d.weathercode)} ${label}: ${Math.round(d.temp_min)}–${Math.round(d.temp_max)}°C, 💧${d.rain_mm.toFixed(1)}mm\n`;
    }
  }

  if (weather) {
    const alerts = getPrioritySummary(generateAllAdvisories(weather));
    text += `\n━━━━━━━━━━━━━━━━\n⚠️ *Alerts*\n━━━━━━━━━━━━━━━━\n`;
    if (alerts.length === 0) {
      text += `✅ No significant alerts\n`;
    } else {
      const icons: Record<string, string> = { DANGER: '🔴', WARNING: '🟡', INFO: '🔵' };
      alerts.slice(0, 3).forEach(a => {
        text += `${icons[a.level] || '🔵'} ${a.crop}: ${a.title}\n`;
      });
    }
  }

  // Sell signals
  const sellLines: string[] = [];
  for (const crop of CROPS) {
    const mainMandi = crop.commodityName === 'Onion' ? 'Lasalgaon' : 'Nashik';
    const p = getLatestPrice(prices, crop.commodityName, mainMandi);
    const avg90 = getAvgPrice(prices, crop.commodityName, 90);
    const alertLevel = computeAlertLevel(p?.modal_price ?? null, avg90);
    const season = getSeasonalContext(crop.commodityName, month);
    const signal = getSellSignal(p?.modal_price ?? null, avg90, alertLevel, season.season);
    if (signal.signal === 'SELL NOW' || signal.signal === 'FORCED SELL') {
      sellLines.push(`${CROP_EMOJI[crop.commodityName]} ${crop.name}: ${signal.signal} — ${signal.reason}`);
    }
  }
  if (sellLines.length > 0) {
    text += `\n━━━━━━━━━━━━━━━━\n📊 *Sell Signals*\n━━━━━━━━━━━━━━━━\n`;
    text += sellLines.join('\n') + '\n';
  }

  text += `\n🌾 KisanMitra — Bhavere Farm Intelligence`;
  return text;
}

export function AppHeader({ onRefresh, isRefreshing, refreshLabel, prices = [], weather }: AppHeaderProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const handlePrint = () => window.open('/report-print', '_blank');

  const handleShare = () => {
    const text = buildWhatsAppReport(prices, weather);
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <header className="bg-primary sticky top-0 z-50 print:static">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-primary-foreground">
              🌾 KisanMitra
            </h1>
            <p className="text-xs md:text-sm text-primary-foreground/80">
              Bhavere, Nashik — Personal Farm Intelligence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <DataFreshnessIndicator onRefresh={onRefresh} />
            <Button size="sm" variant="secondary" onClick={handlePrint} className="text-xs print:hidden">
              <FileText className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Generate Report</span>
            </Button>
            <Button size="sm" variant="secondary" onClick={handleShare} className="text-xs print:hidden">
              <Share2 className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {onRefresh && (
              <Button size="sm" variant="secondary" onClick={onRefresh} disabled={isRefreshing} className="text-xs print:hidden">
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? (refreshLabel || 'Fetching...') : 'Refresh All'}
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-primary-foreground/60 mt-1">{today}</p>

        <nav className="hidden md:flex gap-1 mt-2 print:hidden">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
