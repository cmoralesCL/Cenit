
-- SEED SCRIPT CON DATOS SIMULADOS (VERSIÓN FINAL + COMPROMISOS)
-- User UID: 981e6c8d-a5f6-4400-95c4-dfb516afc9b4
-- Ejecutar DESPUÉS de la migración 'migration_update_frequency.sql'

DO $$
DECLARE
    -- CONFIGURACIÓN
    v_user_id UUID := '981e6c8d-a5f6-4400-95c4-dfb516afc9b4';
    v_start_date DATE := '2025-04-01';
    v_end_date DATE := '2025-12-12';
    v_progress_end_date DATE := '2025-10-24';

    -- IDs de Órbitas (life_prks)
    orbit_salud_id UUID := gen_random_uuid();
    orbit_profesional_id UUID := gen_random_uuid();
    orbit_finanzas_id UUID := gen_random_uuid();

    -- IDs de Fases (area_prks)
    phase_fisico_id UUID := gen_random_uuid();
    phase_mental_id UUID := gen_random_uuid();
    phase_habilidades_id UUID := gen_random_uuid();
    phase_networking_id UUID := gen_random_uuid(); -- Nueva fase para compromisos
    phase_ahorro_id UUID := gen_random_uuid();

    -- IDs de Pulsos (habit_tasks)
    pulse_ejercicio_id UUID := gen_random_uuid();
    pulse_agua_id UUID := gen_random_uuid();
    pulse_meditar_id UUID := gen_random_uuid();
    pulse_leer_id UUID := gen_random_uuid();
    pulse_curso_ia_id UUID := gen_random_uuid();
    pulse_ahorrar_mes_id UUID := gen_random_uuid();
    pulse_revisar_gastos_id UUID := gen_random_uuid();
    task_declaracion_id UUID := gen_random_uuid();

    -- IDs para Compromisos
    commitment_clientes_id UUID := gen_random_uuid();
    commitment_blog_id UUID := gen_random_uuid();

    -- Variables para el bucle
    v_current_loop_date DATE;
    day_of_week_num INT;

