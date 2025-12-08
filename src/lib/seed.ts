
'use server';
import { createClient } from '@/lib/supabase/server';
import type { ProgressLog } from '@/lib/types';
import { eachDayOfInterval, format, subDays, startOfDay, getDay, differenceInMonths, endOfWeek, isSameWeek, startOfWeek, endOfMonth, isSameMonth, startOfMonth, addDays } from 'date-fns';

/**
 * Tipo local para el seeder (compatible con los campos usados aquí).
 * Nota: El modelo runtime puede diferir del tipo Pulse del app.
 */
interface HabitTask {
  id: string;
  user_id: string;
  title: string;
  type: 'habit' | 'task';
  frequency: string | null;
  frequency_days?: string[] | null;
  frequency_interval?: number | null;
  start_date?: string;
  due_date?: string | null;
  archived: boolean;
  archived_at?: string | null;
  created_at?: string | null;

  // Alineado con el modelo usado en la app para ponderación y criticidad
  weight: number;
  is_critical: boolean;

  // Medición/progreso
  measurement_type?: 'binary' | 'quantitative' | null;
  measurement_goal?: { target_count?: number; unit?: string } | null;
  completion_date?: string | null;

  // Campos adicionales si fueran necesarios:
  area_prk_id?: string;
}

// Updated date range to include future data for testing.
const SIMULATION_START_DATE = new Date(2023, 0, 1); // January 1, 2023
const SIMULATION_END_DATE = new Date(2025, 11, 31); // December 31, 2025


function isTaskActiveOnDateForSeed(task: HabitTask, date: Date): boolean {
    const targetDate = startOfDay(date);

    if (!task.start_date) return false;
    
    const startDate = startOfDay(new Date(task.start_date));
    if (targetDate < startDate) return false;

    if (task.archived && task.archived_at && targetDate > startOfDay(new Date(task.archived_at))) {
        return false;
    }
    
    if (task.due_date && targetDate > startOfDay(new Date(task.due_date))) {
        return false;
    }

    if (task.frequency?.includes('ACUMULATIVO')) {
        // We will handle these separately, not on a daily check basis for this simple seeder
        return false;
    }

    switch (task.frequency) {
        case 'DIARIA':
            return true;
        case 'SEMANAL_DIAS_FIJOS':
            const dayMap = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
            const dayOfWeek = getDay(targetDate);
            return task.frequency_days?.includes(dayMap[dayOfWeek]) ?? false;
        case 'INTERVALO_DIAS':
            if (!task.frequency_interval) return false;
            const diffInMs = targetDate.getTime() - startDate.getTime();
            const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));
            return diffInDays % task.frequency_interval === 0;
        default:
            return false;
    }
}

