import { useState, useEffect, memo } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { formatLastUpdated } from '@/lib/timeFormat';
import type { PriceRecord } from '@/hooks/usePrices';
import type { WeatherDay } from '@/hooks/useWeather';
import type { CropAlert } from '@/lib/advisoryEngine';
import { t } from '@/lib/i18n';

interface AIAdvisorSectionProps {
  weather?: WeatherDay[];
  prices: PriceRecord[];
  alerts: CropAlert[];
  trends: any[];
}

export const AIAdvisorSection = memo(function AIAdvisorSection({ weather, prices, alerts, trends }: AIAdvisorSectionProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached advice on mount
  useEffect(() => {
    async function loadCached() {
      const { data } = await supabase
        .from('ai_advice_cache')
        .select('advice_text, generated_at')
        .order('generated_at', { ascending: false })
        .limit(1);
      if (data?.[0]) {
        setAdvice(data[0].advice_text);
        setGeneratedAt(data[0].generated_at);
      }
    }
    loadCached();
  }, []);

  const generateAdvice = async () => {
    setLoading(true);
    setError(null);
    try {
      // Minimum 3 second "thinking" animation
      const minDelay = new Promise(r => setTimeout(r, 3000));

      const fetchPromise = supabase.functions.invoke('ai-advisor', {
        body: {
          forecast: weather,
          prices: prices.slice(0, 30),
          trends,
          alerts: alerts.slice(0, 15),
          currentMonth: new Date().getMonth() + 1,
        },
      });

      const [, result] = await Promise.all([minDelay, fetchPromise]);

      if (result.error) throw new Error(result.error.message);
      if (result.data?.error) throw new Error(result.data.error);

      setAdvice(result.data.advice);
      setGeneratedAt(result.data.generated_at);
    } catch (err: any) {
      setError(err.message || 'Could not generate AI advice');
    } finally {
      setLoading(false);
    }
  };

  // Parse sections from advice text
  const renderAdvice = (text: string) => {
    const sections = text.split(/\n(?=\d\.\s|#{1,3}\s|\*\*)/);
    return (
      <div className="prose prose-sm max-w-none text-xs space-y-2">
        {sections.map((section, i) => {
          // Check for TODAY'S PRIORITY
          if (section.toLowerCase().includes("today's priority") || section.toLowerCase().includes('priority')) {
            const content = section.replace(/^.*?priority[:\s]*/i, '').trim();
            if (content && i === sections.length - 1) {
              return (
                <div key={i} className="bg-success/15 rounded-lg p-2.5 border border-success/30">
                  <div className="text-[10px] font-bold text-success uppercase mb-0.5">🎯 {t('today.priority')}</div>
                  <p className="text-sm font-semibold text-foreground leading-snug">{content}</p>
                </div>
              );
            }
          }
          return <p key={i} className="text-xs leading-relaxed whitespace-pre-line">{section}</p>;
        })}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="px-4 py-3 rounded-t-lg text-sm font-bold tracking-wide uppercase text-primary-foreground"
        style={{ background: 'linear-gradient(135deg, hsl(120 39% 24%), hsl(174 60% 30%))' }}>
        🤖 {t('section.aiAdvisor')} — This Week's Intelligence
      </div>
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="flex items-center justify-center gap-1 mb-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
            </div>
            <p className="text-sm text-muted-foreground">🤖 KisanMitra is thinking...</p>
          </div>
        ) : advice ? (
          <>
            {renderAdvice(advice)}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-[10px] text-muted-foreground">
                Last generated: {generatedAt ? formatLastUpdated(generatedAt) : '—'}
              </span>
              <Button size="sm" variant="outline" className="text-xs" onClick={generateAdvice}>
                {t('btn.refreshAdvice')}
              </Button>
            </div>
          </>
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <p className="text-xs text-muted-foreground">Showing rule-based alerts below</p>
            <Button size="sm" className="mt-2 text-xs" onClick={generateAdvice}>Try Again</Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">AI advisor ready to generate personalized farm intelligence</p>
            <Button size="sm" className="text-xs" onClick={generateAdvice}>
              Generate AI Advice
            </Button>
          </div>
        )}
      </div>
    </div>
  );
});
