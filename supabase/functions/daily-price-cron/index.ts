import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CROPS = ['Banana', 'Tomato', 'Bitter Gourd', 'Papaya', 'Onion'];
const MANDIS = ['Nashik', 'Lasalgaon'];

const VALID_RANGES: Record<string, [number, number]> = {
  'Tomato': [200, 8000],
  'Onion': [300, 6000],
  'Banana': [500, 4000],
  'Papaya': [300, 3000],
  'Bitter Gourd': [500, 5000],
};

function validatePrice(price: number, commodity: string): boolean {
  if (!price || isNaN(price) || price <= 0) return false;
  const range = VALID_RANGES[commodity];
  if (!range) return price > 0 && price < 100000;
  return price >= range[0] && price <= range[1];
}

function isDateRecent(dateStr: string, maxDays = 30): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getTime() - d.getTime()) / 86400000 <= maxDays;
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function extractField(record: any, ...possibleKeys: string[]): string | null {
  for (const key of possibleKeys) {
    const val = record[key] ?? record[key.toLowerCase()] ?? record[key.replace(/_/g, ' ')] ?? record[key.replace(/ /g, '_')];
    if (val !== undefined && val !== null && val !== '') return String(val);
  }
  return null;
}

function parseDateFlexible(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const monMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (monMatch) return `${monMatch[3]}-${months[monMatch[2]] || '01'}-${monMatch[1].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DATAGOV_API_KEY');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    let fetched = 0, failed = 0, cached = 0, skippedInvalid = 0;
    const results: any[] = [];

    for (const commodity of CROPS) {
      for (const mandi of MANDIS) {
        try {
          if (!apiKey) {
            failed++;
            results.push({ commodity, mandi, error: 'No API key' });
            continue;
          }

          const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
          url.searchParams.set('api-key', apiKey);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '10');
          url.searchParams.set('filters[State.keyword]', 'Maharashtra');
          url.searchParams.set('filters[Market Name]', mandi);
          url.searchParams.set('filters[Commodity]', commodity);

          const res = await fetch(url.toString());
          const data = await res.json();

          if (!data.records || data.records.length === 0) {
            cached++;
            results.push({ commodity, mandi, cached: true });
            await delay(500);
            continue;
          }

          const sortedRecords = data.records.sort((a: any, b: any) => {
            const dateA = parseDateFlexible(extractField(a, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '');
            const dateB = parseDateFlexible(extractField(b, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '');
            return dateB.localeCompare(dateA);
          });

          let upserted = false;
          for (const record of sortedRecords) {
            const arrivalDate = extractField(record, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '';
            const priceDate = parseDateFlexible(arrivalDate);
            const modalPrice = parseFloat(extractField(record, 'Modal_Price', 'Modal Price', 'modal_price') ?? '0');

            if (!isDateRecent(priceDate)) { skippedInvalid++; continue; }
            if (!validatePrice(modalPrice, commodity)) { skippedInvalid++; continue; }

            const priceRecord = {
              price_date: priceDate, commodity, mandi,
              min_price: parseFloat(extractField(record, 'Min_Price', 'Min Price', 'min_price') ?? '0') || null,
              max_price: parseFloat(extractField(record, 'Max_Price', 'Max Price', 'max_price') ?? '0') || null,
              modal_price: modalPrice,
              arrivals_qtl: parseFloat(extractField(record, 'Arrivals', 'arrivals', 'Arrival_Qty', 'Total Arrival') ?? '0') || null,
              source: 'data.gov.in',
            };

            await supabase.from('daily_prices').upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });
            fetched++;
            results.push({ commodity, mandi, cached: false, data: priceRecord });
            upserted = true;
            break;
          }

          if (!upserted) {
            cached++;
            results.push({ commodity, mandi, error: 'No valid records' });
          }
        } catch (e) {
          failed++;
          results.push({ commodity, mandi, error: e.message });
        }
        await delay(500);
      }
    }

    // Check for danger alerts
    let dangerAlerts = 0;
    let redPriceAlerts = 0;

    try {
      const { data: weather } = await supabase
        .from('weather_cache')
        .select('*')
        .gte('forecast_date', new Date().toISOString().split('T')[0])
        .order('forecast_date', { ascending: true })
        .limit(10);

      if (weather && weather.length > 0) {
        for (const day of weather) {
          if (day.wind_kmh > 40) dangerAlerts++;
          if (day.humidity_max > 80 && day.rain_mm > 5) dangerAlerts++;
          if (day.temp_min >= 15 && day.temp_min <= 25 && day.humidity_max > 80) dangerAlerts++;
        }
      }

      for (const commodity of CROPS) {
        for (const mandi of MANDIS) {
          const { data: stats } = await supabase.rpc('get_price_stats', { p_commodity: commodity, p_mandi: mandi });
          if (stats && stats.length > 0 && stats[0].avg_90d && stats[0].current_price) {
            const pct = ((stats[0].current_price - stats[0].avg_90d) / stats[0].avg_90d) * 100;
            if (pct <= -30) redPriceAlerts++;
          }
        }
      }
    } catch {}

    // Log to report_history
    const notes = JSON.stringify({
      fetched, failed, cached, skipped_invalid: skippedInvalid,
      danger_alerts: dangerAlerts,
      red_price_alerts: redPriceAlerts,
      timestamp: new Date().toISOString(),
    });
    await supabase.from('report_history').insert({ notes });

    // Send Telegram report if configured
    try {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
      const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
      if (botToken && chatId) {
        const summary = `🌾 *KisanMitra Daily Update*\n📊 Prices: ${fetched} fetched, ${cached} cached, ${failed} failed\n⚠️ Danger alerts: ${dangerAlerts}\n🔴 Price crashes: ${redPriceAlerts}`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: summary, parse_mode: 'Markdown' }),
        });
      }
    } catch {}

    return new Response(JSON.stringify({ fetched, failed, cached, skipped_invalid: skippedInvalid, danger_alerts: dangerAlerts, red_price_alerts: redPriceAlerts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