// Helper function to pick N random days from a week
function getRandomDaysOfWeek(days: Date[], count: number): Date[] {
    const shuffled = [...days].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

export async function seedDatabase(userId: string) {
    const supabase = await createClient();
    console.log(`Starting realistic database seed for user: ${userId}`);

    // Clean up all data for the user
    console.log('Deleting all data for user to ensure a clean seed...');
    await supabase.from('progress_logs').delete().eq('user_id', userId);
    await supabase.from('habit_tasks').delete().eq('user_id', userId);
    await supabase.from('area_prks').delete().eq('user_id', userId);
    await supabase.from('life_prks').delete().eq('user_id', userId);
    console.log('Previous data deleted.');

    // 1. Define and insert Life PRKs
    console.log('Inserting Life PRKs...');
    const lifePrksToCreate = [
        { user_id: userId, title: 'Desarrollo Profesional y Carrera', description: 'Crecer continuamente en mi campo, asumiendo nuevos desafíos y responsabilidades.', archived: false },
        { user_id: userId, title: 'Salud y Bienestar Físico', description: 'Mantener un estilo de vida activo y saludable para tener energía y vitalidad.', archived: false },
        { user_id: userId, title: 'Finanzas Personales Sólidas', description: 'Lograr seguridad y libertad financiera a través de una gestión inteligente del dinero.', archived: false },
        { user_id: userId, title: 'Crecimiento Personal y Mental', description: 'Cultivar la mente y las emociones a través del aprendizaje constante y la introspección.', archived: false },
    ];
    const { data: insertedLifePrks, error: lifePrkError } = await supabase.from('life_prks').insert(lifePrksToCreate).select();
    if (lifePrkError) throw new Error(`Failed to insert Life PRKs: ${lifePrkError.message}`);
    console.log(`Inserted ${insertedLifePrks.length} Life PRKs.`);

    const lifePrkMap = Object.fromEntries(insertedLifePrks.map(p => [p.title, p.id]));

    // 2. Define and insert Area PRKs
    console.log('Inserting Area PRKs...');
    const areaPrksToCreate = [
        // Desarrollo Profesional
        { life_prk_title: 'Desarrollo Profesional y Carrera', title: 'Dominar una Nueva Competencia Técnica', description: 'Convertirme en un experto en IA aplicada a finanzas.' },
        { life_prk_title: 'Desarrollo Profesional y Carrera', title: 'Liderar un Proyecto de Alto Impacto', description: 'Gestionar exitosamente el lanzamiento del nuevo dashboard de cliente.' },
        // Salud y Bienestar
        { life_prk_title: 'Salud y Bienestar Físico', title: 'Mejorar Resistencia Cardiovascular', description: 'Ser capaz de correr 10km cómodamente.' },
        { life_prk_title: 'Salud y Bienestar Físico', title: 'Optimizar la Calidad del Sueño', description: 'Lograr un promedio de 7-8 horas de sueño de calidad por noche.' },
        // Finanzas
        { life_prk_title: 'Finanzas Personales Sólidas', title: 'Construir Fondo de Emergencia', description: 'Ahorrar el equivalente a 6 meses de gastos.' },
        // Crecimiento Personal
        { life_prk_title: 'Crecimiento Personal y Mental', title: 'Hábito de Lectura Consistente', description: 'Leer al menos 12 libros al año.' },
        { life_prk_title: 'Crecimiento Personal y Mental', title: 'Establecer una Práctica de Meditación', description: 'Meditar de forma regular para mejorar el enfoque y reducir el estrés.' },
        { life_prk_title: 'Crecimiento Personal y Mental', title: 'Planificar y Realizar un Viaje Cultural', description: 'Explorar una nueva cultura a través de un viaje inmersivo.' },
        { life_prk_title: 'Crecimiento Personal y Mental', title: 'Fortalecer Vínculos Familiares', description: 'Mejorar la calidad del tiempo que paso con mi familia.' },
    ];

    const areaPrkInsertData = areaPrksToCreate.map(a => ({
        user_id: userId,
        life_prk_id: lifePrkMap[a.life_prk_title],
        title: a.title,
        description: a.description,
        unit: '%', target_value: 100, current_value: 0, archived: false
    }));
    const { data: insertedAreaPrks, error: areaPrkError } = await supabase.from('area_prks').insert(areaPrkInsertData).select();
    if (areaPrkError) throw new Error(`Failed to insert Area PRKs: ${areaPrkError.message}`);
    console.log(`Inserted ${insertedAreaPrks.length} Area PRKs.`);
    
    const areaPrkMap: { [key: string]: string } = Object.fromEntries(insertedAreaPrks.map(p => [p.title, p.id]));
    
    // 3. Define a diverse set of habits and tasks
    const habitsToCreate: (Omit<HabitTask, 'id' | 'created_at' | 'user_id' | 'area_prk_id' | 'archived_at'> & { area_prk_title: string })[] = [
        // Daily habits
        { area_prk_title: 'Optimizar la Calidad del Sueño', title: 'Meditar 10 minutos antes de dormir', type: 'habit', frequency: 'DIARIA', start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 2, is_critical: false, measurement_type: 'binary', archived: false },
        { area_prk_title: 'Hábito de Lectura Consistente', title: 'Leer 20 páginas', type: 'habit', frequency: 'DIARIA', start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 2, is_critical: false, measurement_type: 'quantitative', measurement_goal: { target_count: 20, unit: 'páginas' }, archived: false },
        { area_prk_title: 'Liderar un Proyecto de Alto Impacto', title: 'Planificar el día siguiente', type: 'habit', frequency: 'DIARIA', start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 1, is_critical: false, measurement_type: 'binary', archived: false },
        { area_prk_title: 'Establecer una Práctica de Meditación', title: 'Revisar objetivos del día', type: 'habit', frequency: 'DIARIA', start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 1, is_critical: false, measurement_type: 'binary', archived: false },
        
        // Weekly fixed habits
        { area_prk_title: 'Construir Fondo de Emergencia', title: 'Revisar presupuesto semanal', type: 'habit', frequency: 'SEMANAL_DIAS_FIJOS', frequency_days: ['D'], start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 1, is_critical: false, measurement_type: 'binary', archived: false },

        // Weekly commitments (accumulative)
        { area_prk_title: 'Mejorar Resistencia Cardiovascular', title: 'Hacer ejercicio (3x semana)', type: 'habit', frequency: 'SEMANAL_ACUMULATIVO', measurement_type: 'binary', measurement_goal: { target_count: 3 }, start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 3, is_critical: false, archived: false },

        // Monthly commitments (accumulative)
        { area_prk_title: 'Fortalecer Vínculos Familiares', title: 'Organizar actividad familiar', type: 'habit', frequency: 'MENSUAL_ACUMULATIVO', measurement_type: 'binary', measurement_goal: { target_count: 1 }, start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 4, is_critical: false, archived: false },
        { area_prk_title: 'Hábito de Lectura Consistente', title: 'Leer 1 libro completo al mes', type: 'habit', frequency: 'MENSUAL_ACUMULATIVO', measurement_type: 'binary', measurement_goal: { target_count: 1 }, start_date: format(SIMULATION_START_DATE, 'yyyy-MM-dd'), weight: 3, is_critical: false, archived: false },


        // One-off tasks sprinkled throughout
        { area_prk_title: 'Dominar una Nueva Competencia Técnica', title: 'Inscribirme en el curso de IA', type: 'task', frequency: null, start_date: '2023-02-15', due_date: '2023-02-20', weight: 5, is_critical: true, measurement_type: 'binary', archived: false, completion_date: '2023-02-18' },
        { area_prk_title: 'Planificar y Realizar un Viaje Cultural', title: 'Comprar vuelos para el viaje', type: 'task', frequency: null, start_date: '2024-03-10', due_date: '2024-03-20', weight: 4, is_critical: false, measurement_type: 'binary', archived: false, completion_date: '2024-03-15' }
    ];

    console.log('Inserting new habit and task definitions...');
    const habitTaskInsertData = habitsToCreate.map(h => {
        const area_prk_id = areaPrkMap[h.area_prk_title];
        if (!area_prk_id) {
            console.warn(`Could not find Area PRK for title: "${h.area_prk_title}", skipping task "${h.title}"`);
            return null;
        }
        const { area_prk_title, ...rest } = h;
        return { ...rest, user_id: userId, area_prk_id };
    }).filter(Boolean);
    
    const { data: insertedHabitTasks, error: habitInsertError } = await supabase
        .from('habit_tasks')
        .insert(habitTaskInsertData as any)
        .select();

    if (habitInsertError) throw new Error(`Failed to insert habits: ${habitInsertError.message}`);
    console.log(`Inserted ${insertedHabitTasks.length} new habits/tasks.`);
    

    // 4. Generate progress logs with realistic, ascending compliance
    console.log('Generating realistic progress logs from 2023-01-01 to 2025-12-31...');
    const dateInterval = eachDayOfInterval({ start: SIMULATION_START_DATE, end: SIMULATION_END_DATE });
    const progressLogsToInsert: Omit<ProgressLog, 'id'|'created_at'>[] = [];
    
    const totalMonthsInSimulation = differenceInMonths(SIMULATION_END_DATE, SIMULATION_START_DATE);

    for (const date of dateInterval) {
        const monthsPassed = differenceInMonths(date, SIMULATION_START_DATE);
        
        // Ascending compliance rate: starts at 40% and increases to a max of 90%
        const baseCompliance = 0.40;
        const maxCompliance = 0.90;
        const complianceGrowth = (maxCompliance - baseCompliance) / (totalMonthsInSimulation || 1);
        const currentComplianceRate = Math.min(baseCompliance + (monthsPassed * complianceGrowth), maxCompliance);

        // Handle daily fixed tasks - try to log all of them based on compliance
        const dailyTasks = insertedHabitTasks.filter(t => 
            t.frequency === 'DIARIA' && 
            t.type === 'habit' &&
            isTaskActiveOnDateForSeed(t, date)
        );

        let hasLoggedAtLeastOne = false;
        for (const task of dailyTasks) {
             if (Math.random() < currentComplianceRate) {
                let progressValue = 1;
                let completionPercentage = 1.0;

                if (task.measurement_type === 'quantitative') {
                    const target = task.measurement_goal?.target_count ?? 20;
                    progressValue = Math.floor(target * (0.8 + Math.random() * 0.4));
                    completionPercentage = progressValue / target;
                }

                progressLogsToInsert.push({
                    habit_task_id: task.id, user_id: userId, completion_date: format(date, 'yyyy-MM-dd'),
                    progress_value: progressValue, completion_percentage: completionPercentage
                });
                hasLoggedAtLeastOne = true;
            }
        }
        
        // GUARANTEE: If by chance no daily task was logged, log the first one to ensure data for the day.
        if (!hasLoggedAtLeastOne && dailyTasks.length > 0) {
             progressLogsToInsert.push({
                habit_task_id: dailyTasks[0].id, user_id: userId, completion_date: format(date, 'yyyy-MM-dd'),
                progress_value: 1, completion_percentage: 1.0
            });
        }
        
        // Handle one-off completed tasks
        for (const task of insertedHabitTasks.filter(t => t.type === 'task' && t.completion_date)) {
             if (format(new Date(task.completion_date), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')) {
                 progressLogsToInsert.push({
                    habit_task_id: task.id, user_id: userId, completion_date: task.completion_date,
                    progress_value: 1, completion_percentage: 1.0
                });
             }
        }

        // Handle weekly accumulative commitments - process at the end of each week
        if (getDay(date) === 0) { // Sunday, end of the week for date-fns `isSameWeek` default
            const weekStart = startOfWeek(date, { weekStartsOn: 1 });
            const weekEnd = date; // Process for the week ending on the current day
            const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

            for (const task of insertedHabitTasks.filter(t => t.frequency === 'SEMANAL_ACUMULATIVO')) {
                 if (date >= new Date(task.start_date!)) {
                     const target = task.measurement_goal?.target_count ?? 1;
                     const numToComplete = Math.round(target * currentComplianceRate); // How many times they did it this week
                     const completionDays = getRandomDaysOfWeek(daysInWeek, numToComplete);

                     for(const completionDay of completionDays) {
                         progressLogsToInsert.push({
                            habit_task_id: task.id, user_id: userId, completion_date: format(completionDay, 'yyyy-MM-dd'),
                            progress_value: 1, completion_percentage: 1.0
                         });
                     }
                 }
            }
        }

        // Handle monthly accumulative commitments - process at the end of each month
        if (endOfMonth(date).getDate() === date.getDate()) { // Last day of the month
             const monthStart = startOfMonth(date);
             const daysInMonth = eachDayOfInterval({ start: monthStart, end: date });

             for (const task of insertedHabitTasks.filter(t => t.frequency === 'MENSUAL_ACUMULATIVO')) {
                  if (date >= new Date(task.start_date!)) {
                    const target = task.measurement_goal?.target_count ?? 1;
                    if (Math.random() < currentComplianceRate) { // Decide if they achieve the monthly goal at all
                        const completionDays = getRandomDaysOfWeek(daysInMonth, target); // Pick random day(s) in the month
                         for(const completionDay of completionDays) {
                             progressLogsToInsert.push({
                                habit_task_id: task.id, user_id: userId, completion_date: format(completionDay, 'yyyy-MM-dd'),
                                progress_value: 1, completion_percentage: 1.0
                            });
                         }
                    }
                  }
             }
        }
    }
    
    console.log(`Generated ${progressLogsToInsert.length} realistic progress logs. Inserting into database...`);
    
    // Supabase has a limit on how many rows can be inserted at once, so we chunk it.
    const CHUNK_SIZE = 500;
    for (let i = 0; i < progressLogsToInsert.length; i += CHUNK_SIZE) {
        const chunk = progressLogsToInsert.slice(i, i + CHUNK_SIZE);
        const { error: logInsertError } = await supabase.from('progress_logs').insert(chunk);
        if (logInsertError) {
            console.error('Error inserting chunk:', logInsertError);
            throw new Error(`Failed to insert progress logs chunk: ${logInsertError.message}`);
        }
        console.log(`Inserted chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(progressLogsToInsert.length / CHUNK_SIZE)}...`);
    }

    console.log('Database seeding completed successfully!');
}

    