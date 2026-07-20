-- Migration 060: Rename total_accepted_books to total_processable_books

-- 1. Rename column in box_sessions
ALTER TABLE public.box_sessions RENAME COLUMN total_accepted_books TO total_processable_books;

-- 2. Rename column in lots
ALTER TABLE public.lots RENAME COLUMN total_accepted_books TO total_processable_books;

-- 3. Update the trigger function update_lots_from_sessions
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
        total_processable_books = (
          SELECT COALESCE(SUM(bs.total_processable_books), 0) 
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
