-- Migration 048: Add mismatch columns to books and boxes

ALTER TABLE public.books ADD COLUMN is_mismatch BOOLEAN DEFAULT FALSE;
ALTER TABLE public.books ADD COLUMN resolved_mismatch BOOLEAN DEFAULT FALSE;

ALTER TABLE public.boxes ADD COLUMN total_mismatch_books INTEGER DEFAULT 0;
ALTER TABLE public.boxes ADD COLUMN total_missing_books INTEGER DEFAULT 0;
ALTER TABLE public.boxes ADD COLUMN total_extra_books INTEGER DEFAULT 0;

ALTER TABLE public.lots ADD COLUMN total_expected_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_scanned_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_transmitted_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_missing_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_extra_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_nonprocessable_books INTEGER DEFAULT 0;
ALTER TABLE public.lots ADD COLUMN IF NOT EXISTS total_accepted_books INTEGER DEFAULT 0;
