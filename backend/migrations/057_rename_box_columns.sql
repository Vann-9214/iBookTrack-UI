-- Migration 057: Rename boxes columns to match total_xxx_books convention

ALTER TABLE public.boxes RENAME COLUMN total_books_expected TO total_expected_books;
ALTER TABLE public.boxes RENAME COLUMN books_transmitted TO total_transmitted_books;
