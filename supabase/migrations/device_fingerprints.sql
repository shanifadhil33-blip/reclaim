-- =============================================
-- Device Fingerprints Table
-- Anti-abuse: limits free accounts per device
-- =============================================

CREATE TABLE IF NOT EXISTS device_fingerprints (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  -- Each user can only have one record per fingerprint
  UNIQUE(user_id, fingerprint)
);

-- Index for fast lookups by fingerprint
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_fp ON device_fingerprints(fingerprint);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_device_fingerprints_user ON device_fingerprints(user_id);

-- =============================================
-- Row Level Security
-- =============================================
ALTER TABLE device_fingerprints ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read their own fingerprint records
CREATE POLICY "Users can view own fingerprints"
  ON device_fingerprints FOR SELECT
  USING (auth.uid() = user_id);

-- Allow the service role (callback route) to do everything
-- The anon key used in our server client needs INSERT/UPDATE access
CREATE POLICY "Service can insert fingerprints"
  ON device_fingerprints FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update fingerprints"
  ON device_fingerprints FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow reading all fingerprints for device checking (needed for anti-abuse query)
-- This allows checking if OTHER users share the same device fingerprint
CREATE POLICY "Allow fingerprint lookups for abuse detection"
  ON device_fingerprints FOR SELECT
  USING (true);
