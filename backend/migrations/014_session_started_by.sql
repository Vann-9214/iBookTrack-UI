-- ============================================================
-- Migration 014: Session Started By Columns
-- ============================================================

ALTER TABLE public.box_sessions
  ADD COLUMN IF NOT EXISTS inventory_session_started_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_session_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS endorsement_session_started_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS endorsement_session_started_at TIMESTAMPTZ;
