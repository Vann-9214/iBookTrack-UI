-- Drop sealing columns from boxes since sealing concept is no longer used in production
ALTER TABLE public.boxes
  DROP COLUMN IF EXISTS is_sealed,
  DROP COLUMN IF EXISTS sealed_at,
  DROP COLUMN IF EXISTS sealed_by;
