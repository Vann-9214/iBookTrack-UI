-- ============================================================
-- Migration 009: Storage Assignments Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.storage_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_location_id UUID NOT NULL REFERENCES public.storage_locations(id) ON DELETE CASCADE,
  box_id UUID NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES public.users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  UNIQUE(box_id)
);

CREATE INDEX IF NOT EXISTS idx_storage_assignments_box_id ON public.storage_assignments (box_id);
CREATE INDEX IF NOT EXISTS idx_storage_assignments_location ON public.storage_assignments (storage_location_id);
CREATE INDEX IF NOT EXISTS idx_storage_assignments_status ON public.storage_assignments (status);
