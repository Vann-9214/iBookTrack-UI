-- ============================================================
-- Migration 011: Fix session counts trigger
-- ============================================================

-- 1. Redefine the function to not reference rejection_reason since it is not in book_activity
CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.box_sessions
  SET 
    total_scanned_books = total_scanned_books + 1,
    
    total_processable_books = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_processable_books + 1 
      ELSE total_processable_books 
    END,
    
    total_nonprocessable_books = CASE 
      WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 
      ELSE total_nonprocessable_books 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to book_activity
DROP TRIGGER IF EXISTS trg_update_box_session_counts ON public.book_activity;
CREATE TRIGGER trg_update_box_session_counts
AFTER INSERT ON public.book_activity
FOR EACH ROW EXECUTE FUNCTION update_box_session_counts();

-- 3. Handle 'missing' books deduction via user_flags table
CREATE OR REPLACE FUNCTION update_box_session_counts_for_missing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rejection_reason = 'missing' THEN
    UPDATE public.box_sessions
    SET 
      total_scanned_books = GREATEST(0, total_scanned_books - 1),
      total_nonprocessable_books = GREATEST(0, total_nonprocessable_books - 1)
    WHERE id = (SELECT session_id FROM public.book_activity WHERE id = NEW.book_activity_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_flags_missing ON public.user_flags;
CREATE TRIGGER trg_user_flags_missing
AFTER INSERT ON public.user_flags
FOR EACH ROW EXECUTE FUNCTION update_box_session_counts_for_missing();
