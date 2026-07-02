-- Migration 028: Add received status to box_sessions

ALTER TABLE public.box_sessions DROP CONSTRAINT IF EXISTS warehouse_sessions_status_check;
ALTER TABLE public.box_sessions DROP CONSTRAINT IF EXISTS box_sessions_status_check;

ALTER TABLE public.box_sessions ADD CONSTRAINT box_sessions_status_check 
  CHECK (status IN ('in_progress', 'completed', 'received'));
