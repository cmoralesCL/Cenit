'use server';

import * as tracking from '@/services/tracking';
import * as pulses from '@/services/pulses';
import * as analytics from '@/services/analytics';
import * as dashboard from '@/services/dashboard';
import * as groups from '@/services/groups';
import * as dateUtils from '@/lib/date-utils';
import { Pulse, ProgressLog, Orbit, Phase, AnalyticsData } from '@/lib/types';

// Tracking
export async function isTaskActiveOnDate(task: Pulse, date: Date) { return tracking.isTaskActiveOnDate(task, date); }
export async function getHabitTasksForDate(date: Date, allHabitTasks: Pulse[], allProgressLogs: ProgressLog[]) { return tracking.getHabitTasksForDate(date, allHabitTasks, allProgressLogs); }
export async function calculateProgressForDate(date: Date, lifePrks: Orbit[], areaPrks: Phase[], habitTasks: Pulse[]) { return tracking.calculateProgressForDate(date, lifePrks, areaPrks, habitTasks); }
export async function getActiveCommitments(allHabitTasks: Pulse[], allProgressLogs: ProgressLog[], referenceDate: Date) { return tracking.getActiveCommitments(allHabitTasks, allProgressLogs, referenceDate); }
export async function getActiveTasksForPeriod(allHabitTasks: Pulse[], periodStart: Date, periodEnd: Date) { return tracking.getActiveTasksForPeriod(allHabitTasks, periodStart, periodEnd); }
export async function calculatePeriodProgress(tasks: Pulse[], logs: ProgressLog[], startDate: Date, endDate: Date) { return tracking.calculatePeriodProgress(tasks, logs, startDate, endDate); }

// Pulses
export async function fetchAndMapHabitTasks(userId: string, groupId: string | null) { return pulses.fetchAndMapHabitTasks(userId, groupId); }

// Analytics
export async function calculateWeeklyProgress(selectedDate: Date, allHabitTasks: Pulse[], allProgressLogs: ProgressLog[], habitTasksByDay: Record<string, Pulse[]>, logsByDay: Record<string, ProgressLog[]>) { return analytics.calculateWeeklyProgress(selectedDate, allHabitTasks, allProgressLogs, habitTasksByDay, logsByDay); }
export async function calculateMonthlyProgress(referenceDate: Date, allHabitTasks: Pulse[], allProgressLogs: ProgressLog[], habitTasksByDay: Record<string, Pulse[]>, logsByDay: Record<string, ProgressLog[]>) { return analytics.calculateMonthlyProgress(referenceDate, allHabitTasks, allProgressLogs, habitTasksByDay, logsByDay); }
export async function getAnalyticsData(filters: Parameters<typeof analytics.getAnalyticsData>[0], groupId: string | null) { return analytics.getAnalyticsData(filters, groupId); }

// Dashboard
export async function getDashboardData(selectedDateString: string | undefined, groupId: string | null) { return dashboard.getDashboardData(selectedDateString, groupId); }
export async function getCalendarData(monthDate: Date, groupId: string | null) { return dashboard.getCalendarData(monthDate, groupId); }
export async function getPanelData(groupId: string | null) { return dashboard.getPanelData(groupId); }

// Groups
export async function getGroupsForUser() { return groups.getGroupsForUser(); }
export async function getGroupMembers(groupId: string) { return groups.getGroupMembers(groupId); }
export async function getGroupDetails(groupId: string) { return groups.getGroupDetails(groupId); }

// Date Utils
export async function startOfSemester(date: Date) { return dateUtils.startOfSemester(date); }
export async function endOfSemester(date: Date) { return dateUtils.endOfSemester(date); }