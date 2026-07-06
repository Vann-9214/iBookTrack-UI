-- Drop unused columns from book_activity table
ALTER TABLE public.book_activity
DROP COLUMN IF EXISTS book_type,
DROP COLUMN IF EXISTS condition;

-- Drop is_transmitted from books as requested
ALTER TABLE public.books
DROP COLUMN IF EXISTS is_transmitted;
