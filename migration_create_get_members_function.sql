-- MIGRACIÓN PARA CREAR UNA FUNCIÓN QUE OBTIENE MIEMBROS DE UN GRUPO (SINTAXIS CORREGIDA)
-- Esto soluciona el error PGRST200 y el error de tipo de dato 42804.

CREATE OR REPLACE FUNCTION public.get_group_members_with_details(p_group_id UUID)
RETURNS TABLE (id UUID, email TEXT, role TEXT, avatar_url TEXT, full_name TEXT)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text, -- CAST explícito para corregir el mismatch de tipo de dato
    gm.role,
    u.raw_user_meta_data->>'avatar_url' AS avatar_url,
    u.raw_user_meta_data->>'full_name' AS full_name
  FROM
    public.group_members AS gm
  JOIN
    auth.users AS u ON gm.user_id = u.id
  WHERE
    gm.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

RAISE NOTICE 'Función get_group_members_with_details creada/actualizada exitosamente.';