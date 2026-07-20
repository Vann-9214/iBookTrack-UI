-- ============================================================
-- Migration 012: Warehouse Operations
-- Tracks warehouse receiving, scanning, and book segregation
-- Books are scanned and either accepted or rejected
-- Segregated into different boxes based on status
-- ============================================================

-- Warehouse receiving sessions (when a box arrives at warehouse)
CREATE TABLE IF NOT EXISTS public.warehouse_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id          UUID        NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  received_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  received_by_name TEXT       NOT NULL,
  
  -- Session tracking
  status          TEXT        NOT NULL DEFAULT 'in_progress'
                              CHECK (status IN ('in_progress', 'completed')),
  total_scanned_books   INTEGER     NOT NULL DEFAULT 0,
  total_processable_books  INTEGER     NOT NULL DEFAULT 0,
  total_nonprocessable_books  INTEGER     NOT NULL DEFAULT 0,
  
  -- Segregation boxes
  accepted_box_id UUID        REFERENCES public.boxes(id) ON DELETE SET NULL,
  rejected_box_id UUID        REFERENCES public.boxes(id) ON DELETE SET NULL,
  
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Book scan logs (every book scanned in warehouse)
CREATE TABLE IF NOT EXISTS public.warehouse_book_scans (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES public.warehouse_sessions(id) ON DELETE CASCADE,
  book_id         UUID        REFERENCES public.books(id) ON DELETE SET NULL,
  
  -- Scan result
  scan_status     TEXT        NOT NULL
                              CHECK (scan_status IN ('processable', 'non_processable')),
  rejection_reason TEXT,      -- Reason if rejected/mismatch/damaged
  notes           TEXT,
  
  -- Book details snapshot at time of scan
  book_type       TEXT,
  condition       TEXT,
  
  -- Assignment to segregated box (Removed: assigned_box_id)
  
  scanned_by      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  scanned_by_name TEXT,
  scanned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update triggers
DROP TRIGGER IF EXISTS trg_warehouse_sessions_updated_at ON public.warehouse_sessions;
CREATE TRIGGER trg_warehouse_sessions_updated_at
  BEFORE UPDATE ON public.warehouse_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_box_id ON public.warehouse_sessions(box_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_status ON public.warehouse_sessions(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_received_by ON public.warehouse_sessions(received_by);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_started_at ON public.warehouse_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_session_id ON public.warehouse_book_scans(session_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_book_id ON public.warehouse_book_scans(book_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scan_status ON public.warehouse_book_scans(scan_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scanned_at ON public.warehouse_book_scans(scanned_at DESC);

-- Function to update session counts when book is scanned
CREATE OR REPLACE FUNCTION update_warehouse_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.warehouse_sessions
  SET 
    total_scanned_books = total_scanned_books + 1,
    total_processable_books = CASE WHEN NEW.scan_status = 'processable' THEN total_processable_books + 1 ELSE total_processable_books END,
    total_nonprocessable_books = CASE WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 ELSE total_nonprocessable_books END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_session_counts ON public.warehouse_book_scans;
CREATE TRIGGER trg_update_session_counts
  AFTER INSERT ON public.warehouse_book_scans
  FOR EACH ROW EXECUTE FUNCTION update_warehouse_session_counts();
