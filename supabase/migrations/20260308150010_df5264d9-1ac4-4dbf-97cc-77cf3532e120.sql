CREATE OR REPLACE FUNCTION get_price_stats(
  p_commodity text,
  p_mandi text
) RETURNS TABLE(avg_30d numeric, avg_90d numeric, current_price numeric, 
                price_date date, volatility_score numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(CASE WHEN dp.price_date >= CURRENT_DATE - 30 THEN dp.modal_price END) as avg_30d,
    AVG(CASE WHEN dp.price_date >= CURRENT_DATE - 90 THEN dp.modal_price END) as avg_90d,
    (SELECT dp2.modal_price FROM daily_prices dp2
     WHERE dp2.commodity = p_commodity AND dp2.mandi = p_mandi 
     ORDER BY dp2.price_date DESC LIMIT 1) as current_price,
    (SELECT dp2.price_date FROM daily_prices dp2
     WHERE dp2.commodity = p_commodity AND dp2.mandi = p_mandi 
     ORDER BY dp2.price_date DESC LIMIT 1) as price_date,
    STDDEV(dp.modal_price) / NULLIF(AVG(dp.modal_price), 0) * 100 as volatility_score
  FROM daily_prices dp
  WHERE dp.commodity = p_commodity 
    AND dp.mandi = p_mandi 
    AND dp.price_date >= CURRENT_DATE - 90;
END;
$$ LANGUAGE plpgsql;