-- Migration 055: Add status column to storage_assignments
-- Distinguishes boxes that are assigned to a slot but not yet physically placed
-- (pending) from boxes that have been confirmed as stored (confirmed).

ALTER TABLE public.storage_assignments
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed'
CHECK (status IN ('pending', 'confirmed'));

-- Backfill existing assignments so they remain confirmed.
UPDATE public.storage_assignments
SET status = 'confirmed'
WHERE status IS NULL OR status = '';

-- New assignments should start as pending until physically confirmed.
ALTER TABLE public.storage_assignments
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.storage_assignments
ALTER COLUMN status SET DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_storage_assignments_status ON public.storage_assignments(status);
