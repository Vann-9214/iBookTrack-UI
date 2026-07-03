-- Migration 035: Move transmission_status to book_activity
-- 1. Drops transmission_status from the books table (which was just renamed in 034)
-- 2. Adds transmission_status to the book_activity table

-- Drop the column and its indexes from books
ALTER TABLE public.books DROP COLUMN IF EXISTS transmission_status;
DROP INDEX IF EXISTS public.idx_books_transmission_status;
DROP INDEX IF EXISTS public.idx_books_box_transmission_status;

-- Add it to book_activity
ALTER TABLE public.book_activity ADD COLUMN transmission_status TEXT NOT NULL DEFAULT 'pending' 
  CHECK (transmission_status IN ('pending', 'scanned', 'validated', 'transmitted', 'stored'));

-- Create an index for querying
CREATE INDEX IF NOT EXISTS idx_book_activity_transmission_status ON public.book_activity(transmission_status);
