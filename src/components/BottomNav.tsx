import { NavLink, useLocation } from 'react-router-dom';
import { Home, TrendingUp, Leaf, Settings } from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Dashboard', emoji: '🏠' },
  { to: '/market', icon: TrendingUp, label: 'Market', emoji: '💰' },
  { to: '/advisory', icon: Leaf, label: 'Advisory', emoji: '🌱' },
  { to: '/settings', icon: Settings, label: 'Settings', emoji: '⚙️' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden print:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map(item => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[64px] rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
