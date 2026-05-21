-- =============================================================================
-- FLASHEALO.COM - BACKUP COMPLETO DE BASE DE DATOS
-- Generado: 2026-05-21
-- =============================================================================
-- Este archivo contiene:
--   1. Esquema completo (tipos, tablas, indices, funciones, triggers, RLS)
--   2. Datos de todas las tablas
--
-- Para restaurar en un proyecto nuevo de Supabase:
--   1. Ve al SQL Editor en tu dashboard de Supabase
--   2. Copia y pega este archivo completo
--   3. Ejecuta el script
-- =============================================================================


-- =============================================================================
-- SECCION 1: TIPOS PERSONALIZADOS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE photo_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE subscription_plan AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- SECCION 2: TABLAS
-- =============================================================================

-- Tabla: events
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_public boolean DEFAULT true,
  slug text UNIQUE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  qr_code_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  allow_downloads boolean DEFAULT true,
  auto_approve boolean DEFAULT false,
  gallery_password text DEFAULT NULL
);

COMMENT ON COLUMN events.allow_downloads IS 'Controla si los visitantes pueden descargar fotos de la galería del evento';

-- Tabla: photos
CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_path text NOT NULL,
  status photo_status DEFAULT 'pending',
  format text NOT NULL,
  size bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  uploader_name text,
  file_hash text,
  uploader_ip text,
  thumbnail_url text
);

COMMENT ON COLUMN photos.uploader_name IS 'Nombre proporcionado por el usuario al subir la foto (sin autenticación)';

-- Tabla: subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan subscription_plan DEFAULT 'free',
  custom_branding jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: user_roles
CREATE TABLE IF NOT EXISTS user_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  can_create_event boolean DEFAULT false
);

COMMENT ON COLUMN user_roles.can_create_event IS 'Indica si el usuario tiene permiso para crear eventos';

-- Tabla: upload_rate_limits
CREATE TABLE IF NOT EXISTS upload_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  uploader_name text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  uploads_count integer DEFAULT 0 NOT NULL,
  window_start timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE upload_rate_limits IS 'Trackea uploads por usuario/evento para rate limiting';

-- Tabla: photo_hashes
CREATE TABLE IF NOT EXISTS photo_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE photo_hashes IS 'Almacena hashes MD5 de fotos para detección de duplicados';


-- =============================================================================
-- SECCION 3: INDICES
-- =============================================================================

CREATE INDEX IF NOT EXISTS events_user_id_idx ON events(user_id);
CREATE INDEX IF NOT EXISTS events_slug_idx ON events(slug);
CREATE INDEX IF NOT EXISTS photos_event_id_idx ON photos(event_id);
CREATE INDEX IF NOT EXISTS photos_status_idx ON photos(status);
CREATE INDEX IF NOT EXISTS photos_created_at_idx ON photos(created_at);
CREATE INDEX IF NOT EXISTS photos_uploader_name_idx ON photos(uploader_name);
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_lookup ON upload_rate_limits(event_id, uploader_name, window_start);
CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_hashes_unique ON photo_hashes(event_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_photos_file_hash ON photos(file_hash) WHERE file_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_thumbnail_url ON photos(thumbnail_url) WHERE thumbnail_url IS NOT NULL;


-- =============================================================================
-- SECCION 4: FUNCIONES
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN false;
  END IF;
  RETURN COALESCE(user_role, 'user') = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 'user';
  END IF;
  RETURN COALESCE(user_role, 'user');
END;
$$;

CREATE OR REPLACE FUNCTION can_create_events(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = user_uuid
    AND (role = 'admin' OR can_create_event = true)
  );
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, can_create_event)
  VALUES (NEW.id, 'user', false)
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

