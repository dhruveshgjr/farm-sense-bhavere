type Lang = 'en' | 'mr';

const translations: Record<string, Record<Lang, string>> = {
  // Navigation
  'nav.today': { en: 'Today', mr: 'आज' },
  'nav.dashboard': { en: 'Dashboard', mr: 'डॅशबोर्ड' },
  'nav.market': { en: 'Market', mr: 'बाजार' },
  'nav.advisory': { en: 'Advisory', mr: 'सल्ला' },
  'nav.history': { en: 'History', mr: 'इतिहास' },
  'nav.settings': { en: 'Settings', mr: 'सेटिंग्ज' },

  // Section headers
  'section.weather': { en: '10-Day Weather Forecast', mr: '१०-दिवसीय हवामान अंदाज' },
  'section.market': { en: 'Market Pulse — Current Mandi Prices', mr: 'बाजार नाडी — आजचे मंडी भाव' },
  'section.trends': { en: 'Price Trend Analysis', mr: 'किंमत ट्रेंड विश्लेषण' },
  'section.advisory': { en: 'Crop Advisory — This Week', mr: 'पीक सल्ला — या आठवड्यात' },
  'section.opportunities': { en: 'Market Opportunities & Alerts', mr: 'बाजार संधी आणि इशारे' },
  'section.aiAdvisor': { en: 'AI Farm Advisor', mr: 'AI शेती सल्लागार' },
  'section.supplyIntel': { en: 'Supply Intelligence', mr: 'पुरवठा बुद्धिमत्ता' },
  'section.cropCalendar': { en: 'Crop Activity Calendar', mr: 'पीक क्रिया दिनदर्शिका' },

  // Sell signals
  'signal.sellNow': { en: 'SELL NOW', mr: 'आत्ता विका' },
  'signal.hold': { en: 'HOLD', mr: 'थांबा' },
  'signal.wait': { en: 'WAIT', mr: 'वाट पाहा' },
  'signal.forcedSell': { en: 'FORCED SELL', mr: 'विकणे आवश्यक' },
  'signal.noData': { en: 'NO DATA', mr: 'माहिती नाही' },
  'signal.noHistory': { en: 'NO HISTORY YET', mr: 'इतिहास नाही' },

  // Season
  'season.high': { en: 'HIGH', mr: 'चांगला काळ' },
  'season.low': { en: 'LOW', mr: 'कमी भाव' },
  'season.neutral': { en: 'NEUTRAL', mr: 'सामान्य' },

  // Alert levels
  'alert.danger': { en: 'DANGER', mr: 'धोका' },
  'alert.warning': { en: 'WARNING', mr: 'इशारा' },
  'alert.info': { en: 'INFO', mr: 'माहिती' },

  // Data freshness
  'freshness.live': { en: 'Live', mr: 'थेट' },
  'freshness.recent': { en: 'Recent', mr: 'ताजे' },
  'freshness.aging': { en: 'Aging', mr: 'जुने होत आहे' },
  'freshness.stale': { en: 'Stale', mr: 'जुने' },

  // Crops
  'crop.Banana': { en: 'Banana', mr: 'केळ' },
  'crop.Tomato': { en: 'Tomato', mr: 'टोमॅटो' },
  'crop.Bitter Gourd': { en: 'Bitter Gourd', mr: 'करेला' },
  'crop.Papaya': { en: 'Papaya', mr: 'पपई' },
  'crop.Onion': { en: 'Onion', mr: 'कांदा' },

  // Weather
  'weather.rain': { en: 'Rain', mr: 'पाऊस' },
  'weather.wind': { en: 'Wind', mr: 'वारा' },
  'weather.maxTemp': { en: 'Max Temp', mr: 'जास्तीत जास्त तापमान' },
  'weather.rainyDays': { en: 'Rainy days', mr: 'पावसाळी दिवस' },

  // Buttons
  'btn.refreshAll': { en: 'Refresh All Data', mr: 'सर्व डेटा रिफ्रेश करा' },
  'btn.generateReport': { en: 'Generate Report', mr: 'अहवाल तयार करा' },
  'btn.shareWhatsApp': { en: 'Share via WhatsApp', mr: 'WhatsApp वर शेअर करा' },
  'btn.fetchPrices': { en: 'Fetch Latest Prices', mr: 'ताज्या किंमती आणा' },
  'btn.loadHistory': { en: 'Load 90-Day History', mr: '९०-दिवसीय इतिहास लोड करा' },
  'btn.runNow': { en: 'Run Now', mr: 'आत्ता चालवा' },
  'btn.refreshAdvice': { en: 'Refresh Advice', mr: 'सल्ला रिफ्रेश करा' },

  // Settings
  'settings.systemHealth': { en: 'System Health', mr: 'सिस्टम आरोग्य' },
  'settings.automationStatus': { en: 'Automation Status', mr: 'स्वयंचलन स्थिती' },
  'settings.telegram': { en: 'Telegram Delivery', mr: 'टेलिग्राम डिलिव्हरी' },
  'settings.manualEntry': { en: 'Manual Price Entry', mr: 'किंमत स्वहस्ते टाका' },

  // Empty states
  'empty.noWeatherRisk': { en: 'No significant weather risks this week', mr: 'या आठवड्यात कोणतेही हवामान धोके नाहीत' },
  'empty.pricesNormal': { en: 'All crop prices within normal range', mr: 'सर्व पिकांच्या किंमती सामान्य आहेत' },
  'empty.chartAfter7': { en: 'Chart available after 7 days of price data', mr: '७ दिवसांनंतर चार्ट उपलब्ध होईल' },

  // Toasts
  'toast.dataFetchFailed': { en: 'Data fetch failed', mr: 'डेटा मिळवणे अयशस्वी' },
  'toast.priceSaved': { en: 'Price saved', mr: 'किंमत जतन केली' },
  'toast.reportSent': { en: 'Report sent', mr: 'अहवाल पाठवला' },

  // Today page
  'today.priority': { en: "Today's Priority", mr: 'आजचे प्राधान्य' },
  'today.clearDay': { en: 'Clear day — normal farm operations', mr: 'सामान्य दिवस — नेहमीची शेती कामे' },
  'today.weatherToday': { en: 'Weather Today', mr: 'आजचे हवामान' },
  'today.bestSell': { en: 'Best Sell Today', mr: 'आज सर्वोत्तम विक्री' },
  'today.topAlert': { en: 'Top Alert', mr: 'मुख्य इशारा' },
  'today.noAlerts': { en: 'No alerts', mr: 'इशारे नाहीत' },
  'today.fullDashboard': { en: 'Full Dashboard', mr: 'पूर्ण डॅशबोर्ड' },
  'today.marketPrices': { en: 'Market Prices', mr: 'बाजार भाव' },
  'today.allAdvisories': { en: 'All Advisories', mr: 'सर्व सल्ले' },
  'today.shareReport': { en: 'Share Report', mr: 'अहवाल शेअर करा' },
  'today.lastUpdated': { en: 'Last updated', mr: 'शेवटचे अपडेट' },

  // Misc
  'misc.bhavereNashik': { en: 'Bhavere, Nashik', mr: 'भावेरे, नाशिक' },
  'misc.noData': { en: 'No data', mr: 'माहिती नाही' },
};

