

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import type { DailyProgressSnapshot, Pulse, Phase, WeeklyProgressSnapshot, HabitFrequency } from '@/lib/types';
import { addPulse, updatePulse, archivePulse, logPulseCompletion, removePulseCompletion } from '@/app/actions';

import { CalendarView } from '@/components/calendar-view';
import { CommitmentsSidebar } from '@/components/commitments-sidebar';
import { DayDetailDialog } from './day-detail-dialog';
import { AddPulseDialog, type PulseFormValues } from './add-habit-task-dialog';

interface CalendarPageClientProps {
    initialData: {
        dailyProgress: DailyProgressSnapshot[];
        habitTasks: Record<string, Pulse[]>;
        areaPrks: Phase[];
        weeklyProgress: WeeklyProgressSnapshot[];
        monthlyProgress: number;
        commitments: Pulse[];
    };
    initialMonthString: string;
}

export function CalendarPageClient({ initialData, initialMonthString }: CalendarPageClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSidebarOpen, setSidebarOpen] = useState(true);

    const [isPulseDialogOpen, setPulseDialogOpen] = useState(false);
    const [editingPulse, setEditingPulse] = useState<Pulse | null>(null);
    const [selectedDateForDialog, setSelectedDateForDialog] = useState<Date | undefined>(undefined);
    const [defaultPulseValues, setDefaultPulseValues] = useState<Partial<PulseFormValues> | undefined>(undefined);

    const [isDayDetailOpen, setDayDetailOpen] = useState(false);
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<Date | null>(null);
    const [wasCommitmentPanelOpen, setWasCommitmentPanelOpen] = useState(false);
    
    // Reference date for actions is now always the current date.
    const [referenceDate, setReferenceDate] = useState(() => new Date());

    const handleOpenAddPulseDialog = (date: Date) => {
        setEditingPulse(null);
        setDefaultPulseValues(undefined);
        setSelectedDateForDialog(date);
        setPulseDialogOpen(true);
    };

    const handleOpenEditPulseDialog = (pulse: Pulse, date?: Date) => {
        setEditingPulse(pulse);
        setDefaultPulseValues(undefined);
        setSelectedDateForDialog(date || new Date());
        setPulseDialogOpen(true);
    };

    const handleOpenAddCommitmentDialog = (frequency: HabitFrequency) => {
        setEditingPulse(null);
        setSelectedDateForDialog(new Date()); 
        setDefaultPulseValues({
            type: 'habit',
            frequency: frequency,
        });
        setPulseDialogOpen(true);
    };

    const handleOpenDayDetail = (day: Date) => {
        setSelectedDayForDetail(day);
        setDayDetailOpen(true);
    };
    
    const handleCloseDayDetail = () => {
        setDayDetailOpen(false);
        setWasCommitmentPanelOpen(false);
    }

    const handleDayClick = (day: Date) => {
        handleOpenDayDetail(day);
    }

    const handleSavePulse = (values: Partial<Pulse>) => {
        startTransition(async () => {
            try {
                if (editingPulse) {
                    await updatePulse(editingPulse.id, values);
                    toast({ title: '¡Pulso Actualizado!', description: `Se ha actualizado "${values.title}".` });
                } else {
                    await addPulse(values);
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

    const handleToggleCommitment = (id: string, completed: boolean, date: Date, progressValue?: number) => {
        const task = initialData.commitments.find(ht => ht.id === id);
        if (!task) return;

        const completionDate = date.toISOString().split('T')[0];
        
        startTransition(async () => {
            try {
                await logPulseCompletion(id, task.type, completionDate, progressValue);
                toast({ title: '¡Progreso registrado!' });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la acción.' });
            }
        });
    };

    const handleUndoCommitment = (id: string, date: Date) => {
        const task = initialData.commitments.find(ht => ht.id === id);
        if (!task) return;

        const completionDate = date.toISOString().split('T')[0];
        startTransition(async () => {
            try {
                await removePulseCompletion(id, task.type, completionDate);
                toast({ title: 'Registro deshecho' });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo deshacer la acción.' });
            }
        });
    };


        return (
        <div className="flex flex-col flex-1">
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <CalendarView
                    initialMonthString={initialMonthString}
                    dailyProgressData={initialData.dailyProgress}
                    habitTasksData={initialData.habitTasks}
                    areaPrks={initialData.areaPrks || []}
                    orbits={initialData.orbits || []}
                    weeklyProgressData={initialData.weeklyProgress || []}
                    monthlyProgress={initialData.monthlyProgress}
                    commitments={initialData.commitments}
                    onDayClick={handleDayClick}
                    onToggleCommitment={handleToggleCommitment}
                    onUndoCommitment={handleUndoCommitment}
                    onEditCommitment={handleOpenEditPulseDialog}
                    onArchiveCommitment={(id) => handleArchivePulse(id, new Date())}
                />
                <div className="mt-8">
                    <CommitmentsSidebar
                        commitments={initialData.commitments || []}
                        selectedDate={referenceDate}
                        isOpen={true}
                        setIsOpen={() => {}}
                        onAddCommitment={handleOpenAddCommitmentDialog}
                        onEditCommitment={handleOpenEditPulseDialog}
                    />
                </div>
            </main>
            <DayDetailDialog 
                isOpen={isDayDetailOpen}
                onOpenChange={handleCloseDayDetail}
                day={selectedDayForDetail}
                tasks={selectedDayForDetail ? initialData.habitTasks[format(selectedDayForDetail, 'yyyy-MM-dd')] || [] : []}
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
             <AddPulseDialog 
                isOpen={isPulseDialogOpen}
                onOpenChange={setPulseDialogOpen}
                onSave={handleSavePulse}
                pulse={editingPulse}
                defaultDate={selectedDateForDialog}
                phases={initialData.areaPrks}
                defaultValues={defaultPulseValues}
            />
        </div>
    );
}

    