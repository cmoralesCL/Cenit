'use server';

import { createClient } from "@/lib/supabase/server";
import { Orbit, Phase, Pulse, ProgressLog, DailyProgressSnapshot, WeeklyProgressSnapshot, KpiData, AnalyticsData } from "@/lib/types";
import { 
    format, 
    startOfDay, 
    parseISO, 
    getDay, 
    addDays, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    isSameDay, 
    startOfWeek, 
    endOfWeek, 
    isWithinInterval,
    startOfYear,
    endOfQuarter,
    startOfQuarter,
    addMonths,
    subMonths,
    areIntervalsOverlapping,
    differenceInWeeks,
    differenceInMonths,
    differenceInDays,
    isAfter,
    isBefore,
    endOfYear,
    subDays,
    eachWeekOfInterval,
    eachMonthOfInterval,
    isFirstDayOfMonth,
    endOfDay,
    subYears,
    eachQuarterOfInterval,
    getYear,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { logError } from "@/lib/logger";
import { redirect } from "next/navigation";


async function getCurrentUserId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error('User not authenticated, redirecting to login.');
        redirect('/login');
    }
    return user.id;
}


/**
 * Determina si una tarea (especialmente un hábito) está activa en una fecha específica.
 * @param task La tarea a verificar.
 * @param date La fecha a verificar.
 * @returns `true` si la tarea está activa, `false` en caso contrario.
 */
function isTaskActiveOnDate(task: Pulse, date: Date): boolean {
    const targetDate = startOfDay(date);

    // Common checks for all types
    if (!task.start_date) {
        return false; 
    }
    
    const startDate = startOfDay(parseISO(task.start_date));

    // Check archived status based on date
    if (task.archived && task.archived_at && isAfter(targetDate, startOfDay(parseISO(task.archived_at)))) {
        return false;
    }
    
    // A one-off task with no frequency is active only on its start date, regardless of completion.
    if (task.frequency === null || task.frequency === 'UNICA') {
        const isCompleted = !!task.completion_date;
        if (isCompleted && task.completion_date) {
            // If completed, only show it on its completion date, not after.
            return isSameDay(targetDate, startOfDay(parseISO(task.completion_date)));
        }
        // If not completed, it's active on or after start date, until due date (if any)
        const endDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;
        if (isAfter(targetDate, startDate) && !endDate) {
            // One-off task with no due date becomes "overdue" but remains active
            return true;
        }
        return isWithinInterval(targetDate, { start: startDate, end: endDate || addDays(startDate, 365 * 10) }); // Show for a long time if no due date
    }
    
    // Must be on or after start date for recurring tasks
    if (isBefore(targetDate, startDate)) {
        return false;
    }
    
    // If it's a recurring task/habit, it can't be active past its due_date.
    const endDate = task.due_date ? startOfDay(parseISO(task.due_date)) : null;
    if (endDate && isAfter(targetDate, endDate)) {
        return false;
    }

    // --- Frequency Logic (applies to both tasks and habits) ---
    // Frequencies for commitments should not appear on the calendar
    if (task.frequency && task.frequency.includes('ACUMULATIVO')) {
        return false;
    }

    switch (task.frequency) {
        case 'DIARIA':
            return true;

        case 'SEMANAL_DIAS_FIJOS':
            // date-fns: Sunday=0, Monday=1, ..., Saturday=6
            const dayMap = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
            const dayOfWeek = getDay(targetDate);
            return task.frequency_days?.includes(dayMap[dayOfWeek]) ?? false;
        
        case 'INTERVALO_DIAS':
            if (!task.frequency_interval) return false;
            const diffDays = differenceInDays(targetDate, startDate);
            return diffDays >= 0 && diffDays % task.frequency_interval === 0;
        
        case 'INTERVALO_SEMANAL_DIAS_FIJOS': {
            if (!task.frequency_interval || !task.frequency_days) return false;
            
            const startOfWeekDate = startOfWeek(startDate, { weekStartsOn: 1 });
            const targetWeekStartDate = startOfWeek(targetDate, { weekStartsOn: 1 });
            const weekDiffInDays = differenceInDays(targetWeekStartDate, startOfWeekDate);

            if (weekDiffInDays < 0) return false;

            const weekDiff = Math.floor(weekDiffInDays / 7);

            if (weekDiff % task.frequency_interval !== 0) {
                return false;
            }

            const dayMapWeekly = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
            const dayOfWeekWeekly = getDay(targetDate);
            return task.frequency_days.includes(dayMapWeekly[dayOfWeekWeekly]);
        }

        case 'MENSUAL_DIA_FIJO':
            if (!task.frequency_day_of_month) return false;
            const dateDay = targetDate.getDate();
            const lastDayOfMonth = endOfMonth(targetDate).getDate();

            // Handle cases like setting 31 for a month with 30 days. It should fall on the last day.
            return dateDay === Math.min(task.frequency_day_of_month, lastDayOfMonth);
        
        case 'INTERVALO_MENSUAL_DIA_FIJO':
            if (!task.frequency_interval || !task.frequency_day_of_month) return false;
            const monthDiff = differenceInMonths(targetDate, startDate);
            if (monthDiff < 0 || monthDiff % task.frequency_interval !== 0) {
                return false;
            }
            const dateDayMonthly = targetDate.getDate();
            const lastDayOfMonthMonthly = endOfMonth(targetDate).getDate();
            return dateDayMonthly === Math.min(task.frequency_day_of_month, lastDayOfMonthMonthly);

        case 'ANUAL_FECHA_FIJA':
            const startMonth = startDate.getMonth();
            const startDay = startDate.getDate();
            return targetDate.getMonth() === startMonth && targetDate.getDate() === startDay;

        default:
            return false;
    }
}

/**
 * Obtiene todas las tareas y hábitos activos para una fecha específica, incluyendo su estado de completado.
 * @param date La fecha para la que se obtendrán las tareas.
 * @param allHabitTasks Una lista de todas las tareas y hábitos no archivados.
 * @param allProgressLogs Una lista de todos los registros de progreso.
 * @returns Una lista de tareas y hábitos activos para esa fecha.
 */
