
import { describe, it, expect } from 'vitest';
import { calculatePeriodProgress, isTaskActiveOnDate } from '../tracking';
import { Pulse, ProgressLog } from '@/lib/types';

// Mocks simples de datos
const mockPulseDaily: Pulse = {
    id: 'pulse-1',
    user_id: 'user-1',
    life_prk_id: 'orbit-1',
    phase_ids: ['phase-1'],
    title: 'Daily Habit',
    type: 'habit',
    frequency: 'DIARIA',
    weight: 1,
    start_date: '2025-01-01',
    created_at: '2025-01-01T00:00:00Z',
    archived: false
};

const mockPulseWeekly: Pulse = {
    ...mockPulseDaily,
    id: 'pulse-2',
    title: 'Weekly Habit',
    frequency: 'SEMANAL_DIAS_FIJOS',
    frequency_days: ['L', 'X', 'V'], // Lunes, Miércoles, Viernes
};

describe('calculatePeriodProgress', () => {
    it('debería calcular 100% si se completan todos los días', () => {
        const startDate = new Date('2025-01-01T00:00:00'); // Miércoles
        const endDate = new Date('2025-01-03T23:59:59');   // Viernes
        // Días activos: 1 (Mié), 2 (Jue), 3 (Vie) = 3 días

        const logs: ProgressLog[] = [
            { id: '1', user_id: 'u1', habit_task_id: 'pulse-1', completion_date: '2025-01-01', completion_percentage: 1, created_at: '' },
            { id: '2', user_id: 'u1', habit_task_id: 'pulse-1', completion_date: '2025-01-02', completion_percentage: 1, created_at: '' },
            { id: '3', user_id: 'u1', habit_task_id: 'pulse-1', completion_date: '2025-01-03', completion_percentage: 1, created_at: '' },
        ];

        const progress = calculatePeriodProgress([mockPulseDaily], logs, startDate, endDate);
        expect(progress).toBe(100);
    });

    it('debería calcular 0% si no hay logs', () => {
        const startDate = new Date('2025-01-01T00:00:00');
        const endDate = new Date('2025-01-01T23:59:59');
        const progress = calculatePeriodProgress([mockPulseDaily], [], startDate, endDate);
        expect(progress).toBe(0);
    });

    it('debería calcular 50% si se completa la mitad de los días', () => {
        const startDate = new Date('2025-01-01T00:00:00'); // 1
        const endDate = new Date('2025-01-02T23:59:59');   // 2
        // Total 2 días

        const logs: ProgressLog[] = [
            { id: '1', user_id: 'u1', habit_task_id: 'pulse-1', completion_date: '2025-01-01', completion_percentage: 1, created_at: '' },
        ];

        const progress = calculatePeriodProgress([mockPulseDaily], logs, startDate, endDate);
        expect(progress).toBe(50);
    });
});

describe('isTaskActiveOnDate', () => {
    it('debería retornar false antes de la fecha de inicio', () => {
        const date = new Date('2024-12-31T00:00:00');
        expect(isTaskActiveOnDate(mockPulseDaily, date)).toBe(false);
    });

    it('debería retornar true en la fecha de inicio', () => {
        const date = new Date('2025-01-01T00:00:00');
        expect(isTaskActiveOnDate(mockPulseDaily, date)).toBe(true);
    });

    it('debería respetar frecuencia semanal (L-X-V)', () => {
        // Enero 2025:
        // 1 = Miércoles (Active)
        // 2 = Jueves (Inactive)
        // 3 = Viernes (Active)
        // 4 = Sábado (Inactive)

        expect(isTaskActiveOnDate(mockPulseWeekly, new Date('2025-01-01T00:00:00'))).toBe(true); // Mié
        expect(isTaskActiveOnDate(mockPulseWeekly, new Date('2025-01-02T00:00:00'))).toBe(false); // Jue
        expect(isTaskActiveOnDate(mockPulseWeekly, new Date('2025-01-03T00:00:00'))).toBe(true); // Vie
        expect(isTaskActiveOnDate(mockPulseWeekly, new Date('2025-01-04T00:00:00'))).toBe(false); // Sáb
    });
});
