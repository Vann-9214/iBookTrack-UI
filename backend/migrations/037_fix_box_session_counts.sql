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
    -- Only increment total_scanned if the book is physically there (not missing)
    total_scanned = CASE 
      WHEN NEW.rejection_reason = 'missing' THEN total_scanned 
      ELSE total_scanned + 1 
    END,
    
    total_accepted = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_accepted + 1 
      ELSE total_accepted 
    END,
    
    -- Only increment total_rejected for physical books (e.g. 'extra', 'wrong_lot')
    total_rejected = CASE 
      WHEN NEW.scan_status = 'non_processable' AND (NEW.rejection_reason IS NULL OR NEW.rejection_reason != 'missing') THEN total_rejected + 1 
      ELSE total_rejected 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
