import { useState, useEffect, memo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CROPS } from '@/lib/farmConfig';
import { getCropName } from '@/lib/i18n';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export interface SowingRecord {
  id: string;
  season: string;
  commodity: string;
  district: string;
  area_vs_lastyear_pct: number | null;
  source: string | null;
  recorded_date: string;
  notes: string | null;
}

export const SupplyIntelSection = memo(function SupplyIntelSection() {
  const [data, setData] = useState<SowingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: rows } = await supabase
        .from('sowing_intel')
        .select('*')
        .order('recorded_date', { ascending: false });
      setData((rows as SowingRecord[]) ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const getSignal = (pct: number | null) => {
    if (pct === null || pct === undefined) return null;
    if (pct > 20) return { badge: '🔴 More supply', color: 'text-danger', detail: `▲${pct}% more planted vs last year → Prices likely lower at harvest` };
    if (pct < -20) return { badge: '🟢 Less supply', color: 'text-success', detail: `▼${Math.abs(pct)}% less planted → Prices likely higher at harvest` };
    return { badge: '⚪ Normal', color: 'text-muted-foreground', detail: 'Similar area planted vs last year' };
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm overflow-hidden">
        <div className="section-header" style={{ backgroundColor: 'hsl(174 60% 25%)' }}>🌱 Supply Intelligence</div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      </div>
    );
  }

  const CROP_EMOJI: Record<string, string> = { 'Banana': '🍌', 'Tomato': '🍅', 'Bitter Gourd': '🥒', 'Papaya': '🍈', 'Onion': '🧅' };

  return (
    <div className="bg-card rounded-lg shadow-sm overflow-hidden">
      <div className="section-header text-primary-foreground" style={{ backgroundColor: 'hsl(174 60% 25%)' }}>🌱 Supply Intelligence — What Others Are Planting</div>
      <div className="p-3 space-y-2">
        {CROPS.map(crop => {
          const record = data.find(r => r.commodity === crop.commodityName);
          const signal = record ? getSignal(record.area_vs_lastyear_pct) : null;

          return (
            <div key={crop.name} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
              <div className="flex items-center gap-2">
                <span>{CROP_EMOJI[crop.commodityName] || '🌾'}</span>
                <span className="text-sm font-medium">{getCropName(crop.commodityName)}</span>
              </div>
              <div className="text-right">
                {signal ? (
                  <>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${signal.color} bg-muted`}>{signal.badge}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5 max-w-[200px]">{signal.detail}</p>
                    {record?.source && (
                      <p className="text-[8px] text-muted-foreground">Source: {record.source} | {record.recorded_date}</p>
                    )}
                  </>
                ) : (
                  <Link to="/settings" className="text-[10px] text-info underline">Add data</Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export function getSowingPct(data: SowingRecord[], commodity: string): number | null {
  const record = data.find(r => r.commodity === commodity);
  return record?.area_vs_lastyear_pct ?? null;
}
