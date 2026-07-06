-- Migration: Rename 'status' to 'type' in lots and enforce 'mustang' or 'jaguar'

-- 1. Rename column
ALTER TABLE public.lots RENAME COLUMN status TO type;

-- 2. Drop the existing CHECK constraint
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_status_check;
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_type_check;

-- 3. Update all existing values to 'mustang' to avoid check constraint violation during creation
UPDATE public.lots SET type = 'mustang';

-- 4. Set new default and check constraint
ALTER TABLE public.lots ALTER COLUMN type SET DEFAULT 'mustang';
ALTER TABLE public.lots ADD CONSTRAINT lots_type_check CHECK (type IN ('mustang', 'jaguar'));

-- 5. Drop the old index and recreate it
DROP INDEX IF EXISTS idx_lots_status;
CREATE INDEX IF NOT EXISTS idx_lots_type ON public.lots(type);
