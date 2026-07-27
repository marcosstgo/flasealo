
/*
  # Plan Limits Enforcement

  ## Summary
  Updates the subscription plan enum and enforces photo/event limits per plan.

  ## Changes

  ### 1. Enum update — `subscription_plan` type
  - Adds `starter` and `studio` values to the existing `free`/`pro` enum.

  ### 2. Updated `check_upload_limits()`
  - Now checks **total photos in the event** against the owner's plan limit:
    - `free` / `starter`: 150 photos per event
    - `pro`: 600 photos per event
    - `studio`: unlimited
  - Existing per-uploader rate limit (10 per 5 min) is unchanged.
  - Existing per-uploader total limit (50 per event) is unchanged.

  ### 3. Updated `can_create_events()`
  - Now checks **total active events** against the owner's plan limit:
    - `free` / `starter`: 3 events
    - `pro`: 15 events
    - `studio`: unlimited
  - Admin bypass is unchanged.

  ## Notes
  - `free` users (trial) get the same limits as `starter` (most restrictive paid plan).
  - `studio` is uncapped — both functions return true/allowed immediately.
  - All changes are additive; no data is modified or removed.
*/

-- ─── 1. Extend subscription_plan enum ────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_plan' AND e.enumlabel = 'starter'
  ) THEN
    ALTER TYPE subscription_plan ADD VALUE 'starter';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'subscription_plan' AND e.enumlabel = 'studio'
  ) THEN
    ALTER TYPE subscription_plan ADD VALUE 'studio';
  END IF;
END $$;

-- ─── 2. Update check_upload_limits — add plan-based event photo cap ──────────

CREATE OR REPLACE FUNCTION check_upload_limits(
  p_event_id uuid,
  p_uploader_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_rate_limit         constant integer := 10;
  v_window_minutes     constant integer := 5;
  v_per_user_limit     constant integer := 50;
  v_current_window     timestamptz;
  v_window_start       timestamptz;
  v_uploads_in_window  integer;
  v_total_user_uploads integer;
  v_retry_after        integer;
  v_record_id          uuid;
  -- plan-based event limit
  v_owner_id           uuid;
  v_owner_plan         text;
  v_event_photo_count  integer;
  v_event_photo_limit  integer;
BEGIN
  v_current_window := now();

  -- ── Per-user, per-event total cap ─────────────────────────────────────────
  SELECT COUNT(*)::integer INTO v_total_user_uploads
  FROM photos
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name;

  IF v_total_user_uploads >= v_per_user_limit THEN
    RETURN jsonb_build_object(
      'allowed',       false,
      'reason',        'user_limit_exceeded',
      'total_uploads', v_total_user_uploads,
      'total_limit',   v_per_user_limit,
      'message',       'Has alcanzado el límite de ' || v_per_user_limit || ' fotos para este evento'
    );
  END IF;

  -- ── Plan-based total-event photo cap ──────────────────────────────────────
  SELECT e.user_id INTO v_owner_id
  FROM events e WHERE e.id = p_event_id;

  SELECT COALESCE(s.plan::text, 'free') INTO v_owner_plan
  FROM subscriptions s WHERE s.user_id = v_owner_id;

  IF v_owner_plan IS NULL THEN
    v_owner_plan := 'free';
  END IF;

  -- Determine the event-wide photo limit for this plan
  IF v_owner_plan = 'studio' THEN
    v_event_photo_limit := NULL; -- unlimited
  ELSIF v_owner_plan = 'pro' THEN
    v_event_photo_limit := 600;
  ELSE
    -- free, starter, or any unknown plan
    v_event_photo_limit := 150;
  END IF;

  IF v_event_photo_limit IS NOT NULL THEN
    SELECT COUNT(*)::integer INTO v_event_photo_count
    FROM photos
    WHERE event_id = p_event_id;

    IF v_event_photo_count >= v_event_photo_limit THEN
      RETURN jsonb_build_object(
        'allowed',           false,
        'reason',            'event_limit_exceeded',
        'event_photo_count', v_event_photo_count,
        'event_photo_limit', v_event_photo_limit,
        'message',           'Este evento ha alcanzado el límite de ' || v_event_photo_limit || ' fotos'
      );
    END IF;
  END IF;

  -- ── Rate-limit window check ───────────────────────────────────────────────
  SELECT id, uploads_count, window_start
  INTO v_record_id, v_uploads_in_window, v_window_start
  FROM upload_rate_limits
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name
    AND window_start > (v_current_window - (v_window_minutes || ' minutes')::interval)
  ORDER BY window_start DESC
  LIMIT 1;

  IF v_record_id IS NULL OR
     (v_current_window - v_window_start) > (v_window_minutes || ' minutes')::interval
  THEN
    INSERT INTO upload_rate_limits (event_id, uploader_name, uploads_count, window_start)
    VALUES (p_event_id, p_uploader_name, 0, v_current_window);

    RETURN jsonb_build_object(
      'allowed',          true,
      'uploads_in_window', 0,
      'total_uploads',    v_total_user_uploads,
      'rate_limit',       v_rate_limit,
      'window_minutes',   v_window_minutes
    );
  END IF;

  IF v_uploads_in_window >= v_rate_limit THEN
    v_retry_after := EXTRACT(EPOCH FROM (
      (v_window_start + (v_window_minutes || ' minutes')::interval) - v_current_window
    ))::integer;

    RETURN jsonb_build_object(
      'allowed',             false,
      'reason',              'rate_limit_exceeded',
      'uploads_in_window',   v_uploads_in_window,
      'rate_limit',          v_rate_limit,
      'retry_after_seconds', v_retry_after,
      'message',             'Has subido demasiadas fotos. Espera ' || CEIL(v_retry_after / 60.0) || ' minutos e intenta de nuevo'
    );
  END IF;

  RETURN jsonb_build_object(
    'allowed',          true,
    'uploads_in_window', v_uploads_in_window,
    'total_uploads',    v_total_user_uploads,
    'rate_limit',       v_rate_limit,
    'window_minutes',   v_window_minutes
  );
END;
$$;

-- ─── 3. Update can_create_events — add plan-based active event cap ────────────

CREATE OR REPLACE FUNCTION can_create_events(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  v_can_create    boolean;
  v_trial_ends_at timestamptz;
  v_role          text;
  v_owner_plan    text;
  v_active_events integer;
  v_event_limit   integer;
BEGIN
  SELECT role, can_create_event, trial_ends_at
  INTO v_role, v_can_create, v_trial_ends_at
  FROM user_roles
  WHERE user_id = user_uuid;

  -- Auto-provision on first sign-in
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

  -- Must have explicit permission or active trial
  IF NOT (
    v_can_create = true OR
    (v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW())
  ) THEN
    RETURN false;
  END IF;

  -- ── Plan-based active event cap ───────────────────────────────────────────
  SELECT COALESCE(s.plan::text, 'free') INTO v_owner_plan
  FROM subscriptions s WHERE s.user_id = user_uuid;

  IF v_owner_plan IS NULL THEN
    v_owner_plan := 'free';
  END IF;

  IF v_owner_plan = 'studio' THEN
    RETURN true; -- unlimited
  ELSIF v_owner_plan = 'pro' THEN
    v_event_limit := 15;
  ELSE
    -- free, starter, trial
    v_event_limit := 3;
  END IF;

  SELECT COUNT(*)::integer INTO v_active_events
  FROM events
  WHERE user_id = user_uuid;

  IF v_active_events >= v_event_limit THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
