import { generateAllAdvisories, getPrioritySummary, type CropAlert, type ForecastDay } from '@/lib/advisoryEngine';
import { Skeleton } from '@/components/ui/skeleton';

interface AdvisorySectionProps {
  forecast?: ForecastDay[];
  isLoading: boolean;
}

function getConfidenceIndicator(level: string): { icon: string; text: string; className: string } {
  switch (level) {
    case 'DANGER':
      return { icon: '⚠️', text: 'High confidence — conditions strongly match disease pattern', className: 'text-destructive' };
    case 'WARNING':
      return { icon: '🔶', text: 'Moderate confidence', className: 'text-warning' };
    default:
      return { icon: 'ℹ️', text: 'Low confidence — preventive measure', className: 'text-info' };
  }
}

function AlertCard({ alert }: { alert: CropAlert }) {
  const cls = alert.level === 'DANGER' ? 'alert-danger' : alert.level === 'WARNING' ? 'alert-warning' : 'alert-info';
  const icon = alert.level === 'DANGER' ? '🔴' : alert.level === 'WARNING' ? '🟡' : '🔵';
  const confidence = getConfidenceIndicator(alert.level);

  return (
    <div className={cls}>
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">{alert.crop}</span>
            <span className="text-xs font-semibold">{alert.title}</span>
          </div>
          
          {/* Action - BOLD and prominent */}
          <p className="text-sm font-bold mt-1.5 text-foreground">👉 {alert.action}</p>
          
          {/* Detail - specific weather numbers that triggered the alert */}
          <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
          
          {/* Confidence indicator */}
          <div className={`text-[10px] mt-1.5 ${confidence.className}`}>
            {confidence.icon} {confidence.text}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdvisorySection({ forecast, isLoading }: AdvisorySectionProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header section-header-advisory">🌱 Crop Advisory — This Week</div>
        <div className="p-4 space-y-3">
          {[80, 64, 72].map((w, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3" style={{ width: `${w}%` }} />
              </div>
              <Skeleton className="h-2 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allAlerts = forecast ? generateAllAdvisories(forecast) : {};
  const sorted = getPrioritySummary(allAlerts);

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header section-header-advisory">🌱 Crop Advisory — This Week</div>
      <div className="p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="bg-success/10 rounded-lg p-3 text-center">
            <span className="text-sm">✅ No significant weather risks this week</span>
          </div>
        ) : (
          sorted.slice(0, 8).map((alert, i) => <AlertCard key={i} alert={alert} />)
        )}
        {sorted.length > 8 && (
          <p className="text-xs text-center text-muted-foreground">
            +{sorted.length - 8} more alerts — view all on Advisory page
          </p>
        )}
      </div>
    </div>
  );
}

export { AlertCard };