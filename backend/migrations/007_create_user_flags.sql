-- ============================================================
-- Migration 007: User Flags Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_activity_id UUID REFERENCES public.book_activity(id) ON DELETE CASCADE,
  rejection_reason TEXT NOT NULL,
  notes TEXT,
  warehouse_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  inventory_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  endorsement_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scan_flag_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  warehouse_flag_at TIMESTAMPTZ DEFAULT now(),
  inventory_flag_at TIMESTAMPTZ,
  endorsement_flag_at TIMESTAMPTZ,
  scan_flag_at TIMESTAMPTZ DEFAULT now()
);
