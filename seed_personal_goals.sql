
-- SEED SCRIPT FOR PERSONAL GOALS
-- User UID: c7ac3d0c-35fb-4ad6-95b7-228338c9fc16

DO $$
DECLARE
    user_id UUID := '981e6c8d-a5f6-4400-95c4-dfb516afc9b4';
    
    -- Orbit UUIDs
    orbit_salud_id UUID := gen_random_uuid();
    orbit_profesional_id UUID := gen_random_uuid();
    orbit_finanzas_id UUID := gen_random_uuid();
    orbit_crecimiento_id UUID := gen_random_uuid();
    orbit_ocio_id UUID := gen_random_uuid();

    -- Phase UUIDs
    phase_fisico_id UUID := gen_random_uuid();
    phase_alimentacion_id UUID := gen_random_uuid();
    phase_habilidad_id UUID := gen_random_uuid();
    phase_networking_id UUID := gen_random_uuid();
    phase_ahorro_id UUID := gen_random_uuid();
    phase_deudas_id UUID := gen_random_uuid();
    phase_lectura_id UUID := gen_random_uuid();
    phase_mindfulness_id UUID := gen_random_uuid();
    phase_hobbies_id UUID := gen_random_uuid();
    phase_relaciones_id UUID := gen_random_uuid();

    -- Pulse/Task UUIDs
    pulse_ejercicio_id UUID := gen_random_uuid();
    pulse_agua_id UUID := gen_random_uuid();
    pulse_planificar_comida_id UUID := gen_random_uuid();
    pulse_azucar_id UUID := gen_random_uuid();
    pulse_curso_python_id UUID := gen_random_uuid();
    pulse_estudiar_diario_id UUID := gen_random_uuid();
    pulse_networking_evento_id UUID := gen_random_uuid();
    pulse_linkedin_id UUID := gen_random_uuid();
    pulse_ahorrar_salario_id UUID := gen_random_uuid();
    pulse_investigar_fondos_id UUID := gen_random_uuid();
    pulse_pagar_tarjeta_id UUID := gen_random_uuid();
    pulse_crear_presupuesto_id UUID := gen_random_uuid();
    pulse_leer_libro_mes_id UUID := gen_random_uuid();
    pulse_leer_20_pag_id UUID := gen_random_uuid();
    pulse_meditar_id UUID := gen_random_uuid();
    pulse_diario_id UUID := gen_random_uuid();
    pulse_practicar_guitarra_id UUID := gen_random_uuid();
    pulse_planear_viaje_id UUID := gen_random_uuid();
    pulse_llamar_familiar_id UUID := gen_random_uuid();
    pulse_organizar_cena_id UUID := gen_random_uuid();

BEGIN

-- 1. INSERT ORBITS (life_prks)
INSERT INTO public.life_prks (id, user_id, title, description, color_theme) VALUES
(orbit_salud_id, user_id, 'Salud y Bienestar', 'Mejorar mi salud física y mental.', 'green'),
(orbit_profesional_id, user_id, 'Desarrollo Profesional', 'Crecer en mi carrera y adquirir nuevas habilidades.', 'blue'),
(orbit_finanzas_id, user_id, 'Finanzas Personales', 'Organizar mis finanzas, ahorrar e invertir.', 'yellow'),
(orbit_crecimiento_id, user_id, 'Crecimiento Personal', 'Fomentar hábitos de aprendizaje y autoconocimiento.', 'purple'),
(orbit_ocio_id, user_id, 'Ocio y Relaciones', 'Disfrutar de mis hobbies y fortalecer mis relaciones personales.', 'pink');

-- 2. INSERT PHASES (area_prks)
INSERT INTO public.area_prks (id, user_id, life_prk_id, title, description) VALUES
-- Salud y Bienestar
(phase_fisico_id, user_id, orbit_salud_id, 'Mejorar Condición Física', 'Ser más activo y fuerte.'),
(phase_alimentacion_id, user_id, orbit_salud_id, 'Alimentación Saludable', 'Comer de forma más balanceada y consciente.'),
-- Desarrollo Profesional
(phase_habilidad_id, user_id, orbit_profesional_id, 'Aprender una Nueva Habilidad', 'Adquirir conocimientos en un área nueva.'),
(phase_networking_id, user_id, orbit_profesional_id, 'Expandir Red de Contactos', 'Conectar con profesionales de mi sector.'),
-- Finanzas Personales
(phase_ahorro_id, user_id, orbit_finanzas_id, 'Ahorrar e Invertir', 'Aumentar mi capital y ponerlo a trabajar.'),
(phase_deudas_id, user_id, orbit_finanzas_id, 'Reducir Deudas', 'Pagar deudas pendientes para tener más libertad financiera.'),
-- Crecimiento Personal
(phase_lectura_id, user_id, orbit_crecimiento_id, 'Fomentar la Lectura', 'Leer más libros de forma consistente.'),
(phase_mindfulness_id, user_id, orbit_crecimiento_id, 'Practicar Mindfulness', 'Estar más presente y reducir el estrés.'),
-- Ocio y Relaciones
(phase_hobbies_id, user_id, orbit_ocio_id, 'Dedicar Tiempo a Hobbies', 'Disfrutar de actividades que me apasionan.'),
(phase_relaciones_id, user_id, orbit_ocio_id, 'Fortalecer Relaciones', 'Cuidar los vínculos con familia y amigos.');

