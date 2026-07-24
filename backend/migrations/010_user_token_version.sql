-- ============================================================
-- Migration 010: Users token_version
-- Adds a per-user token version used to invalidate previously issued
-- JWTs (e.g. on password change or forced "log out everywhere").
-- Every issued token carries the user's token_version; requireAuth
-- rejects tokens whose version no longer matches the database.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;
