-- ============================================================
-- Migration 003: Update Users Role Constraint for Warehouse
-- Allows 'warehouse' role in addition to 'supervisor'
-- ============================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_strict_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('supervisor', 'warehouse'));
