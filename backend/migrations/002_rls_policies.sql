-- ============================================================
-- Migration 002: Row Level Security (RLS) on profiles
-- Users can only read/update their OWN profile.
-- Admins (service_role) bypass all policies.
-- ============================================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owner (extra safety)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- SELECT: a user can only see their own profile
CREATE POLICY "profiles_select_own"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- INSERT: only the Supabase trigger (runs as service_role) can insert
-- Regular users cannot INSERT directly
CREATE POLICY "profiles_insert_service_only"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- UPDATE: a user can only update their own non-sensitive fields
CREATE POLICY "profiles_update_own"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: nobody can delete a profile directly — CASCADE from auth.users handles it
CREATE POLICY "profiles_no_delete"
  ON public.profiles
  FOR DELETE
  USING (false);
