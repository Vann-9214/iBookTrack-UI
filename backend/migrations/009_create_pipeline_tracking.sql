-- ============================================================
-- Migration 009: Pipeline Stage Tracking
-- Tracks movement of boxes through the 8-step pipeline
-- Provides audit trail and real-time status
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pipeline_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id          UUID        NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  lot_id          UUID        NOT NULL REFERENCES public.lots(id) ON DELETE CASCADE,
  
  -- Stage information
  from_stage      TEXT,       -- Previous stage (NULL if first stage)
  to_stage        TEXT        NOT NULL
                              CHECK (to_stage IN ('intake', 'cut', 'inspection', 'scan', 'validation', 'qa', 'transmit', 'storage')),
  
  -- Who moved it
  moved_by        UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  moved_by_name   TEXT,       -- Denormalized for quick display
  
  -- Additional context
  notes           TEXT,
  duration_minutes INTEGER,   -- Time spent in previous stage
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pipeline_events_box_id ON public.pipeline_events(box_id);
CREATE INDEX idx_pipeline_events_lot_id ON public.pipeline_events(lot_id);
CREATE INDEX idx_pipeline_events_to_stage ON public.pipeline_events(to_stage);
CREATE INDEX idx_pipeline_events_created_at ON public.pipeline_events(created_at DESC);

-- Composite index for tracking box journey
CREATE INDEX idx_pipeline_events_box_created ON public.pipeline_events(box_id, created_at DESC);