async function getHabitTasksForDate(date: Date, allHabitTasks: Pulse[], allProgressLogs: ProgressLog[]): Promise<Pulse[]> {
    const dateString = format(date, 'yyyy-MM-dd');
    
    const activeTasks = allHabitTasks.filter(task => isTaskActiveOnDate(task, date));

    return activeTasks.map(task => {
        const completionLog = allProgressLogs.find(log => 
            log.habit_task_id === task.id && 
            isSameDay(parseISO(log.completion_date), date)
        );
        
        let completedToday = !!completionLog;
        let progressValue = completionLog?.progress_value;
        let completionPercentage = completionLog?.completion_percentage ?? 0;

        if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && completionLog) {
            completedToday = (progressValue ?? 0) >= task.measurement_goal.target_count;
        } else if (completionLog) {
            completedToday = completionPercentage >= 1;
        }

        return {
            ...task,
            completedToday: completedToday,
            current_progress_value: progressValue,
            completion_date: completionLog ? dateString : ((task.type === 'task' && !task.frequency) ? task.completion_date : undefined),
        };
    });
}


/**
 * Calcula el progreso en cascada para una fecha dada, desde las tareas hasta los PRK de Vida.
 * @param date La fecha para la que se calculará el progreso.
 * @param lifePrks Todos los PRK de Vida.
 * @param areaPrks Todos los PRK de Área.
 * @param habitTasks Las tareas y hábitos activos para esa fecha (obtenidos de `getHabitTasksForDate`).
 * @returns Un objeto con los PRK de vida y área, cada uno con su progreso calculado para ese día.
 */
function calculateProgressForDate(date: Date, lifePrks: Orbit[], areaPrks: Phase[], habitTasks: Pulse[]) {
    const areaPrksWithProgress = areaPrks.map(areaPrk => {
        const relevantTasks = habitTasks.filter(ht => ht.phase_ids.includes(areaPrk.id));
        
        if (relevantTasks.length === 0) {
            return { ...areaPrk, progress: null };
        }
        
        const hasFailedCriticalTask = relevantTasks.some(task => task.is_critical && !task.completedToday);

        if (hasFailedCriticalTask) {
            return { ...areaPrk, progress: 0 };
        }

        const totalWeight = relevantTasks.reduce((sum, task) => sum + task.weight, 0);
        
        const weightedCompleted = relevantTasks.reduce((sum, task) => {
            if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && task.measurement_goal.target_count > 0) {
                const progressValue = task.current_progress_value ?? 0;
                const progressPercentage = progressValue / task.measurement_goal.target_count;
                return sum + (progressPercentage * task.weight);
            }
            if (task.completedToday) {
                return sum + (1 * task.weight);
            }
            return sum;
        }, 0);
        
        const progress = totalWeight > 0 ? (weightedCompleted / totalWeight) * 100 : 0;
        return { ...areaPrk, progress };
    });

    const lifePrksWithProgress = lifePrks.map(lifePrk => {
        const relevantAreaPrks = areaPrksWithProgress.filter(ap => ap.life_prk_id === lifePrk.id && ap.progress !== null);
        
        if (relevantAreaPrks.length === 0) {
            return { ...lifePrk, progress: null };
        }

        const totalProgress = relevantAreaPrks.reduce((sum, ap) => sum + (ap.progress ?? 0), 0);
        const progress = totalProgress / relevantAreaPrks.length;
        return { ...lifePrk, progress };
    });

    return { lifePrksWithProgress, areaPrksWithProgress };
}

function getActiveCommitments(allHabitTasks: Pulse[], allProgressLogs: ProgressLog[], referenceDate: Date) {
    const periodStart = startOfWeek(referenceDate, { weekStartsOn: 1 });
    const periodEnd = endOfWeek(referenceDate, { weekStartsOn: 1 });
    const monthStart = startOfMonth(referenceDate);
    const monthEnd = endOfMonth(referenceDate);
    const quarterStart = startOfQuarter(referenceDate);
    const quarterEnd = endOfQuarter(referenceDate);

    return allHabitTasks.filter(task => {
        // Basic filtering
        if (!task.frequency?.includes('ACUMULATIVO') || !task.start_date) {
            return false;
        }
        const taskStartDate = parseISO(task.start_date);

        // Check archived status based on date
        if (task.archived && task.archived_at && isAfter(referenceDate, startOfDay(parseISO(task.archived_at)))) {
            return false;
        }
        
        if (isAfter(taskStartDate, quarterEnd)) return false; // Use quarterEnd as the widest possible range for this check
        if (task.due_date && isBefore(parseISO(task.due_date), periodStart)) return false;

        const taskInterval = { start: taskStartDate, end: task.due_date ? parseISO(task.due_date) : new Date(8640000000000000) };
        
        if (task.frequency.startsWith('SEMANAL')) {
            const weekInterval = { start: periodStart, end: periodEnd };
            if (!areIntervalsOverlapping(weekInterval, taskInterval, { inclusive: true })) return false;

            if (task.frequency === 'SEMANAL_ACUMULATIVO_RECURRENTE') {
                if (!task.frequency_interval) return false;
                const weekDiff = Math.floor(differenceInDays(startOfWeek(periodStart, { weekStartsOn: 1 }), startOfWeek(taskStartDate, { weekStartsOn: 1 })) / 7);
                return weekDiff >= 0 && weekDiff % task.frequency_interval === 0;
            }
            return true;
        }
        
        if (task.frequency.startsWith('MENSUAL')) {
            const monthInterval = {start: monthStart, end: monthEnd};
            if (!areIntervalsOverlapping(monthInterval, taskInterval, { inclusive: true })) return false;

            if (task.frequency === 'MENSUAL_ACUMULATIVO_RECURRENTE') {
                if (!task.frequency_interval) return false;
                const monthDiff = differenceInMonths(monthStart, taskStartDate);
                return monthDiff >= 0 && monthDiff % task.frequency_interval === 0;
            }
            return true;
        }

        if (task.frequency.startsWith('TRIMESTRAL')) {
            const quarterInterval = {start: quarterStart, end: quarterEnd};
            if (!areIntervalsOverlapping(quarterInterval, taskInterval, { inclusive: true })) return false;
            // Add recurrent logic if needed in the future
            return true;
        }

        return false;
    }).map(task => {
        let logs: ProgressLog[] = [];
        let periodStartForLogs: Date, periodEndForLogs: Date;
        
        const freq = task.frequency;

        if(freq?.startsWith('SEMANAL')) {
            periodStartForLogs = startOfWeek(referenceDate, { weekStartsOn: 1 });
            periodEndForLogs = endOfWeek(referenceDate, { weekStartsOn: 1 });
        } else if (freq?.startsWith('MENSUAL')) {
            periodStartForLogs = monthStart;
            periodEndForLogs = monthEnd;
        } else { // TRIMESTRAL
            periodStartForLogs = quarterStart;
            periodEndForLogs = quarterEnd;
        }
        
        logs = allProgressLogs.filter(log => 
            log.habit_task_id === task.id &&
            isWithinInterval(parseISO(log.completion_date), { start: periodStartForLogs, end: periodEndForLogs })
        );

        const totalProgressValue = logs.reduce((sum, log) => sum + (log.progress_value ?? (log.completion_percentage ? 1 : 0)), 0);
        
        let isCompleted = false;
        if (task.measurement_type === 'binary' || task.measurement_type === 'quantitative') {
            const target = task.measurement_goal?.target_count ?? 1;
            isCompleted = target > 0 ? totalProgressValue >= target : totalProgressValue > 0;
        }

        return {
            ...task,
            current_progress_value: totalProgressValue,
            completedToday: isCompleted, // "completedToday" means completed for the reference period
            logs: logs,
        };
    });
}

