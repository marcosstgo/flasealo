/*
  # Sistema Anti-Spam para Uploads de Fotos

  ## Resumen
  Implementa controles anti-spam para prevenir abuso en uploads de fotos por parte
  de usuarios malintencionados o bots.

  ## 1. Nuevas Tablas
  
  ### `upload_rate_limits`
  Trackea uploads por usuario/evento para implementar rate limiting.
  - `id` (uuid, primary key)
  - `user_id` (uuid, nullable) - ID del usuario autenticado (si aplica)
  - `uploader_name` (text) - Nombre del uploader anónimo
  - `event_id` (uuid, foreign key) - Evento al que pertenece
  - `uploads_count` (integer) - Número de uploads en ventana actual
  - `window_start` (timestamptz) - Inicio de la ventana de rate limiting
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### `photo_hashes`
  Almacena hashes MD5 de fotos para detectar duplicados.
  - `id` (uuid, primary key)
  - `photo_id` (uuid, foreign key) - Referencia a la foto
  - `file_hash` (text) - Hash MD5 del archivo
  - `event_id` (uuid, foreign key) - Evento al que pertenece
  - `created_at` (timestamptz)

  ## 2. Modificaciones a Tablas Existentes
  
  ### Tabla `photos`
  - Agregar columna `file_hash` (text, nullable) - Hash MD5 del archivo para detección de duplicados
  - Agregar columna `uploader_ip` (text, nullable) - IP del uploader para tracking adicional

  ## 3. Índices
  - Índice compuesto en `upload_rate_limits(event_id, uploader_name, window_start)`
  - Índice único en `photo_hashes(event_id, file_hash)` para prevenir duplicados
  - Índice en `photos(file_hash)` para búsqueda rápida

  ## 4. Seguridad (RLS)
  - Enable RLS en `upload_rate_limits` y `photo_hashes`
  - Solo admins pueden leer datos de rate limiting
  - Sistema puede escribir en ambas tablas vía service role

  ## 5. Funciones
  
  ### `check_upload_limits(p_event_id, p_uploader_name)`
  Verifica si un uploader ha excedido los límites:
  - Rate limit: 10 fotos cada 5 minutos
  - Límite total: 50 fotos por uploader por evento
  
  Retorna JSON con:
  - `allowed` (boolean) - Si el upload es permitido
  - `reason` (text) - Razón si no es permitido
  - `uploads_in_window` (integer) - Uploads en ventana actual
  - `total_uploads` (integer) - Total de uploads del usuario en el evento
  - `retry_after_seconds` (integer) - Segundos hasta que pueda intentar de nuevo

  ### `check_duplicate_photo(p_event_id, p_file_hash)`
  Verifica si un archivo ya fue subido al evento basado en su hash.

  ## Notas Importantes
  - Rate limit: 10 fotos cada 5 minutos (ventanas deslizantes)
  - Límite total: 50 fotos por uploader por evento
  - Los hashes detectan archivos idénticos incluso con nombres diferentes
  - IPs se almacenan para análisis de patrones de abuso
*/

-- Crear tabla de rate limits
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

-- Crear tabla de hashes de fotos
CREATE TABLE IF NOT EXISTS photo_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid REFERENCES photos(id) ON DELETE CASCADE,
  file_hash text NOT NULL,
  event_id uuid REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Agregar columnas a tabla photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'file_hash'
  ) THEN
    ALTER TABLE photos ADD COLUMN file_hash text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'uploader_ip'
  ) THEN
    ALTER TABLE photos ADD COLUMN uploader_ip text;
  END IF;
END $$;

-- Crear índices para optimización
CREATE INDEX IF NOT EXISTS idx_upload_rate_limits_lookup 
  ON upload_rate_limits(event_id, uploader_name, window_start);

CREATE UNIQUE INDEX IF NOT EXISTS idx_photo_hashes_unique 
  ON photo_hashes(event_id, file_hash);

CREATE INDEX IF NOT EXISTS idx_photos_file_hash 
  ON photos(file_hash) WHERE file_hash IS NOT NULL;

-- Habilitar RLS
ALTER TABLE upload_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_hashes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para upload_rate_limits
CREATE POLICY "Admins can view all rate limits"
  ON upload_rate_limits FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert rate limits"
  ON upload_rate_limits FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update rate limits"
  ON upload_rate_limits FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas RLS para photo_hashes
CREATE POLICY "Admins can view all photo hashes"
  ON photo_hashes FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert photo hashes"
  ON photo_hashes FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Función para verificar límites de upload
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
  
  -- Obtener o crear registro de rate limit
  SELECT id, uploads_count, window_start 
  INTO v_record_id, v_uploads_in_window, v_window_start
  FROM upload_rate_limits
  WHERE event_id = p_event_id 
    AND uploader_name = p_uploader_name
    AND window_start > (v_current_window - (v_window_minutes || ' minutes')::interval)
  ORDER BY window_start DESC
  LIMIT 1;
  
  -- Contar total de uploads del usuario en este evento
  SELECT COUNT(*)::integer INTO v_total_uploads
  FROM photos
  WHERE event_id = p_event_id 
    AND uploader_name = p_uploader_name;
  
  -- Verificar límite total
  IF v_total_uploads >= v_total_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'total_limit_exceeded',
      'total_uploads', v_total_uploads,
      'total_limit', v_total_limit,
      'message', 'Has alcanzado el límite máximo de ' || v_total_limit || ' fotos para este evento'
    );
  END IF;
  
  -- Si no hay registro o la ventana expiró, crear nueva ventana
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
  
  -- Verificar rate limit
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
  
  -- Todo bien, permitir upload
  RETURN jsonb_build_object(
    'allowed', true,
    'uploads_in_window', v_uploads_in_window,
    'total_uploads', v_total_uploads,
    'rate_limit', v_rate_limit,
    'window_minutes', v_window_minutes
  );
END;
$$;

-- Función para incrementar contador de uploads
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
  
  -- Incrementar contador en ventana actual o crear nueva
  INSERT INTO upload_rate_limits (event_id, uploader_name, uploads_count, window_start)
  VALUES (p_event_id, p_uploader_name, 1, v_current_window)
  ON CONFLICT (id) DO NOTHING;
  
  -- Actualizar contador si existe registro reciente
  UPDATE upload_rate_limits
  SET uploads_count = uploads_count + 1,
      updated_at = now()
  WHERE event_id = p_event_id
    AND uploader_name = p_uploader_name
    AND window_start > (v_current_window - (v_window_minutes || ' minutes')::interval);
END;
$$;

-- Función para verificar foto duplicada
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

-- Trigger para actualizar updated_at en upload_rate_limits
DROP TRIGGER IF EXISTS update_upload_rate_limits_updated_at ON upload_rate_limits;
CREATE TRIGGER update_upload_rate_limits_updated_at
  BEFORE UPDATE ON upload_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE upload_rate_limits IS 'Trackea uploads por usuario/evento para rate limiting';
COMMENT ON TABLE photo_hashes IS 'Almacena hashes MD5 de fotos para detección de duplicados';
COMMENT ON FUNCTION check_upload_limits IS 'Verifica si un uploader puede subir más fotos basado en rate limits y límites totales';
COMMENT ON FUNCTION increment_upload_count IS 'Incrementa el contador de uploads para un usuario en una ventana de tiempo';
COMMENT ON FUNCTION check_duplicate_photo IS 'Verifica si un archivo ya fue subido al evento basado en su hash MD5';
