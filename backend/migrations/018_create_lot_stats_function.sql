-- Create function to get lot statistics efficiently
CREATE OR REPLACE FUNCTION get_lot_stats()
RETURNS TABLE (
  lot TEXT,
  total BIGINT,
  transmitted BIGINT,
  rejected BIGINT,
  completion_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lot_no::TEXT as lot,
    COUNT(*)::BIGINT as total,
    COUNT(*) FILTER (WHERE final_status ILIKE 'transmitted')::BIGINT as transmitted,
    COUNT(*) FILTER (WHERE final_status IS NOT NULL AND final_status NOT ILIKE 'transmitted')::BIGINT as rejected,
    ROUND(
      (COUNT(*) FILTER (WHERE final_status ILIKE 'transmitted')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    ) as completion_rate
  FROM imported_books_staging
  WHERE lot_no IS NOT NULL
  GROUP BY lot_no
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;
