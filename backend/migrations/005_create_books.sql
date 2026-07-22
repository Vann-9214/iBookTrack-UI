-- ============================================================
-- Migration 005: Books Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT NOT NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  title TEXT,
  book_type TEXT,
  is_extra BOOLEAN NOT NULL DEFAULT false,
  is_missing BOOLEAN NOT NULL DEFAULT false,
  is_mismatch BOOLEAN DEFAULT false,
  resolved_mismatch BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_box_id ON public.books (box_id);
CREATE INDEX IF NOT EXISTS idx_books_is_extra ON public.books (is_extra);
CREATE INDEX IF NOT EXISTS idx_books_is_missing ON public.books (is_missing);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books (isbn);
