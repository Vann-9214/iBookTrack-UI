-- 044_update_box_type.sql
-- Remove the old check constraint on box_type
ALTER TABLE public.boxes DROP CONSTRAINT IF EXISTS boxes_box_type_check;

-- Remove the old unique constraint (lot_id, box_number)
ALTER TABLE public.boxes DROP CONSTRAINT IF EXISTS boxes_lot_id_box_number_key;

-- Add the new unique constraint (lot_id, box_number, box_type)
ALTER TABLE public.boxes ADD CONSTRAINT boxes_lot_id_box_number_type_key UNIQUE (lot_id, box_number, box_type);
