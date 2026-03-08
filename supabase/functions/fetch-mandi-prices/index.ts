import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PUBLIC_SAMPLE_KEY = '579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b';

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

// Source 1: data.gov.in API
async function tryDataGovIn(commodity: string, mandi: string, supabase: any): Promise<Response | null> {
  const userKey = Deno.env.get('DATAGOV_API_KEY');
  const effectiveKey = userKey || PUBLIC_SAMPLE_KEY;
  const sourceLabel = userKey ? 'data.gov.in' : 'data.gov.in-public-key';

  console.log(`[Source 1] Trying data.gov.in with ${userKey ? 'user key' : 'public sample key'}`);

  try {
    const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
    url.searchParams.set('api-key', effectiveKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '10');
    url.searchParams.set('filters[State.keyword]', 'Maharashtra');
    url.searchParams.set('filters[Market Name]', mandi);
    url.searchParams.set('filters[Commodity]', commodity);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (!data.records || data.records.length === 0) {
      console.log('[Source 1] No records returned');
      return null;
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
        source: sourceLabel,
      };

      await supabase.from('daily_prices').upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });

      return new Response(JSON.stringify({ ...priceRecord, cached: false, source: sourceLabel }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[Source 1] No valid records after validation');
    return null;
  } catch (err) {
    console.error('[Source 1] Failed:', err);
    return null;
  }
}

// Source 2: Agmarknet HTML scraping
async function tryAgmarknet(commodity: string, mandi: string, supabase: any): Promise<Response | null> {
  console.log(`[Source 2] Trying Agmarknet scraping for ${commodity} at ${mandi}`);

  try {
    // Step 1: GET page to extract hidden fields
    const pageUrl = 'https://agmarknet.gov.in/SearchCmmMkt.aspx';
    const getRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

    if (!getRes.ok) {
      console.log('[Source 2] GET failed:', getRes.status);
      return null;
    }

    const html = await getRes.text();

    const extractHidden = (name: string): string => {
      const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"`, 'i');
      const m = html.match(re);
      return m?.[1] || '';
    };

    const viewState = extractHidden('__VIEWSTATE');
    const viewStateGen = extractHidden('__VIEWSTATEGENERATOR');
    const eventValidation = extractHidden('__EVENTVALIDATION');

    if (!viewState) {
      console.log('[Source 2] Could not extract __VIEWSTATE');
      return null;
    }

    // Format today's date as DD/Mon/YYYY
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${monthNames[now.getMonth()]}/${now.getFullYear()}`;

    // Step 2: POST with form data
    const formData = new URLSearchParams();
    formData.append('__VIEWSTATE', viewState);
    formData.append('__VIEWSTATEGENERATOR', viewStateGen);
    formData.append('__EVENTVALIDATION', eventValidation);
    formData.append('ddlArrivalDate', dateStr);
    formData.append('ddlMarket', mandi);
    formData.append('ddlCommodity', commodity);
    formData.append('btnGo', 'Submit');

    const postRes = await fetch(pageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: formData.toString(),
    });

    if (!postRes.ok) {
      console.log('[Source 2] POST failed:', postRes.status);
      return null;
    }

    const resultHtml = await postRes.text();

    // Parse table rows for price data
    const tableMatch = resultHtml.match(/<table[^>]*id="[^"]*grdArr498[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
    if (!tableMatch) {
      // Try a more generic table pattern
      const rows = resultHtml.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi);
      if (!rows || rows.length < 2) {
        console.log('[Source 2] No data table found');
        return null;
      }
    }

    // Try to extract price values from table cells
    const tdPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const allCells: string[] = [];
    let cellMatch;
    while ((cellMatch = tdPattern.exec(resultHtml)) !== null) {
      allCells.push(cellMatch[1].replace(/<[^>]*>/g, '').trim());
    }

    // Look for numeric values that could be prices (min, max, modal pattern)
    const numericCells = allCells.filter(c => /^\d+(\.\d+)?$/.test(c)).map(Number);

    if (numericCells.length >= 3) {
      // Typically: min, max, modal in consecutive cells
      const candidates = numericCells.filter(n => n > 100 && n < 100000);
      if (candidates.length >= 3) {
        const sorted = [...candidates].sort((a, b) => a - b);
        const minPrice = sorted[0];
        const maxPrice = sorted[sorted.length - 1];
        const modalPrice = sorted[Math.floor(sorted.length / 2)];

        if (validatePrice(modalPrice, commodity)) {
          const priceDate = now.toISOString().split('T')[0];
          const priceRecord = {
            price_date: priceDate, commodity, mandi,
            min_price: minPrice, max_price: maxPrice, modal_price: modalPrice,
            arrivals_qtl: null, source: 'agmarknet-scrape',
          };

          await supabase.from('daily_prices').upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });

          return new Response(JSON.stringify({ ...priceRecord, cached: false, source: 'agmarknet-scrape' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    console.log('[Source 2] Could not extract valid prices from HTML');
    return null;
  } catch (err) {
    console.error('[Source 2] Agmarknet scraping failed:', err);
    return null;
  }
}

// Source 3: Database cache fallback
async function tryCacheFallback(commodity: string, mandi: string, supabase: any): Promise<Response> {
  console.log('[Source 3] Trying database cache fallback');
  const { data: cached } = await supabase.from('daily_prices').select('*')
    .eq('commodity', commodity).eq('mandi', mandi)
    .order('price_date', { ascending: false }).limit(1);

  if (cached && cached.length > 0) {
    return new Response(JSON.stringify({ ...cached[0], cached: true, source: 'cache', cache_note: 'Using last known price from database' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ error: 'No price data available from any source', cached: false, source: 'none' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { commodity, mandi } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Source 1: data.gov.in (user key or public sample key)
    const source1 = await tryDataGovIn(commodity, mandi, supabase);
    if (source1) return source1;

    // Source 2: Agmarknet scraping
    const source2 = await tryAgmarknet(commodity, mandi, supabase);
    if (source2) return source2;

    // Source 3: Cache fallback
    return await tryCacheFallback(commodity, mandi, supabase);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
