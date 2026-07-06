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
    -- Only increment total_scanned if the book is physically there (not missing)
    total_scanned = CASE 
      WHEN v_is_missing = TRUE THEN total_scanned 
      ELSE total_scanned + 1 
    END,
    
    total_accepted = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_accepted + 1 
      ELSE total_accepted 
    END,
    
    -- Only increment total_rejected for physical books (not missing)
    total_rejected = CASE 
      WHEN NEW.scan_status = 'non_processable' AND (v_is_missing IS NULL OR v_is_missing = FALSE) THEN total_rejected + 1 
      ELSE total_rejected 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
