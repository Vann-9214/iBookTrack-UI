-- ============================================================
-- Migration 052: Remove unused columns from books table
-- ============================================================

ALTER TABLE public.books
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS project_name,
DROP COLUMN IF EXISTS barcode,
DROP COLUMN IF EXISTS publisher,
DROP COLUMN IF EXISTS language,
DROP COLUMN IF EXISTS page_count,
DROP COLUMN IF EXISTS condition,
DROP COLUMN IF EXISTS date_purchased,
DROP COLUMN IF EXISTS date_catalogued,
DROP COLUMN IF EXISTS date_scanned;
