-- Migration 059: Triggers to keep lot-level analytics in sync

-- 1. Trigger to update lots from boxes table changes
CREATE OR REPLACE FUNCTION update_lots_from_boxes()
RETURNS TRIGGER AS $$
DECLARE
  v_lot_id UUID;
BEGIN
  -- Determine the lot_id to update based on the operation
  IF TG_OP = 'DELETE' THEN
    v_lot_id := OLD.lot_id;
  ELSE
    v_lot_id := NEW.lot_id;
  END IF;

  -- Re-sum the entire boxes table for this lot and update it instantly
  IF v_lot_id IS NOT NULL THEN
    UPDATE public.lots
    SET 
      total_expected_books = (SELECT COALESCE(SUM(total_expected_books), 0) FROM public.boxes WHERE lot_id = v_lot_id),
      total_missing_books = (SELECT COALESCE(SUM(total_missing_books), 0) FROM public.boxes WHERE lot_id = v_lot_id),
      total_extra_books = (SELECT COALESCE(SUM(total_extra_books), 0) FROM public.boxes WHERE lot_id = v_lot_id),
      total_transmitted_books = (SELECT COALESCE(SUM(total_transmitted_books), 0) FROM public.boxes WHERE lot_id = v_lot_id)
    WHERE id = v_lot_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lots_from_boxes ON public.boxes;
CREATE TRIGGER trg_update_lots_from_boxes
AFTER INSERT OR UPDATE OR DELETE ON public.boxes
FOR EACH ROW EXECUTE FUNCTION update_lots_from_boxes();


-- 2. Trigger to update lots from box_sessions table changes
CREATE OR REPLACE FUNCTION update_lots_from_sessions()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID;
  v_lot_id UUID;
BEGIN
  -- Determine the box_id
  IF TG_OP = 'DELETE' THEN
    v_box_id := OLD.box_id;
  ELSE
    v_box_id := NEW.box_id;
  END IF;

  IF v_box_id IS NOT NULL THEN
    -- Get the parent lot_id for this box
    SELECT lot_id INTO v_lot_id FROM public.boxes WHERE id = v_box_id;

    -- Re-sum the entire box_sessions table for this lot and update it instantly
    IF v_lot_id IS NOT NULL THEN
      UPDATE public.lots
      SET 
        total_scanned_books = (
          SELECT COALESCE(SUM(bs.total_scanned_books), 0) 
          FROM public.box_sessions bs 
          JOIN public.boxes b ON b.id = bs.box_id 
          WHERE b.lot_id = v_lot_id
        ),
        total_accepted_books = (
          SELECT COALESCE(SUM(bs.total_accepted_books), 0) 
          FROM public.box_sessions bs 
          JOIN public.boxes b ON b.id = bs.box_id 
          WHERE b.lot_id = v_lot_id
        ),
        total_nonprocessable_books = (
          SELECT COALESCE(SUM(bs.total_nonprocessable_books), 0) 
          FROM public.box_sessions bs 
          JOIN public.boxes b ON b.id = bs.box_id 
          WHERE b.lot_id = v_lot_id
        )
      WHERE id = v_lot_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lots_from_sessions ON public.box_sessions;
CREATE TRIGGER trg_update_lots_from_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.box_sessions
FOR EACH ROW EXECUTE FUNCTION update_lots_from_sessions();
