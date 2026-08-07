-- ============================================================
-- Migration 005: Books Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn TEXT NOT NULL,
  box_id UUID REFERENCES public.boxes(id) ON DELETE CASCADE,
  title TEXT,
  author TEXT,
  book_type TEXT,
  is_nonprocessable BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_box_id ON public.books (box_id);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books (isbn);



CREATE OR REPLACE FUNCTION refresh_box_flag_counts(v_box_id UUID) RETURNS VOID AS $$
BEGIN
  IF v_box_id IS NOT NULL THEN
    UPDATE public.boxes SET 
      total_missing_books = (
        SELECT COUNT(DISTINCT b.id) FROM public.books b 
        JOIN public.book_activity ba ON b.id = ba.book_id 
        JOIN public.user_flags uf ON ba.id = uf.book_activity_id 
        WHERE b.box_id = v_box_id AND uf.is_resolved = false AND uf.rejection_reason IN ('missing', 'missing-book')
      ),
      total_extra_books = (
        SELECT COUNT(DISTINCT b.id) FROM public.books b 
        JOIN public.book_activity ba ON b.id = ba.book_id 
        JOIN public.user_flags uf ON ba.id = uf.book_activity_id 
        WHERE b.box_id = v_box_id AND uf.is_resolved = false AND uf.rejection_reason IN ('extra', 'extra-book')
      ),
      total_mismatch_books = (
        SELECT COUNT(DISTINCT b.id) FROM public.books b 
        JOIN public.book_activity ba ON b.id = ba.book_id 
        JOIN public.user_flags uf ON ba.id = uf.book_activity_id 
        WHERE b.box_id = v_box_id AND uf.is_resolved = false AND uf.rejection_reason IN ('mismatch', 'mismatched-book')
      )
    WHERE id = v_box_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_box_book_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM refresh_box_flag_counts(NEW.box_id);
  END IF;
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD.box_id != NEW.box_id) THEN
    PERFORM refresh_box_flag_counts(OLD.box_id);
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

