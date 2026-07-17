-- Migration 040: Transform qc_flags to user_flags and link to book_activity

-- 1. Rename table
ALTER TABLE public.qc_flags RENAME TO user_flags;

-- 2. Rename columns
ALTER TABLE public.user_flags RENAME COLUMN issue TO rejection_reason;
ALTER TABLE public.user_flags RENAME COLUMN remarks TO notes;
ALTER TABLE public.user_flags RENAME COLUMN flagged_by TO warehouse_flag_by;
ALTER TABLE public.user_flags RENAME COLUMN flagged_at TO warehouse_flag_at;

-- 3. Drop unneeded columns
ALTER TABLE public.user_flags DROP COLUMN IF EXISTS flagged_by_name;
ALTER TABLE public.user_flags DROP COLUMN IF EXISTS scan_id; -- No longer points to scan, scan points here
ALTER TABLE public.user_flags DROP COLUMN IF EXISTS isbn;
ALTER TABLE public.user_flags DROP COLUMN IF EXISTS title;
ALTER TABLE public.user_flags DROP COLUMN IF EXISTS box_id;

-- 4. Add new tracking columns to user_flags
ALTER TABLE public.user_flags ADD COLUMN IF NOT EXISTS inventory_flag_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.user_flags ADD COLUMN IF NOT EXISTS inventory_flag_at TIMESTAMPTZ;
ALTER TABLE public.user_flags ADD COLUMN IF NOT EXISTS endorsement_flag_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.user_flags ADD COLUMN IF NOT EXISTS endorsement_flag_at TIMESTAMPTZ;
ALTER TABLE public.user_flags ADD COLUMN IF NOT EXISTS endorsement_flag_at TIMESTAMPTZ;

-- 5. Add user_flag_id to book_activity
ALTER TABLE public.book_activity ADD COLUMN IF NOT EXISTS user_flag_id UUID REFERENCES public.user_flags(id) ON DELETE SET NULL;

-- 6. Update the trigger to use user_flags instead of book_activity columns
CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
DECLARE
  flag_reason TEXT := NULL;
BEGIN
  IF NEW.user_flag_id IS NOT NULL THEN
    SELECT rejection_reason INTO flag_reason FROM public.user_flags WHERE id = NEW.user_flag_id;
  END IF;

  UPDATE public.box_sessions
  SET 
    -- Only increment total_scanned_books if the book is physically there (not missing)
    total_scanned_books = CASE 
      WHEN flag_reason = 'missing' THEN total_scanned_books 
      ELSE total_scanned_books + 1 
    END,
    
    total_accepted_books = CASE 
      WHEN NEW.scan_status = 'processable' THEN total_accepted_books + 1 
      ELSE total_accepted_books 
    END,
    
    -- Only increment total_nonprocessable_books for physical books (e.g. 'extra', 'wrong_lot')
    total_nonprocessable_books = CASE 
      WHEN NEW.scan_status = 'non_processable' AND (flag_reason IS NULL OR flag_reason != 'missing') THEN total_nonprocessable_books + 1 
      ELSE total_nonprocessable_books 
    END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Drop columns from book_activity (Do this last so previous trigger events don't break during transition)
ALTER TABLE public.book_activity DROP COLUMN IF EXISTS rejection_reason;
ALTER TABLE public.book_activity DROP COLUMN IF EXISTS notes;
