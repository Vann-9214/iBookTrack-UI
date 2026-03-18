-- ============================================================
-- Migration 004: Lots and Shipments Tables
-- Lots represent entire containers (1-2 containers per lot)
-- Shipments track the overall shipping batches
-- ============================================================

-- Shipments table
CREATE TABLE IF NOT EXISTS public.shipments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_code   TEXT        NOT NULL UNIQUE, -- e.g., 'SHIP-2025-001'
  description     TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'in_transit', 'received', 'completed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lots table (1 lot = 1-2 containers with hundreds of boxes)
CREATE TABLE IF NOT EXISTS public.lots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number      TEXT        NOT NULL UNIQUE, -- e.g., 'LOT-2024-0891'
  shipment_id     UUID        REFERENCES public.shipments(id) ON DELETE SET NULL,
  total_boxes     INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'intake'
                              CHECK (status IN ('intake', 'cut', 'inspection', 'scan', 'validation', 'qa', 'transmit', 'storage')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at triggers
CREATE TRIGGER trg_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_lots_updated_at
  BEFORE UPDATE ON public.lots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes for performance
CREATE INDEX idx_lots_shipment_id ON public.lots(shipment_id);
CREATE INDEX idx_lots_status ON public.lots(status);
CREATE INDEX idx_shipments_status ON public.shipments(status);
