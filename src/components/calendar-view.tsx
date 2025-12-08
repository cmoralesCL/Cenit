
'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parse } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

import { ProgressCalendar } from '@/components/progress-calendar';
import { AddPulseDialog, type PulseFormValues } from './add-habit-task-dialog';
import type { DailyProgressSnapshot, Pulse, Phase, WeeklyProgressSnapshot } from '@/lib/types';
import { addPulse, updatePulse, archivePulse } from '@/app/actions';
import { DayDetailDialog } from './day-detail-dialog';
import { CommitmentsCard } from './commitments-card';

interface CalendarViewProps {
    initialMonthString: string;
    dailyProgressData: DailyProgressSnapshot[];
    habitTasksData: Record<string, Pulse[]>;
    areaPrks: Phase[];
    weeklyProgressData: WeeklyProgressSnapshot[];
    monthlyProgress: number;
    commitments: Pulse[];
    onDayClick: (day: Date) => void;
    onToggleCommitment: (id: string, completed: boolean, date: Date, progressValue?: number) => void;
    onUndoCommitment: (id: string, date: Date) => void;
    onEditCommitment: (task: Pulse) => void;
    onArchiveCommitment: (id: string) => void;
}

export function CalendarView({ 
    initialMonthString, 
    dailyProgressData, 
    habitTasksData, 
    areaPrks,
    orbits,
    weeklyProgressData,
    monthlyProgress,
    commitments,
    onDayClick,
    onToggleCommitment,
    onUndoCommitment,
    onEditCommitment,
    onArchiveCommitment,
}: CalendarViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [isPulseDialogOpen, setPulseDialogOpen] = useState(false);
    const [editingPulse, setEditingPulse] = useState<Pulse | null>(null);
    const [selectedDateForDialog, setSelectedDateForDialog] = useState<Date | undefined>(undefined);
    
    const [isDayDetailOpen, setDayDetailOpen] = useState(false);
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<Date | null>(null);

    const handleMonthChange = (newMonth: Date) => {
        startTransition(() => {
            router.push(`/calendar?month=${format(newMonth, 'yyyy-MM-dd')}`);
        });
    }

    const handleOpenAddPulseDialog = (date: Date) => {
        setEditingPulse(null);
        setSelectedDateForDialog(date);
        setPulseDialogOpen(true);
    };

    const handleOpenEditPulseDialog = (pulse: Pulse, date: Date) => {
        setEditingPulse(pulse);
        setSelectedDateForDialog(date);
        setPulseDialogOpen(true);
    };

    const handleOpenDayDetail = (day: Date) => {
        setSelectedDayForDetail(day);
        setDayDetailOpen(true);
    };
    
    const handleCloseDayDetail = () => {
        setDayDetailOpen(false);
    }

    const handleSavePulse = (values: PulseFormValues) => {
        startTransition(async () => {
            try {
                const pulseData: Partial<Pulse> = {
                    title: values.title,
                    type: values.type,
                    phase_ids: values.phase_ids,
                    start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : undefined,
                    due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
                    frequency: values.frequency,
                    frequency_days: values.frequency_days,
                    weight: values.weight,
                    is_critical: values.is_critical,
                    measurement_type: values.measurement_type,
                    measurement_goal: values.measurement_goal,
                };
                
                if (editingPulse) {
                    await updatePulse(editingPulse.id, pulseData);
                    toast({ title: '¡Pulso Actualizado!', description: `Se ha actualizado "${values.title}".` });
                } else {
                    await addPulse(pulseData);
                    toast({ title: '¡Pulso Agregado!', description: `Se ha agregado "${values.title}".` });
                }
            } catch (error) {
                console.error("Error al guardar el Pulso:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el Pulso.' });
            }
        });
    };

    const handleArchivePulse = (id: string, date: Date) => {
        startTransition(async () => {
            try {
                await archivePulse(id, date.toISOString());
                toast({ title: 'Pulso Archivado' });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar el Pulso.' });
            }
        });
    }
    
    const currentMonth = parse(initialMonthString, 'yyyy-MM-dd', new Date());

    return (
        <>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                <ProgressCalendar
                  currentMonth={currentMonth}
                  onMonthChange={handleMonthChange}
                  dailyProgressData={dailyProgressData}
                  habitTasksData={habitTasksData}
                  weeklyProgressData={weeklyProgressData}
                  monthlyProgress={monthlyProgress}
                  onDayClick={onDayClick}
                />
                 
            </main>
            <AddPulseDialog 
                isOpen={isPulseDialogOpen}
                onOpenChange={setPulseDialogOpen}
                onSave={handleSavePulse}
                pulse={editingPulse}
                defaultDate={selectedDateForDialog}
                phases={areaPrks}
            />
            <DayDetailDialog 
                isOpen={isDayDetailOpen}
                onOpenChange={handleCloseDayDetail}
                day={selectedDayForDetail}
                tasks={selectedDayForDetail ? habitTasksData[format(selectedDayForDetail, 'yyyy-MM-dd')] || [] : []}
                onAddTask={(date) => {
                    handleCloseDayDetail(); 
                    handleOpenAddPulseDialog(date);
                }}
                onEditTask={(task, date) => {
                    handleCloseDayDetail();
                    handleOpenEditPulseDialog(task, date);
                }}
                onArchiveTask={handleArchivePulse}
            />
        </>
    );
}

    