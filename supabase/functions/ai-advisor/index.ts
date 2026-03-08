import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { forecast, prices, trends, alerts, opportunities, currentMonth } = await req.json();

    const systemPrompt = `You are KisanMitra, a personal farm intelligence assistant for a small family farm in Bhavere village, Nashik district, Maharashtra, India.
The farm is water-rich (near a river) and grows: Banana, Tomato, Bitter Gourd (Karela), Papaya, and Onion.
The mandis used are Nashik and Lasalgaon.
You speak like a knowledgeable local advisor — practical, direct, no unnecessary hedging. Use simple English mixed with Marathi crop/market terms where natural (e.g., 'mandi', 'quintal', 'kharif', 'rabi').
Never say 'I cannot predict' — give your best assessment with reasoning.
Always end with ONE clear priority action the farmer should take TODAY.`;

    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const monthName = monthNames[(currentMonth || new Date().getMonth() + 1) - 1];

    let weatherSection = 'No weather data available.';
    if (forecast?.length) {
      weatherSection = forecast.slice(0, 10).map((d: any) =>
        `${d.forecast_date}: ${d.temp_min}-${d.temp_max}°C, Rain: ${d.rain_mm}mm, Humidity: ${d.humidity_max}%, Wind: ${d.wind_kmh}km/h`
      ).join('\n');
    }

    let priceSection = 'No price data available.';
    if (prices?.length) {
      const cropPrices: Record<string, string[]> = {};
      for (const p of prices.slice(0, 20)) {
        if (!cropPrices[p.commodity]) cropPrices[p.commodity] = [];
        cropPrices[p.commodity].push(`${p.mandi}: ₹${p.modal_price}/qtl`);
      }
      priceSection = Object.entries(cropPrices).map(([c, ps]) => `${c} — ${ps.join(', ')}`).join('\n');
    }

    let alertSection = 'No active alerts.';
    if (alerts?.length) {
      alertSection = alerts.slice(0, 10).map((a: any) => `[${a.level}] ${a.crop}: ${a.title} — Action: ${a.action}`).join('\n');
    }

    let trendSection = 'No trend data.';
    if (trends?.length) {
      trendSection = trends.map((t: any) => `${t.commodity}@${t.mandi}: ₹${t.current_price}, ${t.pct_vs_90d > 0 ? '+' : ''}${t.pct_vs_90d?.toFixed(1)}% vs 90d avg, Signal: ${t.sell_signal}`).join('\n');
    }

    const userMessage = `Here is today's farm data. Generate a comprehensive weekly advisory.

WEATHER (next 10 days):
${weatherSection}

CURRENT MANDI PRICES:
${priceSection}

PRICE SIGNALS:
${trendSection}

CROP ALERTS FROM RULES ENGINE:
${alertSection}

SEASONAL CONTEXT:
Current month: ${monthName}

Generate:
1. WEATHER RISK SUMMARY (2-3 sentences, overall risk level this week)
2. MARKET INTELLIGENCE (3-4 sentences: what prices are doing, what to sell, what to hold)
3. TOP 3 ACTIONS THIS WEEK (numbered, specific, with timing)
4. TODAY'S PRIORITY (one sentence, the single most important thing to do today)

Keep total response under 400 words. Be specific to Nashik/Maharashtra context.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        max_tokens: 600,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, try again later' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiResult = await response.json();
    const adviceText = aiResult.choices?.[0]?.message?.content || 'No advice generated.';

    // Cache in database
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    await supabase.from('ai_advice_cache').insert({
      advice_text: adviceText,
      data_hash: new Date().toISOString().split('T')[0],
    });

    return new Response(JSON.stringify({
      advice: adviceText,
      generated_at: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-advisor error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
