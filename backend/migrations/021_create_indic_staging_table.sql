-- ============================================================
-- Migration 021: Create INDIC Staging Table
-- Separate table for INDIC books (215k rows) with different column structure
-- ============================================================

-- Create INDIC staging table (7 columns)
-- Columns: Lot No. | ISBN | Title | Language in iLMS | Remarks | STATUS | TransDate
CREATE TABLE IF NOT EXISTS public.indic_books_staging (
  id                    SERIAL PRIMARY KEY,
  lot_no                TEXT,
  isbn                  TEXT,
  title                 TEXT,
  language_ilms         TEXT,
  remarks               TEXT,
  status                TEXT,
  trans_date            TEXT,
  
  -- Metadata
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Flag to indicate if this ISBN exists in main staging
  exists_in_main        BOOLEAN DEFAULT false,
  matched_at            TIMESTAMPTZ
);

-- Add indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_indic_isbn ON public.indic_books_staging(isbn);
CREATE INDEX IF NOT EXISTS idx_indic_lot_no ON public.indic_books_staging(lot_no);
CREATE INDEX IF NOT EXISTS idx_indic_status ON public.indic_books_staging(status);
CREATE INDEX IF NOT EXISTS idx_indic_exists_in_main ON public.indic_books_staging(exists_in_main);

-- Add comments
COMMENT ON TABLE public.indic_books_staging IS 'Staging table for INDIC books (215k rows) - separate from main staging';
COMMENT ON COLUMN public.indic_books_staging.exists_in_main IS 'Whether this ISBN also exists in imported_books_staging';