async function fetchAndMapHabitTasks(userId: string, groupId: string | null): Promise<Pulse[]> {
    const supabase = await createClient();
    let query = supabase
        .from('habit_tasks')
        .select('*');

    if (groupId) {
        query = query.eq('group_id', groupId);
    } else {
        query = query.eq('user_id', userId).is('group_id', null);
    }

    const { data: tasks, error: tasksError } = await query.order('display_order', { nullsFirst: true });
    if (tasksError) throw tasksError;

    const { data: links, error: linksError } = await supabase
        .from('habit_task_area_prk_links')
        .select('habit_task_id, area_prk_id');
    if (linksError) throw linksError;

    const linksByTaskId = links.reduce((acc, link) => {
        if (!acc[link.habit_task_id]) {
            acc[link.habit_task_id] = [];
        }
        acc[link.habit_task_id].push(link.area_prk_id);
        return acc;
    }, {} as Record<string, string[]>);

    return tasks.map(task => ({
        ...task,
        phase_ids: linksByTaskId[task.id] || [],
    }));
}


export async function getDashboardData(selectedDateString: string | undefined, groupId: string | null) {
    const dateToUse = selectedDateString || format(new Date(), 'yyyy-MM-dd');
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    const selectedDate = parseISO(dateToUse);

    let lifePrksQuery = supabase.from('life_prks').select('*').eq('archived', false);
    if (groupId) {
        lifePrksQuery = lifePrksQuery.eq('group_id', groupId);
    } else {
        lifePrksQuery = lifePrksQuery.eq('user_id', userId).is('group_id', null);
    }
    const { data: lifePrks, error: lifePrksError } = await lifePrksQuery;
    if (lifePrksError) {
        await logError(lifePrksError, {at: 'getDashboardData - lifePrks'});
        throw lifePrksError;
    };

    let areaPrksQuery = supabase.from('area_prks').select('*').eq('archived', false);
    if (groupId) {
        areaPrksQuery = areaPrksQuery.eq('group_id', groupId);
    } else {
        areaPrksQuery = areaPrksQuery.eq('user_id', userId).is('group_id', null);
    }
    const { data: areaPrks, error: areaPrksError } = await areaPrksQuery;
    if (areaPrksError) {
        await logError(areaPrksError, {at: 'getDashboardData - areaPrks'});
        throw areaPrksError;
    }

    const allHabitTasks = await fetchAndMapHabitTasks(userId, groupId);

    let progressLogsQuery = supabase.from('progress_logs').select('*');
    if (groupId) {
        progressLogsQuery = progressLogsQuery.in('habit_task_id', allHabitTasks.map(t => t.id));
    } else {
        progressLogsQuery = progressLogsQuery.eq('user_id', userId);
    }
    const { data: allProgressLogs, error: progressLogsError } = await progressLogsQuery;
    if (progressLogsError) {
        await logError(progressLogsError, {at: 'getDashboardData - allProgressLogs'});
        throw progressLogsError;
    }

    // --- Pre-process data for progress calculations ---
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    const activeTasksForWeek = getActiveTasksForPeriod(allHabitTasks, weekStart, weekEnd);

    const logsByDay = allProgressLogs.reduce((acc, log) => {
        const day = format(parseISO(log.completion_date), 'yyyy-MM-dd');
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(log);
        return acc;
    }, {} as Record<string, ProgressLog[]>);

    // --- Calculate daily progress for the week view (WeekNav) ---
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });
    const dailyProgressDataForWeek: DailyProgressSnapshot[] = [];
    let pulsesForSelectedDay: Pulse[] = [];

    for (const day of weekDays) {
        const dayString = format(day, 'yyyy-MM-dd');
        const baseTasksForDayInLoop = activeTasksForWeek[dayString] || [];
        const logsForDayInLoop = logsByDay[dayString] || [];
        const habitTasksForDayInLoop = baseTasksForDayInLoop.map(task => {
            const completionLog = logsForDayInLoop.find(log => log.habit_task_id === task.id);
            let completedToday = !!completionLog;
            if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && completionLog) {
                completedToday = (completionLog.progress_value ?? 0) >= task.measurement_goal.target_count;
            } else if (completionLog) {
                completedToday = (completionLog.completion_percentage ?? 0) >= 1;
            }
            return { 
                ...task, 
                completedToday, 
                current_progress_value: completionLog?.progress_value,
                completion_date: completionLog ? dayString : ((task.type === 'task' && !task.frequency) ? task.completion_date : undefined),
            };
        });

        if (isSameDay(day, selectedDate)) {
            pulsesForSelectedDay = habitTasksForDayInLoop;
        }

        const { lifePrksWithProgress } = calculateProgressForDate(day, lifePrks, areaPrks, habitTasksForDayInLoop);
        const relevantLifePrks = lifePrksWithProgress.filter(lp => lp.progress !== null);
        const overallProgress = relevantLifePrks.length > 0
            ? relevantLifePrks.reduce((sum, lp) => sum + (lp.progress ?? 0), 0) / relevantLifePrks.length
            : 0;
        dailyProgressDataForWeek.push({
            snapshot_date: dayString,
            progress: isNaN(overallProgress) ? 0 : overallProgress,
        });
    }
    
    const { lifePrksWithProgress, areaPrksWithProgress } = calculateProgressForDate(selectedDate, lifePrks, areaPrks, pulsesForSelectedDay);

    const commitments = getActiveCommitments(allHabitTasks, allProgressLogs, selectedDate);
    
    // --- Calculate Weekly and Monthly Progress using pre-computed data ---
    const weeklyProgress = await calculateWeeklyProgress(selectedDate, allHabitTasks, allProgressLogs, activeTasksForWeek, logsByDay);
    
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const activeTasksForMonth = getActiveTasksForPeriod(allHabitTasks, monthStart, monthEnd);
    const monthlyProgress = await calculateMonthlyProgress(selectedDate, allHabitTasks, allProgressLogs, activeTasksForMonth, logsByDay);

    return {
        orbits: lifePrksWithProgress,
        phases: areaPrksWithProgress,
        pulses: pulsesForSelectedDay,
        commitments: commitments,
        weeklyProgress: weeklyProgress,
        monthlyProgress: monthlyProgress,
        date: dateToUse,
        dailyProgressDataForWeek,
    };
}


