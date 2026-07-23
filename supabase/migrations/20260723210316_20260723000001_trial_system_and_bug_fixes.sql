/*
  # Trial System + Bug Fixes

  ## Summary
  Implements a 14-day free trial for new users and fixes several bugs
  in the anti-spam and photo deduplication system.

  ## 1. Trial System

  ### Changes to `user_roles`
  - Add `trial_ends_at` (timestamptz) — set 14 days from signup for all new users.

  ### Updated `handle_new_user` trigger
  - Sets `trial_ends_at = now() + interval '14 days'` on every new signup.
  - Sets `can_create_event = true` so trial users can immediately create events.

  ### Updated `can_create_events()` function
  - Returns `true` if the user has explicit permission (`can_create_event = true`)
    OR is still within their trial period (`trial_ends_at > now()`).
  - After trial expires, permission reverts to the manual `can_create_event` flag.

  ### New `get_trial_info()` function
  - Returns trial status for the current user:
    `{ in_trial, trial_ends_at, days_remaining, trial_expired, has_permanent_access }`
  - Used by the Dashboard to show the trial banner.

  ## 2. Bug Fixes

  ### photo_hashes RLS — anon INSERT
  - Previous INSERT policy was `TO authenticated` only.
  - Guest uploaders use the anon key and could not insert hashes → deduplication silently broke.
  - Fix: add a separate anon INSERT policy.

  ### upload_rate_limits RLS — anon INSERT/UPDATE
  - Same issue: anon guests couldn't write rate-limit rows.
  - Fix: add anon INSERT and UPDATE policies.

  ### increment_upload_count — double-counting bug
  - Previous code used `ON CONFLICT (id) DO NOTHING` where `id` is a random UUID.
  - This conflict condition NEVER fires, so every call inserted a fresh row AND
    then updated all rows in the window, double-counting the first upload.
  - Fix: rewrite to UPDATE first; INSERT only when no rows exist in the window.

  ## Notes
  - Existing users get `trial_ends_at` set retroactively to `created_at + 14 days`
    (computed from `auth.users`) so they are not suddenly locked out.
  - Admins are unaffected: `is_admin` check continues to gate event creation.
*/

-- ─── 1. Add trial_ends_at to user_roles ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'trial_ends_at'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN trial_ends_at timestamptz;
  END IF;
END $$;

-- Back-fill existing users: trial ends 14 days after their auth account was created
UPDATE user_roles ur
SET trial_ends_at = au.created_at + interval '14 days'
FROM auth.users au
WHERE au.id = ur.user_id
  AND ur.trial_ends_at IS NULL;

-- ─── 2. Update handle_new_user trigger ──────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, can_create_event, trial_ends_at)
  VALUES (NEW.id, 'user', true, NOW() + INTERVAL '14 days')
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, custom_branding)
  VALUES (NEW.id, 'free', '{}')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 3. Update can_create_events() ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION can_create_events(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  v_can_create boolean;
  v_trial_ends_at timestamptz;
  v_role text;
BEGIN
  SELECT role, can_create_event, trial_ends_at
  INTO v_role, v_can_create, v_trial_ends_at
  FROM user_roles
  WHERE user_id = user_uuid;

  IF v_role IS NULL THEN
    INSERT INTO user_roles (user_id, role, can_create_event, trial_ends_at)
    VALUES (user_uuid, 'user', true, NOW() + INTERVAL '14 days')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN true;
  END IF;

  -- Admins always can
  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  -- Explicit permission
  IF v_can_create = true THEN
    RETURN true;
  END IF;

  -- Within trial period
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 4. get_trial_info() ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_trial_info(user_uuid uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  v_trial_ends_at timestamptz;
  v_can_create boolean;
  v_role text;
  v_days_remaining integer;
  v_in_trial boolean;
BEGIN
  SELECT role, can_create_event, trial_ends_at
  INTO v_role, v_can_create, v_trial_ends_at
  FROM user_roles
  WHERE user_id = user_uuid;

  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN
    v_in_trial := true;
    v_days_remaining := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_trial_ends_at - NOW())) / 86400))::integer;
  ELSE
    v_in_trial := false;
    v_days_remaining := 0;
  END IF;

  RETURN jsonb_build_object(
    'in_trial', v_in_trial,
    'trial_ends_at', v_trial_ends_at,
    'days_remaining', v_days_remaining,
    'trial_expired', v_trial_ends_at IS NOT NULL AND v_trial_ends_at <= NOW(),
    'has_permanent_access', COALESCE(v_can_create, false) = true OR v_role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Fix photo_hashes RLS — allow anon inserts ───────────────────────────

DROP POLICY IF EXISTS "System can insert photo hashes" ON photo_hashes;
CREATE POLICY "System can insert photo hashes"
  ON photo_hashes FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ─── 6. Fix upload_rate_limits RLS — allow anon inserts/updates ─────────────

DROP POLICY IF EXISTS "System can insert rate limits" ON upload_rate_limits;
CREATE POLICY "System can insert rate limits"
  ON upload_rate_limits FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update rate limits" ON upload_rate_limits;
CREATE POLICY "System can update rate limits"
  ON upload_rate_limits FOR UPDATE
  TO anon, authenticated
  USING (true);

-- ─── 7. Fix increment_upload_count — remove broken ON CONFLICT (id) ─────────

CREATE OR REPLACE FUNCTION increment_upload_count(
  p_event_id uuid,
  p_uploader_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_window_minutes constant integer := 5;
  v_updated integer;
BEGIN
  -- Try to increment an existing window row first
  UPDATE upload_rate_limits
  SET uploads_count = uploads_count + 1,
      updated_at = now()
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name
    AND window_start > (now() - (v_window_minutes || ' minutes')::interval);

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- No active window found — start a fresh one
  IF v_updated = 0 THEN
    INSERT INTO upload_rate_limits (event_id, uploader_name, uploads_count, window_start)
    VALUES (p_event_id, p_uploader_name, 1, now())
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
