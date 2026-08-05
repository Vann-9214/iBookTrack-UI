-- ============================================================
-- Migration 016: Fix transmitted-books trigger matching
-- ============================================================
--
-- The trigger added in migration 006 recomputed boxes.total_transmitted_books
-- using a strict, case-sensitive equality check against the literal string
-- 'Transmission_Archive COMPLETED'. Scan Manager (Simflex) statuses are not
-- guaranteed to come back in that exact casing/format, so books that the
-- rest of the app already treats as fully transmitted (see
-- backend/utils/transmissionStatus.js -> isTransmissionArchiveCompleted,
-- which matches case-insensitively on "TRANSMISSION" + "COMPLETED") were
-- being undercounted here, causing the box list's "Transmitted" column to
-- drift out of sync with the actual per-book statuses.
--
-- This migration makes the trigger use the same lenient matching rule, then
-- backfills existing boxes so already-stored counts are corrected.

CREATE OR REPLACE FUNCTION update_box_transmitted_books()
RETURNS TRIGGER AS $$
DECLARE
  v_box_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN SELECT box_id INTO v_box_id FROM public.books WHERE id = OLD.book_id; ELSE SELECT box_id INTO v_box_id FROM public.books WHERE id = NEW.book_id; END IF;
  IF v_box_id IS NOT NULL THEN
    UPDATE public.boxes
    SET total_transmitted_books = (
      SELECT COUNT(*)
      FROM public.book_activity ba
      JOIN public.books b ON b.id = ba.book_id
      WHERE b.box_id = v_box_id
        AND ba.transmission_status ILIKE '%TRANSMISSION%'
        AND ba.transmission_status ILIKE '%COMPLETED%'
    )
    WHERE id = v_box_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Backfill: recompute total_transmitted_books for every box using the new
-- lenient rule so existing data (e.g. box 106) is corrected immediately.
UPDATE public.boxes b
SET total_transmitted_books = (
  SELECT COUNT(*)
  FROM public.book_activity ba
  JOIN public.books bk ON bk.id = ba.book_id
  WHERE bk.box_id = b.id
    AND ba.transmission_status ILIKE '%TRANSMISSION%'
    AND ba.transmission_status ILIKE '%COMPLETED%'
);

-- Keep lots' aggregate totals (maintained by a separate trigger in
-- 003_boxes.sql) consistent with the corrected box totals.
UPDATE public.lots l
SET total_transmitted_books = (
  SELECT COALESCE(SUM(total_transmitted_books), 0) FROM public.boxes WHERE lot_id = l.id
);
