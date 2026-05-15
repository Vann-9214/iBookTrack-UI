-- ============================================================
-- Migration 025: Optimize get_lot_stats performance
-- imported_books_staging has millions of rows; add index on
-- lot_no so GROUP BY doesn't require a full sequential scan.
-- Also rewrite the function to use SECURITY DEFINER so it
-- runs with elevated privileges and bypasses RLS overhead.
-- ============================================================

-- Index on lot_no (the GROUP BY column)
CREATE INDEX IF NOT EXISTS idx_imported_books_staging_lot_no
  ON public.imported_books_staging (lot_no);

-- Index on final_status (the FILTER columns)
CREATE INDEX IF NOT EXISTS idx_imported_books_staging_final_status
  ON public.imported_books_staging (final_status);

-- Composite index: covers GROUP BY lot_no + FILTER final_status in one scan
CREATE INDEX IF NOT EXISTS idx_imported_books_staging_lot_status
  ON public.imported_books_staging (lot_no, final_status);

-- Rewrite function: add SECURITY DEFINER + stable classification
CREATE OR REPLACE FUNCTION get_lot_stats()
RETURNS TABLE (
  lot TEXT,
  total BIGINT,
  transmitted BIGINT,
  rejected BIGINT,
  completion_rate NUMERIC
)
SECURITY DEFINER
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    lot_no::TEXT                                                                          AS lot,
    COUNT(*)::BIGINT                                                                      AS total,
    COUNT(*) FILTER (WHERE final_status ILIKE 'transmitted')::BIGINT                     AS transmitted,
    COUNT(*) FILTER (WHERE final_status IS NOT NULL
                      AND  final_status NOT ILIKE 'transmitted')::BIGINT                 AS rejected,
    ROUND(
      COUNT(*) FILTER (WHERE final_status ILIKE 'transmitted')::NUMERIC
      / NULLIF(COUNT(*), 0)::NUMERIC * 100,
      2
    )                                                                                     AS completion_rate
  FROM public.imported_books_staging
  WHERE lot_no IS NOT NULL
  GROUP BY lot_no
  ORDER BY total DESC;
END;
$$;
