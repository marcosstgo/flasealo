/*
  # Security audit fixes
  - Add SET search_path to all mutable-search-path functions
  - Revoke EXECUTE from anon/authenticated on trigger-only and admin-only functions
  - Replace broad storage SELECT policy with an owner-restricted one
*/

-- ─── 1. Fix mutable search_path ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.can_create_events(user_uuid uuid DEFAULT auth.uid())
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
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

  IF v_role = 'admin' THEN RETURN true; END IF;
  IF v_can_create = true THEN RETURN true; END IF;
  IF v_trial_ends_at IS NOT NULL AND v_trial_ends_at > NOW() THEN RETURN true; END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_trial_info(user_uuid uuid DEFAULT auth.uid())
  RETURNS jsonb
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
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
    'in_trial',          v_in_trial,
    'trial_ends_at',     v_trial_ends_at,
    'days_remaining',    v_days_remaining,
    'trial_expired',     v_trial_ends_at IS NOT NULL AND v_trial_ends_at <= NOW(),
    'has_permanent_access', COALESCE(v_can_create, false) = true OR v_role = 'admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_plan_self_escalation()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.plan = OLD.plan THEN RETURN NEW; END IF;

  IF coalesce(current_setting('request.jwt.claims', true), '') = '' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscription plan changes require administrative access'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_gallery_password()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  IF NEW.gallery_password IS NOT NULL
     AND NEW.gallery_password IS DISTINCT FROM OLD.gallery_password
     AND NEW.gallery_password NOT LIKE '$2%'
  THEN
    NEW.gallery_password := extensions.crypt(NEW.gallery_password, extensions.gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

-- ─── 2. Revoke EXECUTE from roles that should not call these directly ─────────

-- Trigger-only functions: nobody should call these via REST
REVOKE EXECUTE ON FUNCTION public.handle_new_user()               FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_plan_self_escalation()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.hash_gallery_password()         FROM anon, authenticated;

-- Admin/owner functions: only authenticated users, not anon
REVOKE EXECUTE ON FUNCTION public.can_create_events(uuid)   FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_trial_info(uuid)      FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_user_setup(uuid)    FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_info(uuid)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid)       FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid)            FROM anon;

-- ─── 3. Fix storage listing on event-photos ───────────────────────────────────

-- Drop the broad "anyone can list" SELECT policy
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;

-- Allow only authenticated owners to list their own event folder
-- (Individual file URLs still work via the public bucket CDN regardless of this)
CREATE POLICY "Owners can list their event photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-photos'
    AND auth.uid() IN (
      SELECT user_id FROM public.events
      WHERE id::text = (storage.foldername(name))[1]
    )
  );
