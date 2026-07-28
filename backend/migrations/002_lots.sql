-- ============================================================
-- Migration 002: Lots Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number TEXT NOT NULL,
  total_boxes INTEGER NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'Mustang',
  total_scanned_books INTEGER DEFAULT 0,
  total_processable_books INTEGER DEFAULT 0,
  total_missing_books INTEGER DEFAULT 0,
  total_extra_books INTEGER DEFAULT 0,
  total_nonprocessable_books INTEGER DEFAULT 0,
  total_expected_books INTEGER DEFAULT 0,
  total_transmitted_books INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lots_type ON public.lots (type);
CREATE UNIQUE INDEX IF NOT EXISTS lots_lot_number_type_key ON public.lots (lot_number, type);



DROP TRIGGER IF EXISTS trg_lots_updated_at ON public.lots;
CREATE TRIGGER trg_lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
