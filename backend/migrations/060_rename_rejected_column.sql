-- Migration 060: Rename total_rejected_books to total_nonprocessable_books

ALTER TABLE public.box_sessions RENAME COLUMN total_rejected_books TO total_nonprocessable_books;
