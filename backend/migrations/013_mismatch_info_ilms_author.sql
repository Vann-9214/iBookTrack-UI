-- ============================================================
-- Migration 013: Add ilms_author to mismatch_info
-- ============================================================

ALTER TABLE public.mismatch_info
ADD COLUMN IF NOT EXISTS ilms_author TEXT;
