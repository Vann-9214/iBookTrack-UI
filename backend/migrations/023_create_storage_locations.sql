-- ============================================================
-- Migration 023: Storage Locations Table
-- Tracks which physical rack/level slot each box occupies in storage.
-- Each slot holds up to 20 boxes (capacity).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storage_locations (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id      TEXT        NOT NULL,             -- e.g. 'A', 'B', 'C', 'D'
  level        INTEGER     NOT NULL,             -- 1, 2, 3, 4
  capacity     INTEGER     NOT NULL DEFAULT 20,  -- max boxes per slot
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rack_id, level)
);

-- Junction: which boxes are stored in which slot
CREATE TABLE IF NOT EXISTS public.storage_assignments (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID        NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  box_id              UUID        NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  assigned_by         UUID        REFERENCES auth.users(id),
  assigned_by_name    TEXT,
  assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (box_id)  -- a box can only be in one location at a time
);

CREATE INDEX IF NOT EXISTS idx_storage_assignments_location ON public.storage_assignments(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_storage_assignments_box ON public.storage_assignments(box_id);

-- Seed default rack/level combinations: Racks A-D, Levels 1-4
INSERT INTO public.storage_locations (rack_id, level, capacity) VALUES
  ('A', 1, 20), ('A', 2, 20), ('A', 3, 20), ('A', 4, 20),
  ('B', 1, 20), ('B', 2, 20), ('B', 3, 20), ('B', 4, 20),
  ('C', 1, 20), ('C', 2, 20), ('C', 3, 20), ('C', 4, 20),
  ('D', 1, 20), ('D', 2, 20), ('D', 3, 20), ('D', 4, 20)
ON CONFLICT (rack_id, level) DO NOTHING;

-- RLS: allow authenticated users to read; allow service role full access
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_locations_read" ON public.storage_locations;
CREATE POLICY "storage_locations_read" ON public.storage_locations
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "storage_assignments_read" ON public.storage_assignments;
CREATE POLICY "storage_assignments_read" ON public.storage_assignments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "storage_assignments_write" ON public.storage_assignments;
CREATE POLICY "storage_assignments_write" ON public.storage_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
