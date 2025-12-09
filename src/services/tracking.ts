
import { Orbit, Phase, Pulse, ProgressLog } from "@/lib/types";
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
    startOfQuarter,
    endOfQuarter,
    areIntervalsOverlapping,
    differenceInWeeks,
    differenceInMonths,
    differenceInDays,
    isAfter,
    isBefore,
    eachWeekOfInterval,
    eachMonthOfInterval,
} from 'date-fns';
import { getNowInChile } from "@/lib/date-utils";

/**
 * Determina si una tarea (especialmente un hábito) está activa en una fecha específica.
 * @param task La tarea a verificar.
 * @param date La fecha a verificar.
 * @returns `true` si la tarea está activa, `false` en caso contrario.
 */
export function isTaskActiveOnDate(task: Pulse, date: Date): boolean {
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
 */
export async function getHabitTasksForDate(date: Date, allHabitTasks: Pulse[], allProgressLogs: ProgressLog[]): Promise<Pulse[]> {
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
 */
export function calculateProgressForDate(date: Date, lifePrks: Orbit[], areaPrks: Phase[], habitTasks: Pulse[]) {
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

export function getActiveCommitments(allHabitTasks: Pulse[], allProgressLogs: ProgressLog[], referenceDate: Date) {
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
            const monthInterval = { start: monthStart, end: monthEnd };
            if (!areIntervalsOverlapping(monthInterval, taskInterval, { inclusive: true })) return false;

            if (task.frequency === 'MENSUAL_ACUMULATIVO_RECURRENTE') {
                if (!task.frequency_interval) return false;
                const monthDiff = differenceInMonths(monthStart, taskStartDate);
                return monthDiff >= 0 && monthDiff % task.frequency_interval === 0;
            }
            return true;
        }

        if (task.frequency.startsWith('TRIMESTRAL')) {
            const quarterInterval = { start: quarterStart, end: quarterEnd };
            if (!areIntervalsOverlapping(quarterInterval, taskInterval, { inclusive: true })) return false;
            // Add recurrent logic if needed in the future
            return true;
        }

        return false;
    }).map(task => {
        let logs: ProgressLog[] = [];
        let periodStartForLogs: Date, periodEndForLogs: Date;

        const freq = task.frequency;

        if (freq?.startsWith('SEMANAL')) {
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

/**
 * Pre-calculates which tasks are active on each day of a given period.
 */
export function getActiveTasksForPeriod(allHabitTasks: Pulse[], periodStart: Date, periodEnd: Date): Record<string, Pulse[]> {
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

/**
 * Calculates the weighted progress for a set of tasks within a given date range.
 */
export function calculatePeriodProgress(tasks: Pulse[], logs: ProgressLog[], startDate: Date, endDate: Date): number {
    let totalWeightedProgress = 0;
    let totalPossibleWeight = 0;
    const today = startOfDay(getNowInChile());

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
                        const weekLogs = logs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: week, end: endOfWeek(week, { weekStartsOn: 1 }) }));
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
                    if (getActiveCommitments([task], [], month).length > 0) {
                        opportunityCount++;
                        const monthLogs = logs.filter(log => log.habit_task_id === task.id && isWithinInterval(parseISO(log.completion_date), { start: month, end: endOfMonth(month) }));
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
                if (opportunityCount > 0) periodProgress = periodProgress / opportunityCount;

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
