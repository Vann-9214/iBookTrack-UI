-- ============================================================
-- Migration 011: Row Level Security (RLS) Policies
-- Enable RLS on all new tables and set appropriate policies
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unaccounted_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transmission_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;

-- Shipments: All authenticated users can read, only admins can modify
CREATE POLICY "shipments_select_all" ON public.shipments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "shipments_insert_admin" ON public.shipments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "shipments_update_admin" ON public.shipments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lots: All authenticated users can read, warehouse staff and admins can modify
CREATE POLICY "lots_select_all" ON public.lots
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "lots_insert_staff" ON public.lots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

CREATE POLICY "lots_update_staff" ON public.lots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Boxes: All authenticated users can read, warehouse staff and admins can modify
CREATE POLICY "boxes_select_all" ON public.boxes
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "boxes_insert_staff" ON public.boxes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

CREATE POLICY "boxes_update_staff" ON public.boxes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Books: All authenticated users can read, warehouse staff and admins can modify
CREATE POLICY "books_select_all" ON public.books
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "books_insert_staff" ON public.books
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

CREATE POLICY "books_update_staff" ON public.books
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Unaccounted Books: All authenticated users can read and insert
CREATE POLICY "unaccounted_books_select_all" ON public.unaccounted_books
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "unaccounted_books_insert_all" ON public.unaccounted_books
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "unaccounted_books_update_staff" ON public.unaccounted_books
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Transmission Queue: All authenticated users can read, warehouse staff and admins can modify
CREATE POLICY "transmission_queue_select_all" ON public.transmission_queue
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "transmission_queue_insert_staff" ON public.transmission_queue
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

CREATE POLICY "transmission_queue_update_staff" ON public.transmission_queue
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'warehouse_staff'))
  );

-- Pipeline Events: All authenticated users can read and insert (for tracking)
CREATE POLICY "pipeline_events_select_all" ON public.pipeline_events
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "pipeline_events_insert_all" ON public.pipeline_events
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Scan History: All authenticated users can read and insert
CREATE POLICY "scan_history_select_all" ON public.scan_history
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "scan_history_insert_all" ON public.scan_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
