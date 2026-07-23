-- ============================================================
-- Migration 006: Book Activity Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.book_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.box_sessions(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  scan_status TEXT NOT NULL,
  transmission_status TEXT NOT NULL DEFAULT 'pending',
  warehouse_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_scan_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  inventory_scan_at TIMESTAMPTZ,
  endorsement_scan_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_book_activity_book_id ON public.book_activity (book_id);
CREATE INDEX IF NOT EXISTS idx_book_activity_session_id ON public.book_activity (session_id);
CREATE INDEX IF NOT EXISTS idx_book_activity_transmission_status ON public.book_activity (transmission_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scan_status ON public.book_activity (scan_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scanned_at ON public.book_activity (warehouse_scan_at DESC);



CREATE OR REPLACE FUNCTION update_box_transmitted_books()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN SELECT box_id INTO v_box_id FROM public.books WHERE id = OLD.book_id; ELSE SELECT box_id INTO v_box_id FROM public.books WHERE id = NEW.book_id; END IF;
  IF v_box_id IS NOT NULL THEN
    UPDATE public.boxes SET total_transmitted_books = (SELECT COUNT(*) FROM public.book_activity ba JOIN public.books b ON b.id = ba.book_id WHERE b.box_id = v_box_id AND ba.transmission_status = 'Transmission_Archive COMPLETED') WHERE id = v_box_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_box_transmitted_books ON public.book_activity;
CREATE TRIGGER trg_update_box_transmitted_books
AFTER INSERT OR UPDATE OF transmission_status OR DELETE ON public.book_activity
FOR EACH ROW EXECUTE FUNCTION update_box_transmitted_books();


CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.box_sessions SET total_scanned_books = total_scanned_books + 1, total_processable_books = CASE WHEN NEW.scan_status = 'processable' THEN total_processable_books + 1 ELSE total_processable_books END, total_nonprocessable_books = CASE WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 ELSE total_nonprocessable_books END WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_box_session_counts ON public.book_activity;
CREATE TRIGGER trg_update_box_session_counts
AFTER INSERT ON public.book_activity
FOR EACH ROW EXECUTE FUNCTION update_box_session_counts();
