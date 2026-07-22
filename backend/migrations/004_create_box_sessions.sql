-- ============================================================
-- Migration 004: Box Sessions Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.box_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  warehouse_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cut_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scan_user_received UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  cut_user_send UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_time_received TIMESTAMPTZ,
  inventory_time_received TIMESTAMPTZ,
  endorsement_time_received TIMESTAMPTZ,
  cut_time_received TIMESTAMPTZ,
  scan_time_received TIMESTAMPTZ,
  inventory_time_send TIMESTAMPTZ,
  endorsement_time_send TIMESTAMPTZ,
  cut_time_send TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_scanned_books INTEGER NOT NULL DEFAULT 0,
  total_processable_books INTEGER NOT NULL DEFAULT 0,
  total_nonprocessable_books INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_box_sessions_box_id ON public.box_sessions (box_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_received_by ON public.box_sessions (warehouse_user_received);
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_status ON public.box_sessions (status);
