/*
  # Control de descarga de fotos

  1. Cambios
    - Agregar columna `allow_downloads` a la tabla `events`
    - Por defecto permite descargas (true) para mantener compatibilidad
    - Los administradores y propietarios pueden controlar esta configuración

  2. Funcionalidad
    - Cuando `allow_downloads` es false, no se muestran botones de descarga
    - Se muestra un indicador visual en la galería
    - Los propietarios pueden cambiar esta configuración desde el panel de gestión
*/

-- Agregar columna allow_downloads a la tabla events si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'allow_downloads'
  ) THEN
    ALTER TABLE events ADD COLUMN allow_downloads boolean DEFAULT true;
  END IF;
END $$;

-- Agregar comentario a la columna
COMMENT ON COLUMN events.allow_downloads IS 'Controla si los visitantes pueden descargar fotos de la galería del evento';

-- Actualizar eventos existentes para permitir descargas por defecto
UPDATE events SET allow_downloads = true WHERE allow_downloads IS NULL;