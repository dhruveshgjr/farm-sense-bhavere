import { RefreshCw, FileText, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';
import type { PriceRecord } from '@/hooks/usePrices';
import type { WeatherDay } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary, computeSprayWindows, computeDiseaseRisks } from '@/lib/advisoryEngine';
import { DataFreshnessIndicator } from '@/components/DataFreshnessIndicator';
import { generateWhatsAppReport } from '@/lib/reportGenerator';

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

export function AppHeader({ onRefresh, isRefreshing, refreshLabel, prices = [], weather }: AppHeaderProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const handlePrint = () => window.open('/report-print', '_blank');

  const handleShare = () => {
    const month = new Date().getMonth() + 1;
    const forecast = weather || [];
    const allAlerts = generateAllAdvisories(forecast);
    const alerts = getPrioritySummary(allAlerts);
    const sprayWindows = computeSprayWindows(forecast);
    const diseaseRisks = computeDiseaseRisks(forecast);
    
    const report = generateWhatsAppReport(forecast, prices, alerts, sprayWindows, diseaseRisks, month);
    
    const isMobile = /Android|iPhone/i.test(navigator.userAgent);
    const url = isMobile
      ? `whatsapp://send?text=${encodeURIComponent(report.text)}`
      : `https://wa.me/?text=${encodeURIComponent(report.text)}`;
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
