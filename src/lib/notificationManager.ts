const NOTIFICATION_COOLDOWNS: Record<string, number> = {
  'DANGER_WEATHER': 6 * 60 * 60 * 1000,
  'RED_PRICE': 12 * 60 * 60 * 1000,
  'GREEN_PRICE': 4 * 60 * 60 * 1000,
  'STALE_DATA': 24 * 60 * 60 * 1000,
};

function shouldNotify(type: string): boolean {
  const key = `notif_last_${type}`;
  const last = parseInt(localStorage.getItem(key) ?? '0');
  return Date.now() - last > (NOTIFICATION_COOLDOWNS[type] ?? 12 * 60 * 60 * 1000);
}

function markNotified(type: string) {
  localStorage.setItem(`notif_last_${type}`, Date.now().toString());
}

export function smartCheckAndNotify(
  alerts: { level: string; title: string; crop: string; action: string }[],
  trends?: { alert_level: string; commodity: string; mandi: string; current_price: number; pct_vs_90d: number }[]
) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  if (localStorage.getItem('notifications_enabled') !== 'true') return;

  // DANGER weather alerts
  const dangerAlerts = alerts.filter(a => a.level === 'DANGER');
  if (dangerAlerts.length > 0 && shouldNotify('DANGER_WEATHER')) {
    const top = dangerAlerts[0];
    new Notification(`🔴 ${top.crop} Alert — KisanMitra`, {
      body: top.action,
      icon: '/favicon.ico',
      tag: 'danger-weather',
    });
    markNotified('DANGER_WEATHER');
  }

  if (!trends) return;

  // GREEN price opportunity
  const greenCrops = trends.filter(t => t.alert_level === 'GREEN');
  if (greenCrops.length > 0 && shouldNotify('GREEN_PRICE')) {
    const top = greenCrops[0];
    new Notification(`💰 Sell Opportunity — ${top.commodity}`, {
      body: `${top.commodity} at ${top.mandi} is ₹${top.current_price}/qtl — ${top.pct_vs_90d.toFixed(0)}% above average. Sell now!`,
      icon: '/favicon.ico',
      tag: 'green-price',
    });
    markNotified('GREEN_PRICE');
  }

  // RED price crash
  const redCrops = trends.filter(t => t.alert_level === 'RED');
  if (redCrops.length > 0 && shouldNotify('RED_PRICE')) {
    const top = redCrops[0];
    new Notification(`⚠️ Price Crash — ${top.commodity}`, {
      body: `${top.commodity} at ${top.mandi} is ${Math.abs(top.pct_vs_90d).toFixed(0)}% below average.`,
      icon: '/favicon.ico',
      tag: 'red-price',
    });
    markNotified('RED_PRICE');
  }
}
