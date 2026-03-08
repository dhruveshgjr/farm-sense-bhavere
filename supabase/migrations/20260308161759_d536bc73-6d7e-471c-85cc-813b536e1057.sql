
CREATE TABLE IF NOT EXISTS public.sowing_intel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season text NOT NULL,
  commodity text NOT NULL,
  district text DEFAULT 'Nashik',
  area_vs_lastyear_pct numeric,
  source text,
  recorded_date date DEFAULT CURRENT_DATE,
  notes text,
  UNIQUE(season, commodity, district)
);

ALTER TABLE public.sowing_intel ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read sowing" ON public.sowing_intel FOR SELECT USING (true);
CREATE POLICY "Allow insert sowing" ON public.sowing_intel FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update sowing" ON public.sowing_intel FOR UPDATE USING (true);
CREATE POLICY "Allow delete sowing" ON public.sowing_intel FOR DELETE USING (true);

CREATE TABLE IF NOT EXISTS public.ai_advice_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at timestamptz DEFAULT now(),
  advice_text text NOT NULL,
  data_hash text
);

ALTER TABLE public.ai_advice_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read ai_advice" ON public.ai_advice_cache FOR SELECT USING (true);
CREATE POLICY "Allow insert ai_advice" ON public.ai_advice_cache FOR INSERT WITH CHECK (true);
