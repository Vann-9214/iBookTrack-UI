-- ============================================================
-- Migration 019: Row Level Security for imported_books_staging
-- Restricts direct access while allowing service role (backend API) full access
-- ============================================================

-- Enable RLS on staging table
ALTER TABLE public.imported_books_staging ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can READ staging data
-- This allows logged-in users to view reports
CREATE POLICY "staging_read_authenticated"
ON public.imported_books_staging
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Only service role can INSERT (via backend API)
-- Prevents users from directly inserting data
CREATE POLICY "staging_insert_service_only"
ON public.imported_books_staging
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 3: Only service role can UPDATE
-- Prevents users from modifying imported data
CREATE POLICY "staging_update_service_only"
ON public.imported_books_staging
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Only service role can DELETE
-- Prevents accidental data loss
CREATE POLICY "staging_delete_service_only"
ON public.imported_books_staging
FOR DELETE
TO service_role
USING (true);

-- Note: service_role (used by backend API) bypasses RLS automatically
-- This setup ensures:
-- ✅ Backend API has full access (import, update, delete)
-- ✅ Logged-in users can view data (for reports)
-- ❌ Anonymous users cannot access
-- ❌ Users cannot modify data directly
