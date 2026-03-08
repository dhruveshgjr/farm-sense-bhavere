import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';

export function NotificationSettings() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem('notifications_enabled') === 'true');
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (checked && 'Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        localStorage.setItem('notifications_enabled', 'true');
        setEnabled(true);
      }
    } else {
      localStorage.setItem('notifications_enabled', 'false');
      setEnabled(false);
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm p-4">
      <h2 className="text-sm font-bold mb-3">🔔 Notifications</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Enable Alerts</p>
          <p className="text-xs text-muted-foreground">Get alerts for dangerous weather and price crashes</p>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={permission === 'denied'}
        />
      </div>
      {permission === 'denied' && (
        <p className="text-xs text-danger mt-2">Notifications blocked by browser. Enable in browser settings.</p>
      )}
    </div>
  );
}

export function checkAndNotify(alerts: { level: string; title: string; crop: string; action: string }[]) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('notifications_enabled') !== 'true') return;

  const lastNotified = localStorage.getItem('last_notification_time');
  const twelveHours = 12 * 60 * 60 * 1000;
  if (lastNotified && Date.now() - parseInt(lastNotified) < twelveHours) return;

  const dangerAlerts = alerts.filter(a => a.level === 'DANGER').slice(0, 3);
  if (dangerAlerts.length === 0) return;

  localStorage.setItem('last_notification_time', String(Date.now()));

  for (const alert of dangerAlerts) {
    new Notification('🔴 KisanMitra Alert', {
      body: `${alert.crop}: ${alert.title} — ${alert.action}`,
      icon: '/favicon.ico',
    });
  }
}
