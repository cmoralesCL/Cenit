'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LifePrkSection } from './life-prk-section';
import { AddPhaseDialog, type PhaseFormValues } from './add-area-prk-dialog';
import { AddPulseDialog, PulseFormValues } from './add-habit-task-dialog';
import type { Orbit, Phase, Pulse } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { 
    addPhase, 
    updatePhase,
    addPulse, 
    updatePulse,
    archiveOrbit,
    archivePhase,
    archivePulse,
} from '@/app/actions';
import { Button } from './ui/button';
import { Accordion } from '@/components/ui/accordion';
import { useDialog } from '@/hooks/use-dialog';
import { Plus } from 'lucide-react';

interface PanelProps {
  orbits: Orbit[];
  phases: Phase[];
  allPulses: Pulse[];
}

export function Panel({
  orbits,
  phases,
  allPulses,
}: PanelProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const { setOrbitToEdit } = useDialog();

  const [openOrbitIds, setOpenOrbitIds] = useState<string[]>([]);

  useEffect(() => {
    // Initialize open orbits only on the client side after mount
    // to avoid hydration mismatch.
    setOpenOrbitIds(orbits.map(lp => lp.id));
  }, [orbits]);


  const [isPhaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [isPulseDialogOpen, setPulseDialogOpen] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [editingPulse, setEditingPulse] = useState<Pulse | null>(null);
  const [activeOrbitId, setActiveOrbitId] = useState<string | null>(null);
  const [activePhaseIds, setActivePhaseIds] = useState<string[]>([]);


  const handleOpenEditOrbitDialog = (orbit: Orbit) => {
    setOrbitToEdit(orbit);
  };

  const handleOpenAddPhaseDialog = (orbitId: string) => {
    setActiveOrbitId(orbitId);
    setEditingPhase(null);
    setPhaseDialogOpen(true);
  }

  const handleOpenEditPhaseDialog = (phase: Phase) => {
    setActiveOrbitId(phase.life_prk_id);
    setEditingPhase(phase);
    setPhaseDialogOpen(true);
  }

  const handleSavePhase = (values: PhaseFormValues) => {
     startTransition(async () => {
        try {
          if (editingPhase) {
            await updatePhase(editingPhase.id, values);
            toast({ title: '¡Fase Actualizada!', description: `Se ha actualizado "${values.title}".` });
          } else {
            await addPhase(values);
            toast({ title: '¡Fase Establecida!', description: `Ahora estás siguiendo "${values.title}".` });
          }
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar la Fase.' });
        }
    });
  };

  const handleOpenAddPulseDialog = (phaseId: string) => {
    setActivePhaseIds([phaseId]);
    setEditingPulse(null);
    setPulseDialogOpen(true);
  };

  const handleOpenEditPulseDialog = (pulse: Pulse) => {
    setEditingPulse(pulse);
    setActivePhaseIds(pulse.phase_ids);
    setPulseDialogOpen(true);
  };

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
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo guardar el Pulso. Revisa los campos e inténtalo de nuevo.' });
        }
    });
  };
  
  const handleArchiveOrbit = (id: string) => {
    startTransition(async () => {
        try {
          await archiveOrbit(id);
          toast({ title: 'Órbita Archivada' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar la Órbita.' });
        }
    });
  };

  const handleArchivePhase = (id: string) => {
    startTransition(async () => {
        try {
          await archivePhase(id);
          toast({ title: 'Fase Archivada' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar la Fase.' });
        }
    });
  };

  const handleArchivePulse = (id: string) => {
    startTransition(async () => {
        try {
          await archivePulse(id, new Date().toISOString());
          toast({ title: 'Pulso Archivado' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar el Pulso.' });
        }
    });
  };
  
  return (
    <>
      <main className="flex-1 container mx-auto px-2 sm:px-4 lg:px-6 py-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold font-headline text-foreground">Panel Estratégico</h1>
              <p className="text-sm text-muted-foreground">Una vista completa de todas tus Órbitas, Fases y Pulsos.</p>
            </div>
             <Button onClick={() => setOrbitToEdit(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Añadir Órbita
            </Button>
        </div>

        {orbits.length === 0 && !isPending && (
            <div className="text-center py-24">
                <h2 className="text-xl font-headline font-semibold text-foreground">Bienvenido a Cenit</h2>
                <p className="mt-2 text-sm text-muted-foreground">Define tu primera Órbita para empezar a construir tu ecosistema.</p>
                <Button className="mt-6" onClick={() => setOrbitToEdit(null)}>Crear una Órbita</Button>
            </div>
        )}
        {isPending && (
            <div className="text-center py-24">
                  <h2 className="text-xl font-headline font-semibold text-foreground">Cargando...</h2>
            </div>
        )}
        {!isPending && orbits.length > 0 && (
          <>
            <div className="flex justify-end gap-2 mb-2">
                <Button variant="ghost" size="sm" onClick={() => setOpenOrbitIds(orbits.map(lp => lp.id))}>
                    Expandir Todo
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOpenOrbitIds([])}>
                    Contraer Todo
                </Button>
            </div>
            <Accordion 
              type="multiple" 
              className="w-full space-y-3" 
              value={openOrbitIds}
              onValueChange={setOpenOrbitIds}
            >
              {orbits.map((lp) => (
                <LifePrkSection
                  key={lp.id}
                  orbit={lp}
                  phases={phases.filter(kp => kp.life_prk_id === lp.id)}
                  allPulses={allPulses}
                  onAddPhase={handleOpenAddPhaseDialog}
                  onEditPhase={handleOpenEditPhaseDialog}
                  onAddPulse={handleOpenAddPulseDialog}
                  onEditPulse={handleOpenEditPulseDialog}
                  onArchive={handleArchiveOrbit}
                  onEdit={handleOpenEditOrbitDialog}
                  onArchivePhase={handleArchivePhase}
                  onArchivePulse={handleArchivePulse}
                />
              ))}
            </Accordion>
          </>
        )}
      </main>
      <AddPhaseDialog 
        isOpen={isPhaseDialogOpen} 
        onOpenChange={setPhaseDialogOpen} 
        onSave={handleSavePhase}
        phase={editingPhase}
        defaultOrbitId={activeOrbitId}
      />
      <AddPulseDialog 
        isOpen={isPulseDialogOpen} 
        onOpenChange={setPulseDialogOpen} 
        onSave={handleSavePulse}
        pulse={editingPulse}
        defaultPhaseIds={activePhaseIds}
        defaultDate={new Date()}
        phases={phases}
        />
    </>
  );
}
