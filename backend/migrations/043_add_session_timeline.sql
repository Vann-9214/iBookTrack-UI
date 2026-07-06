-- Migration 043: Add timeline and missing user tracking columns to box_sessions

-- Add timeline columns for received events
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS warehouse_time_received TIMESTAMPTZ;
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS inventory_time_received TIMESTAMPTZ;
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS endorsement_time_received TIMESTAMPTZ;

-- Add timeline columns for send events
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS inventory_time_send TIMESTAMPTZ;
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS endorsement_time_send TIMESTAMPTZ;

-- Add the missing user column for endorsement send
ALTER TABLE public.box_sessions ADD COLUMN IF NOT EXISTS endorsement_user_send UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
