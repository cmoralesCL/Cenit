
-- MIGRACIÓN PARA ARREGLAR LA CREACIÓN DE GRUPOS
-- Crea un trigger que automáticamente añade al creador de un grupo como miembro.

-- 1. Crear la función del Trigger
-- Esta función se ejecutará automáticamente después de una inserción en la tabla 'groups'.
CREATE OR REPLACE FUNCTION public.add_owner_to_group_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserta una fila en group_members, estableciendo al creador (owner_id) como miembro con el rol de 'owner'.
  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear el Trigger
-- Este trigger llama a la función anterior DESPUÉS de que se inserte cada nueva fila en 'public.groups'.
-- Primero, se elimina por si ya existía una versión anterior.
DROP TRIGGER IF EXISTS trigger_add_owner_after_group_creation ON public.groups;
CREATE TRIGGER trigger_add_owner_after_group_creation
  AFTER INSERT ON public.groups
  FOR EACH ROW EXECUTE FUNCTION public.add_owner_to_group_members();

RAISE NOTICE 'Trigger para la creación de grupos creado/actualizado exitosamente.';

-- 3. (Opcional pero recomendado) Reparar grupos existentes
-- Este comando inserta las membresías faltantes para los dueños de grupos que ya fueron creados.
RAISE NOTICE 'Reparando membresías de grupos existentes...';
INSERT INTO public.group_members (group_id, user_id, role)
SELECT id, owner_id, 'owner'
FROM public.groups g
WHERE NOT EXISTS (
    SELECT 1
    FROM public.group_members gm
    WHERE gm.group_id = g.id AND gm.user_id = g.owner_id
);
RAISE NOTICE 'Reparación completada.';