BEGIN
    -- 1. LIMPIEZA DE DATOS ANTERIORES PARA EL USUARIO
    RAISE NOTICE 'Limpiando datos antiguos para el usuario: %...', v_user_id;
    DELETE FROM public.progress_logs WHERE user_id = v_user_id;
    DELETE FROM public.habit_task_area_prk_links WHERE habit_task_id IN (SELECT id FROM public.habit_tasks WHERE user_id = v_user_id);
    DELETE FROM public.habit_tasks WHERE user_id = v_user_id;
    DELETE FROM public.area_prks WHERE user_id = v_user_id;
    DELETE FROM public.life_prks WHERE user_id = v_user_id;
    RAISE NOTICE 'Limpieza completada.';

    -- 2. INSERTAR ÓRBITAS (life_prks)
    RAISE NOTICE 'Insertando Órbitas...';
    INSERT INTO public.life_prks (id, user_id, title, description, color_theme) VALUES
    (orbit_salud_id, v_user_id, 'Salud Integral', 'Bienestar físico y mental.', 'mint'),
    (orbit_profesional_id, v_user_id, 'Desarrollo de Carrera', 'Crecer profesionalmente y adquirir nuevas habilidades.', 'sapphire'),
    (orbit_finanzas_id, v_user_id, 'Salud Financiera', 'Organizar finanzas, ahorrar e invertir.', 'solar');

    -- 3. INSERTAR FASES (area_prks)
    RAISE NOTICE 'Insertando Fases...';
    INSERT INTO public.area_prks (id, user_id, life_prk_id, title, description) VALUES
    (phase_fisico_id, v_user_id, orbit_salud_id, 'Condición Física', 'Mejorar la resistencia y fuerza.'),
    (phase_mental_id, v_user_id, orbit_salud_id, 'Claridad Mental', 'Reducir el estrés y mejorar el enfoque.'),
    (phase_habilidades_id, v_user_id, orbit_profesional_id, 'Nuevas Habilidades', 'Aprender tecnologías con alta demanda.'),
    (phase_networking_id, v_user_id, orbit_profesional_id, 'Networking y Marca Personal', 'Expandir red de contactos y crear contenido.'),
    (phase_ahorro_id, v_user_id, orbit_finanzas_id, 'Ahorro e Inversión', 'Crear un fondo para el futuro.');

    -- 4. INSERTAR PULSOS, TAREAS Y COMPROMISOS (habit_tasks)
    RAISE NOTICE 'Insertando Pulsos, Tareas y Compromisos...';
    INSERT INTO public.habit_tasks (id, user_id, title, type, frequency, frequency_days, frequency_day_of_month, start_date, due_date, description, measurement_type, measurement_goal) VALUES
    -- Hábitos Diarios y de Días Fijos
    (pulse_ejercicio_id, v_user_id, 'Hacer 30 min de cardio', 'habit', 'SEMANAL_DIAS_FIJOS', '{"L", "X", "V"}', NULL, v_start_date, v_end_date, 'Correr o usar la elíptica.', 'binary', NULL),
    (pulse_agua_id, v_user_id, 'Beber 2 litros de agua', 'habit', 'DIARIA', NULL, NULL, v_start_date, v_end_date, 'Mantenerse hidratado durante el día.', 'binary', NULL),
    (pulse_meditar_id, v_user_id, 'Meditar por 10 minutos', 'habit', 'DIARIA', NULL, NULL, v_start_date, v_end_date, 'Usar una app de meditación guiada.', 'binary', NULL),
    (pulse_leer_id, v_user_id, 'Leer 15 páginas de un libro', 'habit', 'DIARIA', NULL, NULL, v_start_date, v_end_date, 'Fomentar el hábito de la lectura.', 'binary', NULL),
    (pulse_curso_ia_id, v_user_id, 'Estudiar curso de IA', 'habit', 'SEMANAL_DIAS_FIJOS', '{"M", "J"}', NULL, v_start_date, v_end_date, 'Dedicarse al curso de Inteligencia Artificial.', 'binary', NULL),
    (pulse_ahorrar_mes_id, v_user_id, 'Ahorrar 10% del ingreso', 'habit', 'MENSUAL_DIA_FIJO', NULL, 1, v_start_date, v_end_date, 'Transferir a la cuenta de ahorros el día 1 de cada mes.', 'binary', NULL),
    (pulse_revisar_gastos_id, v_user_id, 'Revisar gastos semanales', 'habit', 'SEMANAL_DIAS_FIJOS', '{"D"}', NULL, v_start_date, v_end_date, 'Categorizar gastos de la semana.', 'binary', NULL),
    -- Tarea Única
    (task_declaracion_id, v_user_id, 'Preparar declaración de impuestos', 'task', 'UNICA', NULL, NULL, '2025-04-01', '2025-04-30', 'Reunir todos los documentos necesarios.', 'binary', NULL),
    -- Compromisos Acumulativos
    (commitment_clientes_id, v_user_id, 'Contactar clientes potenciales', 'habit', 'SEMANAL_ACUMULATIVO', NULL, NULL, v_start_date, v_end_date, 'Llamar o enviar correo a nuevos prospectos.', 'quantitative', '{"target_count": 3}'),
    (commitment_blog_id, v_user_id, 'Escribir artículos para el blog', 'habit', 'MENSUAL_ACUMULATIVO', NULL, NULL, v_start_date, v_end_date, 'Crear contenido de valor para la marca personal.', 'quantitative', '{"target_count": 2}');

    -- 5. VINCULAR PULSOS A FASES
    RAISE NOTICE 'Vinculando Pulsos a Fases...';
    INSERT INTO public.habit_task_area_prk_links (habit_task_id, area_prk_id) VALUES
    (pulse_ejercicio_id, phase_fisico_id),
    (pulse_agua_id, phase_fisico_id),
    (pulse_meditar_id, phase_mental_id),
    (pulse_leer_id, phase_mental_id),
    (pulse_curso_ia_id, phase_habilidades_id),
    (commitment_clientes_id, phase_networking_id),
    (commitment_blog_id, phase_networking_id),
    (pulse_ahorrar_mes_id, phase_ahorro_id),
    (pulse_revisar_gastos_id, phase_ahorro_id),
    (task_declaracion_id, phase_ahorro_id);

    -- 6. SIMULACIÓN DE CUMPLIMIENTO DE HÁBITOS Y COMPROMISOS
    RAISE NOTICE 'Iniciando simulación de progreso desde % hasta %...', v_start_date, v_progress_end_date;
    v_current_loop_date := v_start_date;
    WHILE v_current_loop_date <= v_progress_end_date LOOP
        day_of_week_num := EXTRACT(DOW FROM v_current_loop_date);

        -- Simulación para hábitos diarios (70% de probabilidad)
        IF random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_agua_id, v_current_loop_date, 1); END IF;
        IF random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_meditar_id, v_current_loop_date, 1); END IF;
        IF random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_leer_id, v_current_loop_date, 1); END IF;

        -- Simulación para hábitos de días fijos
        IF day_of_week_num IN (1, 3, 5) AND random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_ejercicio_id, v_current_loop_date, 1); END IF;
        IF day_of_week_num IN (2, 4) AND random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_curso_ia_id, v_current_loop_date, 1); END IF;
        IF day_of_week_num = 0 AND random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_revisar_gastos_id, v_current_loop_date, 1); END IF;
        IF EXTRACT(DAY FROM v_current_loop_date) = 1 AND random() < 0.7 THEN INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, pulse_ahorrar_mes_id, v_current_loop_date, 1); END IF;

        -- Simulación para Compromiso Semanal (Contactar 3 clientes)
        -- Se simula 1 contacto en 3 días aleatorios de la semana
        IF day_of_week_num IN (1, 3, 5) AND random() < 0.65 THEN
             INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, commitment_clientes_id, v_current_loop_date, 1);
        END IF;

        -- Simulación para Compromiso Mensual (Escribir 2 artículos)
        -- Se simula 1 artículo en 2 días aleatorios del mes (ej. dias 10 y 20)
        IF EXTRACT(DAY FROM v_current_loop_date) IN (10, 20) AND random() < 0.8 THEN
            INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, commitment_blog_id, v_current_loop_date, 1);
        END IF;

        v_current_loop_date := v_current_loop_date + INTERVAL '1 day';
    END LOOP;

    -- Simulación de completado para la tarea
    IF v_progress_end_date >= '2025-04-28' THEN
        INSERT INTO public.progress_logs (user_id, habit_task_id, completion_date, progress_value) VALUES (v_user_id, task_declaracion_id, '2025-04-28', 1);
        UPDATE public.habit_tasks SET completion_date = '2025-04-28' WHERE id = task_declaracion_id;
    END IF;

    RAISE NOTICE 'Simulación completada exitosamente.';

END $$;
