-- 023_fix_handle_new_user_email.sql
--
-- Dos bugs reales encontrados en producción el 2026-07-17 al intentar crear
-- una cuenta super_admin (paulinho4835@gmail.com):
--
-- 1) perfiles.email existe en producción (agregada fuera de las migraciones
--    del repo, drift de schema) pero handle_new_user() no la rellenaba.
--
-- 2) handle_new_user() no tenía `search_path` fijado. Cuando el trigger
--    corre disparado por el servicio de Auth (GoTrue), el search_path de esa
--    sesión NO incluye `public`, así que la referencia sin calificar a
--    `perfiles` fallaba con "relation perfiles does not exist" (42P01) y
--    abortaba la transacción completa. Esto rompía el alta de CUALQUIER
--    usuario nuevo en producción (auth.signUp o auth.admin.createUser),
--    no solo este caso puntual.
--
-- Fix: calificar la tabla como public.perfiles y fijar SET search_path =
-- public en la función, que es la práctica recomendada por Supabase para
-- toda función SECURITY DEFINER (evita también el warning de seguridad
-- "Function Search Path Mutable").

ALTER TABLE perfiles ADD COLUMN IF NOT EXISTS email text;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, rol, nombre, email)
  VALUES (
    NEW.id,
    'vendedor',
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;
