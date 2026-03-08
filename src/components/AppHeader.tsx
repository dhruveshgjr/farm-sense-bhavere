import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavLink } from 'react-router-dom';

interface AppHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/market', label: 'Market' },
  { to: '/advisory', label: 'Advisory' },
  { to: '/history', label: 'History' },
];

export function AppHeader({ onRefresh, isRefreshing }: AppHeaderProps) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="bg-primary sticky top-0 z-50">
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
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse-dot" />
              <span className="text-xs text-primary-foreground/80">Live</span>
            </div>
            {onRefresh && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-primary-foreground/60 mt-1">{today}</p>

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1 mt-2">
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
