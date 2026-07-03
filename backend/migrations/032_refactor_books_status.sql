-- Migration 032: Refactor books table status and stage
-- Renames 'status' to 'scan_status' to match what it really represents
-- Drops 'current_stage' since the box's current_stage is used instead

ALTER TABLE public.books RENAME COLUMN status TO scan_status;
ALTER TABLE public.books DROP COLUMN IF EXISTS current_stage;

-- Drop the index for the deleted column
DROP INDEX IF EXISTS public.idx_books_current_stage;

-- Rename indexes to match the new column name
ALTER INDEX IF EXISTS public.idx_books_status RENAME TO idx_books_scan_status;
ALTER INDEX IF EXISTS public.idx_books_box_status RENAME TO idx_books_box_scan_status;
