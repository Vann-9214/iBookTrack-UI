-- Migration 046: Capitalize lot type values and update constraint

-- 1. Drop the existing lowercase check constraint
ALTER TABLE public.lots DROP CONSTRAINT IF EXISTS lots_type_check;

-- 2. Capitalize existing type values
UPDATE public.lots SET type = INITCAP(type) WHERE type IN ('mustang', 'jaguar');

-- 3. Update default to capitalized
ALTER TABLE public.lots ALTER COLUMN type SET DEFAULT 'Mustang';

-- 4. Add new check constraint allowing capitalized values
ALTER TABLE public.lots ADD CONSTRAINT lots_type_check CHECK (type IN ('Mustang', 'Jaguar'));

-- 5. Recreate the index
DROP INDEX IF EXISTS idx_lots_type;
CREATE INDEX IF NOT EXISTS idx_lots_type ON public.lots(type);
