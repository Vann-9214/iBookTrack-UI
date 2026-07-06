-- Migration: Auto-delete lots when they have 0 boxes left

-- Create the trigger function
CREATE OR REPLACE FUNCTION delete_empty_lot()
RETURNS TRIGGER AS $$
BEGIN
    -- After a box is deleted or moved, check if the old lot has any boxes left
    IF NOT EXISTS (
        SELECT 1 
        FROM public.boxes 
        WHERE lot_id = OLD.lot_id
    ) THEN
        -- No boxes left? Auto-delete the empty lot
        DELETE FROM public.lots WHERE id = OLD.lot_id;
    END IF;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to the boxes table (for DELETE and UPDATE of lot_id)
DROP TRIGGER IF EXISTS trigger_delete_empty_lot ON public.boxes;
CREATE TRIGGER trigger_delete_empty_lot
AFTER DELETE OR UPDATE OF lot_id ON public.boxes
FOR EACH ROW
EXECUTE FUNCTION delete_empty_lot();