async function calculateWeeklyProgress(
    selectedDate: Date,
    allHabitTasks: Pulse[],
    allProgressLogs: ProgressLog[],
    habitTasksByDay: Record<string, Pulse[]>, // Now passed in
    logsByDay: Record<string, ProgressLog[]>      // Now passed in
): Promise<number> {
    const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 }); 
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    let totalWeightedProgress = 0;
    let totalWeight = 0;

    // 1. Daily tasks progress (using pre-computed data)
    weekDays.forEach(d => {
        const dayString = format(d, 'yyyy-MM-dd');
        const tasks = habitTasksByDay[dayString] ?? [];
        
        if (tasks.length > 0) {
            tasks.forEach(task => {
                const logsForThisDay = logsByDay[dayString] || [];
                const completionLog = logsForThisDay.find(log => log.habit_task_id === task.id);

                let completedToday = !!completionLog;
                let current_progress_value = completionLog?.progress_value;

                if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && completionLog) {
                    completedToday = (current_progress_value ?? 0) >= task.measurement_goal.target_count;
                } else if (completionLog) {
                    completedToday = (completionLog.completion_percentage ?? 0) >= 1;
                }

                let progressPercentage = 0;
                if (task.measurement_type === 'quantitative') {
                    const target = task.measurement_goal?.target_count ?? 1;
                    progressPercentage = target > 0 ? ((current_progress_value ?? 0) / target) : 0;
                } else if (completedToday) {
                    progressPercentage = 1;
                }
                totalWeightedProgress += progressPercentage * task.weight;
                totalWeight += task.weight;
            });
        }
    });

    // 2. Weekly commitments progress
    const weeklyCommitmentTasks = getActiveCommitments(allHabitTasks, allProgressLogs, weekStart)
        .filter(c => c.frequency?.startsWith('SEMANAL_ACUMULATIVO'));

    weeklyCommitmentTasks.forEach(task => {
        const target = task.measurement_goal?.target_count ?? 1;
        // The 'current_progress_value' is already calculated correctly in getActiveCommitments
        const totalValue = task.current_progress_value ?? 0;
        
        const progressPercentage = target > 0 ? (totalValue / target) : 0;

        totalWeightedProgress += progressPercentage * task.weight;
        totalWeight += task.weight;
    });

    const combinedAvgProgress = totalWeight > 0
        ? (totalWeightedProgress / totalWeight) * 100
        : 0;
    
    return combinedAvgProgress;
}


async function calculateMonthlyProgress(
    referenceDate: Date,
    allHabitTasks: Pulse[],
    allProgressLogs: ProgressLog[],
    habitTasksByDay: Record<string, Pulse[]>, // Now passed in
    logsByDay: Record<string, ProgressLog[]>      // Now passed in
): Promise<number> {
    const monthStart = startOfMonth(referenceDate);
    const today = new Date();
    const endOfReferenceMonth = endOfMonth(referenceDate);

    let calculationEndDate;

    if (isAfter(monthStart, today)) {
        // If the whole month is in the future, progress is 0
        return 0;
    }

    if (isBefore(endOfReferenceMonth, today)) {
        // If the whole month is in the past, calculate for the full month
        calculationEndDate = endOfReferenceMonth;
    } else {
        // If it's the current month, calculate up to today
        calculationEndDate = today;
    }

    const daysInMonth = eachDayOfInterval({ start: monthStart, end: calculationEndDate });

    let totalMonthlyWeightedProgress = 0;
    let totalMonthlyWeight = 0;

    // 1. Daily tasks progress for the month (using pre-computed data)
    daysInMonth.forEach(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const tasks = habitTasksByDay[dayString] ?? [];
        tasks.forEach(task => {
            const logsForThisDay = logsByDay[dayString] || [];
            const completionLog = logsForThisDay.find(log => log.habit_task_id === task.id);

            let completedToday = !!completionLog;
            let current_progress_value = completionLog?.progress_value;

            if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && completionLog) {
                completedToday = (current_progress_value ?? 0) >= task.measurement_goal.target_count;
            } else if (completionLog) {
                completedToday = (completionLog.completion_percentage ?? 0) >= 1;
            }

            let progressPercentage = 0;
            if (task.measurement_type === 'quantitative') {
                const target = task.measurement_goal?.target_count ?? 1;
                progressPercentage = target > 0 ? ((current_progress_value ?? 0) / target) : 0;
            } else if (completedToday) {
                progressPercentage = 1;
            }
            totalMonthlyWeightedProgress += progressPercentage * task.weight;
            totalMonthlyWeight += task.weight;
        });
    });
    
    // 2. Accumulative commitments for the month
    const monthlyCommitments = getActiveCommitments(allHabitTasks, allProgressLogs, monthStart);
    
    monthlyCommitments.forEach(task => {
        if (!task.frequency || !task.start_date) return;
        
        const target = task.measurement_goal?.target_count ?? 1;
        let periodProgress = 0;

        if (task.frequency.startsWith('SEMANAL')) {
            let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
            let weeksInPeriod = 0;
            let totalWeeklyProgress = 0;

            while(weekStart <= calculationEndDate) {
                const currentWeekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
                const weekEndForInterval = isAfter(currentWeekEnd, calculationEndDate) ? calculationEndDate : currentWeekEnd;

                const isActiveThisWeek = getActiveCommitments([task], [], weekStart).length > 0;
                if (!isActiveThisWeek) {
                    weekStart = addDays(weekStart, 7);
                    continue;
                }

                weeksInPeriod++;

                const logs = allProgressLogs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: weekStart, end: weekEndForInterval }));
                const totalValue = logs.reduce((sum, log) => sum + (log.progress_value ?? 0), 0);
                const weekCompletionPercentage = target > 0 ? (totalValue / target) : 0;
                
                totalWeeklyProgress += weekCompletionPercentage;
                weekStart = addDays(weekStart, 7);
            }
            if(weeksInPeriod > 0) periodProgress = totalWeeklyProgress / weeksInPeriod;

        } else { // Monthly, Quarterly commitments for the month
            const logs = allProgressLogs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: monthStart, end: calculationEndDate }));
            const totalValue = logs.reduce((sum, log) => sum + (log.progress_value ?? 0), 0);
            periodProgress = target > 0 ? (totalValue / target) : 0;
        }
        
        totalMonthlyWeightedProgress += periodProgress * task.weight;
        totalMonthlyWeight += task.weight;
    });

    return totalMonthlyWeight > 0
        ? (totalMonthlyWeightedProgress / totalMonthlyWeight) * 100
        : 0;
}



