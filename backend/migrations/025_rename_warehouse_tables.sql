-- Migration 025: Rename warehouse tables to generalized book scan tables
-- This renames warehouse_sessions -> box_sessions and warehouse_book_scans -> book_scans

-- 1. Rename tables
ALTER TABLE IF EXISTS public.warehouse_sessions RENAME TO box_sessions;
ALTER TABLE IF EXISTS public.warehouse_book_scans RENAME TO book_scans;

-- 2. Rename indexes for box_sessions
ALTER INDEX IF EXISTS idx_warehouse_sessions_box_id RENAME TO idx_box_sessions_box_id;
ALTER INDEX IF EXISTS idx_warehouse_sessions_status RENAME TO idx_box_sessions_status;
ALTER INDEX IF EXISTS idx_warehouse_sessions_received_by RENAME TO idx_box_sessions_received_by;
ALTER INDEX IF EXISTS idx_warehouse_sessions_started_at RENAME TO idx_box_sessions_started_at;
ALTER INDEX IF EXISTS idx_warehouse_sessions_lot_id RENAME TO idx_box_sessions_lot_id;

-- 3. Rename indexes for book_scans
ALTER INDEX IF EXISTS idx_warehouse_book_scans_session_id RENAME TO idx_book_scans_session_id;
ALTER INDEX IF EXISTS idx_warehouse_book_scans_book_id RENAME TO idx_book_scans_book_id;
ALTER INDEX IF EXISTS idx_warehouse_book_scans_scan_status RENAME TO idx_book_scans_scan_status;
ALTER INDEX IF EXISTS idx_warehouse_book_scans_scanned_at RENAME TO idx_book_scans_scanned_at;

-- 4. Rename trigger functions (if needed to keep it clean)
ALTER FUNCTION update_warehouse_session_counts RENAME TO update_box_session_counts;

-- 5. Drop old triggers
DROP TRIGGER IF EXISTS trg_warehouse_sessions_updated_at ON public.box_sessions;
DROP TRIGGER IF EXISTS trg_update_session_counts ON public.book_scans;

-- 6. Recreate triggers on new table names
CREATE TRIGGER trg_box_sessions_updated_at
  BEFORE UPDATE ON public.box_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_update_box_session_counts
  AFTER INSERT ON public.book_scans
  FOR EACH ROW EXECUTE FUNCTION update_box_session_counts();

-- 7. Update the trigger function internals to use the new table name
CREATE OR REPLACE FUNCTION update_box_session_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.box_sessions
  SET 
    total_scanned_books = total_scanned_books + 1,
    total_accepted_books = CASE WHEN NEW.scan_status = 'processable' THEN total_accepted_books + 1 ELSE total_accepted_books END,
    total_nonprocessable_books = CASE WHEN NEW.scan_status = 'non_processable' THEN total_nonprocessable_books + 1 ELSE total_nonprocessable_books END
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Rename RLS policies (optional but good for consistency)
ALTER POLICY "warehouse_sessions_select_all" ON public.box_sessions RENAME TO "box_sessions_select_all";
ALTER POLICY "warehouse_sessions_insert_staff" ON public.box_sessions RENAME TO "box_sessions_insert_staff";
ALTER POLICY "warehouse_sessions_update_staff" ON public.box_sessions RENAME TO "box_sessions_update_staff";

ALTER POLICY "warehouse_book_scans_select_all" ON public.book_scans RENAME TO "book_scans_select_all";
ALTER POLICY "warehouse_book_scans_insert_staff" ON public.book_scans RENAME TO "book_scans_insert_staff";
