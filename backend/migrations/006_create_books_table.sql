-- ============================================================
-- Migration 006: Books Table
-- Stores individual book details
-- Will be populated from client's API when available
-- For now, supports manual entry and ISBN scanning
-- ============================================================

CREATE TABLE IF NOT EXISTS public.books (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn            TEXT        NOT NULL, -- ISBN-10 or ISBN-13
  barcode         TEXT,       -- Barcode representation (can be same as ISBN or different)
  box_id          UUID        REFERENCES public.boxes(id) ON DELETE SET NULL,
  
  -- Book Details (will come from client's API)
  title           TEXT,
  description     TEXT,
  project_name    TEXT,       -- Project/Collection name
  book_type       TEXT        CHECK (book_type IN ('Mustang', 'Jaguar')),
  publisher       TEXT,
  language        TEXT,
  page_count      INTEGER,
  condition       TEXT,
  
  -- Tracking Information
  date_purchased  DATE,
  date_catalogued DATE,
  date_scanned    TIMESTAMPTZ,
  
  -- Status
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'scanned', 'validated', 'transmitted', 'stored')),
  current_stage   TEXT        NOT NULL DEFAULT 'intake'
                              CHECK (current_stage IN ('intake', 'cut', 'inspection', 'scan', 'validation', 'qa', 'transmit', 'storage')),
  
  -- Flags
  is_transmitted  BOOLEAN     NOT NULL DEFAULT FALSE,
  is_unaccounted  BOOLEAN     NOT NULL DEFAULT FALSE,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books(isbn);
CREATE INDEX IF NOT EXISTS idx_books_barcode ON public.books(barcode);
CREATE INDEX IF NOT EXISTS idx_books_box_id ON public.books(box_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON public.books(status);
CREATE INDEX IF NOT EXISTS idx_books_current_stage ON public.books(current_stage);
CREATE INDEX IF NOT EXISTS idx_books_is_transmitted ON public.books(is_transmitted);
CREATE INDEX IF NOT EXISTS idx_books_is_unaccounted ON public.books(is_unaccounted);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_books_box_status ON public.books(box_id, status);
