-- ============================================================
-- Migration 016: Add lot_id to warehouse_sessions
-- Track which lot the session belongs to for on-demand box creation
-- ============================================================

-- Add lot_id column to warehouse_sessions
ALTER TABLE public.warehouse_sessions 
  ADD COLUMN IF NOT EXISTS lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE;

-- Add index for lot_id
CREATE INDEX IF NOT EXISTS idx_warehouse_sessions_lot_id ON public.warehouse_sessions(lot_id);

-- Add comment
COMMENT ON COLUMN public.warehouse_sessions.lot_id IS 'Lot this session belongs to - used for creating boxes on-demand';
