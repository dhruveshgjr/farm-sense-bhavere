import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CROPS = ['Banana', 'Tomato', 'Bitter Gourd', 'Papaya', 'Onion'];
const MANDIS = ['Nashik', 'Lasalgaon'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('DATAGOV_API_KEY');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let success = 0;
    let failed = 0;
    const prices: Record<string, any> = {};

    for (const commodity of CROPS) {
      for (const mandi of MANDIS) {
        try {
          if (!apiKey) {
            failed++;
            continue;
          }

          const url = new URL('https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070');
          url.searchParams.set('api-key', apiKey);
          url.searchParams.set('format', 'json');
          url.searchParams.set('limit', '5');
          url.searchParams.set('filters[State.keyword]', 'Maharashtra');
          url.searchParams.set('filters[District]', mandi);
          url.searchParams.set('filters[Commodity]', commodity);

          const res = await fetch(url.toString());
          const data = await res.json();

          if (!data.records || data.records.length === 0) {
            failed++;
            continue;
          }

          for (const record of data.records) {
            const arrivalDate = record.Arrival_Date;
            const parts = arrivalDate.split('/');
            const priceDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

            const priceRecord = {
              price_date: priceDate,
              commodity,
              mandi,
              min_price: parseFloat(record.Min_x0020_Price) || null,
              max_price: parseFloat(record.Max_x0020_Price) || null,
              modal_price: parseFloat(record.Modal_x0020_Price),
              source: 'data.gov.in',
            };

            await supabase
              .from('daily_prices')
              .upsert(priceRecord, { onConflict: 'price_date,commodity,mandi' });
          }

          success++;
          prices[`${commodity}-${mandi}`] = data.records.length;
        } catch {
          failed++;
        }
      }
    }

    return new Response(JSON.stringify({ success, failed, prices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