export function t(key: string, lang?: Lang): string {
  const l = lang || getLanguage();
  return translations[key]?.[l] || translations[key]?.en || key;
}

export function getLanguage(): Lang {
  return (localStorage.getItem('kisanmitra_language') as Lang) || 'en';
}

export function setLanguage(lang: Lang) {
  localStorage.setItem('kisanmitra_language', lang);
}

export function getCropName(commodityName: string, lang?: Lang): string {
  const l = lang || getLanguage();
  return translations[`crop.${commodityName}`]?.[l] || commodityName;
}

export function getSignalText(signal: string, lang?: Lang): string {
  const l = lang || getLanguage();
  const map: Record<string, string> = {
    'SELL NOW': t('signal.sellNow', l),
    'HOLD': t('signal.hold', l),
    'WAIT': t('signal.wait', l),
    'FORCED SELL': t('signal.forcedSell', l),
    'NO DATA': t('signal.noData', l),
    'NO HISTORY YET': t('signal.noHistory', l),
  };
  return map[signal] || signal;
}

export function getSeasonText(season: string, lang?: Lang): string {
  const l = lang || getLanguage();
  const map: Record<string, string> = {
    'HIGH': t('season.high', l),
    'LOW': t('season.low', l),
    'NEUTRAL': t('season.neutral', l),
  };
  return map[season] || season;
}

export type { Lang };
