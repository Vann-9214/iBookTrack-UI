-- Rename column in box_sessions
ALTER TABLE public.box_sessions
RENAME COLUMN inventory_user_scan TO inventory_user_send;

-- Update book_activity
ALTER TABLE public.book_activity
RENAME COLUMN scanned_by TO warehouse_scan_by;

ALTER TABLE public.book_activity
DROP COLUMN IF EXISTS scanned_by_name;

ALTER TABLE public.book_activity
RENAME COLUMN scanned_at TO warehouse_scan_at;

ALTER TABLE public.book_activity
ADD COLUMN IF NOT EXISTS inventory_scan_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS endorsement_scan_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS inventory_scan_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS endorsement_scan_at TIMESTAMPTZ;

-- Update indexes
ALTER INDEX IF EXISTS idx_book_activity_scanned_at RENAME TO idx_book_activity_warehouse_scan_at;
