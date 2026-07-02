-- 1. Create the function that recounts the specific lot
CREATE OR REPLACE FUNCTION update_lot_box_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If a box was INSERTED or UPDATED
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE lots
        SET total_boxes = (
            SELECT COUNT(*) FROM boxes WHERE lot_id = NEW.lot_id
        )
        WHERE id = NEW.lot_id;
    END IF;

    -- If a box was DELETED
    IF (TG_OP = 'DELETE') THEN
        UPDATE lots
        SET total_boxes = (
            SELECT COUNT(*) FROM boxes WHERE lot_id = OLD.lot_id
        )
        WHERE id = OLD.lot_id;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the boxes table
DROP TRIGGER IF EXISTS trigger_update_lot_box_count ON boxes;

CREATE TRIGGER trigger_update_lot_box_count
AFTER INSERT OR DELETE OR UPDATE OF lot_id ON boxes
FOR EACH ROW
EXECUTE FUNCTION update_lot_box_count();