CREATE OR REPLACE FUNCTION check_user_setup(user_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  has_role boolean;
  has_subscription boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = user_uuid) INTO has_role;
  SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = user_uuid) INTO has_subscription;
  IF NOT has_role THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  IF NOT has_subscription THEN
    INSERT INTO subscriptions (user_id, plan, custom_branding)
    VALUES (user_uuid, 'free', '{}')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  result := jsonb_build_object(
    'user_id', user_uuid,
    'has_role', has_role,
    'has_subscription', has_subscription,
    'fixed', NOT has_role OR NOT has_subscription
  );
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION get_user_info(user_uuid uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result jsonb;
  user_role text;
  user_plan text;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  SELECT plan INTO user_plan FROM subscriptions WHERE user_id = user_uuid;
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    user_role := 'user';
  END IF;
  IF user_plan IS NULL THEN
    INSERT INTO subscriptions (user_id, plan, custom_branding)
    VALUES (user_uuid, 'free', '{}')
    ON CONFLICT (user_id) DO NOTHING;
    user_plan := 'free';
  END IF;
  result := jsonb_build_object(
    'user_id', user_uuid,
    'role', COALESCE(user_role, 'user'),
    'plan', COALESCE(user_plan, 'free'),
    'is_admin', COALESCE(user_role, 'user') = 'admin'
  );
  RETURN result;
END;
$$;

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
  v_rate_limit constant integer := 10;
  v_window_minutes constant integer := 5;
  v_total_limit constant integer := 50;
  v_current_window timestamptz;
  v_window_start timestamptz;
  v_uploads_in_window integer;
  v_total_uploads integer;
  v_retry_after integer;
  v_record_id uuid;
BEGIN
  v_current_window := now();
  SELECT id, uploads_count, window_start
  INTO v_record_id, v_uploads_in_window, v_window_start
  FROM upload_rate_limits
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name
    AND window_start > (v_current_window - (v_window_minutes || ' minutes')::interval)
  ORDER BY window_start DESC
  LIMIT 1;
  SELECT COUNT(*)::integer INTO v_total_uploads
  FROM photos
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name;
  IF v_total_uploads >= v_total_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'total_limit_exceeded',
      'total_uploads', v_total_uploads,
      'total_limit', v_total_limit,
      'message', 'Has alcanzado el límite máximo de ' || v_total_limit || ' fotos para este evento'
    );
  END IF;
  IF v_record_id IS NULL OR (v_current_window - v_window_start) > (v_window_minutes || ' minutes')::interval THEN
    INSERT INTO upload_rate_limits (event_id, uploader_name, uploads_count, window_start)
    VALUES (p_event_id, p_uploader_name, 0, v_current_window);
    RETURN jsonb_build_object(
      'allowed', true,
      'uploads_in_window', 0,
      'total_uploads', v_total_uploads,
      'rate_limit', v_rate_limit,
      'window_minutes', v_window_minutes
    );
  END IF;
  IF v_uploads_in_window >= v_rate_limit THEN
    v_retry_after := EXTRACT(EPOCH FROM (
      (v_window_start + (v_window_minutes || ' minutes')::interval) - v_current_window
    ))::integer;
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit_exceeded',
      'uploads_in_window', v_uploads_in_window,
      'rate_limit', v_rate_limit,
      'retry_after_seconds', v_retry_after,
      'message', 'Has subido demasiadas fotos. Espera ' || CEIL(v_retry_after / 60.0) || ' minutos e intenta de nuevo'
    );
  END IF;
  RETURN jsonb_build_object(
    'allowed', true,
    'uploads_in_window', v_uploads_in_window,
    'total_uploads', v_total_uploads,
    'rate_limit', v_rate_limit,
    'window_minutes', v_window_minutes
  );
END;
$$;

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
  v_current_window timestamptz;
BEGIN
  v_current_window := now();
  INSERT INTO upload_rate_limits (event_id, uploader_name, uploads_count, window_start)
  VALUES (p_event_id, p_uploader_name, 1, v_current_window)
  ON CONFLICT (id) DO NOTHING;
  UPDATE upload_rate_limits
  SET uploads_count = uploads_count + 1,
      updated_at = now()
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name
    AND window_start > (v_current_window - (v_window_minutes || ' minutes')::interval);
END;
$$;

CREATE OR REPLACE FUNCTION check_duplicate_photo(
  p_event_id uuid,
  p_file_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM photo_hashes
    WHERE event_id = p_event_id
      AND file_hash = p_file_hash
  );
END;
$$;


-- =============================================================================
-- SECCION 5: TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at
  BEFORE UPDATE ON photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upload_rate_limits_updated_at ON upload_rate_limits;
CREATE TRIGGER update_upload_rate_limits_updated_at
  BEFORE UPDATE ON upload_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- SECCION 6: ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_hashes ENABLE ROW LEVEL SECURITY;

-- Politicas: events
DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events"
  ON events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own events" ON events;
CREATE POLICY "Users can create their own events"
  ON events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND can_create_events());

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Public events are viewable by anyone" ON events;
CREATE POLICY "Public events are viewable by anyone"
  ON events FOR SELECT TO anon
  USING (is_public = true);

DROP POLICY IF EXISTS "Admins can view all events" ON events;
CREATE POLICY "Admins can view all events"
  ON events FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage all events" ON events;
CREATE POLICY "Admins can manage all events"
  ON events FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Politicas: photos
DROP POLICY IF EXISTS "Event owners can view all photos for their events" ON photos;
CREATE POLICY "Event owners can view all photos for their events"
  ON photos FOR SELECT TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Event owners can update photo status" ON photos;
CREATE POLICY "Event owners can update photo status"
  ON photos FOR UPDATE TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Event owners can delete photos" ON photos;
