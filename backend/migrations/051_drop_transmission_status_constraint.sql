-- Migration 051: Drop transmission_status check constraint
-- The business logic now requires storing exact, varied Simflex status strings 
-- (e.g. "Transmission_Archive COMPLETED", "Scanning ONGOING") 
-- instead of the previously mapped enums.

ALTER TABLE public.book_activity DROP CONSTRAINT IF EXISTS book_activity_transmission_status_check;
