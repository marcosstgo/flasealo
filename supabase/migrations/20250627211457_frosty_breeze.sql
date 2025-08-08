/*
  # Control de creación de eventos

  1. Cambios en la tabla user_roles
    - Agregar columna `can_create_event` (boolean, default false)
    - Solo usuarios autorizados por admin pueden crear eventos

  2. Actualizar políticas RLS
    - Modificar política de INSERT en events para verificar permisos
    - Solo admins o usuarios con can_create_event=true pueden crear eventos

  3. Actualizar función handle_new_user
    - Nuevos usuarios tendrán can_create_event=false por defecto
*/

-- Agregar columna can_create_event a la tabla user_roles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_roles' AND column_name = 'can_create_event'
  ) THEN
    ALTER TABLE user_roles ADD COLUMN can_create_event boolean DEFAULT false;
  END IF;
END $$;

-- Actualizar usuarios existentes para que no puedan crear eventos por defecto
UPDATE user_roles SET can_create_event = false WHERE can_create_event IS NULL;

-- Agregar comentario a la columna
COMMENT ON COLUMN user_roles.can_create_event IS 'Indica si el usuario tiene permiso para crear eventos';

-- Actualizar la función handle_new_user para incluir can_create_event
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar rol de usuario con can_create_event=false por defecto
  INSERT INTO public.user_roles (user_id, role, can_create_event)
  VALUES (NEW.id, 'user', false)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Insertar suscripción por defecto
  INSERT INTO public.subscriptions (user_id, plan, custom_branding)
  VALUES (NEW.id, 'free', '{}')
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log el error pero no fallar el registro
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario puede crear eventos
CREATE OR REPLACE FUNCTION can_create_events(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = user_uuid 
    AND (role = 'admin' OR can_create_event = true)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar política de creación de eventos
DROP POLICY IF EXISTS "Users can create their own events" ON events;
CREATE POLICY "Users can create their own events"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND can_create_events());

-- Política para que admins puedan gestionar permisos de creación de eventos
CREATE POLICY "Admins can update event creation permissions"
  ON user_roles
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());