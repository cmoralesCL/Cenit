
import { createClient } from "@/lib/supabase/server";
import { parseISO, format, startOfMonth, startOfWeek, endOfWeek, endOfMonth, eachDayOfInterval, isAfter, isBefore, addDays, getYear, eachWeekOfInterval, subDays, subMonths, startOfYear, endOfDay, startOfDay, eachMonthOfInterval, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { AnalyticsData, Orbit, Phase, Pulse, ProgressLog } from "@/lib/types";
import { getNowInChile, startOfSemester, endOfSemester } from "@/lib/date-utils";
import { fetchAndMapHabitTasks } from "./pulses";
import { getActiveCommitments, calculatePeriodProgress } from "./tracking";
import { redirect } from "next/navigation";

async function getCurrentUserId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        redirect('/login');
    }
    return user.id;
}

export async function calculateWeeklyProgress(
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
                const completionLog = logsForThisDay.find((log: ProgressLog) => log.habit_task_id === task.id);

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


export async function calculateMonthlyProgress(
    referenceDate: Date,
    allHabitTasks: Pulse[],
    allProgressLogs: ProgressLog[],
    habitTasksByDay: Record<string, Pulse[]>, // Now passed in
    logsByDay: Record<string, ProgressLog[]>      // Now passed in
): Promise<number> {
    const monthStart = startOfMonth(referenceDate);
    const today = getNowInChile();
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
            const completionLog = logsForThisDay.find((log: ProgressLog) => log.habit_task_id === task.id);

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

            while (weekStart <= calculationEndDate) {
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
            if (weeksInPeriod > 0) periodProgress = totalWeeklyProgress / weeksInPeriod;

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
    const today = getNowInChile();
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
    } else if (typeof filters.timePeriod === 'object' && 'from' in filters.timePeriod) {
        startDate = startOfDay(filters.timePeriod.from);
        endDate = endOfDay(filters.timePeriod.to);
    } else {
        startDate = startOfDay(subDays(today, 29));
    }

    // 2. Fetch all base data concurrently
    const allPulsesPromise = fetchAndMapHabitTasks(userId, groupId);

    const lifePrksQuery = supabase.from('life_prks').select('*').eq('archived', false);
    if (groupId) lifePrksQuery.eq('group_id', groupId);
    else lifePrksQuery.eq('user_id', userId).is('group_id', null);

    const areaPrksQuery = supabase.from('area_prks').select('*').eq('archived', false);
    if (groupId) areaPrksQuery.eq('group_id', groupId);
    else areaPrksQuery.eq('user_id', userId).is('group_id', null);

    const [allPulses, { data: allOrbits, error: lifePrksError }, { data: allPhases, error: areaPrksError }] = await Promise.all([
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

    // Helper to find phases/orbits
    const getPhaseIdsInOrbit = (oid: string) => allPhases!.filter(p => p.life_prk_id === oid).map(p => p.id);

    if (filters.level === 'pulses') {
        if (filters.pulseId) {
            targetPulses = allPulses.filter(p => p.id === filters.pulseId);
            itemsToGroup = targetPulses; // Group by the single pulse (or multiple if we selected multple)
        } else if (filters.phaseId) {
            targetPulses = allPulses.filter(p => p.phase_ids.includes(filters.phaseId!));
            itemsToGroup = targetPulses;
        } else if (filters.orbitId) {
            const phases = getPhaseIdsInOrbit(filters.orbitId);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phases.includes(pid)));
            itemsToGroup = targetPulses;
        } else {
            itemsToGroup = targetPulses; // All pulses if no filter
        }
    } else if (filters.level === 'phases') {
        if (filters.phaseId) {
            targetPulses = allPulses.filter(p => p.phase_ids.includes(filters.phaseId!));
            itemsToGroup = allPhases!.filter(p => p.id === filters.phaseId);
        } else if (filters.orbitId) {
            const phases = getPhaseIdsInOrbit(filters.orbitId);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phases.includes(pid)));
            itemsToGroup = allPhases!.filter(p => phases.includes(p.id));
        } else {
            itemsToGroup = allPhases!;
        }
    } else { // Orbits
        if (filters.orbitId) {
            const phases = getPhaseIdsInOrbit(filters.orbitId);
            targetPulses = allPulses.filter(p => p.phase_ids.some(pid => phases.includes(pid)));
            itemsToGroup = allOrbits!.filter(o => o.id === filters.orbitId);
        } else {
            itemsToGroup = allOrbits!;
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

        // Clamp intervalEnd to not exceed global endDate
        if (isAfter(intervalEnd, endDate)) intervalEnd = endDate;

        const progress = calculatePeriodProgress(targetPulses, allProgressLogs, intervalStart, intervalEnd);

        const chartEntry: { date: string; progress: number;[key: string]: string | number } = {
            date: format(intervalStart, 'yyyy-MM-dd'),
            progress: Math.round(progress),
        };

        // Calculate progress for each item in the subgroup (for stacked/attr charts)
        if (itemsToGroup.length > 0) {
            for (const item of itemsToGroup) {
                let itemPulses: Pulse[] = [];
                if ('life_prk_id' in item) { // It's a Phase
                    itemPulses = allPulses.filter(p => p.phase_ids.includes(item.id));
                } else if ('phase_ids' in item) { // It's a Pulse
                    itemPulses = [item as Pulse];
                } else { // It's an Orbit
                    const phaseIds = allPhases!.filter(p => p.life_prk_id === item.id).map(p => p.id);
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
        if (d.progress >= bestDay.progress) bestDay = { date: d.date, progress: d.progress };
        if (d.progress <= worstDay.progress && d.progress > 0) worstDay = { date: d.date, progress: d.progress };
        // Note: Logic for worst day might need refinement to ignore future days or 0 days if deemed 'inactive'
    });

    // Handle case where worst day is still default
    if (worstDay.progress === 100 && totalProgress === 0) worstDay.progress = 0;

    const averageProgress = daysWithActivity > 0 ? totalProgress / daysWithActivity : 0;
    const consistency = intervals.length > 0 ? (daysWithActivity / intervals.length) * 100 : 0;

    return {
        kpis: {
            overallProgress: Math.round(overallProgress),
            consistency: Math.round(consistency),
            averageProgress: Math.round(averageProgress),
            bestDay: { ...bestDay, date: bestDay.date !== 'N/A' ? format(parseISO(bestDay.date), 'd MMM', { locale: es }) : 'N/A' },
            worstDay: { ...worstDay, date: worstDay.date !== 'N/A' ? format(parseISO(worstDay.date), 'd MMM', { locale: es }) : 'N/A' },
        },
        chartData,
        allOrbits: allOrbits || [],
        allPhases: allPhases || [],
        allPulses: allPulses || [],
    };
}
