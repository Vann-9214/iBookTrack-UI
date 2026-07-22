-- ============================================================
-- Migration 010: Triggers and Functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 1. Create the function that recounts the specific lot
CREATE OR REPLACE FUNCTION update_lot_box_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If a box was INSERTED or UPDATED
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE lots
        SET total_boxes = (
            SELECT COUNT(*) FROM boxes WHERE lot_id = NEW.lot_id
        )
        WHERE id = NEW.lot_id;
    END IF;

    -- If a box was DELETED
    IF (TG_OP = 'DELETE') THEN
        UPDATE lots
        SET total_boxes = (
            SELECT COUNT(*) FROM boxes WHERE lot_id = OLD.lot_id
        )
        WHERE id = OLD.lot_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the boxes table
DROP TRIGGER IF EXISTS trigger_update_lot_box_count ON boxes;

CREATE TRIGGER trigger_update_lot_box_count
AFTER INSERT OR DELETE OR UPDATE OF lot_id ON boxes
FOR EACH ROW
EXECUTE FUNCTION update_lot_box_count();


-- Migration 037: Fix box session counts and remove books_received
-- 1. Drop books_received from boxes
-- 2. Update trigger so 'missing' books do not increment physical scan counts

-- 1. Drop the redundant column from boxes
ALTER TABLE public.boxes DROP COLUMN IF EXISTS books_received;

-- 2. Update the trigger function
CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.box_sessions
  SET 
    -- Only increment total_scanned_books if the book is physically there (not missing)
    total_scanned_books = CASE 
      WHEN NEW.rejection_reason = 'missing' THEN total_scanned_books 
      ELSE total_scanned_books + 1 
    END,
    
    total_processable_books = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_processable_books + 1 
      ELSE total_processable_books 
    END,
    
    -- Only increment total_nonprocessable_books for physical books (e.g. 'extra', 'wrong_lot')
    total_nonprocessable_books = CASE 
      WHEN NEW.scan_status = 'non_processable' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason != 'missing') THEN total_nonprocessable_books + 1 
      ELSE total_nonprocessable_books 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Prevent direct deletion of records in box_sessions table, but allow cascade deletes
CREATE OR REPLACE FUNCTION prevent_direct_box_session_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- pg_trigger_depth() is 0 for direct DELETE queries. 
  -- It is > 0 for ON DELETE CASCADE triggered by deleting the parent box.
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'Direct deletion of box_sessions records is not allowed. They can only be deleted by deleting the parent box.';
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_direct_box_session_delete ON public.box_sessions;
DROP TRIGGER IF EXISTS trg_prevent_box_session_delete ON public.box_sessions;

CREATE TRIGGER trg_prevent_direct_box_session_delete
BEFORE DELETE ON public.box_sessions
FOR EACH ROW
EXECUTE FUNCTION prevent_direct_box_session_delete();


-- Migration: Auto-delete lots when they have 0 boxes left

-- Create the trigger function
CREATE OR REPLACE FUNCTION delete_empty_lot()
RETURNS TRIGGER AS $$
BEGIN
    -- After a box is deleted or moved, check if the old lot has any boxes left
    IF NOT EXISTS (
        SELECT 1 
        FROM public.boxes 
        WHERE lot_id = OLD.lot_id
    ) THEN
        -- No boxes left? Auto-delete the empty lot
        DELETE FROM public.lots WHERE id = OLD.lot_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the boxes table (for DELETE and UPDATE of lot_id)
DROP TRIGGER IF EXISTS trigger_delete_empty_lot ON public.boxes;
CREATE TRIGGER trigger_delete_empty_lot
AFTER DELETE OR UPDATE OF lot_id ON public.boxes
FOR EACH ROW
EXECUTE FUNCTION delete_empty_lot();


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

DROP TRIGGER IF EXISTS trg_update_lots_from_sessions ON public.box_sessions;
CREATE TRIGGER trg_update_lots_from_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.box_sessions
FOR EACH ROW EXECUTE FUNCTION update_lots_from_sessions();


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



CREATE TRIGGER trg_lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_boxes_updated_at BEFORE UPDATE ON public.boxes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_box_sessions_updated_at BEFORE UPDATE ON public.box_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
