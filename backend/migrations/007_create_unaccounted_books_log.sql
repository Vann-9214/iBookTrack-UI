-- ============================================================
-- Migration 007: Unaccounted Books Log
-- Tracks books that are missing or unaccounted for
-- Detected at various stages of the pipeline
-- ============================================================

CREATE TABLE IF NOT EXISTS public.unaccounted_books (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id         UUID        REFERENCES public.books(id) ON DELETE CASCADE,
  isbn            TEXT        NOT NULL,
  lot_number      TEXT        NOT NULL,
  stage_detected  TEXT        NOT NULL, -- Which pipeline stage detected the issue
  reported_by     UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  reported_by_name TEXT       NOT NULL, -- Denormalized for quick display
  notes           TEXT,
  resolved        BOOLEAN     NOT NULL DEFAULT FALSE,
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_unaccounted_books_book_id ON public.unaccounted_books(book_id);
CREATE INDEX idx_unaccounted_books_isbn ON public.unaccounted_books(isbn);
CREATE INDEX idx_unaccounted_books_resolved ON public.unaccounted_books(resolved);
CREATE INDEX idx_unaccounted_books_created_at ON public.unaccounted_books(created_at DESC);
