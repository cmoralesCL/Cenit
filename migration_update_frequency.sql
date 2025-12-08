
-- MIGRACIÓN PARA ACTUALIZAR LA RESTRICCIÓN DE FRECUENCIA
-- Este script alinea el CHECK de la base de datos con los valores esperados por el código de la aplicación.

-- Paso 1: Eliminar la restricción de CHECK existente en la columna 'frequency'.
-- El nombre 'habit_tasks_frequency_check' es el nombre por defecto que Supabase suele asignar.
-- Si recibes un error de que la restricción no existe, búsca el nombre correcto en la configuración de tu tabla en Supabase y reemplázalo aquí.
ALTER TABLE public.habit_tasks
DROP CONSTRAINT habit_tasks_frequency_check;

-- Paso 2: Agregar la nueva restricción de CHECK con los valores en español.
ALTER TABLE public.habit_tasks
ADD CONSTRAINT habit_tasks_frequency_check CHECK (frequency = ANY (ARRAY[
    'DIARIA'::text,
    'SEMANAL_DIAS_FIJOS'::text,
    'INTERVALO_DIAS'::text,
    'INTERVALO_SEMANAL_DIAS_FIJOS'::text,
    'MENSUAL_DIA_FIJO'::text,
    'INTERVALO_MENSUAL_DIA_FIJO'::text,
    'ANUAL_FECHA_FIJA'::text,
    'UNICA'::text,
    -- Frecuencias para compromisos acumulativos
    'SEMANAL_ACUMULATIVO'::text,
    'MENSUAL_ACUMULATIVO'::text,
    'TRIMESTRAL_ACUMULATIVO'::text,
    'SEMANAL_ACUMULATIVO_RECURRENTE'::text,
    'MENSUAL_ACUMULATIVO_RECURRENTE'::text
]));

RAISE NOTICE '¡Migración de la restricción de frecuencia completada exitosamente!';
