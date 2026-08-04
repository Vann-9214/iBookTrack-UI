-- ============================================================
-- Migration 014: Add author column to books
-- ============================================================
-- iLMS returns an "Author" field alongside "Title" when looking up a book
-- by ISBN. This column stores that value so it can be displayed alongside
-- the book title throughout the app.

ALTER TABLE public.books ADD COLUMN IF NOT EXISTS author TEXT;
