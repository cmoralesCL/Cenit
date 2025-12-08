
'use client';

import { useState, useTransition, ReactNode } from 'react';
import { AddOrbitDialog } from './add-life-prk-dialog';
import { AddPhaseDialog } from './add-area-prk-dialog';
import { AddPulseDialog } from './add-habit-task-dialog';
import { DialogProvider } from '@/hooks/use-dialog';
import type { Orbit, Phase, Pulse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addOrbit, updateOrbit, addPhase, addPulse } from '@/app/actions';

export function PageWrapper({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // State for all dialogs, managed globally here
    const [isOrbitDialogOpen, setOrbitDialogOpen] = useState(false);
    const [isPhaseDialogOpen, setPhaseDialogOpen] = useState(false);
    const [isPulseDialogOpen, setPulseDialogOpen] = useState(false);

    // State for editing items
    const [editingOrbit, setEditingOrbit] = useState<Orbit | null>(null);

    const handleOpenOrbit = (orbit?: Orbit | null) => {
        setEditingOrbit(orbit || null);
        setOrbitDialogOpen(true);
    };
    
    const handleOpenPhase = () => setPhaseDialogOpen(true);
    const handleOpenPulse = () => setPulseDialogOpen(true);


    const handleSaveOrbit = (values: { title: string; description?: string, color_theme?: string }) => {
        startTransition(async () => {
            try {
                if (editingOrbit) {
                    await updateOrbit(editingOrbit.id, values);
                    toast({ title: '¡Órbita Actualizada!', description: `Se ha actualizado "${values.title}".` });
                } else {
                    await addOrbit(values);
                    toast({ title: '¡Órbita Agregada!', description: `"${values.title}" es ahora uno de tus pilares de vida.` });
                }
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la Órbita.' });
            }
        });
    };
    
    // Placeholder handlers for Phase and Pulse, as they need more context from the page
    const handleSavePhase = (values: any) => {
        console.warn("Save Phase from wrapper is not fully implemented and needs page context.");
        // This would typically be handled within the page component itself
        setPhaseDialogOpen(false);
    }
     const handleSavePulse = (values: any) => {
        console.warn("Save Pulse from wrapper is not fully implemented and needs page context.");
        setPulseDialogOpen(false);
    }

    return (
        <DialogProvider value={{ 
            setOrbitToEdit: handleOpenOrbit, 
            onOpenOrbit: () => handleOpenOrbit(null),
            onOpenPhase: handleOpenPhase,
            onOpenPulse: handleOpenPulse,
        }}>
            {children}
            <AddOrbitDialog
                isOpen={isOrbitDialogOpen}
                onOpenChange={setOrbitDialogOpen}
                onSave={handleSaveOrbit}
                orbit={editingOrbit}
            />
             {/* Note: These dialogs will lack context like which Orbit/Phase they belong to.
                 The individual page components will need to render their own dialog instances for a complete UX.
                 This is a simplified global handler for the FAB.
             */}
            <AddPhaseDialog
                isOpen={isPhaseDialogOpen}
                onOpenChange={setPhaseDialogOpen}
                onSave={handleSavePhase}
                phase={null}
            />
            <AddPulseDialog
                isOpen={isPulseDialogOpen}
                onOpenChange={setPulseDialogOpen}
                onSave={handleSavePulse}
                pulse={null}
                phases={[]}
                defaultDate={new Date()}
            />
        </DialogProvider>
    );
}
