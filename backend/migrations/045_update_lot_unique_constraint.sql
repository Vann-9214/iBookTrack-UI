-- 045_update_lot_unique_constraint.sql
-- Drop the old unique constraint on lot_number alone
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_lot_number_key;

-- Add a new unique constraint that scopes lot_number uniqueness per brand type (mustang, jaguar, etc.)
ALTER TABLE public.lots ADD CONSTRAINT lots_lot_number_type_key UNIQUE (lot_number, type);
