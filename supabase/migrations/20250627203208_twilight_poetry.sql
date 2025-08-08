/*
  # Crear políticas de Storage para el bucket event-photos

  1. Políticas de Storage
    - Permitir a cualquiera subir fotos al bucket event-photos
    - Permitir a cualquiera ver fotos del bucket event-photos
    - Permitir a propietarios de eventos eliminar fotos

  2. Notas
    - El bucket event-photos ya existe
    - Solo creamos las políticas necesarias
*/

-- Eliminar políticas existentes si existen (para evitar duplicados)
DROP POLICY IF EXISTS "Anyone can upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view photos" ON storage.objects;
DROP POLICY IF EXISTS "Event owners can delete photos" ON storage.objects;

-- Política para subir archivos (INSERT) - cualquiera puede subir
CREATE POLICY "Anyone can upload photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'event-photos');

-- Política para ver archivos (SELECT) - cualquiera puede ver
CREATE POLICY "Anyone can view photos" ON storage.objects
FOR SELECT USING (bucket_id = 'event-photos');

-- Política para eliminar archivos (DELETE) - solo propietarios de eventos
CREATE POLICY "Event owners can delete photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'event-photos' AND
  auth.uid() IN (
    SELECT user_id FROM events 
    WHERE id = (
      SELECT event_id FROM photos 
      WHERE image_path = name
    )
  )
);