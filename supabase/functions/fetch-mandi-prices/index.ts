import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
    const { commodity, mandi } = await req.json();
    const apiKey = Deno.env.get('DATAGOV_API_KEY');
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!apiKey) {
      const { data: cached } = await supabase.from('daily_prices').select('*')
        .eq('commodity', commodity).eq('mandi', mandi)
        .order('price_date', { ascending: false }).limit(1);
      if (cached && cached.length > 0) {
        return new Response(JSON.stringify({ ...cached[0], cached: true, cache_note: 'API key not configured — showing last known price' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'No API key and no cached data', cached: false }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      const { data: cached } = await supabase.from('daily_prices').select('*')
        .eq('commodity', commodity).eq('mandi', mandi)
        .order('price_date', { ascending: false }).limit(1);
      if (cached && cached.length > 0) {
        return new Response(JSON.stringify({ ...cached[0], cached: true, cache_note: 'Live fetch failed — showing last known price' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'No records found', cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sortedRecords = data.records.sort((a: any, b: any) => {
      const dateA = parseDateFlexible(extractField(a, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '');
      const dateB = parseDateFlexible(extractField(b, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '');
      return dateB.localeCompare(dateA);
    });

    for (const record of sortedRecords) {
      const arrivalDate = extractField(record, 'Arrival_Date', 'Arrival Date', 'arrival_date') ?? '';
      const priceDate = parseDateFlexible(arrivalDate);
      const modalPrice = parseFloat(extractField(record, 'Modal_Price', 'Modal Price', 'modal_price') ?? '0');

      if (!isDateRecent(priceDate)) continue;
      if (!validatePrice(modalPrice, commodity)) continue;

      const priceRecord = {
        price_date: priceDate, commodity, mandi,
        min_price: parseFloat(extractField(record, 'Min_Price', 'Min Price', 'min_price') ?? '0') || null,
        max_price: parseFloat(extractField(record, 'Max_Price', 'Max Price', 'max_price') ?? '0') || null,
        modal_price: modalPrice,
        arrivals_qtl: parseFloat(extractField(record, 'Arrivals', 'arrivals', 'Arrival_Qty', 'Total Arrival') ?? '0') || null,
        source: 'data.gov.in',
      };

      await supabase.from('daily_prices').upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });

      return new Response(JSON.stringify({ ...priceRecord, cached: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No valid records found
    const { data: cached } = await supabase.from('daily_prices').select('*')
      .eq('commodity', commodity).eq('mandi', mandi)
      .order('price_date', { ascending: false }).limit(1);
    if (cached && cached.length > 0) {
      return new Response(JSON.stringify({ ...cached[0], cached: true, cache_note: 'No valid records — showing last known price' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'No valid price records', cached: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
