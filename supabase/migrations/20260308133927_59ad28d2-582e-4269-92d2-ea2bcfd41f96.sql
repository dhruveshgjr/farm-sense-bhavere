
-- Add arrivals_qtl column
ALTER TABLE daily_prices ADD COLUMN IF NOT EXISTS arrivals_qtl numeric;

-- Drop existing policies and recreate properly
DROP POLICY IF EXISTS "Allow all access to daily_prices" ON daily_prices;
DROP POLICY IF EXISTS "Allow public read" ON daily_prices;
DROP POLICY IF EXISTS "Allow service insert prices" ON daily_prices;
DROP POLICY IF EXISTS "Allow service upsert prices" ON daily_prices;

CREATE POLICY "Allow public read" ON daily_prices FOR SELECT USING (true);
CREATE POLICY "Allow insert prices" ON daily_prices FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update prices" ON daily_prices FOR UPDATE USING (true);
CREATE POLICY "Allow delete prices" ON daily_prices FOR DELETE USING (true);

-- Weather cache policies
DROP POLICY IF EXISTS "Allow all access to weather_cache" ON weather_cache;
DROP POLICY IF EXISTS "Allow public read weather" ON weather_cache;

CREATE POLICY "Allow public read weather" ON weather_cache FOR SELECT USING (true);
CREATE POLICY "Allow insert weather" ON weather_cache FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update weather" ON weather_cache FOR UPDATE USING (true);

-- Report history policies
DROP POLICY IF EXISTS "Allow all access to report_history" ON report_history;
CREATE POLICY "Allow public read reports" ON report_history FOR SELECT USING (true);
CREATE POLICY "Allow insert reports" ON report_history FOR INSERT WITH CHECK (true);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_daily_prices_lookup ON daily_prices (commodity, mandi, price_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_prices_date ON daily_prices (price_date DESC);
