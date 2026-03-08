
CREATE TABLE public.daily_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fetched_at TIMESTAMPTZ DEFAULT now(),
  price_date DATE NOT NULL,
  commodity TEXT NOT NULL,
  mandi TEXT NOT NULL,
  min_price NUMERIC,
  max_price NUMERIC,
  modal_price NUMERIC NOT NULL,
  unit TEXT DEFAULT 'Quintal',
  source TEXT DEFAULT 'data.gov.in',
  UNIQUE (price_date, commodity, mandi)
);

ALTER TABLE public.daily_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to daily_prices" ON public.daily_prices FOR ALL USING (true) WITH CHECK (true);
