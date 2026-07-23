-- ============================================================
-- Migration 012: Add Inventory Role
-- Allows 'inventory' role in addition to 'supervisor' and 'warehouse'
-- ============================================================

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_strict_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('supervisor', 'warehouse', 'inventory'));
