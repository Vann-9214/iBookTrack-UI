-- Migration 033: Separate unaccounted flags
-- Separates the single is_unaccounted flag into missing and extra flags

ALTER TABLE public.books RENAME COLUMN is_unaccounted TO is_unaccounted_extra;
ALTER TABLE public.books ADD COLUMN is_unaccounted_missing BOOLEAN NOT NULL DEFAULT FALSE;

-- Rename the old index and create a new one
ALTER INDEX IF EXISTS public.idx_books_is_unaccounted RENAME TO idx_books_is_unaccounted_extra;
CREATE INDEX IF NOT EXISTS idx_books_is_unaccounted_missing ON public.books(is_unaccounted_missing);
