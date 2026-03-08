import { RefreshCw, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import { CROPS, MANDIS } from '@/lib/farmConfig';
import { getLatestPrice, type PriceRecord } from '@/hooks/usePrices';
import type { WeatherDay } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';

interface AppHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  refreshLabel?: string;
  prices?: PriceRecord[];
  weather?: WeatherDay[];
}

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/market', label: 'Market' },
  { to: '/advisory', label: 'Advisory' },
  { to: '/settings', label: 'Settings' },
];

function buildWhatsAppSummary(prices: PriceRecord[], weather?: WeatherDay[]): string {
  const today = new Date().toLocaleDateString('en-IN');
  let text = `🌾 KisanMitra Report - ${today}\n📍 Bhavere, Nashik\n\n`;

  if (weather && weather.length > 0) {
    const rainyDays = weather.slice(0, 7).filter(d => d.rain_mm > 1).length;
    const maxTemp = Math.max(...weather.map(d => d.temp_max));
    text += `🌤 Weather: ${rainyDays} rainy days ahead, max ${Math.round(maxTemp)}°C\n\n`;
  }

  text += `💰 Prices today:\n`;
  for (const crop of CROPS) {
    for (const mandi of MANDIS) {
      const p = getLatestPrice(prices, crop.commodityName, mandi);
      if (p) text += `${crop.name} (${mandi}): ₹${p.modal_price.toLocaleString()}\n`;
    }
  }

  if (weather) {
    const alerts = getPrioritySummary(generateAllAdvisories(weather));
    text += `\n⚠️ Alerts: ${alerts.length} crop warnings this week`;
    const danger = alerts.find(a => a.level === 'DANGER');
    if (danger) text += `\n🔴 ${danger.title}`;
  }

  return text;
}

export function AppHeader({ onRefresh, isRefreshing, refreshLabel, prices = [], weather }: AppHeaderProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const text = buildWhatsAppSummary(prices, weather);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
              Bhavere Village, Nashik — Personal Farm Intelligence
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
              <span className="text-xs text-primary-foreground/80">Live</span>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handlePrint}
              className="text-xs print:hidden"
            >
              <FileText className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Report</span>
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleShare}
              className="text-xs print:hidden"
            >
              <Share2 className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            {onRefresh && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-xs print:hidden"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? (refreshLabel || 'Fetching...') : 'Refresh'}
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-primary-foreground/60 mt-1">{today}</p>

        {/* Desktop nav */}
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
