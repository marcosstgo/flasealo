/*
  # Corrección de Problemas de Seguridad

  ## Problema: Function Search Path Mutable
  
  Las funciones con `SECURITY DEFINER` deben tener un `search_path` fijo para prevenir
  ataques de escalación de privilegios. Sin un search_path fijo, un atacante podría
  crear objetos maliciosos en otros schemas que podrían ser ejecutados con privilegios
  elevados.
  
  ## Solución
  
  Agregar `SET search_path = public, pg_temp` a todas las funciones `SECURITY DEFINER`:
  - `is_admin()`
  - `get_user_role()`
  - `handle_new_user()`
  - `can_create_events()`
  - `check_user_setup()`
  - `get_user_info()`
  
  La función `update_updated_at_column()` no tiene `SECURITY DEFINER` pero se le
  agrega search_path por buena práctica.

  ## Referencias
  - https://www.postgresql.org/docs/current/sql-createfunction.html
  - https://wiki.postgresql.org/wiki/A_Guide_to_CVE-2018-1058%3A_Protect_Your_Search_Path
*/

-- Actualizar función is_admin con search_path fijo
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
  
  -- Si no existe, crear registro por defecto
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN false;
  END IF;
  
  RETURN COALESCE(user_role, 'user') = 'admin';
END;
$$;

-- Actualizar función get_user_role con search_path fijo
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
  
  -- Si no existe, crear registro por defecto
  IF user_role IS NULL THEN
    INSERT INTO user_roles (user_id, role) VALUES (user_uuid, 'user')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN 'user';
  END IF;
  
  RETURN COALESCE(user_role, 'user');
END;
$$;

-- Actualizar función can_create_events con search_path fijo
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

-- Actualizar función handle_new_user con search_path fijo
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
$$;

-- Actualizar función check_user_setup con search_path fijo
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
$$;

-- Actualizar función get_user_info con search_path fijo
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
$$;

-- Actualizar función update_updated_at_column con search_path fijo (buena práctica)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger 
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Agregar comentarios explicativos
COMMENT ON FUNCTION is_admin IS 'Verifica si un usuario es administrador. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
COMMENT ON FUNCTION get_user_role IS 'Obtiene el rol del usuario. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
COMMENT ON FUNCTION can_create_events IS 'Verifica si un usuario puede crear eventos. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
COMMENT ON FUNCTION handle_new_user IS 'Trigger para inicializar nuevos usuarios. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
COMMENT ON FUNCTION check_user_setup IS 'Verifica y corrige la configuración de usuario. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
COMMENT ON FUNCTION get_user_info IS 'Obtiene información completa del usuario. SECURITY DEFINER con search_path fijo para prevenir ataques de escalación de privilegios.';
