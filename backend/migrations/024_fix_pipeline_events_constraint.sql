-- ============================================================
-- Migration 024: Fix pipeline_events to_stage CHECK constraint
-- The original constraint used old stage names (intake, inspection, validation, qa)
-- The actual pipeline uses: warehouse, inventory, cut, endorsement, scan, transmit, storage
-- ============================================================

ALTER TABLE public.pipeline_events
  DROP CONSTRAINT IF EXISTS pipeline_events_to_stage_check;

ALTER TABLE public.pipeline_events
  ADD CONSTRAINT pipeline_events_to_stage_check
  CHECK (to_stage IN ('warehouse', 'inventory', 'cut', 'endorsement', 'scan', 'transmit', 'storage'));