/**
 * Pre-calculates which tasks are active on each day of a given period.
 * This is a performance optimization to avoid re-calculating active status for every task on every day.
 * @param allHabitTasks All tasks to be processed.
 * @param periodStart The start of the date interval.
 * @param periodEnd The end of the date interval.
 * @returns A record where keys are date strings ('yyyy-MM-dd') and values are arrays of tasks active on that day.
 */
function getActiveTasksForPeriod(allHabitTasks: Pulse[], periodStart: Date, periodEnd: Date): Record<string, Pulse[]> {
    const activeTasksByDay: Record<string, Pulse[]> = {};
    const daysInPeriod = eachDayOfInterval({ start: periodStart, end: periodEnd });

    // Initialize the map for all days in the period
    for (const day of daysInPeriod) {
        activeTasksByDay[format(day, 'yyyy-MM-dd')] = [];
    }

    // Iterate over each task once
    for (const task of allHabitTasks) {
        // Iterate over each day in the period to check if the task is active
        for (const day of daysInPeriod) {
            if (isTaskActiveOnDate(task, day)) {
                const dayString = format(day, 'yyyy-MM-dd');
                activeTasksByDay[dayString].push(task);
            }
        }
    }

    return activeTasksByDay;
}


export async function getCalendarData(monthDate: Date, groupId: string | null) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    const monthStart = startOfMonth(monthDate);
    const monthEnd = endOfMonth(monthDate);
    
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    const daysInView = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    // --- 1. Fetch all data concurrently ---
    let lifePrksQuery = supabase.from('life_prks').select('*').eq('archived', false);
    if (groupId) {
        lifePrksQuery = lifePrksQuery.eq('group_id', groupId);
    } else {
        lifePrksQuery = lifePrksQuery.eq('user_id', userId).is('group_id', null);
    }

    let areaPrksQuery = supabase.from('area_prks').select('*').eq('archived', false);
    if (groupId) {
        areaPrksQuery = areaPrksQuery.eq('group_id', groupId);
    } else {
        areaPrksQuery = areaPrksQuery.eq('user_id', userId).is('group_id', null);
    }

    const allHabitTasksPromise = fetchAndMapHabitTasks(userId, groupId);

    const [
        { data: lifePrks, error: lifePrksError },
        { data: areaPrks, error: areaPrksError },
        allHabitTasks,
    ] = await Promise.all([
        lifePrksQuery,
        areaPrksQuery,
        allHabitTasksPromise
    ]);

    if (lifePrksError) { await logError(lifePrksError, { at: 'getCalendarData - lifePrks' }); throw lifePrksError; }
    if (areaPrksError) { await logError(areaPrksError, { at: 'getCalendarData - areaPrks' }); throw areaPrksError; }

    let progressLogsQuery = supabase.from('progress_logs').select('*')
        .gte('completion_date', format(calendarStart, 'yyyy-MM-dd'))
        .lte('completion_date', format(calendarEnd, 'yyyy-MM-dd'));

    if (groupId) {
        progressLogsQuery = progressLogsQuery.in('habit_task_id', allHabitTasks.map(t => t.id));
    } else {
        progressLogsQuery = progressLogsQuery.eq('user_id', userId);
    }

    const { data: allProgressLogs, error: progressLogsError } = await progressLogsQuery;
    if (progressLogsError) { await logError(progressLogsError, { at: 'getCalendarData - allProgressLogs' }); throw progressLogsError; }

    // --- 2. Pre-process and organize data for efficient lookups ---

    // Group all active tasks by day for the entire visible period
    const activeTasksForPeriod = getActiveTasksForPeriod(allHabitTasks, calendarStart, calendarEnd);

    // Group all progress logs by day for O(1) lookup
    const logsByDay = allProgressLogs.reduce((acc, log) => {
        const day = format(parseISO(log.completion_date), 'yyyy-MM-dd');
        if (!acc[day]) {
            acc[day] = [];
        }
        acc[day].push(log);
        return acc;
    }, {} as Record<string, ProgressLog[]>);

    // --- 3. Calculate daily progress and prepare task data for the client ---
    const dailyProgress: DailyProgressSnapshot[] = [];
    const habitTasksByDay: Record<string, Pulse[]> = {};

    for (const day of daysInView) {
        const dayString = format(day, 'yyyy-MM-dd');
        const baseTasksForDay = activeTasksForPeriod[dayString] || [];
        const logsForDay = logsByDay[dayString] || [];

        // Enrich tasks with completion data for this specific day
        const habitTasksForDay = baseTasksForDay.map(task => {
            const completionLog = logsForDay.find(log => log.habit_task_id === task.id);
            
            let completedToday = !!completionLog;
            if (task.measurement_type === 'quantitative' && task.measurement_goal?.target_count && completionLog) {
                completedToday = (completionLog.progress_value ?? 0) >= task.measurement_goal.target_count;
            } else if (completionLog) {
                completedToday = (completionLog.completion_percentage ?? 0) >= 1;
            }

            return {
                ...task,
                completedToday: completedToday,
                current_progress_value: completionLog?.progress_value,
                completion_date: completionLog ? dayString : ((task.type === 'task' && !task.frequency) ? task.completion_date : undefined),
            };
        });
        
        habitTasksByDay[dayString] = habitTasksForDay;

        // Calculate overall progress for the day
        if (habitTasksForDay.length > 0) {
            const { lifePrksWithProgress } = calculateProgressForDate(day, lifePrks, areaPrks, habitTasksForDay);
            const relevantLifePrks = lifePrksWithProgress.filter(lp => lp.progress !== null);
            const overallProgress = relevantLifePrks.length > 0
                ? relevantLifePrks.reduce((sum, lp) => sum + (lp.progress ?? 0), 0) / relevantLifePrks.length
                : 0;

            dailyProgress.push({
                snapshot_date: dayString,
                progress: isNaN(overallProgress) ? 0 : overallProgress,
            });
        } else {
            dailyProgress.push({ snapshot_date: dayString, progress: 0 });
        }
    }
    
    // --- 4. Calculate Commitments, Weekly, and Monthly progress using pre-computed data ---
    
    // Note: getActiveCommitments is called with all tasks, but its internal log filtering is now faster.
    const commitments = getActiveCommitments(allHabitTasks, allProgressLogs, monthDate);

    const weeklyProgress: WeeklyProgressSnapshot[] = [];
    for (let i = 0; i < daysInView.length; i += 7) {
        const weekStart = daysInView[i];
        // Pass the pre-computed maps to the calculation function
        const progress = await calculateWeeklyProgress(weekStart, allHabitTasks, allProgressLogs, habitTasksByDay, logsByDay);
        weeklyProgress.push({
            id: format(weekStart, 'yyyy-MM-dd'),
            progress: progress,
        });
    }

    const monthlyProgress = await calculateMonthlyProgress(monthDate, allHabitTasks, allProgressLogs, habitTasksByDay, logsByDay);

    return {
        dailyProgress,
        habitTasks: habitTasksByDay,
        weeklyProgress,
        monthlyProgress,
        areaPrks,
        commitments,
        orbits: lifePrks, // Add orbits to the return object
    };
}



