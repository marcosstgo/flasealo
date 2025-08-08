/*
  # Agregar campo uploader_name a la tabla photos

  1. Cambios
    - Agregar columna `uploader_name` a la tabla `photos`
    - La columna será opcional (nullable) para mantener compatibilidad con fotos existentes
    - Agregar índice para búsquedas por nombre del usuario que subió la foto

  2. Notas
    - Este campo almacenará el nombre que ingresa el usuario al subir fotos
    - No requiere autenticación, solo el nombre proporcionado voluntariamente
    - Útil para identificar quién subió cada foto en el panel de administración
*/

-- Agregar columna uploader_name a la tabla photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'photos' AND column_name = 'uploader_name'
  ) THEN
    ALTER TABLE photos ADD COLUMN uploader_name text;
  END IF;
END $$;

-- Agregar índice para búsquedas por uploader_name
CREATE INDEX IF NOT EXISTS photos_uploader_name_idx ON photos(uploader_name);

-- Agregar comentario a la columna
COMMENT ON COLUMN photos.uploader_name IS 'Nombre proporcionado por el usuario al subir la foto (sin autenticación)';