-- 3. INSERT PULSES/TASKS (habit_tasks)
INSERT INTO public.habit_tasks (id, user_id, title, type, frequency, frequency_days, start_date) VALUES
-- Físico
(pulse_ejercicio_id, user_id, 'Hacer ejercicio', 'habit', 'specific_days', '{"monday", "wednesday", "friday"}', current_date),
(pulse_agua_id, user_id, 'Beber 2L de agua', 'habit', 'daily', NULL, current_date),
-- Alimentación
(pulse_planificar_comida_id, user_id, 'Planificar comidas de la semana', 'habit', 'weekly', '{"sunday"}', current_date),
(pulse_azucar_id, user_id, 'Reducir consumo de azúcar', 'habit', 'daily', NULL, current_date),
-- Habilidad
(pulse_curso_python_id, user_id, 'Completar curso de Python', 'project', NULL, NULL, current_date),
(pulse_estudiar_diario_id, user_id, 'Estudiar 1 hora al día', 'habit', 'daily', NULL, current_date),
-- Networking
(pulse_networking_evento_id, user_id, 'Asistir a 1 evento de networking', 'task', 'monthly', NULL, current_date),
(pulse_linkedin_id, user_id, 'Contactar a 5 personas en LinkedIn', 'habit', 'weekly', NULL, current_date),
-- Ahorro
(pulse_ahorrar_salario_id, user_id, 'Ahorrar 15% del salario', 'habit', 'monthly', NULL, current_date),
(pulse_investigar_fondos_id, user_id, 'Investigar fondos de inversión', 'task', NULL, NULL, current_date),
-- Deudas
(pulse_pagar_tarjeta_id, user_id, 'Hacer pago extra en tarjeta de crédito', 'habit', 'monthly', NULL, current_date),
(pulse_crear_presupuesto_id, user_id, 'Crear presupuesto mensual', 'task', NULL, NULL, current_date),
-- Lectura
(pulse_leer_libro_mes_id, user_id, 'Leer 1 libro al mes', 'habit', 'monthly', NULL, current_date),
(pulse_leer_20_pag_id, user_id, 'Leer 20 páginas', 'habit', 'daily', NULL, current_date),
-- Mindfulness
(pulse_meditar_id, user_id, 'Meditar 10 minutos', 'habit', 'daily', NULL, current_date),
(pulse_diario_id, user_id, 'Escribir en el diario', 'habit', 'daily', NULL, current_date),
-- Hobbies
(pulse_practicar_guitarra_id, user_id, 'Practicar guitarra 2h semanales', 'habit', 'weekly', NULL, current_date),
(pulse_planear_viaje_id, user_id, 'Planear viaje de fin de semana', 'project', NULL, NULL, current_date),
-- Relaciones
(pulse_llamar_familiar_id, user_id, 'Llamar a un familiar o amigo', 'habit', 'weekly', NULL, current_date),
(pulse_organizar_cena_id, user_id, 'Organizar una cena con amigos', 'task', NULL, NULL, current_date);

-- 4. LINK PULSES TO PHASES (habit_task_area_prk_links)
INSERT INTO public.habit_task_area_prk_links (habit_task_id, area_prk_id) VALUES
-- Físico
(pulse_ejercicio_id, phase_fisico_id),
(pulse_agua_id, phase_fisico_id),
-- Alimentación
(pulse_planificar_comida_id, phase_alimentacion_id),
(pulse_azucar_id, phase_alimentacion_id),
-- Habilidad
(pulse_curso_python_id, phase_habilidad_id),
(pulse_estudiar_diario_id, phase_habilidad_id),
-- Networking
(pulse_networking_evento_id, phase_networking_id),
(pulse_linkedin_id, phase_networking_id),
-- Ahorro
(pulse_ahorrar_salario_id, phase_ahorro_id),
(pulse_investigar_fondos_id, phase_ahorro_id),
-- Deudas
(pulse_pagar_tarjeta_id, phase_deudas_id),
(pulse_crear_presupuesto_id, phase_deudas_id),
-- Lectura
(pulse_leer_libro_mes_id, phase_lectura_id),
(pulse_leer_20_pag_id, phase_lectura_id),
-- Mindfulness
(pulse_meditar_id, phase_mindfulness_id),
(pulse_diario_id, phase_mindfulness_id),
-- Hobbies
(pulse_practicar_guitarra_id, phase_hobbies_id),
(pulse_planear_viaje_id, phase_hobbies_id),
-- Relaciones
(pulse_llamar_familiar_id, phase_relaciones_id),
(pulse_organizar_cena_id, phase_relaciones_id);

END $$;