CREATE POLICY "Event owners can delete photos"
  ON photos FOR DELETE TO authenticated
  USING (
    event_id IN (SELECT id FROM events WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Approved photos in public events are viewable by anyone" ON photos;
CREATE POLICY "Approved photos in public events are viewable by anyone"
  ON photos FOR SELECT TO anon
  USING (
    status = 'approved' AND
    event_id IN (SELECT id FROM events WHERE is_public = true)
  );

DROP POLICY IF EXISTS "Admins can view all photos" ON photos;
CREATE POLICY "Admins can view all photos"
  ON photos FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage all photos" ON photos;
CREATE POLICY "Admins can manage all photos"
  ON photos FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Politicas: subscriptions
DROP POLICY IF EXISTS "Users can view their own subscription" ON subscriptions;
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own subscription" ON subscriptions;
CREATE POLICY "Users can create their own subscription"
  ON subscriptions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own subscription" ON subscriptions;
CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all subscriptions" ON subscriptions;
CREATE POLICY "Admins can view all subscriptions"
  ON subscriptions FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON subscriptions;
CREATE POLICY "Admins can manage all subscriptions"
  ON subscriptions FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Politicas: user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON user_roles;
CREATE POLICY "Users can view their own role"
  ON user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
CREATE POLICY "Admins can view all roles"
  ON user_roles FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles"
  ON user_roles FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update event creation permissions" ON user_roles;
CREATE POLICY "Admins can update event creation permissions"
  ON user_roles FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles"
  ON user_roles FOR INSERT TO authenticated
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles"
  ON user_roles FOR DELETE TO authenticated
  USING (is_admin());

-- Politicas: upload_rate_limits
DROP POLICY IF EXISTS "Admins can view all rate limits" ON upload_rate_limits;
CREATE POLICY "Admins can view all rate limits"
  ON upload_rate_limits FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete rate limits" ON upload_rate_limits;
CREATE POLICY "Admins can delete rate limits"
  ON upload_rate_limits FOR DELETE TO authenticated
  USING (is_admin());

-- Politicas: photo_hashes
DROP POLICY IF EXISTS "Admins can view all photo hashes" ON photo_hashes;
CREATE POLICY "Admins can view all photo hashes"
  ON photo_hashes FOR SELECT TO authenticated
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete photo hashes" ON photo_hashes;
CREATE POLICY "Admins can delete photo hashes"
  ON photo_hashes FOR DELETE TO authenticated
  USING (is_admin());

-- Politicas: storage
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
CREATE POLICY "Anyone can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
CREATE POLICY "Anyone can view photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-photos');

DROP POLICY IF EXISTS "Event owners can delete photos" ON storage.objects;
CREATE POLICY "Event owners can delete photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'event-photos' AND
    auth.uid() IN (
      SELECT user_id FROM events
      WHERE id = (SELECT event_id FROM photos WHERE image_path = name)
    )
  );


-- =============================================================================
-- SECCION 7: DATOS - events (16 registros)
-- =============================================================================

INSERT INTO events (id, name, description, is_public, slug, user_id, qr_code_url, created_at, updated_at, allow_downloads, auto_approve) VALUES
('2d85c70a-8bf8-485f-aeae-23ffbd3c6e9c', 'Festival de las flores', 'Esta es la descripcion del evento', true, 'festival-de-las-flores', '4759c4a4-4dae-4577-8a1e-36f48976fc54', NULL, '2025-06-24 23:29:49.035059+00', '2025-06-24 23:29:49.035059+00', true, false),
('382da6db-11df-4b6d-90cf-4f2872c7363f', 'Festival del Apio', NULL, true, 'festival-del-apio', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-06-27 19:56:21.530706+00', '2025-06-28 17:16:05.851642+00', true, false),
('2be9c6c5-595b-4f27-b0c3-a73de5d7556a', 'Festival de Aibonito', 'Esto festiva se celebra todo los años', true, 'festival-de-aibonito', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-06-27 22:44:10.63364+00', '2025-06-27 22:44:27.962055+00', false, false),
('64bac68c-e357-48be-a480-05e8693ee995', 'Boda de María & José', 'Celebra el 27 de junio de 2025', true, 'boda-de-mar-a-jos', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-06-27 22:46:24.847404+00', '2025-06-27 22:46:24.847404+00', true, false),
('48a7e7fc-b3ee-4237-9a94-3d185f101305', 'Quiceañera (Arroyo)', NULL, true, 'quicea-era-arroyo', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-06-28 18:43:31.450938+00', '2025-06-28 18:43:31.450938+00', true, false),
('83a3ee40-8504-408d-b6f4-bbec97ff9444', 'Lunita (Bautismo)', NULL, true, 'lunita-bautismo', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-06-29 03:12:21.370411+00', '2025-06-29 03:23:19.286099+00', false, false),
('e1ca8a53-b052-4524-97d5-ece0041cab3f', 'Feria Nacional de Artesanías de Barranquitas', NULL, true, 'feria-nacional-de-artesan-as-de-barranquitas', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-07-18 18:38:44.602146+00', '2025-07-18 18:38:44.602146+00', true, false),
('64a25b83-fafe-4d52-99f4-1c408cee24cf', 'Seguridad en Manatí', NULL, true, 'seguridad-en-manat', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-12 20:00:45.329958+00', '2025-11-19 07:12:53.171638+00', false, false),
('18f20a5f-02d6-466b-bfaf-62523579c812', 'Boda de Jorge', NULL, true, 'boda-de-jorge', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-19 06:50:26.488446+00', '2025-11-19 06:50:26.488446+00', true, false),
('d1d3f367-b8c6-44e8-9e4e-52bbf18890a5', 'Festival del Pastel 2025', NULL, true, 'festival-del-pastel-2025', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-21 19:07:41.677142+00', '2025-11-21 19:07:41.677142+00', true, false),
('04c73171-ec4e-4d80-a7d5-3a590fadbedc', 'Aibonito (Fotos)', NULL, true, 'aibonito-fotos', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-21 19:59:51.479007+00', '2025-11-21 19:59:51.479007+00', true, false),
('d974d949-cd17-4023-96d0-2bf914aecfe1', 'Encendido Navidad 2025 (Manatí)', NULL, true, 'encendido-navidad-2025-manat', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-21 20:03:24.479107+00', '2026-03-11 05:17:26.473621+00', true, false),
('7e9f4a25-d59a-4ad4-b121-a239485864f6', 'Encendido de Navidad (Barranquitas)', NULL, true, 'encendido-de-navidad-barranquitas', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2025-11-21 21:12:01.83711+00', '2025-11-21 21:12:01.83711+00', true, false),
('360740af-5968-48f1-a8c1-60cfb275d868', 'Truist Fest', NULL, true, 'truist-fest', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2026-03-11 05:21:06.063043+00', '2026-03-11 05:21:06.063043+00', true, false),
('6b8ee43c-b69e-4575-a459-eb2925339cb6', 'Aibonito', NULL, true, 'aibonito', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2026-03-21 22:21:52.77147+00', '2026-03-21 22:21:52.77147+00', true, false),
('36c1b66f-f2d5-489c-a4d7-e86d798298d8', 'Valeria & Loann', 'Fotos de los tortolitos', true, 'valeria-loann', '884fe364-25f0-4bb6-a615-baef2cfc5dd5', NULL, '2026-03-25 18:50:22.614787+00', '2026-03-25 18:52:33.497071+00', true, true)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECCION 8: DATOS - photos (67 registros)
-- =============================================================================

INSERT INTO photos (id, event_id, user_id, image_path, status, format, size, created_at, updated_at, uploader_name, file_hash, uploader_ip, thumbnail_url) VALUES
('bd2aa110-1ca8-4939-92d2-669f742499b8', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751056427971-bc0oxw-IMG_8067.jpeg', 'approved', 'image/jpeg', 2666315, '2025-06-27 20:33:49.288102+00', '2025-06-27 20:34:14.216209+00', 'Loann Javier', NULL, NULL, NULL),
('40a09c03-3213-45a3-819e-da33ae125354', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751056429134-orrm63-IMG_8066.jpeg', 'approved', 'image/jpeg', 2675151, '2025-06-27 20:33:50.293454+00', '2025-06-27 20:34:13.112461+00', 'Loann Javier', NULL, NULL, NULL),
('3f25d176-596b-40d1-895a-3e0b6e2f050d', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751056430134-wybral-IMG_8065.jpeg', 'approved', 'image/jpeg', 2315665, '2025-06-27 20:33:51.011715+00', '2025-06-27 20:34:11.025303+00', 'Loann Javier', NULL, NULL, NULL),
('26d1366c-7e5b-49d4-8705-cc677a6e1755', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751060913814-nggji-50BFAD93-A4CD-4410-9F08-729280A5A65A.jpeg', 'approved', 'image/jpeg', 2278667, '2025-06-27 21:48:36.610463+00', '2025-06-27 21:49:24.053086+00', 'Loann', NULL, NULL, NULL),
('4e72f995-11a2-4138-a646-ee8c35e1e7ce', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751062050744-q8gu4e-1000069599.jpg', 'approved', 'image/jpeg', 3397866, '2025-06-27 22:07:33.109313+00', '2025-06-27 22:22:43.707637+00', 'Loany', NULL, NULL, NULL),
('f981ee46-1a13-4520-9555-817dda959e92', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751064162389-i1dc-1000650655.jpg', 'approved', 'image/jpeg', 171369, '2025-06-27 22:42:43.856802+00', '2025-06-27 22:43:05.757461+00', 'Marcos  Vargas', NULL, NULL, NULL),
('7bb201ee-fb08-4bd4-b973-f42fb1ef5e93', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751064812905-q3qp9f-2025-06-2718.53.244261835679720825356.jpg', 'approved', 'image/jpeg', 2610925, '2025-06-27 22:53:36.103729+00', '2025-06-27 22:54:09.214035+00', 'Marcos Vargas', NULL, NULL, NULL),
('7a924f1a-3511-4442-96a0-c1493ddebaa9', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751071758329-ngpjtn-1000019820.jpg', 'approved', 'image/jpeg', 3581151, '2025-06-28 00:49:18.771364+00', '2025-06-28 00:49:56.594799+00', 'Johnny', NULL, NULL, NULL),
('d16325b0-9aa3-44b6-9382-863ac977e858', '382da6db-11df-4b6d-90cf-4f2872c7363f', NULL, 'festival-del-apio/1751071754967-k270pv-1000650505.png', 'approved', 'image/png', 2674713, '2025-06-28 00:49:18.991865+00', '2025-06-28 00:49:43.815754+00', 'Carol G', NULL, NULL, NULL),
('7e213277-205b-4644-8da6-ea94f2981e20', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977704890-9gqr5-P1131062.jpeg', 'approved', 'image/jpeg', 2084483, '2025-11-12 20:01:46.18385+00', '2025-11-12 20:02:15.125501+00', 'Marcos', NULL, NULL, NULL),
('75c72de5-9494-4318-92d1-d56772e09330', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977706175-182wa-P1131047.jpeg', 'approved', 'image/jpeg', 3307729, '2025-11-12 20:01:47.049334+00', '2025-11-12 20:02:11.231117+00', 'Marcos', NULL, NULL, NULL),
('c7ef0dfd-1567-4888-a9c7-44f336e1e7b2', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977707036-dgipmg-P1130988.jpeg', 'approved', 'image/jpeg', 2584207, '2025-11-12 20:01:47.698768+00', '2025-11-12 20:02:13.961488+00', 'Marcos', NULL, NULL, NULL),
('23e84927-5646-4e7f-ad23-31312376250a', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977707686-fpxbi-P1130950.jpeg', 'approved', 'image/jpeg', 4431690, '2025-11-12 20:01:48.423123+00', '2025-11-12 20:02:10.400676+00', 'Marcos', NULL, NULL, NULL),
('a48cbc0a-be6a-4f8c-9049-e8dd4faa3a7c', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977708408-wo5ms-P1130887.jpeg', 'approved', 'image/jpeg', 4139624, '2025-11-12 20:01:49.146921+00', '2025-11-12 20:02:16.097331+00', 'Marcos', NULL, NULL, NULL),
('dcc2ad62-bd41-4a06-bac7-a39e6e7f61cc', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977709133-8e8onc-1J0A2078.jpeg', 'approved', 'image/jpeg', 7811491, '2025-11-12 20:01:50.409232+00', '2025-11-12 20:02:09.28558+00', 'Marcos', NULL, NULL, NULL),
('b3d1cd1f-cee7-435f-91a1-f757be72d58f', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977710401-ohs73q-1J0A2071.jpeg', 'approved', 'image/jpeg', 7994070, '2025-11-12 20:01:51.682451+00', '2025-11-12 20:02:13.161199+00', 'Marcos', NULL, NULL, NULL),
('a23bdcb3-85b5-4da5-ae0e-c4841ceb5916', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762977711773-zmgxn-1J0A2034.jpeg', 'approved', 'image/jpeg', 7199377, '2025-11-12 20:01:53.699786+00', '2025-11-12 20:02:07.946031+00', 'Marcos', NULL, NULL, NULL),
('7cd13bfb-25e6-4316-b8f9-762392f0cfae', '64a25b83-fafe-4d52-99f4-1c408cee24cf', NULL, 'seguridad-en-manat/1762978191558-g25us-image.jpg', 'rejected', 'image/jpeg', 3714287, '2025-11-12 20:09:55.81924+00', '2025-11-19 19:00:25.015859+00', 'Laura', NULL, NULL, NULL),
('af88937a-f263-4984-9cda-92fb25ec2062', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763535159337-g8i12-1000530168.jpg', 'approved', 'image/jpeg', 728358, '2025-11-19 06:52:40.50342+00', '2025-11-19 06:52:58.200737+00', 'Temetito', NULL, NULL, NULL),
('196320c8-dd19-45ba-b5de-e0af88e8af39', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582271474-fqmwn-IMG_9276.jpeg', 'approved', 'image/jpeg', 1918022, '2025-11-19 19:58:19.4877+00', '2025-11-19 19:59:32.016039+00', 'Marcos Santiago', NULL, NULL, NULL),
('b44f8b83-6a8e-4fc3-b9a2-9992f198a630', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582299557-p96q6l-IMG_9265.jpeg', 'approved', 'image/jpeg', 2670454, '2025-11-19 19:58:58.405686+00', '2025-11-19 19:59:33.870371+00', 'Marcos Santiago', NULL, NULL, NULL),
('c396fa06-efba-4e9b-93bf-be2e3847ea2f', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582338455-pozt-IMG_9234.jpeg', 'approved', 'image/jpeg', 528718, '2025-11-19 19:59:05.883811+00', '2025-11-19 19:59:31.124634+00', 'Marcos Santiago', NULL, NULL, NULL),
('b4cf05b7-030c-41e6-af61-baeab466e063', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582591630-0be2poc-IMG_9153.jpeg', 'approved', 'image/jpeg', 6389624, '2025-11-19 20:03:15.747604+00', '2025-11-19 20:04:51.01119+00', 'Marcos Santiago', NULL, NULL, NULL),
('fa81ebc3-3b44-40a0-b8d5-51e4b4b1da53', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582595803-zovewd-IMG_9128.jpeg', 'approved', 'image/jpeg', 8264483, '2025-11-19 20:03:18.277997+00', '2025-11-19 20:04:48.528741+00', 'Marcos Santiago', NULL, NULL, NULL),
('a72d7662-62d9-4aa8-a3ab-63c7f1cfc162', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582598551-8bhnni-IMG_9137.jpeg', 'approved', 'image/jpeg', 6095109, '2025-11-19 20:03:20.538555+00', '2025-11-19 20:04:52.151328+00', 'Marcos Santiago', NULL, NULL, NULL),
('761b3044-62ee-4bdd-adcc-e920a736e0fd', '18f20a5f-02d6-466b-bfaf-62523579c812', NULL, 'boda-de-jorge/1763582600651-d0ufz8-IMG_9108.jpeg', 'approved', 'image/jpeg', 1904966, '2025-11-19 20:03:21.762599+00', '2025-11-19 20:04:47.480652+00', 'Marcos Santiago', NULL, NULL, NULL),
('bf192e96-5d03-4233-8a80-03146f12b7fd', '04c73171-ec4e-4d80-a7d5-3a590fadbedc', NULL, 'aibonito-fotos/1763831241198-sgqzkn-73ee80b0-f31b-4044-86d2-7fb15c3b9163.jpeg', 'approved', 'image/jpeg', 494041, '2025-11-22 17:07:23.016263+00', '2025-11-30 03:48:44.980812+00', 'Miguel (BEBO) Santiago', NULL, NULL, NULL),
('6aad85b8-f7a2-40db-b8a6-9165403b007e', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1763889928668-hg8ded-DJI_0138.jpg', 'approved', 'image/jpeg', 3077705, '2025-11-23 09:25:27.788916+00', '2025-11-23 09:25:59.492762+00', 'Marcos', NULL, NULL, NULL),
('e7cda04d-6b36-4fd4-95b7-255899efcaf9', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1763889929718-pnb97-DJI_0137.jpg', 'approved', 'image/jpeg', 3306626, '2025-11-23 09:25:28.370778+00', '2025-11-23 09:25:58.836119+00', 'Marcos', NULL, NULL, NULL),
('fb8e1024-b73c-4f92-add8-1249a7a099dd', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1763889930298-rif66-DJI_0129.jpg', 'approved', 'image/jpeg', 3184369, '2025-11-23 09:25:28.846155+00', '2025-11-23 09:25:58.222708+00', 'Marcos', NULL, NULL, NULL),
('cb80543c-333e-4e76-bbb8-1284ce54eb03', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1763889930772-0ltjyl-DJI_0108.jpg', 'approved', 'image/jpeg', 4346569, '2025-11-23 09:25:29.343768+00', '2025-11-23 09:25:57.53329+00', 'Marcos', NULL, NULL, NULL),
('0e768464-9e5c-43eb-999e-3700b5096d64', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1763889931270-vo7hoa-P1131332C.jpg', 'approved', 'image/jpeg', 9208791, '2025-11-23 09:25:30.247024+00', '2025-11-23 09:25:56.738371+00', 'Marcos', NULL, NULL, NULL),
('c739100c-3176-4795-982e-c245fe4d7e16', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764018195947-dz14tg-DJI_0129__GRADED.jpg', 'approved', 'image/jpeg', 10477839, '2025-11-24 21:03:12.76793+00', '2025-11-24 21:03:33.49858+00', 'Marcos', NULL, NULL, NULL),
('38b65c48-9518-43b6-817c-5e19234681a8', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764018197035-8dz99v-1J0A3097__GRADED.jpg', 'approved', 'image/jpeg', 10254634, '2025-11-24 21:03:13.892779+00', '2025-11-24 21:03:35.310591+00', 'Marcos', NULL, NULL, NULL),
('e70d3bd3-f990-4dca-942b-31c7b4e1aa40', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764018198175-01ewi-1J0A3058__GRADED.jpg', 'approved', 'image/jpeg', 8570429, '2025-11-24 21:03:15.534422+00', '2025-11-24 21:03:32.541576+00', 'Marcos', NULL, NULL, NULL),
('93c363fc-0a65-48ba-bd33-52c6a495ffe3', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764097901808-kxtyy-P1131160.jpeg', 'approved', 'image/jpeg', 4932824, '2025-11-25 19:11:44.344708+00', '2025-11-30 03:46:40.210719+00', 'Adrián', NULL, NULL, NULL),
('2d64119f-79d6-40e8-82ad-8f747b34eef1', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764097904423-yfjoa-P1131155.jpeg', 'approved', 'image/jpeg', 5131120, '2025-11-25 19:11:46.479095+00', '2025-11-30 03:46:42.025734+00', 'Adrián', NULL, NULL, NULL),
('1db5f25f-8c22-4b4b-8f7f-2cab3952c14e', 'd974d949-cd17-4023-96d0-2bf914aecfe1', NULL, 'encendido-navidad-2025-manat/1764097906530-4xvjn9-P1131152.jpeg', 'approved', 'image/jpeg', 5394174, '2025-11-25 19:11:48.398258+00', '2025-11-30 03:46:38.752362+00', 'Adrián', NULL, NULL, NULL),
('65e29e2b-3a76-4f04-9641-595ff5805a1d', '360740af-5968-48f1-a8c1-60cfb275d868', NULL, 'truist-fest/1773206543176-iiwlx-19729.jpg', 'approved', 'image/jpeg', 378713, '2026-03-11 05:22:21.897744+00', '2026-03-11 05:22:59.629333+00', 'Sangano', NULL, NULL, NULL),
('1a560083-aa51-4149-9f32-35d406c4581a', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131778941-860hj-1J0A5516.jpeg', 'approved', 'image/jpeg', 3673047, '2026-03-21 22:23:00.766254+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('acfc33e4-91aa-439f-97a6-646b23018c44', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131795493-ygdwvn-1J0A5405.jpeg', 'approved', 'image/jpeg', 4078030, '2026-03-21 22:23:16.581607+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('45c58443-e472-4fbc-9110-ef7aae572048', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131796619-ik9jbg-1J0A5399.jpeg', 'approved', 'image/jpeg', 4372025, '2026-03-21 22:23:17.816894+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('17f9ae23-be16-477c-b1b5-cab97b64d11a', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131797911-sz1pw-1J0A5392.jpeg', 'approved', 'image/jpeg', 4538254, '2026-03-21 22:23:19.051969+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('25b42b5d-00af-4ecd-94ee-415aed1cfb3b', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131799070-c4bqj-1J0A5386.jpeg', 'approved', 'image/jpeg', 3818393, '2026-03-21 22:23:20.031587+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('5b3777e0-b10f-4612-a2ed-ff56c8c27763', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131800049-n7yvd-1J0A5389.jpeg', 'approved', 'image/jpeg', 4134995, '2026-03-21 22:23:21.491971+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('5df22bd0-13d5-4c98-9efa-a7cf417742a6', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131801721-xllayq-1J0A5385.jpeg', 'approved', 'image/jpeg', 4128537, '2026-03-21 22:23:22.715631+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('a3d07c8a-29fc-4d95-bbf3-ffa8e4a75429', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131802952-yasq7-1J0A5373.jpeg', 'approved', 'image/jpeg', 3096863, '2026-03-21 22:23:23.840957+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('355def34-3eb1-4723-b8c4-265973225b53', '6b8ee43c-b69e-4575-a459-eb2925339cb6', NULL, 'aibonito/1774131803859-bitjcl-1J0A5371.jpeg', 'approved', 'image/jpeg', 3662977, '2026-03-21 22:23:24.76955+00', '2026-03-21 22:24:01.691849+00', 'Marcos', NULL, NULL, NULL),
('aedc4e73-3386-46b2-8049-83df8ae100bd', '7e9f4a25-d59a-4ad4-b121-a239485864f6', NULL, 'encendido-de-navidad-barranquitas/1774138555551-evrlx9-1J0A3969.jpg', 'approved', 'image/jpeg', 8426037, '2026-03-22 00:15:57.224344+00', '2026-03-24 20:17:48.12234+00', 'Jose', NULL, NULL, NULL),
('3729657e-2bd9-4a8e-974e-f1c45c6f63cf', '7e9f4a25-d59a-4ad4-b121-a239485864f6', NULL, 'encendido-de-navidad-barranquitas/1774138557154-0b35pm-1J0A3969-2.jpg', 'approved', 'image/jpeg', 8980365, '2026-03-22 00:15:58.630467+00', '2026-03-24 20:17:48.12234+00', 'Jose', NULL, NULL, NULL),
('c27270e3-9783-4828-8366-cfb089dfd3ac', '7e9f4a25-d59a-4ad4-b121-a239485864f6', NULL, 'encendido-de-navidad-barranquitas/1774138558555-0szweo-1J0A3972-Enhanced-NR.jpg', 'approved', 'image/jpeg', 7617644, '2026-03-22 00:15:59.534581+00', '2026-03-24 20:17:48.12234+00', 'Jose', NULL, NULL, NULL),
('7d2b8d81-8914-4d3e-8114-0fed05287e23', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465328370-3nypx4-IMG_1107.jpeg', 'approved', 'image/jpeg', 2021014, '2026-03-25 19:02:10.778606+00', '2026-03-25 19:02:10.778606+00', 'Loann', NULL, NULL, NULL),
('77060c7f-3280-454f-891b-ae7b85f02959', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465332147-w5n3rs-IMG_1105.jpeg', 'approved', 'image/jpeg', 1583700, '2026-03-25 19:02:13.8575+00', '2026-03-25 19:02:13.8575+00', 'Loann', NULL, NULL, NULL),
('784c50b3-7f6a-41a5-a034-876c6c4a8f14', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465334787-m4uzzr-e15de0fa-8907-4de7-85b7-4f115d743874.jpeg', 'approved', 'image/jpeg', 106180, '2026-03-25 19:02:15.381644+00', '2026-03-25 19:02:15.381644+00', 'Loann', NULL, NULL, NULL),
('4e7ed60f-8920-4b59-a51e-11ffe98d51be', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465336094-grbwhn-IMG_0934.jpeg', 'approved', 'image/jpeg', 250215, '2026-03-25 19:02:16.695136+00', '2026-03-25 19:02:16.695136+00', 'Loann', NULL, NULL, NULL),
('37695b41-e7bd-4b4d-88ac-50ed392973ab', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465337680-vc4j9k-IMG_0811.jpeg', 'approved', 'image/jpeg', 2802944, '2026-03-25 19:02:19.600272+00', '2026-03-25 19:02:19.600272+00', 'Loann', NULL, NULL, NULL),
('9a2a1158-baa7-42ad-bb72-cc49f2be4151', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465345666-c4i3n-IMG_0805.jpeg', 'approved', 'image/jpeg', 2102173, '2026-03-25 19:02:27.46838+00', '2026-03-25 19:02:27.46838+00', 'Loann', NULL, NULL, NULL),
('9475fdb5-7480-4487-813b-46c31c5f1711', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465414637-q45o1f-IMG_0804.jpeg', 'approved', 'image/jpeg', 2674699, '2026-03-25 19:03:39.49614+00', '2026-03-25 19:03:39.49614+00', 'Loann', NULL, NULL, NULL),
('9b271c13-95d0-4d16-864e-240ce8d29997', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465427870-h11niw-6b3b4341-df17-4f0e-998b-d0010affea6d.jpeg', 'approved', 'image/jpeg', 241658, '2026-03-25 19:03:48.608086+00', '2026-03-25 19:03:48.608086+00', 'Loann', NULL, NULL, NULL),
('3714f921-58d0-4600-b8b2-37f852230585', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465429416-m6gep8-758ded7c-79f4-4b98-93ab-28889c5d4b19.jpeg', 'approved', 'image/jpeg', 217847, '2026-03-25 19:03:50.250528+00', '2026-03-25 19:03:50.250528+00', 'Loann', NULL, NULL, NULL),
('efe9e801-5638-4ec9-af8b-8ca45c9504e2', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465449366-8soub5-f8fe7f06-ec2d-47f1-b69b-3e800b9dcaab.jpeg', 'approved', 'image/jpeg', 278369, '2026-03-25 19:04:10.195449+00', '2026-03-25 19:04:10.195449+00', 'Loann', NULL, NULL, NULL),
('5b76491d-a4fa-447a-80fd-6190e3420618', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465477681-694yzs-653e81f1-7861-45ef-bccc-93b6fe23cdd2.jpeg', 'approved', 'image/jpeg', 213970, '2026-03-25 19:04:38.548646+00', '2026-03-25 19:04:38.548646+00', 'Loann', NULL, NULL, NULL),
('7376fe88-6bdd-4864-988b-8c05798dc0c4', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465480741-e1gqfz-0ab217bb-eb22-4241-aff2-0b3d336d2bb1.jpeg', 'approved', 'image/jpeg', 111353, '2026-03-25 19:04:41.466719+00', '2026-03-25 19:04:41.466719+00', 'Loann', NULL, NULL, NULL),
('b2c42821-0a6e-4d2e-b538-131403615203', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465482979-1ykj0m-IMG_6311.jpeg', 'approved', 'image/jpeg', 1236177, '2026-03-25 19:04:44.571529+00', '2026-03-25 19:04:44.571529+00', 'Loann', NULL, NULL, NULL),
('2f436009-a0df-4ffb-a5f0-55c262b2723b', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465485303-to1zkd-93360267-d39d-446f-87f3-aa65ec6f20e4.jpeg', 'approved', 'image/jpeg', 307416, '2026-03-25 19:04:46.073455+00', '2026-03-25 19:04:46.073455+00', 'Loann', NULL, NULL, NULL),
('859821e4-ce44-4937-bbe3-295c44f04cac', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465487002-jwfggj-IMG_5795.jpeg', 'approved', 'image/jpeg', 2728195, '2026-03-25 19:04:49.079458+00', '2026-03-25 19:04:49.079458+00', 'Loann', NULL, NULL, NULL),
('8295ba75-8d2b-4119-b3c4-9763e7a1faca', '36c1b66f-f2d5-489c-a4d7-e86d798298d8', NULL, 'valeria-loann/1774465489753-076w1p-5d77588d-bd92-4912-b2c4-cf9bc47a9c22.jpeg', 'approved', 'image/jpeg', 476455, '2026-03-25 19:04:50.663873+00', '2026-03-25 19:04:50.663873+00', 'Loann', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- SECCION 9: DATOS - subscriptions (3 registros)
-- =============================================================================

INSERT INTO subscriptions (user_id, plan, custom_branding, created_at, updated_at) VALUES
('eef9d5e5-c02f-409e-8a92-a4b439877e01', 'free', '{}', '2025-06-27 19:54:30.381643+00', '2025-06-27 19:54:30.381643+00'),
('4e49f550-9191-4a13-8379-81884d8ccdb1', 'free', '{}', '2025-06-27 21:23:35.217471+00', '2025-06-27 21:23:35.217471+00'),
('b3c2c95e-7609-4453-9329-58f0a0f6ce18', 'free', '{}', '2026-03-21 22:52:47.736689+00', '2026-03-21 22:52:47.736689+00')
ON CONFLICT (user_id) DO NOTHING;


-- =============================================================================
-- SECCION 10: DATOS - user_roles (5 registros)
-- =============================================================================

INSERT INTO user_roles (user_id, role, created_at, updated_at, can_create_event) VALUES
('4759c4a4-4dae-4577-8a1e-36f48976fc54', 'admin', '2025-06-24 23:24:16.945041+00', '2025-06-24 23:24:44.323762+00', false),
('884fe364-25f0-4bb6-a615-baef2cfc5dd5', 'admin', '2025-06-27 19:07:31.766285+00', '2025-06-27 20:53:48.095767+00', false),
('eef9d5e5-c02f-409e-8a92-a4b439877e01', 'user', '2025-06-27 19:54:30.381643+00', '2026-03-21 22:31:59.721387+00', true),
('4e49f550-9191-4a13-8379-81884d8ccdb1', 'user', '2025-06-27 21:23:35.217471+00', '2026-03-21 22:32:02.2881+00', true),
('b3c2c95e-7609-4453-9329-58f0a0f6ce18', 'user', '2026-03-21 22:52:47.736689+00', '2026-03-21 22:52:47.736689+00', false)
ON CONFLICT (user_id) DO NOTHING;


-- =============================================================================
-- NOTA SOBRE USUARIOS AUTH
-- =============================================================================
-- Los usuarios en auth.users NO pueden copiarse directamente desde SQL.
-- Los UUIDs de usuarios referenciados en este backup son:
--   4759c4a4-4dae-4577-8a1e-36f48976fc54  (admin)
--   884fe364-25f0-4bb6-a615-baef2cfc5dd5  (admin - usuario principal)
--   eef9d5e5-c02f-409e-8a92-a4b439877e01  (user)
--   4e49f550-9191-4a13-8379-81884d8ccdb1  (user)
--   b3c2c95e-7609-4453-9329-58f0a0f6ce18  (user)
--
-- Para restaurar en un proyecto nuevo:
--   1. Los usuarios deben registrarse nuevamente (o usar Supabase Dashboard > Auth > Users)
--   2. Actualizar los user_id en events, photos, subscriptions y user_roles
--      para que coincidan con los nuevos UUIDs generados
--
-- NOTA SOBRE STORAGE (FOTOS):
--   Las fotos fisicas en el bucket 'event-photos' de Supabase Storage
--   deben descargarse por separado desde:
--   Dashboard de Supabase > Storage > event-photos
-- =============================================================================

-- FIN DEL BACKUP
