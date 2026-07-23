/*
  # Fix pgcrypto schema reference
  
  In Supabase, pgcrypto functions (crypt, gen_salt) live in the `extensions` schema,
  not in `public`. Update all functions to use fully-qualified names.
*/

-- ─── Fix hash_gallery_password trigger function ───────────────────────────────

CREATE OR REPLACE FUNCTION hash_gallery_password()
RETURNS trigger
LANGUAGE plpgsql
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

-- ─── Fix verify_gallery_password RPC ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION verify_gallery_password(
  p_slug     text,
  p_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
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

  RETURN v_stored = extensions.crypt(p_password, v_stored);
END;
$$;

-- ─── Re-hash all existing plaintext passwords with correct schema ─────────────

UPDATE events
SET gallery_password = extensions.crypt(gallery_password, extensions.gen_salt('bf'))
WHERE gallery_password IS NOT NULL
  AND gallery_password NOT LIKE '$2%';
