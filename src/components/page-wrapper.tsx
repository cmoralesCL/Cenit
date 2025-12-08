
'use client';

import { useState, useTransition, ReactNode, useEffect } from 'react';
import { AddOrbitDialog } from './add-life-prk-dialog';
import { AddPhaseDialog } from './add-area-prk-dialog';
import { AddPulseDialog } from './add-habit-task-dialog';
import { DialogProvider } from '@/hooks/use-dialog';
import type { Orbit, Phase, Pulse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addOrbit, updateOrbit, addPhase, addPulse } from '@/app/actions';
import { createClient } from '@/lib/supabase/client';

export function PageWrapper({ children }: { children: ReactNode }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // State for all dialogs, managed globally here
    const [isOrbitDialogOpen, setOrbitDialogOpen] = useState(false);
    const [isPhaseDialogOpen, setPhaseDialogOpen] = useState(false);
    const [isPulseDialogOpen, setPulseDialogOpen] = useState(false);

    // State for editing items
    const [editingOrbit, setEditingOrbit] = useState<Orbit | null>(null);
    const [phases, setPhases] = useState<Phase[]>([]);

    useEffect(() => {
        const fetchPhases = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data, error } = await supabase.from('area_prks').select('*').eq('user_id', user.id);
                if (error) {
                    console.error('Error fetching phases:', error);
                } else {
                    setPhases(data || []);
                }
            }
        };

        if (isPulseDialogOpen) {
            fetchPhases();
        }
    }, [isPulseDialogOpen]);

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
    
    const handleSavePhase = (values: { title: string; description?: string; life_prk_id: string }) => {
        startTransition(async () => {
            try {
                await addPhase(values);
                toast({ title: '¡Fase Establecida!', description: `Ahora estás siguiendo "${values.title}".` });
            } catch (error) {
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la Fase.' });
            }
        });
    }

    const handleSavePulse = (values: Partial<Omit<Pulse, 'id' | 'created_at' | 'archived_at' | 'archived'>>) => {
        startTransition(async () => {
            try {
                await addPulse(values);
                toast({ title: '¡Pulso Agregado!', description: `Se ha agregado "${values.title}".` });
            } catch (error) {
                console.error("Error al guardar el Pulso:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el Pulso. Revisa los campos e inténtalo de nuevo.' });
            }
        });
    };

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
                phases={phases}
                defaultDate={new Date()}
            />
        </DialogProvider>
    );
}
