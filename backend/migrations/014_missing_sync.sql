-- ============================================================
-- Migration 014: Missing Triggers and Indexes Sync
-- ============================================================

-- 1. Auto-delete empty lots trigger (Currently in DB but missing from scripts)
CREATE OR REPLACE FUNCTION public.delete_empty_lot()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.boxes WHERE lot_id = OLD.lot_id
    ) THEN
        DELETE FROM public.lots WHERE id = OLD.lot_id;
    END IF;
    RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_delete_empty_lot ON public.boxes;
CREATE TRIGGER trigger_delete_empty_lot
AFTER DELETE OR UPDATE OF lot_id ON public.boxes
FOR EACH ROW EXECUTE FUNCTION public.delete_empty_lot();

-- 2. Prevent direct box session deletion (Currently in DB but missing from scripts)
CREATE OR REPLACE FUNCTION public.prevent_direct_box_session_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF pg_trigger_depth() = 0 THEN
    RAISE EXCEPTION 'Direct deletion of box_sessions records is not allowed. They can only be deleted by deleting the parent box.';
  END IF;
  RETURN OLD;
END;
$function$;

DROP TRIGGER IF EXISTS trg_prevent_direct_box_session_delete ON public.box_sessions;
CREATE TRIGGER trg_prevent_direct_box_session_delete
BEFORE DELETE ON public.box_sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_direct_box_session_delete();

-- 3. Missing Performance Index
-- user_flags has an ON DELETE CASCADE for book_activity_id, but no index. 
-- This causes a slow full-table scan every time a book scan is deleted.
CREATE INDEX IF NOT EXISTS idx_user_flags_book_activity_id ON public.user_flags (book_activity_id);
