-- ============================================================
-- Migration 005: Boxes Table
-- Each lot contains hundreds of boxes
-- Each box has a unique ID and contains multiple books
-- ============================================================

CREATE TABLE IF NOT EXISTS public.boxes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number      TEXT        NOT NULL UNIQUE, -- e.g., 'BOX-001', 'B001'
  lot_id          UUID        NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  total_books     INTEGER     NOT NULL DEFAULT 0,
  books_received  INTEGER     NOT NULL DEFAULT 0,
  books_transmitted INTEGER   NOT NULL DEFAULT 0,
  current_stage   TEXT        NOT NULL DEFAULT 'intake'
                              CHECK (current_stage IN ('intake', 'cut', 'inspection', 'scan', 'validation', 'qa', 'transmit', 'storage')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at trigger
DROP TRIGGER IF EXISTS trg_boxes_updated_at ON public.boxes;
CREATE TRIGGER trg_boxes_updated_at
  BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_boxes_lot_id ON public.boxes(lot_id);
CREATE INDEX IF NOT EXISTS idx_boxes_current_stage ON public.boxes(current_stage);
CREATE INDEX IF NOT EXISTS idx_boxes_box_number ON public.boxes(box_number);
