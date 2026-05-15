-- ============================================================
-- Migration 010: Scan History (Inventory Gate)
-- Tracks all ISBN/barcode scans at the Inventory Gate
-- Logs when books are scanned and slips are printed
-- ============================================================

CREATE TABLE IF NOT EXISTS public.scan_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         UUID        REFERENCES public.books(id) ON DELETE SET NULL,
  isbn            TEXT        NOT NULL,
  barcode         TEXT,
  
  -- Scan details
  scanned_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  scanned_by_name TEXT,       -- Denormalized for quick display
  
  -- Print tracking
  slip_printed    BOOLEAN     NOT NULL DEFAULT FALSE,
  printed_at      TIMESTAMPTZ,
  
  -- Book details snapshot (in case book is deleted later)
  title           TEXT,
  box_number      TEXT,
  lot_number      TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_scan_history_book_id ON public.scan_history(book_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_isbn ON public.scan_history(isbn);
CREATE INDEX IF NOT EXISTS idx_scan_history_scanned_by ON public.scan_history(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON public.scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_slip_printed ON public.scan_history(slip_printed);
