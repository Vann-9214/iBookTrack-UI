-- ============================================================
-- Migration 013: Add transmission_updated_at to book_activity
-- ============================================================
-- Stores the timestamp returned by Scan Manager (Simplex) when a
-- book's pipeline status was last checked. Lets the Transmission
-- Monitor show the actual transmission date without calling the
-- external API on every page load.

ALTER TABLE public.book_activity
ADD COLUMN IF NOT EXISTS transmission_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_book_activity_transmission_updated_at
ON public.book_activity (transmission_updated_at);
