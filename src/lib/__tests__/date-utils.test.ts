
import { describe, it, expect, vi } from 'vitest';
import { getNowInChile, startOfSemester, endOfSemester } from '../date-utils';
import { format } from 'date-fns';

describe('date-utils', () => {
    describe('startOfSemester', () => {
        it('debería retornar 1 de Enero para el primer semestre (Ene-Jun)', () => {
            const date = new Date('2025-04-15');
            const start = startOfSemester(date);
            expect(start.getMonth()).toBe(0); // Enero
            expect(start.getDate()).toBe(1);
            expect(start.getFullYear()).toBe(2025);
        });

        it('debería retornar 1 de Julio para el segundo semestre (Jul-Dic)', () => {
            const date = new Date('2025-10-31');
            const start = startOfSemester(date);
            expect(start.getMonth()).toBe(6); // Julio
            expect(start.getDate()).toBe(1);
            expect(start.getFullYear()).toBe(2025);
        });
    });

    describe('endOfSemester', () => {
        it('debería retornar 30 de Junio para el primer semestre', () => {
            const date = new Date('2025-02-01');
            const end = endOfSemester(date);
            expect(end.getMonth()).toBe(5); // Junio
            expect(end.getDate()).toBe(30);
            expect(end.getFullYear()).toBe(2025);
        });

        it('debería retornar 31 de Diciembre para el segundo semestre', () => {
            const date = new Date('2025-08-15');
            const end = endOfSemester(date);
            expect(end.getMonth()).toBe(11); // Diciembre
            expect(end.getDate()).toBe(31);
            expect(end.getFullYear()).toBe(2025);
        });
    });
});
