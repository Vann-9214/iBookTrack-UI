-- Migration 061: Trigger to auto-update total_transmitted_books on boxes

CREATE OR REPLACE FUNCTION update_box_transmitted_books()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID;
BEGIN
  -- Determine the book's box_id
  IF TG_OP = 'DELETE' THEN
    SELECT box_id INTO v_box_id FROM public.books WHERE id = OLD.book_id;
  ELSE
    SELECT box_id INTO v_box_id FROM public.books WHERE id = NEW.book_id;
  END IF;

  IF v_box_id IS NOT NULL THEN
    -- Count how many book_activity records for this box have transmission_status = 'Transmission_Archive COMPLETED'
    UPDATE public.boxes
    SET total_transmitted_books = (
      SELECT COUNT(*)
      FROM public.book_activity ba
      JOIN public.books b ON b.id = ba.book_id
      WHERE b.box_id = v_box_id
        AND ba.transmission_status = 'Transmission_Archive COMPLETED'
    )
    WHERE id = v_box_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_box_transmitted_books ON public.book_activity;
CREATE TRIGGER trg_update_box_transmitted_books
AFTER INSERT OR UPDATE OF transmission_status OR DELETE ON public.book_activity
FOR EACH ROW EXECUTE FUNCTION update_box_transmitted_books();
