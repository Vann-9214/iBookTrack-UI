-- ============================================================
-- Migration 008: Transmission Queue
-- Tracks transmission status of lots/boxes
-- Shows progress of books being transmitted
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transmission_queue (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id              UUID        NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  box_id              UUID        REFERENCES public.boxes(id) ON DELETE CASCADE,
  
  -- Transmission details
  books_received      INTEGER     NOT NULL DEFAULT 0,
  total_transmitted_books   INTEGER     NOT NULL DEFAULT 0,
  
  -- Status tracking
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  transmission_date   TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  
  -- Error tracking
  error_message       TEXT,
  retry_count         INTEGER     NOT NULL DEFAULT 0,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_transmission_queue_updated_at ON public.transmission_queue;
CREATE TRIGGER trg_transmission_queue_updated_at
  BEFORE UPDATE ON public.transmission_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transmission_queue_lot_id ON public.transmission_queue(lot_id);
CREATE INDEX IF NOT EXISTS idx_transmission_queue_box_id ON public.transmission_queue(box_id);
CREATE INDEX IF NOT EXISTS idx_transmission_queue_status ON public.transmission_queue(status);
CREATE INDEX IF NOT EXISTS idx_transmission_queue_created_at ON public.transmission_queue(created_at DESC);
