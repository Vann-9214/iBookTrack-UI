-- Migration 056: Trigger to update box missing/extra/mismatch counts

CREATE OR REPLACE FUNCTION update_box_book_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' AND NEW.box_id IS NOT NULL THEN
    UPDATE public.boxes
    SET 
      total_missing_books = total_missing_books + (CASE WHEN NEW.is_missing THEN 1 ELSE 0 END),
      total_extra_books = total_extra_books + (CASE WHEN NEW.is_extra THEN 1 ELSE 0 END),
      total_mismatch_books = total_mismatch_books + (CASE WHEN NEW.is_mismatch THEN 1 ELSE 0 END)
    WHERE id = NEW.box_id;
  END IF;

  -- Handle UPDATE (same box)
  IF TG_OP = 'UPDATE' AND OLD.box_id = NEW.box_id AND NEW.box_id IS NOT NULL THEN
    UPDATE public.boxes
    SET 
      total_missing_books = total_missing_books + 
        (CASE WHEN NEW.is_missing AND NOT OLD.is_missing THEN 1 
              WHEN NOT NEW.is_missing AND OLD.is_missing THEN -1 ELSE 0 END),
              
      total_extra_books = total_extra_books + 
        (CASE WHEN NEW.is_extra AND NOT OLD.is_extra THEN 1 
              WHEN NOT NEW.is_extra AND OLD.is_extra THEN -1 ELSE 0 END),
              
      total_mismatch_books = total_mismatch_books + 
        (CASE WHEN NEW.is_mismatch AND NOT OLD.is_mismatch THEN 1 
              WHEN NOT NEW.is_mismatch AND OLD.is_mismatch THEN -1 ELSE 0 END)
    WHERE id = NEW.box_id;
  END IF;

  -- Handle UPDATE (moving between boxes)
  IF TG_OP = 'UPDATE' AND OLD.box_id IS DISTINCT FROM NEW.box_id THEN
    -- Remove from old box
    IF OLD.box_id IS NOT NULL THEN
      UPDATE public.boxes
      SET 
        total_missing_books = total_missing_books - (CASE WHEN OLD.is_missing THEN 1 ELSE 0 END),
        total_extra_books = total_extra_books - (CASE WHEN OLD.is_extra THEN 1 ELSE 0 END),
        total_mismatch_books = total_mismatch_books - (CASE WHEN OLD.is_mismatch THEN 1 ELSE 0 END)
      WHERE id = OLD.box_id;
    END IF;
    
    -- Add to new box
    IF NEW.box_id IS NOT NULL THEN
      UPDATE public.boxes
      SET 
        total_missing_books = total_missing_books + (CASE WHEN NEW.is_missing THEN 1 ELSE 0 END),
        total_extra_books = total_extra_books + (CASE WHEN NEW.is_extra THEN 1 ELSE 0 END),
        total_mismatch_books = total_mismatch_books + (CASE WHEN NEW.is_mismatch THEN 1 ELSE 0 END)
      WHERE id = NEW.box_id;
    END IF;
  END IF;

  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.box_id IS NOT NULL THEN
    UPDATE public.boxes
    SET 
      total_missing_books = total_missing_books - (CASE WHEN OLD.is_missing THEN 1 ELSE 0 END),
      total_extra_books = total_extra_books - (CASE WHEN OLD.is_extra THEN 1 ELSE 0 END),
      total_mismatch_books = total_mismatch_books - (CASE WHEN OLD.is_mismatch THEN 1 ELSE 0 END)
    WHERE id = OLD.box_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_box_book_counts ON public.books;
CREATE TRIGGER trg_update_box_book_counts
AFTER INSERT OR UPDATE OR DELETE ON public.books
FOR EACH ROW EXECUTE FUNCTION update_box_book_counts();
