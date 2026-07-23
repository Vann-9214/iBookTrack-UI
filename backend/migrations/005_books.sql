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



CREATE OR REPLACE FUNCTION update_box_book_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.box_id IS NOT NULL THEN
    UPDATE public.boxes SET total_missing_books = total_missing_books + (CASE WHEN NEW.is_missing THEN 1 ELSE 0 END), total_extra_books = total_extra_books + (CASE WHEN NEW.is_extra THEN 1 ELSE 0 END), total_mismatch_books = total_mismatch_books + (CASE WHEN NEW.is_mismatch THEN 1 ELSE 0 END) WHERE id = NEW.box_id;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.box_id IS NOT NULL AND (OLD.box_id != COALESCE(NEW.box_id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
      UPDATE public.boxes SET total_missing_books = total_missing_books - (CASE WHEN OLD.is_missing THEN 1 ELSE 0 END), total_extra_books = total_extra_books - (CASE WHEN OLD.is_extra THEN 1 ELSE 0 END), total_mismatch_books = total_mismatch_books - (CASE WHEN OLD.is_mismatch THEN 1 ELSE 0 END) WHERE id = OLD.box_id;
    END IF;
    IF NEW.box_id IS NOT NULL AND (OLD.box_id IS NULL OR OLD.box_id != NEW.box_id) THEN
      UPDATE public.boxes SET total_missing_books = total_missing_books + (CASE WHEN NEW.is_missing THEN 1 ELSE 0 END), total_extra_books = total_extra_books + (CASE WHEN NEW.is_extra THEN 1 ELSE 0 END), total_mismatch_books = total_mismatch_books + (CASE WHEN NEW.is_mismatch THEN 1 ELSE 0 END) WHERE id = NEW.box_id;
    END IF;
    IF NEW.box_id IS NOT NULL AND OLD.box_id = NEW.box_id THEN
      UPDATE public.boxes SET total_missing_books = total_missing_books + (CASE WHEN NEW.is_missing THEN 1 ELSE 0 END) - (CASE WHEN OLD.is_missing THEN 1 ELSE 0 END), total_extra_books = total_extra_books + (CASE WHEN NEW.is_extra THEN 1 ELSE 0 END) - (CASE WHEN OLD.is_extra THEN 1 ELSE 0 END), total_mismatch_books = total_mismatch_books + (CASE WHEN NEW.is_mismatch THEN 1 ELSE 0 END) - (CASE WHEN OLD.is_mismatch THEN 1 ELSE 0 END) WHERE id = NEW.box_id;
    END IF;
  END IF;
  IF TG_OP = 'DELETE' AND OLD.box_id IS NOT NULL THEN
    UPDATE public.boxes SET total_missing_books = total_missing_books - (CASE WHEN OLD.is_missing THEN 1 ELSE 0 END), total_extra_books = total_extra_books - (CASE WHEN OLD.is_extra THEN 1 ELSE 0 END), total_mismatch_books = total_mismatch_books - (CASE WHEN OLD.is_mismatch THEN 1 ELSE 0 END) WHERE id = OLD.box_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_box_book_counts ON public.books;
CREATE TRIGGER trg_update_box_book_counts
AFTER INSERT OR UPDATE OR DELETE ON public.books
FOR EACH ROW EXECUTE FUNCTION update_box_book_counts();


DROP TRIGGER IF EXISTS trg_books_updated_at ON public.books;
CREATE TRIGGER trg_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
