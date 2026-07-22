-- ============================================================
-- Migration 003: Boxes Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number TEXT NOT NULL UNIQUE,
  lot_id UUID NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  total_expected_books INTEGER NOT NULL DEFAULT 0,
  total_transmitted_books INTEGER NOT NULL DEFAULT 0,
  current_stage TEXT NOT NULL DEFAULT 'intake',
  box_type TEXT DEFAULT 'mixed',
  total_missing_books INTEGER DEFAULT 0,
  total_extra_books INTEGER DEFAULT 0,
  total_mismatch_books INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boxes_box_number ON public.boxes (box_number);
CREATE INDEX IF NOT EXISTS idx_boxes_box_type ON public.boxes (box_type);
CREATE INDEX IF NOT EXISTS idx_boxes_current_stage ON public.boxes (current_stage);
CREATE INDEX IF NOT EXISTS idx_boxes_lot_id ON public.boxes (lot_id);
CREATE UNIQUE INDEX IF NOT EXISTS boxes_lot_id_box_number_type_key ON public.boxes (lot_id, box_number, box_type);
