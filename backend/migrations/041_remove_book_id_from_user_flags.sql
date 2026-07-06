-- Migration 041: Remove book_id from user_flags
-- The link is exclusively handled by book_activity.user_flag_id pointing to user_flags.id

ALTER TABLE public.user_flags DROP COLUMN IF EXISTS book_id;
