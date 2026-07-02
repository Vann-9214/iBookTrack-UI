-- Migration 028: Alter lot_number to INTEGER
-- We use regexp_replace to strip out any alphabetic characters (like "Lot ") 
-- that might have been saved in the past before casting it to an integer.

ALTER TABLE public.lots 
  ALTER COLUMN lot_number TYPE INTEGER 
  USING (NULLIF(regexp_replace(lot_number, '\D', '', 'g'), ''))::INTEGER;