/**
 * Returns the start of the semester for a given date.
 * January 1st for the first semester (months 0-5).
 * July 1st for the second semester (months 6-11).
 * @param date The date to check.
 * @returns The start date of the semester.
 */
export async function startOfSemester(date: Date): Promise<Date> {
    const month = date.getMonth();
    const year = date.getFullYear();
    // First semester (Jan-Jun) starts in January (month 0).
    // Second semester (Jul-Dec) starts in July (month 6).
    const startMonth = month < 6 ? 0 : 6;
    return new Date(year, startMonth, 1);
}

/**
 * Returns the end of the semester for a given date.
 * June 30th for the first semester.
 * December 31st for the second semester.
 * @param date The date to check.
 * @returns The end date of the semester.
 */
export async function endOfSemester(date: Date): Promise<Date> {
    const start = await startOfSemester(date);
    // Add 5 months to get to June or December, then get the end of that month.
    const endMonth = addMonths(start, 5);
    return endOfMonth(endMonth);
}

/**
 * Calculates the weighted progress for a set of tasks within a given date range.
 * This is the CORE progress calculation logic.
 * @param tasks The tasks to calculate progress for.
 * @param logs The progress logs for the relevant period.
 * @param startDate The start date of the period.
 * @param endDate The end date of the period.
 * @returns The calculated progress percentage, capped at 100.
 */
function calculatePeriodProgress(tasks: Pulse[], logs: ProgressLog[], startDate: Date, endDate: Date): number {
    let totalWeightedProgress = 0;
    let totalPossibleWeight = 0;
    const today = startOfDay(new Date());

    const activeTasks = tasks.filter(task => {
        if (!task.start_date) return false;
        const taskStartDate = parseISO(task.start_date);
        if (isAfter(taskStartDate, endDate)) return false;
        if (task.archived && task.archived_at && isBefore(parseISO(task.archived_at), startDate)) return false;
        if (task.due_date && isBefore(parseISO(task.due_date), startDate)) return false;
        const taskEndDate = task.due_date ? parseISO(task.due_date) : new Date(8640000000000000);
        return areIntervalsOverlapping({ start: startDate, end: endDate }, { start: taskStartDate, end: taskEndDate }, { inclusive: true });
    });

    activeTasks.forEach(task => {
        const taskWeight = task.weight || 1;
        let periodAchievedProgress = 0;
        let opportunityCount = 0;
        const taskStartDate = parseISO(task.start_date!);
        
        // --- Handle Daily/Scheduled Tasks ---
        if (!task.frequency?.includes('ACUMULATIVO')) {
            const periodStartDate = isAfter(taskStartDate, startDate) ? taskStartDate : startDate;
            const daysInPeriod = eachDayOfInterval({ start: periodStartDate, end: endDate });
            const activeDays = daysInPeriod.filter(day => isTaskActiveOnDate(task, day));
            opportunityCount = activeDays.length;

            if (opportunityCount > 0) {
                const periodLogs = logs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: periodStartDate, end: endDate }));
                
                if (task.measurement_type === 'quantitative') {
                    const totalValue = periodLogs.reduce((sum, log) => sum + (log.progress_value ?? 0), 0);
                    const totalTarget = (task.measurement_goal?.target_count ?? 1) * opportunityCount;
                    periodAchievedProgress = totalTarget > 0 ? totalValue / totalTarget : 0;
                } else { // binary and one-off
                    periodAchievedProgress = periodLogs.length / opportunityCount;
                }
                 totalWeightedProgress += periodAchievedProgress * taskWeight;
                 totalPossibleWeight += taskWeight;
            }
        } 
        // --- Handle Accumulative Tasks ---
        else {
             let periodProgress = 0;
            if (task.frequency.startsWith('SEMANAL')) {
                const periodStartDate = isAfter(taskStartDate, startDate) ? taskStartDate : startDate;
                const weeksInPeriod = eachWeekOfInterval({ start: periodStartDate, end: endDate }, { weekStartsOn: 1 })
                    .filter(week => isBefore(week, today)); // Only count weeks that have started
                let totalWeeklyProgress = 0;
                
                for (const week of weeksInPeriod) {
                    if (getActiveCommitments([task], [], week).length > 0) {
                        opportunityCount++;
                        const weekLogs = logs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: week, end: endOfWeek(week, {weekStartsOn: 1}) }));
                        const target = task.measurement_goal?.target_count ?? 1;
                        let weekProgress = 0;
                        if (task.measurement_type === 'quantitative') {
                            const totalValue = weekLogs.reduce((sum, l) => sum + (l.progress_value ?? 0), 0);
                            weekProgress = target > 0 ? totalValue / target : 0;
                        } else {
                            weekProgress = target > 0 ? weekLogs.length / target : 0;
                        }
                        totalWeeklyProgress += weekProgress;
                    }
                }
                if (opportunityCount > 0) {
                    periodProgress = totalWeeklyProgress / opportunityCount;
                }

            } else if (task.frequency.startsWith('MENSUAL')) {
                 const periodStartDate = isAfter(taskStartDate, startDate) ? taskStartDate : startDate;
                 const monthsInPeriod = eachMonthOfInterval({ start: periodStartDate, end: endDate })
                    .filter(month => isBefore(month, today)); // Only count months that have started
                 for (const month of monthsInPeriod) {
                    if (getActiveCommitments([task],[], month).length > 0) {
                        opportunityCount++;
                        const monthLogs = logs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), {start: month, end: endOfMonth(month)}));
                        const target = task.measurement_goal?.target_count ?? 1;
                        let monthProgress = 0;
                        if (task.measurement_type === 'quantitative') {
                            const totalValue = monthLogs.reduce((sum, l) => sum + (l.progress_value ?? 0), 0);
                            monthProgress = target > 0 ? totalValue / target : 0;
                        } else {
                            monthProgress = target > 0 ? monthLogs.length / target : 0;
                        }
                         periodProgress += monthProgress;
                    }
                 }
                 if(opportunityCount > 0) periodProgress = periodProgress / opportunityCount;

            }
             // NOTE: Not handling TRIMESTRAL/ANUAL for simplicity in this iteration
            if (opportunityCount > 0) {
                totalWeightedProgress += periodProgress * taskWeight;
                totalPossibleWeight += taskWeight;
            }
        }
    });

    if (totalPossibleWeight === 0) return 0;

    const progress = (totalWeightedProgress / totalPossibleWeight) * 100;
    return progress;
}

