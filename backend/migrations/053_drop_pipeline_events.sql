-- Migration 053: Drop pipeline_events table
-- We have moved to a single wide-row architecture via box_sessions
-- to prevent data flooding and unnecessary rows.

DROP TABLE IF EXISTS public.pipeline_events;
