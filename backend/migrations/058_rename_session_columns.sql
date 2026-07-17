-- Migration 058: Rename box_sessions columns to match total_xxx_books convention

ALTER TABLE public.box_sessions RENAME COLUMN total_scanned TO total_scanned_books;
ALTER TABLE public.box_sessions RENAME COLUMN total_accepted TO total_accepted_books;
ALTER TABLE public.box_sessions RENAME COLUMN total_rejected TO total_rejected_books;
