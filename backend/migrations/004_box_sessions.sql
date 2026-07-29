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
  inventory_complete_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_complete_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_complete_at TIMESTAMPTZ,
  endorsement_complete_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_scanned_books INTEGER NOT NULL DEFAULT 0,
  total_processable_books INTEGER NOT NULL DEFAULT 0,
  total_nonprocessable_books INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.box_sessions
  ADD COLUMN IF NOT EXISTS inventory_complete_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS endorsement_complete_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_complete_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS endorsement_complete_at TIMESTAMPTZ;

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

-- 1. Create the validation function
CREATE OR REPLACE FUNCTION validate_pipeline_stage_status()
RETURNS TRIGGER AS $$
DECLARE
    v_stage text;
    v_status text;
BEGIN
    -- Determine which table fired the trigger to grab the appropriate variables
    IF TG_TABLE_NAME = 'box_sessions' THEN
        v_status := NEW.status;
        SELECT current_stage INTO v_stage FROM boxes WHERE id = NEW.box_id;
    ELSIF TG_TABLE_NAME = 'boxes' THEN
        v_stage := NEW.current_stage;
        -- If updating a box, we need to check ALL its existing sessions
        FOR v_status IN SELECT status FROM box_sessions WHERE box_id = NEW.id LOOP
            -- Run the Business Logic Rules
            IF v_stage = 'warehouse' AND v_status NOT IN ('completed') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: completed', v_status, v_stage;
            ELSIF v_stage = 'inventory' AND v_status NOT IN ('received', 'completed', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, completed, sent', v_status, v_stage;
            ELSIF v_stage = 'cut' AND v_status NOT IN ('received', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, sent', v_status, v_stage;
            ELSIF v_stage = 'endorsement' AND v_status NOT IN ('received', 'completed', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, completed, sent', v_status, v_stage;
            ELSIF v_stage = 'scan' AND v_status NOT IN ('received') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
            ELSIF v_stage = 'storage' AND v_status NOT IN ('received') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
            END IF;
        END LOOP;
        
        RETURN NEW;
    END IF;

    -- Proceed only if we have both values (for box_sessions insert/update)
    IF v_stage IS NOT NULL AND v_status IS NOT NULL THEN
        -- Run the Business Logic Rules
        IF v_stage = 'warehouse' AND v_status NOT IN ('completed') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: completed', v_status, v_stage;
        ELSIF v_stage = 'inventory' AND v_status NOT IN ('received', 'completed', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, completed, sent', v_status, v_stage;
        ELSIF v_stage = 'cut' AND v_status NOT IN ('received', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, sent', v_status, v_stage;
        ELSIF v_stage = 'endorsement' AND v_status NOT IN ('received', 'completed', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, completed, sent', v_status, v_stage;
        ELSIF v_stage = 'scan' AND v_status NOT IN ('received') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
        ELSIF v_stage = 'storage' AND v_status NOT IN ('received') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Trigger for box_sessions (fires when inserting or updating a session)
DROP TRIGGER IF EXISTS check_box_session_status ON box_sessions;
CREATE TRIGGER check_box_session_status
BEFORE INSERT OR UPDATE OF status, box_id ON box_sessions
FOR EACH ROW
EXECUTE FUNCTION validate_pipeline_stage_status();

-- 3. Trigger for boxes (fires when changing the box's stage)
DROP TRIGGER IF EXISTS check_box_stage_change ON boxes;
CREATE TRIGGER check_box_stage_change
BEFORE UPDATE OF current_stage ON boxes
FOR EACH ROW
EXECUTE FUNCTION validate_pipeline_stage_status();
