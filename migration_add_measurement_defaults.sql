
-- MIGRACIÓN PARA AÑADIR VALORES DEFAULT A CAMPOS DE MEDICIÓN
-- Esto previene el error "uncontrolled to controlled" en los formularios de React
-- al asegurar que los campos de medición nunca sean NULL.

-- 1. Añadir DEFAULT al tipo de medición.
ALTER TABLE public.habit_tasks
ALTER COLUMN measurement_type SET DEFAULT 'binary';

-- 2. Añadir DEFAULT al objetivo de medición (como JSON vacío).
ALTER TABLE public.habit_tasks
ALTER COLUMN measurement_goal SET DEFAULT '{}'::jsonb;

-- 3. Actualizar los valores NULL existentes en la tabla para que coincidan con los nuevos defaults.
UPDATE public.habit_tasks
SET 
    measurement_type = COALESCE(measurement_type, 'binary'),
    measurement_goal = COALESCE(measurement_goal, '{}'::jsonb)
WHERE 
    measurement_type IS NULL OR 
    measurement_goal IS NULL;

RAISE NOTICE 'Valores DEFAULT añadidos y registros existentes actualizados para los campos de medición en habit_tasks.';
