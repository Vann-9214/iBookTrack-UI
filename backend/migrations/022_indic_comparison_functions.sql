-- ============================================================
-- Migration 022: Functions to Compare INDIC and Main Staging Data
-- ============================================================

-- Function to mark INDIC books that exist in main staging
CREATE OR REPLACE FUNCTION mark_indic_duplicates()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE indic_books_staging i
  SET exists_in_main = true, matched_at = NOW()
  FROM imported_books_staging m
  WHERE i.isbn = m.isbn
    AND i.exists_in_main = false;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get INDIC-only books (not in main staging)
CREATE OR REPLACE FUNCTION get_indic_only_books()
RETURNS TABLE (
  lot_no TEXT,
  isbn TEXT,
  title TEXT,
  language_ilms TEXT,
  status TEXT,
  trans_date TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.lot_no,
    i.isbn,
    i.title,
    i.language_ilms,
    i.status,
    i.trans_date
  FROM indic_books_staging i
  WHERE i.exists_in_main = false
  ORDER BY i.lot_no, i.isbn;
END;
$$ LANGUAGE plpgsql;

-- Function to get books in both files (duplicates)
CREATE OR REPLACE FUNCTION get_duplicate_books()
RETURNS TABLE (
  isbn TEXT,
  indic_lot TEXT,
  main_lot TEXT,
  indic_status TEXT,
  main_status TEXT,
  indic_title TEXT,
  main_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.isbn,
    i.lot_no as indic_lot,
    m.lot_no as main_lot,
    i.status as indic_status,
    m.final_status as main_status,
    i.title as indic_title,
    m.title as main_title
  FROM indic_books_staging i
  INNER JOIN imported_books_staging m ON i.isbn = m.isbn
  ORDER BY i.isbn;
END;
$$ LANGUAGE plpgsql;

-- Function to get INDIC statistics
CREATE OR REPLACE FUNCTION get_indic_stats()
RETURNS TABLE (
  total_indic BIGINT,
  in_both_files BIGINT,
  indic_only BIGINT,
  transmitted BIGINT,
  rejected BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_indic,
    COUNT(*) FILTER (WHERE exists_in_main = true)::BIGINT as in_both_files,
    COUNT(*) FILTER (WHERE exists_in_main = false)::BIGINT as indic_only,
    COUNT(*) FILTER (WHERE status ILIKE 'transmitted')::BIGINT as transmitted,
    COUNT(*) FILTER (WHERE status NOT ILIKE 'transmitted' AND status IS NOT NULL)::BIGINT as rejected
  FROM indic_books_staging;
END;
$$ LANGUAGE plpgsql;

-- Function to get INDIC lot breakdown
CREATE OR REPLACE FUNCTION get_indic_lot_stats()
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
    COUNT(*) FILTER (WHERE status ILIKE 'transmitted')::BIGINT as transmitted,
    COUNT(*) FILTER (WHERE status IS NOT NULL AND status NOT ILIKE 'transmitted')::BIGINT as rejected,
    ROUND(
      (COUNT(*) FILTER (WHERE status ILIKE 'transmitted')::NUMERIC / NULLIF(COUNT(*), 0)::NUMERIC) * 100,
      2
    ) as completion_rate
  FROM indic_books_staging
  WHERE lot_no IS NOT NULL
  GROUP BY lot_no
  ORDER BY total DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_indic_duplicates() IS 'Marks INDIC books that have matching ISBN in main staging table';
COMMENT ON FUNCTION get_indic_only_books() IS 'Returns books that exist only in INDIC file (not in main file)';
COMMENT ON FUNCTION get_duplicate_books() IS 'Returns books that exist in both INDIC and main files';
COMMENT ON FUNCTION get_indic_stats() IS 'Returns statistics about INDIC books';
COMMENT ON FUNCTION get_indic_lot_stats() IS 'Returns lot breakdown statistics for INDIC books';
