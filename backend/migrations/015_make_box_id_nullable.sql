-- ============================================================
-- Migration 015: Make box_id nullable in warehouse_sessions
-- Since boxes are now created on-demand, box_id can be null when session starts
-- ============================================================

-- Make box_id nullable in warehouse_sessions
ALTER TABLE public.warehouse_sessions 
  ALTER COLUMN box_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.warehouse_sessions.box_id IS 'Optional receiving box ID - can be null if boxes created on-demand';