export async function getAnalyticsData(filters: {
    level: 'orbits' | 'phases' | 'pulses';
    timePeriod: 'all' | 'last30d' | 'last3m' | { from: Date; to: Date };
    scale: 'daily' | 'weekly' | 'monthly';
    orbitId?: string;
    phaseId?: string;
    pulseId?: string;
}, groupId: string | null): Promise<AnalyticsData> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // 1. Determine date range
    const today = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(today);

    if (filters.timePeriod === 'last30d') {
        startDate = startOfDay(subDays(today, 29));
    } else if (filters.timePeriod === 'last3m') {
        startDate = startOfDay(subMonths(today, 3));
    } else if (filters.timePeriod === 'all') {
        // Fetch all data, but we need a reasonable start date for logs
        const { data: firstLog } = await supabase.from('progress_logs').select('completion_date').eq('user_id', userId).order('completion_date', { ascending: true }).limit(1).single();
        startDate = firstLog ? parseISO(firstLog.completion_date) : startOfYear(today);
    } else {
        startDate = startOfDay(filters.timePeriod.from);
        endDate = endOfDay(filters.timePeriod.to);
    }

    // 2. Fetch all base data concurrently
    const allPulsesPromise = fetchAndMapHabitTasks(userId, groupId);
    
    const lifePrksQuery = supabase.from('life_prks').select('*').eq('archived', false).eq(groupId ? 'group_id' : 'user_id', groupId || userId);
    const areaPrksQuery = supabase.from('area_prks').select('*').eq('archived', false).eq(groupId ? 'group_id' : 'user_id', groupId || userId);

    const [ allPulses, { data: allOrbits, error: lifePrksError }, { data: allPhases, error: areaPrksError } ] = await Promise.all([
        allPulsesPromise, 
        lifePrksQuery, 
        areaPrksQuery
    ]);

    if (lifePrksError) throw lifePrksError;
    if (areaPrksError) throw areaPrksError;

    let progressLogsQuery = supabase.from('progress_logs').select('*')
        .gte('completion_date', format(startDate, 'yyyy-MM-dd'))
        .lte('completion_date', format(endDate, 'yyyy-MM-dd'));

    if (groupId) {
        const pulseIds = allPulses.map(p => p.id);
        progressLogsQuery = progressLogsQuery.in('habit_task_id', pulseIds);
    } else {
        progressLogsQuery = progressLogsQuery.eq('user_id', userId);
    }

    const { data: allProgressLogs, error: progressLogsError } = await progressLogsQuery;
    if (progressLogsError) throw progressLogsError;

    // 3. Filter data based on the selected level and IDs
    let targetPulses = allPulses;
    let itemsToGroup: (Orbit | Phase | Pulse)[] = [];
    let itemNameKey: 'title' = 'title';

    if (filters.level === 'pulses') {
        if (filters.pulseId) {
            targetPulses = allPulses.filter(p => p.id === filters.pulseId);
        } else if (filters.phaseId) {
            targetPulses = allPulses.filter(p => p.phase_ids.includes(filters.phaseId));
            itemsToGroup = targetPulses;
        } else if (filters.orbitId) {
            const phaseIdsInOrbit = allPhases.filter(p => p.life_prk_id === filters.orbitId).map(p => p.id);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phaseIdsInOrbit.includes(pid)));
            itemsToGroup = targetPulses;
        }
    } else if (filters.level === 'phases') {
        if (filters.phaseId) {
            targetPulses = allPulses.filter(p => p.phase_ids.includes(filters.phaseId));
        } else if (filters.orbitId) {
            const phaseIdsInOrbit = allPhases.filter(p => p.life_prk_id === filters.orbitId).map(p => p.id);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phaseIdsInOrbit.includes(pid)));
            itemsToGroup = allPhases.filter(p => phaseIdsInOrbit.includes(p.id));
        } else {
            itemsToGroup = allPhases;
        }
    } else { // Orbits
        if (filters.orbitId) {
            const phaseIdsInOrbit = allPhases.filter(p => p.life_prk_id === filters.orbitId).map(p => p.id);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phaseIdsInOrbit.includes(pid)));
            itemsToGroup = allPhases.filter(p => phaseIdsInOrbit.includes(p.id));
        } else {
            itemsToGroup = allOrbits;
        }
    }

    // 4. Calculate time-series data for the chart
    const chartData: AnalyticsData['chartData'] = [];
    let intervalFunction: (interval: { start: Date; end: Date; }) => Date[];

    if (filters.scale === 'weekly') {
        intervalFunction = (interval) => eachWeekOfInterval(interval, { weekStartsOn: 1 });
    } else if (filters.scale === 'monthly') {
        intervalFunction = eachMonthOfInterval;
    } else {
        intervalFunction = eachDayOfInterval;
    }

    const intervals = intervalFunction({ start: startDate, end: endDate });

    for (const intervalStart of intervals) {
        let intervalEnd: Date;
        if (filters.scale === 'weekly') {
            intervalEnd = endOfWeek(intervalStart, { weekStartsOn: 1 });
        } else if (filters.scale === 'monthly') {
            intervalEnd = endOfMonth(intervalStart);
        } else {
            intervalEnd = endOfDay(intervalStart);
        }

        const progress = calculatePeriodProgress(targetPulses, allProgressLogs, intervalStart, intervalEnd);
        
        const chartEntry: { date: string; progress: number; [key: string]: any } = {
            date: format(intervalStart, 'yyyy-MM-dd'),
            progress: Math.round(progress),
        };

        // Calculate progress for each item in the subgroup (for stacked charts)
        if (itemsToGroup.length > 0) {
            for (const item of itemsToGroup) {
                let itemPulses: Pulse[];
                if ('life_prk_id' in item) { // It's a Phase
                    itemPulses = allPulses.filter(p => p.phase_ids.includes(item.id));
                } else if ('phase_ids' in item) { // It's a Pulse
                    itemPulses = [item as Pulse];
                } else { // It's an Orbit
                    const phaseIds = allPhases.filter(p => p.life_prk_id === item.id).map(p => p.id);
                    itemPulses = allPulses.filter(p => p.phase_ids.some(pid => phaseIds.includes(pid)));
                }
                const itemProgress = calculatePeriodProgress(itemPulses, allProgressLogs, intervalStart, intervalEnd);
                chartEntry[item.title] = Math.round(itemProgress);
            }
        }
        
        chartData.push(chartEntry);
    }

    // 5. Calculate KPIs
    const overallProgress = calculatePeriodProgress(targetPulses, allProgressLogs, startDate, endDate);
    
    let bestDay = { date: 'N/A', progress: 0 };
    let worstDay = { date: 'N/A', progress: 100 };
    let totalProgress = 0;
    let daysWithActivity = 0;

    chartData.forEach(d => {
        if (d.progress > 0) {
            totalProgress += d.progress;
            daysWithActivity++;
        }
        if (d.progress > bestDay.progress) bestDay = { date: d.date, progress: d.progress };
        if (d.progress < worstDay.progress) worstDay = { date: d.date, progress: d.progress };
    });

    const averageProgress = daysWithActivity > 0 ? totalProgress / daysWithActivity : 0;
    const consistency = intervals.length > 0 ? (daysWithActivity / intervals.length) * 100 : 0;

    return {
        kpis: {
            overallProgress: Math.round(overallProgress),
            consistency: Math.round(consistency),
            averageProgress: Math.round(averageProgress),
            bestDay: { ...bestDay, date: bestDay.date !== 'N/A' ? format(parseISO(bestDay.date), 'd MMM', {locale: es}) : 'N/A' },
            worstDay: { ...worstDay, date: worstDay.date !== 'N/A' ? format(parseISO(worstDay.date), 'd MMM', {locale: es}) : 'N/A' },
        },
        chartData,
        allOrbits,
        allPhases,
        allPulses,
    };
}


