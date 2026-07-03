-- Migration 034: Rename book_scans and transmission_status
-- 1. Renames book_scans to book_activity
-- 2. Renames books.scan_status to books.transmission_status

-- 1. Rename book_scans to book_activity
ALTER TABLE IF EXISTS public.book_scans RENAME TO book_activity;

-- Rename indexes for book_activity
ALTER INDEX IF EXISTS idx_book_scans_session_id RENAME TO idx_book_activity_session_id;
ALTER INDEX IF EXISTS idx_book_scans_book_id RENAME TO idx_book_activity_book_id;
ALTER INDEX IF EXISTS idx_book_scans_scan_status RENAME TO idx_book_activity_scan_status;
ALTER INDEX IF EXISTS idx_book_scans_scanned_at RENAME TO idx_book_activity_scanned_at;

-- Recreate trigger on book_activity (it was previously on book_scans)
DROP TRIGGER IF EXISTS trg_update_box_session_counts ON public.book_activity;
CREATE TRIGGER trg_update_box_session_counts
  AFTER INSERT ON public.book_activity
  FOR EACH ROW EXECUTE FUNCTION update_box_session_counts();

-- Update foreign keys (if explicitly named)
ALTER TABLE public.book_activity DROP CONSTRAINT IF EXISTS book_scans_session_id_fkey;
ALTER TABLE public.book_activity DROP CONSTRAINT IF EXISTS book_activity_session_id_fkey;
ALTER TABLE public.book_activity ADD CONSTRAINT book_activity_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.box_sessions(id) ON DELETE CASCADE;

ALTER TABLE public.book_activity DROP CONSTRAINT IF EXISTS book_scans_book_id_fkey;
ALTER TABLE public.book_activity DROP CONSTRAINT IF EXISTS book_activity_book_id_fkey;
ALTER TABLE public.book_activity ADD CONSTRAINT book_activity_book_id_fkey FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE CASCADE;

-- Drop any old policies and recreate them securely
DROP POLICY IF EXISTS "warehouse_book_scans_select_all" ON public.book_activity;
DROP POLICY IF EXISTS "warehouse_book_scans_insert_staff" ON public.book_activity;
DROP POLICY IF EXISTS "book_scans_select_all" ON public.book_activity;
DROP POLICY IF EXISTS "book_scans_insert_staff" ON public.book_activity;
DROP POLICY IF EXISTS "book_activity_select_all" ON public.book_activity;
DROP POLICY IF EXISTS "book_activity_insert_staff" ON public.book_activity;

CREATE POLICY "book_activity_select_all" ON public.book_activity
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "book_activity_insert_staff" ON public.book_activity
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );


-- 2. Rename books.scan_status to books.transmission_status
-- Note: It was renamed from 'status' to 'scan_status' in migration 032
ALTER TABLE public.books RENAME COLUMN scan_status TO transmission_status;

-- Rename index
ALTER INDEX IF EXISTS public.idx_books_scan_status RENAME TO idx_books_transmission_status;
ALTER INDEX IF EXISTS public.idx_books_box_scan_status RENAME TO idx_books_box_transmission_status;
