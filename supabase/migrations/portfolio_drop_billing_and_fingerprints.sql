-- Portfolio-only cleanup. Apply this by hand in the Supabase SQL editor.
-- The app no longer reads billing columns or device_fingerprints, so it
-- works before this file is applied. After it is applied, those columns
-- and the fingerprint table are gone.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public.device_fingerprint_in_use(text);
DROP TABLE IF EXISTS public.device_fingerprints;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS polar_subscription_id;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS subscription_status;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS trial_ends_at;
