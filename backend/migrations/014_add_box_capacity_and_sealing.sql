-- ============================================================
-- Migration 014: Add Box Sealing Features
-- Adds dynamic box management with manual sealing
-- Boxes are marked as full manually when physically full
-- ============================================================

-- Add new columns to boxes table
ALTER TABLE public.boxes 
  ADD COLUMN IF NOT EXISTS is_sealed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sealed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS box_type TEXT DEFAULT 'mixed' 
    CHECK (box_type IN ('receiving', 'accepted', 'rejected', 'mixed'));

-- Add index for sealed boxes
CREATE INDEX IF NOT EXISTS idx_boxes_is_sealed ON public.boxes(is_sealed);
CREATE INDEX IF NOT EXISTS idx_boxes_box_type ON public.boxes(box_type);

-- Add comment
COMMENT ON COLUMN public.boxes.is_sealed IS 'Whether this box is manually marked as full and sealed';
COMMENT ON COLUMN public.boxes.sealed_at IS 'Timestamp when the box was sealed';
COMMENT ON COLUMN public.boxes.sealed_by IS 'User who sealed the box';
COMMENT ON COLUMN public.boxes.box_type IS 'Type of box: receiving (incoming), accepted (good books), rejected (bad books), mixed (both)';
