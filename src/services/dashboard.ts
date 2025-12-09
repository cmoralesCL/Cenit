
import { createClient } from "@/lib/supabase/server";
import { DailyProgressSnapshot, ProgressLog, Pulse, WeeklyProgressSnapshot } from "@/lib/types";
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, startOfMonth, endOfMonth } from 'date-fns';
import { getNowInChile, getChileDateString } from "@/lib/date-utils";
import { logError } from "@/lib/logger";
import { redirect } from "next/navigation";
import { fetchAndMapHabitTasks } from "./pulses";
import { getActiveTasksForPeriod, calculateProgressForDate, getActiveCommitments, calculatePeriodProgress } from "./tracking";
import { calculateMonthlyProgress, calculateWeeklyProgress } from "./analytics";

async function getCurrentUserId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }
    return user.id;
}

export async function getDashboardData(selectedDateString: string | undefined, groupId: string | null) {
    const dateToUse = selectedDateString || getChileDateString();
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
        await logError(lifePrksError, { at: 'getDashboardData - lifePrks' });
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
        await logError(areaPrksError, { at: 'getDashboardData - areaPrks' });
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
        await logError(progressLogsError, { at: 'getDashboardData - allProgressLogs' });
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
            const completionLog = logsForDayInLoop.find((log: ProgressLog) => log.habit_task_id === task.id);
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
            const completionLog = logsForDay.find((log: ProgressLog) => log.habit_task_id === task.id);

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
 * Fetches all strategic data for the Panel view, ignoring date filters.
 * Progress is calculated based on all available logs up to the current date.
 */
export async function getPanelData(groupId: string | null) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    const today = getNowInChile();
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
