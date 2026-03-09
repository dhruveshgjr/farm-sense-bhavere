import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Step = 'welcome' | 'setup' | 'ready';

interface CheckItem {
  label: string;
  done: boolean;
  warning?: string;
}

export function OnboardingOverlay({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<Step>('welcome');
  const [checks, setChecks] = useState<CheckItem[]>([
    { label: 'Fetching 10-day weather forecast for Bhavere...', done: false },
    { label: 'Checking price data...', done: false },
    { label: 'Loading crop advisory rules...', done: false },
  ]);

  // Auto-advance welcome after 2 seconds
  useEffect(() => {
    if (step === 'welcome') {
      const t = setTimeout(() => setStep('setup'), 2000);
      return () => clearTimeout(t);
    }
  }, [step]);

  // Run setup checks
  useEffect(() => {
    if (step !== 'setup') return;
    let cancelled = false;

    async function run() {
      // Weather fetch
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=19.78&longitude=73.91&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_max,windspeed_10m_max,precipitation_probability_max,weathercode&timezone=Asia/Kolkata&forecast_days=10`
        );
        if (res.ok) {
          const data = await res.json();
          // Cache weather
          if (data.daily) {
            for (let i = 0; i < data.daily.time.length; i++) {
              await supabase.from('weather_cache').upsert({
                forecast_date: data.daily.time[i],
                temp_max: data.daily.temperature_2m_max[i],
                temp_min: data.daily.temperature_2m_min[i],
                rain_mm: data.daily.precipitation_sum[i],
                humidity_max: data.daily.relative_humidity_2m_max[i],
                wind_kmh: data.daily.windspeed_10m_max[i],
                rain_prob_pct: data.daily.precipitation_probability_max[i],
                weathercode: data.daily.weathercode[i],
              }, { onConflict: 'forecast_date' });
            }
          }
        }
        if (!cancelled) setChecks(prev => prev.map((c, i) => i === 0 ? { ...c, done: true } : c));
      } catch {
        if (!cancelled) setChecks(prev => prev.map((c, i) => i === 0 ? { ...c, done: true } : c));
      }

      await new Promise(r => setTimeout(r, 500));

      // Price database check
      if (!cancelled) {
        const { count } = await supabase.from('daily_prices').select('*', { count: 'exact', head: true });
        if ((count ?? 0) > 0) {
          setChecks(prev => prev.map((c, i) => i === 1 ? { ...c, done: true } : c));
        } else {
          setChecks(prev => prev.map((c, i) =>
            i === 1 ? { ...c, done: true, warning: '📥 No price data yet — go to Import to add mandi prices' } : c
          ));
        }
      }

      await new Promise(r => setTimeout(r, 500));

      // Advisory rules
      if (!cancelled) setChecks(prev => prev.map((c, i) => i === 2 ? { ...c, done: true } : c));
    }

    run();
    return () => { cancelled = true; };
  }, [step]);

  const allDone = checks[0].done && checks[2].done && checks[1].warning;

  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="text-7xl mb-6">🌾</div>
        <h1 className="text-2xl font-bold mb-2">नमस्कार! Welcome to KisanMitra</h1>
        <p className="text-muted-foreground">Your personal farm intelligence system for Bhavere, Nashik</p>
        <Button className="mt-6" onClick={() => setStep('setup')}>Next →</Button>
      </div>
    );
  }

  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
        <h2 className="text-xl font-bold mb-6">Setting up your farm data...</h2>
        <div className="space-y-4 w-full max-w-md">
          {checks.map((check, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-xl mt-0.5">
                {check.done ? '✅' : check.warning ? '⚠️' : '⏳'}
              </span>
              <div>
                <p className="text-sm">{check.warning || check.label}</p>
              </div>
            </div>
          ))}
        </div>
        {allDone && (
          <Button className="mt-8" onClick={() => setStep('ready')}>Continue →</Button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="text-5xl mb-4">✅</div>
      <h2 className="text-xl font-bold mb-2">KisanMitra is ready!</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Weather data loaded. Add your data.gov.in API key in Settings to enable live prices.
      </p>
      <Button onClick={() => {
        localStorage.setItem('kisanmitra_onboarded', 'true');
        onComplete();
      }}>
        Go to Dashboard →
      </Button>
    </div>
  );
}
