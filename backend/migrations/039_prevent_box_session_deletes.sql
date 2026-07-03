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
