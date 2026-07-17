-- Migration 042: Fix trigger after removing user_flag_id

CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_is_missing BOOLEAN := FALSE;
  v_is_extra BOOLEAN := FALSE;
BEGIN
  -- Look up the book's status to see if it's missing or extra
  SELECT is_missing, is_extra INTO v_is_missing, v_is_extra 
  FROM public.books 
  WHERE id = NEW.book_id;

  UPDATE public.box_sessions
  SET 
    -- Only increment total_scanned_books if the book is physically there (not missing)
    total_scanned_books = CASE 
      WHEN v_is_missing = TRUE THEN total_scanned_books 
      ELSE total_scanned_books + 1 
    END,
    
    total_accepted_books = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_accepted_books + 1 
      ELSE total_accepted_books 
    END,
    
    -- Increment total_nonprocessable_books for BOTH missing books AND physical non-processable books
    total_nonprocessable_books = CASE 
      WHEN v_is_missing = TRUE THEN total_nonprocessable_books + 1
      WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 
      ELSE total_nonprocessable_books 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
