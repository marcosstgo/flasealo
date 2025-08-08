/*
  # Agregar control de descarga de fotos

  1. Cambios
    - Agregar columna `allow_downloads` a la tabla `events`
    - La columna será boolean con valor por defecto `true`
    - Esto permite controlar si los visitantes pueden descargar fotos de la galería

  2. Notas
    - Por defecto los eventos permitirán descargas (backward compatibility)
    - Los organizadores podrán cambiar esta configuración desde el panel de control
*/

-- Agregar columna allow_downloads a la tabla events
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