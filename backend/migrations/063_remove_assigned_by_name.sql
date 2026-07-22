-- ============================================================
-- Migration 063: Remove assigned_by_name from storage_assignments
-- ============================================================

ALTER TABLE public.storage_assignments DROP COLUMN IF EXISTS assigned_by_name;
