/*
  # Security Hardening

  1. Add gallery_password column to events (was missing from live DB)
  2. Remove vulnerable anon INSERT/UPDATE policies on photo_hashes and upload_rate_limits
  3. Create record_photo_hash() SECURITY DEFINER function (safe server-side hash insertion)
  4. Enable pgcrypto and hash gallery passwords with bcrypt
  5. Trigger to hash new gallery passwords before saving
  6. verify_gallery_password() RPC for constant-time comparison
  7. Trigger to prevent users from self-escalating their subscription plan
*/

-- ─── 1. Add gallery_password column if missing ───────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'gallery_password'
  ) THEN
    ALTER TABLE events ADD COLUMN gallery_password text DEFAULT NULL;
  END IF;
END $$;

-- ─── 2. Remove vulnerable anon policies ──────────────────────────────────────

DROP POLICY IF EXISTS "System can insert photo hashes"   ON photo_hashes;
DROP POLICY IF EXISTS "System can insert rate limits"    ON upload_rate_limits;
DROP POLICY IF EXISTS "System can update rate limits"    ON upload_rate_limits;

-- ─── 3. Secure photo hash insertion via SECURITY DEFINER function ─────────────

CREATE OR REPLACE FUNCTION record_photo_hash(
  p_event_id  uuid,
  p_file_hash text,
  p_photo_id  uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM photos WHERE id = p_photo_id AND event_id = p_event_id
  ) THEN
    RAISE EXCEPTION 'Photo not found or does not belong to this event';
  END IF;

  INSERT INTO photo_hashes (event_id, file_hash, photo_id)
  VALUES (p_event_id, p_file_hash, p_photo_id)
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── 4. Enable pgcrypto ───────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 5. Hash all existing plaintext gallery passwords ────────────────────────

UPDATE events
SET gallery_password = crypt(gallery_password, gen_salt('bf'))
WHERE gallery_password IS NOT NULL
  AND gallery_password NOT LIKE '$2%';

-- ─── 6. Trigger: auto-hash password before INSERT or UPDATE ──────────────────

CREATE OR REPLACE FUNCTION hash_gallery_password()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.gallery_password IS NOT NULL
     AND NEW.gallery_password IS DISTINCT FROM OLD.gallery_password
     AND NEW.gallery_password NOT LIKE '$2%'
  THEN
    NEW.gallery_password := crypt(NEW.gallery_password, gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_gallery_password ON events;
CREATE TRIGGER trg_hash_gallery_password
  BEFORE INSERT OR UPDATE OF gallery_password ON events
  FOR EACH ROW
  EXECUTE FUNCTION hash_gallery_password();

-- ─── 7. Constant-time password verification RPC ───────────────────────────────

CREATE OR REPLACE FUNCTION verify_gallery_password(
  p_slug     text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_stored text;
BEGIN
  SELECT gallery_password INTO v_stored
  FROM events
  WHERE slug = p_slug AND is_public = true;

  IF v_stored IS NULL THEN
    RETURN false;
  END IF;

  RETURN v_stored = crypt(p_password, v_stored);
END;
$$;

-- ─── 8. Prevent users from self-escalating their subscription plan ────────────

CREATE OR REPLACE FUNCTION prevent_plan_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.plan = OLD.plan THEN
    RETURN NEW;
  END IF;

  -- Allow when called without a user JWT (service_role / internal)
  IF coalesce(current_setting('request.jwt.claims', true), '') = '' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscription plan changes require administrative access'
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_plan_escalation ON subscriptions;
CREATE TRIGGER trg_prevent_plan_escalation
  BEFORE UPDATE OF plan ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION prevent_plan_self_escalation();
