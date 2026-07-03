-- Migration 036: Rename unaccounted flags
-- Simplifies the names of the missing and extra book flags

ALTER TABLE public.books RENAME COLUMN is_unaccounted_missing TO is_missing;
ALTER TABLE public.books RENAME COLUMN is_unaccounted_extra TO is_extra;

-- Rename the corresponding indexes
ALTER INDEX IF EXISTS public.idx_books_is_unaccounted_missing RENAME TO idx_books_is_missing;
ALTER INDEX IF EXISTS public.idx_books_is_unaccounted_extra RENAME TO idx_books_is_extra;
