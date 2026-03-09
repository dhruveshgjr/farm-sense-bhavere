import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Leaf, Settings, FileText, Download } from 'lucide-react';
import { useWeather } from '@/hooks/useWeather';
import { generateAllAdvisories, getPrioritySummary } from '@/lib/advisoryEngine';

const navItems = [
  { to: '/', icon: FileText, label: 'Today', emoji: '📋' },
  { to: '/dashboard', icon: Home, label: 'Dashboard', emoji: '🏠' },
  { to: '/import', icon: Download, label: 'Import', emoji: '📥' },
  { to: '/market', icon: TrendingUp, label: 'Market', emoji: '💰' },
  { to: '/advisory', icon: Leaf, label: 'Advisory', emoji: '🌱' },
  { to: '/settings', icon: Settings, label: 'Settings', emoji: '⚙️' },
];

export function BottomNav() {
  const location = useLocation();
  const { data: weather } = useWeather();

  let alertCount = 0;
  if (weather) {
    const allAlerts = generateAllAdvisories(weather);
    const sorted = getPrioritySummary(allAlerts);
    alertCount = sorted.filter(a => a.level === 'DANGER' || a.level === 'WARNING').length;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 min-w-[48px] rounded-lg transition-colors relative ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className={`text-[8px] font-medium ${!isActive ? 'hidden min-[420px]:block' : ''}`}>{item.label}</span>
              {item.to === '/advisory' && alertCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
