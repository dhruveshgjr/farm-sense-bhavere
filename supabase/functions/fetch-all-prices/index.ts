import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const CROPS = ['Banana', 'Tomato', 'Bitter Gourd', 'Papaya', 'Onion'];
const MANDIS = ['Nashik', 'Lasalgaon'];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DATAGOV_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'DATAGOV_API_KEY not configured',
        success: 0,
        failed: 10,
        cached: 0,
        results: [],
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let success = 0;
    let failed = 0;
    let cached = 0;
    const results: any[] = [];

    for (const commodity of CROPS) {
      for (const mandi of MANDIS) {
        try {
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
            // Fallback to cached
            const { data: cachedData } = await supabase
              .from('daily_prices')
              .select('*')
              .eq('commodity', commodity)
              .eq('mandi', mandi)
              .order('price_date', { ascending: false })
              .limit(1);

            if (cachedData && cachedData.length > 0) {
              cached++;
              results.push({ commodity, mandi, cached: true, data: cachedData[0] });
            } else {
              failed++;
              results.push({ commodity, mandi, error: 'No data available' });
            }
            await delay(500);
            continue;
          }

          // Sort by Arrival_Date descending
          const sortedRecords = data.records.sort((a: any, b: any) => {
            const parseDate = (d: string) => {
              const parts = d.split('/');
              return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
            };
            return parseDate(b.Arrival_Date) - parseDate(a.Arrival_Date);
          });

          const record = sortedRecords[0];
          const arrivalDate = record.Arrival_Date;
          const parts = arrivalDate.split('/');
          const priceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

          const priceRecord = {
            price_date: priceDate,
            commodity,
            mandi,
            min_price: parseFloat(record.Min_Price) || parseFloat(record.Min_x0020_Price) || null,
            max_price: parseFloat(record.Max_Price) || parseFloat(record.Max_x0020_Price) || null,
            modal_price: parseFloat(record.Modal_Price) || parseFloat(record.Modal_x0020_Price),
            source: 'data.gov.in',
          };

          await supabase
            .from('daily_prices')
            .upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });

          success++;
          results.push({ commodity, mandi, cached: false, data: priceRecord });
        } catch (e) {
          failed++;
          results.push({ commodity, mandi, error: e.message });
        }

        // Rate limit delay
        await delay(500);
      }
    }

    return new Response(JSON.stringify({ success, failed, cached, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
