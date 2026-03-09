// English-only translations — Marathi removed
const translations: Record<string, string> = {
  // Navigation
  'nav.today': 'Today',
  'nav.dashboard': 'Dashboard',
  'nav.market': 'Market',
  'nav.advisory': 'Advisory',
  'nav.history': 'History',
  'nav.settings': 'Settings',
  'nav.import': 'Import',

  // Section headers
  'section.weather': '10-Day Weather Forecast',
  'section.market': 'Market Pulse — Current Mandi Prices',
  'section.trends': 'Price Trend Analysis',
  'section.advisory': 'Crop Advisory — This Week',
  'section.opportunities': 'Market Opportunities & Alerts',
  'section.aiAdvisor': 'AI Farm Advisor',
  'section.supplyIntel': 'Supply Intelligence',
  'section.cropCalendar': 'Crop Activity Calendar',

  // Sell signals
  'signal.sellNow': 'SELL NOW',
  'signal.hold': 'HOLD',
  'signal.wait': 'WAIT',
  'signal.forcedSell': 'FORCED SELL',
  'signal.noData': 'NO DATA',
  'signal.noHistory': 'NO HISTORY YET',

  // Season
  'season.high': 'HIGH',
  'season.low': 'LOW',
  'season.neutral': 'NEUTRAL',

  // Alert levels
  'alert.danger': 'DANGER',
  'alert.warning': 'WARNING',
  'alert.info': 'INFO',

  // Data freshness
  'freshness.live': 'Live',
  'freshness.recent': 'Recent',
  'freshness.aging': 'Aging',
  'freshness.stale': 'Stale',

  // Crops
  'crop.Banana': 'Banana',
  'crop.Tomato': 'Tomato',
  'crop.Bitter Gourd': 'Bitter Gourd',
  'crop.Papaya': 'Papaya',
  'crop.Onion': 'Onion',

  // Weather
  'weather.rain': 'Rain',
  'weather.wind': 'Wind',
  'weather.maxTemp': 'Max Temp',
  'weather.rainyDays': 'Rainy days',

  // Buttons
  'btn.refreshAll': 'Refresh All Data',
  'btn.generateReport': 'Generate Report',
  'btn.shareWhatsApp': 'Share via WhatsApp',
  'btn.fetchPrices': 'Fetch Latest Prices',
  'btn.loadHistory': 'Load 90-Day History',
  'btn.runNow': 'Run Now',
  'btn.refreshAdvice': 'Refresh Advice',

  // Settings
  'settings.systemHealth': 'System Health',
  'settings.automationStatus': 'Automation Status',
  'settings.telegram': 'Telegram Delivery',
  'settings.manualEntry': 'Manual Price Entry',

  // Empty states
  'empty.noWeatherRisk': 'No significant weather risks this week',
  'empty.pricesNormal': 'All crop prices within normal range',
  'empty.chartAfter7': 'Chart available after 7 days of price data',

  // Toasts
  'toast.dataFetchFailed': 'Data fetch failed',
  'toast.priceSaved': 'Price saved',
  'toast.reportSent': 'Report sent',

  // Today page
  'today.priority': "Today's Priority",
  'today.clearDay': 'No critical actions today — normal farm operations',
  'today.weatherToday': 'Weather Today',
  'today.bestSell': 'Best Sell Today',
  'today.topAlert': 'Top Alert',
  'today.noAlerts': 'No alerts',
  'today.fullDashboard': 'Full Dashboard',
  'today.marketPrices': 'Market Prices',
  'today.allAdvisories': 'All Advisories',
  'today.shareReport': 'Share Report',
  'today.lastUpdated': 'Last updated',
  'today.aiGenerated': '🤖 AI generated',
  'today.criticalAlert': '🔴 Critical alert',
  'today.weatherWarning': '🟡 Weather warning',
  'today.clear': '✅ Clear',
  'today.addApiKey': 'Add DATAGOV_API_KEY to see sell signals',

  // Misc
  'misc.bhavereNashik': 'Bhavere, Nashik',
  'misc.noData': 'No data',

  // Setup banners
  'setup.needApiKey': '⚠️ KisanMitra needs setup: Add DATAGOV_API_KEY to get live mandi prices',
  'setup.openSettings': 'Open Settings →',
  'setup.needHistory': '📊 No price history yet. Go to Settings → Load 90-Day History to activate trend analysis and sell signals.',
  'setup.goToSettings': 'Go to Settings →',

  // Smart Advisor
  'smart_advisor': 'Smart Advisor',
  'smart_advisor_badge': '🧠 Smart Advisor',
  'using_public_data': 'Using public data source',
  'no_key_needed': 'No key needed',
  'smart_advisor_active': 'Smart Advisor active',
};

export function t(key: string): string {
  return translations[key] || key;
}

export function getCropName(commodityName: string): string {
  return translations[`crop.${commodityName}`] || commodityName;
}

export function getSignalText(signal: string): string {
  const map: Record<string, string> = {
    'SELL NOW': t('signal.sellNow'),
    'HOLD': t('signal.hold'),
    'WAIT': t('signal.wait'),
    'FORCED SELL': t('signal.forcedSell'),
    'NO DATA': t('signal.noData'),
    'NO HISTORY YET': t('signal.noHistory'),
  };
  return map[signal] || signal;
}

export function getSeasonText(season: string): string {
  const map: Record<string, string> = {
    'HIGH': t('season.high'),
    'LOW': t('season.low'),
    'NEUTRAL': t('season.neutral'),
  };
  return map[season] || season;
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-IN');
}
