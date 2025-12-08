
-- MIGRACIÓN PARA CONFIGURAR LA LOCALIZACIÓN DE TIEMPO DE LA BASE DE DATOS
-- Esto ayuda a prevenir errores de "hydration mismatch" asegurando que la base de datos
-- y la aplicación hablen el mismo idioma para las fechas.

-- NOTA: Necesitas permisos de administrador para ejecutar este comando.

ALTER DATABASE postgres SET lc_time = 'es_ES.UTF-8';

RAISE NOTICE 'Configuración de lc_time de la base de datos actualizada a es_ES.UTF-8. Por favor, reinicia las conexiones a la base de datos para que el cambio surta efecto.';
