-- ============================================================
-- Migration 048: Remove lot_id from box_sessions
-- Since the frontend now strictly enforces creating/selecting a box
-- before starting a session, box_id is never null. Therefore,
-- lot_id on box_sessions is redundant (it can be joined via boxes table).
-- ============================================================

-- Drop the index first
DROP INDEX IF EXISTS public.idx_box_sessions_lot_id;

-- Drop the foreign key constraint
ALTER TABLE public.box_sessions 
DROP CONSTRAINT IF EXISTS warehouse_sessions_lot_id_fkey;

ALTER TABLE public.box_sessions 
DROP CONSTRAINT IF EXISTS box_sessions_lot_id_fkey;

-- Drop the column
ALTER TABLE public.box_sessions 
DROP COLUMN IF EXISTS lot_id;
