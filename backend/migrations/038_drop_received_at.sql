-- Migration 038: Drop received_at from boxes
-- Removes the unused received_at tracking column

ALTER TABLE public.boxes DROP COLUMN IF EXISTS received_at;
