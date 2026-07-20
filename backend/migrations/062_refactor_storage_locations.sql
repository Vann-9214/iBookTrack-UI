-- Migration 062: Refactor storage_locations to use shelf, rack, level

-- 1. Add the shelf column
ALTER TABLE public.storage_locations ADD COLUMN IF NOT EXISTS shelf INTEGER NOT NULL DEFAULT 1;

-- 2. Update existing data to extract shelf and rack
-- Assuming existing rack_id format is like 'A' (for shelf 1) or 'S2-A' (for shelf 2)
UPDATE public.storage_locations
SET
  shelf = CASE
    WHEN rack_id LIKE 'S%-%' THEN CAST(SUBSTRING(rack_id FROM 2 FOR POSITION('-' IN rack_id) - 2) AS INTEGER)
    ELSE 1
  END,
  rack_id = CASE
    WHEN rack_id LIKE 'S%-%' THEN SUBSTRING(rack_id FROM POSITION('-' IN rack_id) + 1)
    ELSE rack_id
  END;

-- 3. Rename rack_id to rack
ALTER TABLE public.storage_locations RENAME COLUMN rack_id TO rack;

-- 4. Drop the old unique constraint (rack_id, level)
ALTER TABLE public.storage_locations DROP CONSTRAINT IF EXISTS storage_locations_rack_id_level_key;

-- 5. Add the new unique constraint (shelf, rack, level)
ALTER TABLE public.storage_locations ADD CONSTRAINT storage_locations_shelf_rack_level_key UNIQUE (shelf, rack, level);
