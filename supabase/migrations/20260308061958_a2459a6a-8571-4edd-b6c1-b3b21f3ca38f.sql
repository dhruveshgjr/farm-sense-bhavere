
-- Create weather_cache table (daily_prices already created)
CREATE TABLE public.weather_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at TIMESTAMPTZ DEFAULT now(),
  forecast_date DATE NOT NULL UNIQUE,
  temp_max NUMERIC,
  temp_min NUMERIC,
  rain_mm NUMERIC,
  humidity_max NUMERIC,
  wind_kmh NUMERIC,
  rain_prob_pct NUMERIC,
  weathercode INTEGER
);

-- Create report_history table
CREATE TABLE public.report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_at TIMESTAMPTZ DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.weather_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to weather_cache" ON public.weather_cache FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to report_history" ON public.report_history FOR ALL USING (true) WITH CHECK (true);
