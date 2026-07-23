-- ============================================================
-- Migration 008: Storage Locations Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storage_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf INTEGER NOT NULL DEFAULT 1,
  rack TEXT NOT NULL,
  level INTEGER NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 20,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(shelf, rack, level)
);
