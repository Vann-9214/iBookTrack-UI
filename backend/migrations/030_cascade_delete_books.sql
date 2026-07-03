-- Migration 030: Cascade delete books on box delete

ALTER TABLE public.books DROP CONSTRAINT IF EXISTS books_box_id_fkey;
ALTER TABLE public.books ADD CONSTRAINT books_box_id_fkey FOREIGN KEY (box_id) REFERENCES public.boxes(id) ON DELETE CASCADE;

-- Also cascade delete book_scans if a book is deleted
ALTER TABLE public.book_scans DROP CONSTRAINT IF EXISTS warehouse_book_scans_book_id_fkey;
ALTER TABLE public.book_scans DROP CONSTRAINT IF EXISTS book_scans_book_id_fkey;
ALTER TABLE public.book_scans ADD CONSTRAINT book_scans_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;
