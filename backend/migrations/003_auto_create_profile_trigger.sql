-- ============================================================
-- Migration 003: auto-create profile on signup
-- Fires after a new row is inserted in auth.users.
-- Runs as SECURITY DEFINER (service_role) to bypass RLS.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER          -- runs with elevated privilege to insert past RLS
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: safe to run twice
  RETURN NEW;
END;
$$;

-- Drop existing trigger first so this migration is re-runnable
DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
