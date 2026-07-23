-- ============================================================
-- Migration 004: Box Sessions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.box_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  warehouse_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cut_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scan_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cut_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_time_received TIMESTAMPTZ,
  inventory_time_received TIMESTAMPTZ,
  endorsement_time_received TIMESTAMPTZ,
  cut_time_received TIMESTAMPTZ,
  scan_time_received TIMESTAMPTZ,
  inventory_time_send TIMESTAMPTZ,
  endorsement_time_send TIMESTAMPTZ,
  cut_time_send TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_scanned_books INTEGER NOT NULL DEFAULT 0,
  total_processable_books INTEGER NOT NULL DEFAULT 0,
  total_nonprocessable_books INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_box_sessions_box_id ON public.box_sessions (box_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_received_by ON public.box_sessions (warehouse_user_received);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_status ON public.box_sessions (status);



CREATE OR REPLACE FUNCTION update_lots_from_sessions()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID; v_lot_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN v_box_id := OLD.box_id; ELSE v_box_id := NEW.box_id; END IF;
  IF v_box_id IS NOT NULL THEN
    SELECT lot_id INTO v_lot_id FROM public.boxes WHERE id = v_box_id;
    IF v_lot_id IS NOT NULL THEN
      UPDATE public.lots SET total_scanned_books = (SELECT COALESCE(SUM(bs.total_scanned_books), 0) FROM public.box_sessions bs JOIN public.boxes b ON b.id = bs.box_id WHERE b.lot_id = v_lot_id), total_processable_books = (SELECT COALESCE(SUM(bs.total_processable_books), 0) FROM public.box_sessions bs JOIN public.boxes b ON b.id = bs.box_id WHERE b.lot_id = v_lot_id), total_nonprocessable_books = (SELECT COALESCE(SUM(bs.total_nonprocessable_books), 0) FROM public.box_sessions bs JOIN public.boxes b ON b.id = bs.box_id WHERE b.lot_id = v_lot_id) WHERE id = v_lot_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_lots_from_sessions ON public.box_sessions;
CREATE TRIGGER trg_update_lots_from_sessions
AFTER INSERT OR UPDATE OR DELETE ON public.box_sessions
FOR EACH ROW EXECUTE FUNCTION update_lots_from_sessions();


DROP TRIGGER IF EXISTS trg_box_sessions_updated_at ON public.box_sessions;
CREATE TRIGGER trg_box_sessions_updated_at BEFORE UPDATE ON public.box_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
