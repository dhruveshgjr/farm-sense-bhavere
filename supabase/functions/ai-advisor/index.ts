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

  const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({
      advice: null,
      fallback: true,
      use_smart_advisor: true,
      reason: 'No AI key configured — using Smart Advisor (deterministic, free, instant)',
      generated_at: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const body = await req.json();
    const { forecast, prices, trends, alerts, currentMonth } = body;

    const totalRain = forecast?.reduce((s: number, d: any) => s + (d.rain_mm || 0), 0) || 0;
    const maxTemp = Math.max(...(forecast?.map((d: any) => d.temp_max || 0) || [0]));
    const rainyDays = forecast?.filter((d: any) => (d.rain_mm || 0) > 5).length || 0;
    const maxWind = Math.max(...(forecast?.map((d: any) => d.wind_kmh || 0) || [0]));

    const priceLines = (trends || [])
      .filter((t: any) => t.current_price)
      .map((t: any) => {
        const pct = t.pct_vs_90d ? `${t.pct_vs_90d > 0 ? '+' : ''}${t.pct_vs_90d.toFixed(1)}% vs 90d avg` : 'no history';
        return `${t.commodity} at ${t.mandi}: ₹${t.current_price}/qtl (${pct}) — Signal: ${t.sell_signal || 'NORMAL'}`;
      }).join('\n');

    const dangerAlerts = (alerts || []).filter((a: any) => a.level === 'DANGER');
    const warningAlerts = (alerts || []).filter((a: any) => a.level === 'WARNING');
    const alertLines = [
      ...dangerAlerts.map((a: any) => `🔴 ${a.crop}: ${a.title} → ${a.action}`),
      ...warningAlerts.slice(0, 3).map((a: any) => `🟡 ${a.crop}: ${a.title}`)
    ].join('\n') || 'No significant alerts';

    const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const systemPrompt = `You are KisanMitra, a personal farm intelligence assistant for a small family farm in Bhavere village, Nashik district, Maharashtra, India. The farm is water-rich (near a river) and grows: Banana (केळ), Tomato (टोमॅटो), Bitter Gourd/Karela (करेला), Papaya (पपई), and Onion (कांदा). The mandis used are Nashik and Lasalgaon. You speak like a knowledgeable local advisor — practical, direct, no unnecessary hedging. Use simple English with natural Marathi market terms (mandi, quintal, kharif, rabi) where appropriate. Never say you cannot predict — give your best assessment with clear reasoning. The farmer's ultimate goal is to know what the market will pay BEFORE planting, and sell at the right time.`;

    const userMessage = `Here is today's farm data for ${MONTH_NAMES[currentMonth] || 'this month'}. Generate a focused weekly advisory.

WEATHER (10-day): Total rain ${totalRain.toFixed(0)}mm, ${rainyDays} rainy days, max temp ${maxTemp}°C, max wind ${maxWind}km/h

MANDI PRICES:
${priceLines || 'No price data available yet'}

CROP ALERTS:
${alertLines}

Generate exactly this structure (use these exact headers):
WEATHER RISK: [2 sentences — overall risk level and most important weather event]
MARKET INTELLIGENCE: [3 sentences — what prices are doing, which crop to sell, which to hold]
TOP 3 ACTIONS:
1. [specific action with timing]
2. [specific action with timing]
3. [specific action with timing]
TODAY'S PRIORITY: [one sentence — single most important thing to do today]

Keep total under 350 words. Be specific to Nashik/Maharashtra context.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic API error:', response.status, errText);
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const adviceText = data.content?.[0]?.text || '';

    // Cache in ai_advice_cache table
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from('ai_advice_cache').insert({
        advice_text: adviceText,
        data_hash: new Date().toISOString().split('T')[0],
      });
    }

    return new Response(JSON.stringify({
      advice: adviceText,
      fallback: false,
      generated_at: new Date().toISOString()
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('ai-advisor error:', error);
    return new Response(JSON.stringify({
      advice: null,
      fallback: true,
      use_smart_advisor: true,
      reason: (error as Error).message,
      generated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
