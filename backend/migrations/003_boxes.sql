-- ============================================================
-- Migration 003: Boxes Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_number TEXT NOT NULL,
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



CREATE OR REPLACE FUNCTION update_lot_box_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE lots SET total_boxes = (SELECT COUNT(*) FROM boxes WHERE lot_id = NEW.lot_id) WHERE id = NEW.lot_id;
    END IF;
    IF (TG_OP = 'DELETE') THEN
        UPDATE lots SET total_boxes = (SELECT COUNT(*) FROM boxes WHERE lot_id = OLD.lot_id) WHERE id = OLD.lot_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lot_box_count_trigger ON boxes;
CREATE TRIGGER update_lot_box_count_trigger
AFTER INSERT OR UPDATE OR DELETE ON boxes
FOR EACH ROW EXECUTE FUNCTION update_lot_box_count();


CREATE OR REPLACE FUNCTION update_lots_from_boxes()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_lot_id := OLD.lot_id; ELSE v_lot_id := NEW.lot_id; END IF;
  IF v_lot_id IS NOT NULL THEN
    UPDATE public.lots SET total_expected_books = (SELECT COALESCE(SUM(total_expected_books), 0) FROM public.boxes WHERE lot_id = v_lot_id), total_missing_books = (SELECT COALESCE(SUM(total_missing_books), 0) FROM public.boxes WHERE lot_id = v_lot_id), total_extra_books = (SELECT COALESCE(SUM(total_extra_books), 0) FROM public.boxes WHERE lot_id = v_lot_id), total_transmitted_books = (SELECT COALESCE(SUM(total_transmitted_books), 0) FROM public.boxes WHERE lot_id = v_lot_id) WHERE id = v_lot_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lots_from_boxes ON public.boxes;
CREATE TRIGGER trg_update_lots_from_boxes
AFTER INSERT OR UPDATE OR DELETE ON public.boxes
FOR EACH ROW EXECUTE FUNCTION update_lots_from_boxes();


DROP TRIGGER IF EXISTS trg_boxes_updated_at ON public.boxes;
CREATE TRIGGER trg_boxes_updated_at BEFORE UPDATE ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
