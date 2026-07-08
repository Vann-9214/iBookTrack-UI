-- ============================================================
-- Migration 047: Add Constraint for is_missing and is_extra
-- Ensures a book cannot be marked as both missing and extra simultaneously
-- ============================================================

ALTER TABLE public.books 
ADD CONSTRAINT chk_not_both_missing_and_extra 
CHECK (NOT (is_missing = true AND is_extra = true));
