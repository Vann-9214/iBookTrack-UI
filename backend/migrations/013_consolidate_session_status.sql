-- ============================================================
-- Migration 013: Consolidate Session Status (Real-Time Locking)
-- ============================================================
-- Combines previous 012 migrations so both inventory and endorsement
-- sessions can use 'in_progress' and 'delayed' status.

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
            IF v_stage = 'warehouse' AND v_status NOT IN ('in_progress', 'delayed', 'completed') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: in_progress, delayed, completed', v_status, v_stage;
            ELSIF v_stage = 'inventory' AND v_status NOT IN ('received', 'in_progress', 'delayed', 'completed', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, in_progress, delayed, completed, sent', v_status, v_stage;
            ELSIF v_stage = 'cut' AND v_status NOT IN ('received', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, sent', v_status, v_stage;
            ELSIF v_stage = 'endorsement' AND v_status NOT IN ('received', 'in_progress', 'delayed', 'completed', 'sent') THEN
                RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, in_progress, delayed, completed, sent', v_status, v_stage;
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
        IF v_stage = 'warehouse' AND v_status NOT IN ('in_progress', 'delayed', 'completed') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: in_progress, delayed, completed', v_status, v_stage;
        ELSIF v_stage = 'inventory' AND v_status NOT IN ('received', 'in_progress', 'delayed', 'completed', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, in_progress, delayed, completed, sent', v_status, v_stage;
        ELSIF v_stage = 'cut' AND v_status NOT IN ('received', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, sent', v_status, v_stage;
        ELSIF v_stage = 'endorsement' AND v_status NOT IN ('received', 'in_progress', 'delayed', 'completed', 'sent') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received, in_progress, delayed, completed, sent', v_status, v_stage;
        ELSIF v_stage = 'scan' AND v_status NOT IN ('received') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
        ELSIF v_stage = 'storage' AND v_status NOT IN ('received') THEN
            RAISE EXCEPTION 'Constraint Violation: Invalid session status "%" for stage "%". Allowed: received', v_status, v_stage;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
