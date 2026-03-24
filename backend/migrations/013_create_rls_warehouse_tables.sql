-- ============================================================
-- Migration 013: RLS Policies for Warehouse Tables
-- ============================================================

-- Enable RLS
ALTER TABLE public.warehouse_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_book_scans ENABLE ROW LEVEL SECURITY;

-- Warehouse Sessions: All authenticated users can read, warehouse staff can modify
DROP POLICY IF EXISTS "warehouse_sessions_select_all" ON public.warehouse_sessions;
CREATE POLICY "warehouse_sessions_select_all" ON public.warehouse_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "warehouse_sessions_insert_staff" ON public.warehouse_sessions;
CREATE POLICY "warehouse_sessions_insert_staff" ON public.warehouse_sessions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

DROP POLICY IF EXISTS "warehouse_sessions_update_staff" ON public.warehouse_sessions;
CREATE POLICY "warehouse_sessions_update_staff" ON public.warehouse_sessions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Warehouse Book Scans: All authenticated users can read, warehouse staff can insert
DROP POLICY IF EXISTS "warehouse_book_scans_select_all" ON public.warehouse_book_scans;
CREATE POLICY "warehouse_book_scans_select_all" ON public.warehouse_book_scans
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "warehouse_book_scans_insert_staff" ON public.warehouse_book_scans;
CREATE POLICY "warehouse_book_scans_insert_staff" ON public.warehouse_book_scans
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );
