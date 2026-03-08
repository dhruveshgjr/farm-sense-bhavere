import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractField(record: any, ...possibleKeys: string[]): string | null {
  for (const key of possibleKeys) {
    const val = record[key] ?? record[key.toLowerCase()] ?? record[key.replace(/_/g, ' ')] ?? record[key.replace(/ /g, '_')];
    if (val !== undefined && val !== null && val !== '') return String(val);
  }
  return null;
}

function parseDateFlexible(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  // ISO: 2025-03-01
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.split('T')[0];
  // DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (slashMatch) return `${slashMatch[3]}-${slashMatch[2].padStart(2, '0')}-${slashMatch[1].padStart(2, '0')}`;
  // DD-Mon-YYYY
  const months: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const monMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (monMatch) return `${monMatch[3]}-${months[monMatch[2]] || '01'}-${monMatch[1].padStart(2, '0')}`;
  return new Date().toISOString().split('T')[0];
}

function formatDateForAPI(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { commodity, mandi, days = 90 } = await req.json();
    const apiKey = Deno.env.get('DATAGOV_API_KEY');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'DATAGOV_API_KEY not configured', inserted: 0, skipped: 0 }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);

    const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    url.searchParams.set('api-key', apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '500');
    url.searchParams.set('filters[State.keyword]', 'Maharashtra');
    url.searchParams.set('filters[Market Name]', mandi);
    url.searchParams.set('filters[Commodity]', commodity);
    url.searchParams.set('filters[Arrival_Date_From]', formatDateForAPI(from));
    url.searchParams.set('filters[Arrival_Date_To]', formatDateForAPI(now));

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, skipped: 0, date_range: `${formatDateForAPI(from)} - ${formatDateForAPI(now)}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let inserted = 0;
    let skipped = 0;

    for (const rec of data.records) {
      try {
        const arrivalDate = extractField(rec, 'Arrival_Date', 'Arrival Date', 'arrival_date');
        if (!arrivalDate) { skipped++; continue; }
        const priceDate = parseDateFlexible(arrivalDate);
        const modalPrice = parseFloat(extractField(rec, 'Modal_Price', 'Modal Price', 'modal_price') ?? '0');
        if (!modalPrice) { skipped++; continue; }

        const priceRecord = {
          price_date: priceDate,
          commodity,
          mandi,
          min_price: parseFloat(extractField(rec, 'Min_Price', 'Min Price', 'min_price') ?? '0') || null,
          max_price: parseFloat(extractField(rec, 'Max_Price', 'Max Price', 'max_price') ?? '0') || null,
          modal_price: modalPrice,
          arrivals_qtl: parseFloat(extractField(rec, 'Arrivals', 'arrivals', 'Arrival_Qty', 'Total Arrival') ?? '0') || null,
          source: 'data.gov.in',
        };

        const { error } = await supabase.from('daily_prices').upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });
        if (error) skipped++;
        else inserted++;
      } catch { skipped++; }
    }

    return new Response(JSON.stringify({
      inserted, skipped,
      date_range: `${formatDateForAPI(from)} - ${formatDateForAPI(now)}`,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