export async function getGroupsForUser() {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', userId);

    if (error) {
        await logError(error, { at: 'getGroupsForUser' });
        throw error;
    }

    return data.map(item => item.groups).filter(Boolean);
}

/**
 * Fetches all strategic data for the Panel view, ignoring date filters.
 * Progress is calculated based on all available logs up to the current date.
 */
export async function getPanelData(groupId: string | null) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    const today = new Date();
    // A very early date to consider all historical data.
    const historicalStartDate = new Date(2020, 0, 1);

    let lifePrksQuery = supabase.from('life_prks').select('*').eq('archived', false);
    if (groupId) {
        lifePrksQuery = lifePrksQuery.eq('group_id', groupId);
    } else {
        lifePrksQuery = lifePrksQuery.eq('user_id', userId).is('group_id', null);
    }
    const { data: lifePrks, error: lifePrksError } = await lifePrksQuery;
    if (lifePrksError) throw lifePrksError;

    let areaPrksQuery = supabase.from('area_prks').select('*').eq('archived', false);
    if (groupId) {
        areaPrksQuery = areaPrksQuery.eq('group_id', groupId);
    } else {
        areaPrksQuery = areaPrksQuery.eq('user_id', userId).is('group_id', null);
    }
    const { data: areaPrks, error: areaPrksError } = await areaPrksQuery;
    if (areaPrksError) throw areaPrksError;

    const allHabitTasks = await fetchAndMapHabitTasks(userId, groupId);

    let progressLogsQuery = supabase.from('progress_logs').select('*');
    if (groupId) {
        progressLogsQuery = progressLogsQuery.in('habit_task_id', allHabitTasks.map(t => t.id));
    } else {
        progressLogsQuery = progressLogsQuery.eq('user_id', userId);
    }
    const { data: allProgressLogs, error: progressLogsError } = await progressLogsQuery;
    if (progressLogsError) throw progressLogsError;
    
    // Calculate overall progress for each pulse up to today
    const pulsesWithProgress = allHabitTasks
        .filter(t => !t.archived)
        .map(pulse => {
            const progress = calculatePeriodProgress([pulse], allProgressLogs, historicalStartDate, today);
            return { ...pulse, progress };
        });

    // Calculate overall progress for each area up to today
    const areaPrksWithProgress = areaPrks.map(areaPrk => {
        const relevantTasks = pulsesWithProgress.filter(ht => ht.phase_ids.includes(areaPrk.id));
        if (relevantTasks.length === 0) {
            return { ...areaPrk, progress: 0 };
        }
        const totalProgress = relevantTasks.reduce((sum, task) => sum + ((task.progress ?? 0) * task.weight), 0);
        const totalWeight = relevantTasks.reduce((sum, task) => sum + task.weight, 0);
        const progress = totalWeight > 0 ? totalProgress / totalWeight : 0;
        
        return { ...areaPrk, progress };
    });

    // Calculate overall progress for each life prk based on its areas
    const lifePrksWithProgress = lifePrks.map(lifePrk => {
        const relevantAreaPrks = areaPrksWithProgress.filter(ap => ap.life_prk_id === lifePrk.id);
        if (relevantAreaPrks.length === 0) {
            return { ...lifePrk, progress: 0 };
        }
        const totalProgress = relevantAreaPrks.reduce((sum, ap) => sum + (ap.progress ?? 0), 0);
        const progress = totalProgress / relevantAreaPrks.length;
        return { ...lifePrk, progress };
    });

    return {
        orbits: lifePrksWithProgress,
        phases: areaPrksWithProgress,
        allPulses: pulsesWithProgress,
    };
}

export async function getGroupMembers(groupId: string): Promise<{ id: string; email: string | undefined; role: string; avatar_url: string | undefined; full_name: string | undefined }[]> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // First, verify the current user is a member of the group they are trying to view.
    const { data: memberCheck, error: memberCheckError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .single();

    if (memberCheckError || !memberCheck) {
        await logError(new Error('User is not a member of this group or group does not exist.'), { at: 'getGroupMembers', groupId });
        throw new Error("Access denied: You are not a member of this group.");
    }

    // Call the new database function.
    const { data: members, error } = await supabase
        .rpc('get_group_members_with_details', { p_group_id: groupId });

    if (error) {
        await logError(error, { at: 'getGroupMembers RPC call', groupId });
        throw error;
    }

    return members || [];
}

export async function getGroupDetails(groupId: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Verify the current user is a member of the group.
    const { data: memberCheck, error: memberCheckError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .single();

    if (memberCheckError || !memberCheck) {
        await logError(new Error('User is not a member of this group or group does not exist.'), { at: 'getGroupDetails', groupId });
        throw new Error("Access denied: You are not a member of this group.");
    }

    // Fetch the group details.
    const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) {
        await logError(error, { at: 'getGroupDetails', groupId });
        throw error;
    }

    return group;
}