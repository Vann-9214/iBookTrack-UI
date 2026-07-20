-- Migration 029: Fix old triggers that still reference book_sessions

-- 1. Drop the old trigger if it exists
DROP TRIGGER IF EXISTS trg_update_book_session_counts ON public.book_scans;

-- 2. Drop the old function if it exists (CASCADE will drop any triggers attached to it)
DROP FUNCTION IF EXISTS update_book_session_counts() CASCADE;

-- 3. Ensure the new trigger function exists and points to box_sessions
CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.box_sessions
  SET 
    total_scanned_books = total_scanned_books + 1,
    total_processable_books = CASE WHEN NEW.scan_status = 'processable' THEN total_processable_books + 1 ELSE total_processable_books END,
    total_nonprocessable_books = CASE WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 ELSE total_nonprocessable_books END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the new trigger
DROP TRIGGER IF EXISTS trg_update_box_session_counts ON public.book_scans;
CREATE TRIGGER trg_update_box_session_counts
  AFTER INSERT ON public.book_scans
  FOR EACH ROW EXECUTE FUNCTION update_box_session_counts();
