ALTER TABLE public.box_sessions
  ADD COLUMN IF NOT EXISTS inventory_printed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS inventory_printed_at TIMESTAMPTZ;
