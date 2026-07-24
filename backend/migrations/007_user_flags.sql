-- ============================================================
-- Migration 007: User Flags Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_activity_id UUID REFERENCES public.book_activity(id) ON DELETE CASCADE,
  rejection_reason TEXT NOT NULL,
  notes TEXT,
  warehouse_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scan_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_flag_at TIMESTAMPTZ,
  inventory_flag_at TIMESTAMPTZ,
  endorsement_flag_at TIMESTAMPTZ,
  scan_flag_at TIMESTAMPTZ
);



CREATE OR REPLACE FUNCTION update_box_session_counts_for_missing()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rejection_reason = 'missing' THEN
    UPDATE public.box_sessions SET total_scanned_books = GREATEST(0, total_scanned_books - 1), total_nonprocessable_books = GREATEST(0, total_nonprocessable_books - 1) WHERE id = (SELECT session_id FROM public.book_activity WHERE id = NEW.book_activity_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_flags_missing ON public.user_flags;
CREATE TRIGGER trg_user_flags_missing
AFTER INSERT ON public.user_flags
FOR EACH ROW EXECUTE FUNCTION update_box_session_counts_for_missing();
