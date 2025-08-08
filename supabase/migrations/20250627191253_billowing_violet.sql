/*
  # Arreglar sistema de registro de usuarios

  1. Verificar y arreglar función handle_new_user
  2. Asegurar que el trigger funcione correctamente
  3. Agregar función de subscripción automática
  4. Mejorar manejo de errores

  Este migration asegura que:
  - Los nuevos usuarios obtengan automáticamente un rol 'user'
  - Se cree una suscripción 'free' por defecto
  - Los triggers funcionen correctamente
*/

-- Recrear la función handle_new_user con mejor manejo de errores
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insertar rol de usuario
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
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

-- Eliminar trigger existente si existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crear nuevo trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Función para verificar la configuración del usuario
CREATE OR REPLACE FUNCTION check_user_setup(user_uuid uuid)
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  has_role boolean;
  has_subscription boolean;
BEGIN
  -- Verificar si el usuario tiene rol
  SELECT EXISTS(SELECT 1 FROM user_roles WHERE user_id = user_uuid) INTO has_role;
  
  -- Verificar si el usuario tiene suscripción
  SELECT EXISTS(SELECT 1 FROM subscriptions WHERE user_id = user_uuid) INTO has_subscription;
  
  -- Si falta algo, crearlo
  IF NOT has_role THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  IF NOT has_subscription THEN
    INSERT INTO subscriptions (user_id, plan, custom_branding) 
    VALUES (user_uuid, 'free', '{}')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  -- Devolver estado
  result := jsonb_build_object(
    'user_id', user_uuid,
    'has_role', has_role,
    'has_subscription', has_subscription,
    'fixed', NOT has_role OR NOT has_subscription
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener información completa del usuario
CREATE OR REPLACE FUNCTION get_user_info(user_uuid uuid DEFAULT auth.uid())
RETURNS jsonb AS $$
DECLARE
  result jsonb;
  user_role text;
  user_plan text;
BEGIN
  -- Obtener rol del usuario
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  
  -- Obtener plan del usuario
  SELECT plan INTO user_plan FROM subscriptions WHERE user_id = user_uuid;
  
  -- Si no existe, crear registros por defecto
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función get_user_role para usar la nueva función
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  
  -- Si no existe, crear registro por defecto
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 'user';
  END IF;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar función is_admin para usar la nueva función
CREATE OR REPLACE FUNCTION is_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role FROM user_roles WHERE user_id = user_uuid;
  
  -- Si no existe, crear registro por defecto
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN false;
  END IF;
  
  RETURN COALESCE(user_role, 'user') = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;