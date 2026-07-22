-- ============================================================
-- Migration 006: Book Activity Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.book_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.box_sessions(id) ON DELETE CASCADE,
  book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
  scan_status TEXT NOT NULL,
  transmission_status TEXT NOT NULL DEFAULT 'pending',
  warehouse_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_scan_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_scan_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  inventory_scan_at TIMESTAMPTZ,
  endorsement_scan_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_book_activity_book_id ON public.book_activity (book_id);
CREATE INDEX IF NOT EXISTS idx_book_activity_session_id ON public.book_activity (session_id);
CREATE INDEX IF NOT EXISTS idx_book_activity_transmission_status ON public.book_activity (transmission_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scan_status ON public.book_activity (scan_status);
CREATE INDEX IF NOT EXISTS idx_warehouse_book_scans_scanned_at ON public.book_activity (warehouse_scan_at DESC);
