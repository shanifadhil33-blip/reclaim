-- Stop every signed-in user from reading every device fingerprint.
-- The old policy "Allow fingerprint lookups for abuse detection" used
-- USING (true), so any authenticated session could select every row.
--
-- Apply this file in the Supabase SQL editor by hand. Do not run it
-- from the app. The auth callback calls device_fingerprint_in_use and
-- falls back to the old select only when this function is missing.

CREATE OR REPLACE FUNCTION public.device_fingerprint_in_use(p_fingerprint text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.device_fingerprints
    WHERE fingerprint = p_fingerprint
      AND user_id IS DISTINCT FROM auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.device_fingerprint_in_use(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.device_fingerprint_in_use(text) TO authenticated;

DROP POLICY IF EXISTS "Allow fingerprint lookups for abuse detection" ON public.device_fingerprints;
