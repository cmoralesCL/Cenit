
-- MIGRACIÓN PARA PERMITIR LA BÚSQUEDA DE USUARIOS PARA INVITACIONES
-- Crea una política de RLS que permite a los usuarios autenticados leer la tabla auth.users.

-- 1. Asegurarse de que RLS está habilitado en la tabla auth.users.
-- Supabase generalmente hace esto por defecto, pero es bueno confirmarlo.
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 2. Crear la política de lectura.
-- Primero, se elimina por si ya existía una versión anterior con el mismo nombre.
DROP POLICY IF EXISTS "Allow authenticated users to read all users" ON auth.users;

-- Esta política permite a cualquier usuario con el rol 'authenticated' realizar una operación SELECT sobre la tabla auth.users.
-- La condición `USING (true)` significa que la política se aplica a todas las filas sin restricciones de lectura.
CREATE POLICY "Allow authenticated users to read all users"
  ON auth.users
  FOR SELECT
  TO authenticated
  USING (true);

RAISE NOTICE 'Política de RLS creada exitosamente. Los usuarios ahora pueden ser listados para invitaciones.';
