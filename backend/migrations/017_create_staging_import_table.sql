-- ============================================================
-- Migration 017: Create Staging Table for Excel Import
-- Temporary table to import raw Excel data before processing
-- ============================================================

-- Create staging table that mirrors Excel structure (970k+ rows, 15 columns)
-- New Excel format: S. No | Vendor Name | FACILITY_ID | Lot No. | ISBN | Title | 
-- Received - Date | Inventory Check by- UID | Scanning - Date | Scanning - User ID | 
-- FINAL STATUS | Trans Date | Language | Language Ilms | Phase
CREATE TABLE IF NOT EXISTS public.imported_books_staging (
  id                    SERIAL PRIMARY KEY,
  s_no                  INTEGER,
  vendor_name           TEXT,
  facility_id           TEXT,
  lot_no                TEXT,
  isbn                  TEXT,
  title                 TEXT,
  received_date         TEXT,  -- Import as text first, convert later
  inventory_check_uid   TEXT,
  scanning_date         TEXT,  -- Import as text first
  scanning_user_id      TEXT,
  final_status          TEXT,
  trans_date            TEXT,  -- Import as text first
  language              TEXT,
  language_ilms         TEXT,
  phase                 TEXT,
  
  -- Processing metadata
  processed             BOOLEAN DEFAULT false,
  processing_error      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at          TIMESTAMPTZ
);

-- Add indexes for faster processing
CREATE INDEX IF NOT EXISTS idx_staging_isbn ON public.imported_books_staging(isbn);
CREATE INDEX IF NOT EXISTS idx_staging_lot_no ON public.imported_books_staging(lot_no);
CREATE INDEX IF NOT EXISTS idx_staging_processed ON public.imported_books_staging(processed);
CREATE INDEX IF NOT EXISTS idx_staging_vendor ON public.imported_books_staging(vendor_name);

-- Add comments
COMMENT ON TABLE public.imported_books_staging IS 'Staging table for importing Excel data - holds raw data before processing';
COMMENT ON COLUMN public.imported_books_staging.processed IS 'Whether this row has been processed into main tables';
COMMENT ON COLUMN public.imported_books_staging.processing_error IS 'Error message if processing failed';
