-- Migration 049: Add 'sent' status to box_sessions
-- Allows marking a box session as sent to the next station
-- without changing the box's current_stage.
-- ============================================================

ALTER TABLE public.box_sessions
DROP CONSTRAINT IF EXISTS box_sessions_status_check;

ALTER TABLE public.box_sessions
ADD CONSTRAINT box_sessions_status_check
  CHECK (status IN ('in_progress', 'completed', 'received', 'sent'));
