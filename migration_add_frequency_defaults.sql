
-- MIGRACIÓN PARA AÑADIR VALORES DEFAULT A CAMPOS DE FRECUENCIA
-- Esto previene el error "uncontrolled to controlled" en los formularios de React
-- al asegurar que los campos numéricos y de array nunca sean NULL.

-- 1. Añadir DEFAULT al intervalo de frecuencia.
ALTER TABLE public.habit_tasks
ALTER COLUMN frequency_interval SET DEFAULT 1;

-- 2. Añadir DEFAULT al día del mes.
ALTER TABLE public.habit_tasks
ALTER COLUMN frequency_day_of_month SET DEFAULT 1;

-- 3. Añadir DEFAULT a los días de la semana (como array vacío).
ALTER TABLE public.habit_tasks
ALTER COLUMN frequency_days SET DEFAULT '{}'::text[];

-- Opcional: Actualizar los valores NULL existentes en la tabla para que coincidan con los nuevos defaults.
UPDATE public.habit_tasks
SET 
    frequency_interval = COALESCE(frequency_interval, 1),
    frequency_day_of_month = COALESCE(frequency_day_of_month, 1),
    frequency_days = COALESCE(frequency_days, '{}'::text[])
WHERE 
    frequency_interval IS NULL OR 
    frequency_day_of_month IS NULL OR 
    frequency_days IS NULL;

RAISE NOTICE 'Valores DEFAULT añadidos y registros existentes actualizados en la tabla habit_tasks.';
