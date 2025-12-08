

'use client';

import { useTransition, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ListTodo, PanelRightClose, PanelRightOpen, Plus } from 'lucide-react';
import type { Pulse, HabitFrequency, ProgressLog } from '@/lib/types';
import { HabitTaskListItem } from './habit-task-list-item';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from '@/hooks/use-toast';
import { logPulseCompletion, removePulseCompletion, archivePulse } from '@/app/actions';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';


type CommitmentTab = 'weekly' | 'monthly' | 'quarterly';
const tabToFrequencyMap: Record<CommitmentTab, HabitFrequency> = {
    weekly: 'SEMANAL_ACUMULATIVO',
    monthly: 'MENSUAL_ACUMULATIVO',
    quarterly: 'TRIMESTRAL_ACUMULATIVO'
};

interface CommitmentsSidebarProps {
  commitments: Pulse[];
  selectedDate: Date;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddCommitment: (frequency: HabitFrequency) => void;
  onEditCommitment: (task: Pulse) => void;
}

export function CommitmentsSidebar({ commitments, selectedDate, isOpen, setIsOpen, onAddCommitment, onEditCommitment }: CommitmentsSidebarProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<CommitmentTab>('weekly');

  const handleToggle = (id: string, completed: boolean, date: Date, progressValue?: number) => {
     const task = commitments.find(ht => ht.id === id);
    if (!task) return;

    const completionDate = date.toISOString().split('T')[0];

    startTransition(async () => {
      try {
        await logPulseCompletion(id, task.type, completionDate, progressValue);
        toast({ title: "¡Progreso registrado!" });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No se pudo actualizar la acción.' });
      }
    });
  };

  const handleUndo = (id: string, date: Date) => {
     const task = commitments.find(ht => ht.id === id);
    if (!task) return;

    const completionDate = date.toISOString().split('T')[0];
    startTransition(async () => {
        try {
            await removePulseCompletion(id, task.type, completionDate);
            toast({ title: "Registro deshecho" });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo deshacer la acción.' });
        }
    });
  }

  const handleEdit = (task: Pulse) => {
    onEditCommitment(task);
  };

  const handleArchive = (id: string) => {
    startTransition(async () => {
        try {
          await archivePulse(id, selectedDate.toISOString());
          toast({ title: 'Pulso Archivado' });
        } catch (error) {
          toast({ variant: 'destructive', title: 'Error', description: 'No se pudo archivar el Pulso.' });
        }
    });
  };

  const weeklyCommitments = commitments.filter(c => c.frequency?.startsWith('SEMANAL_ACUMULATIVO'));
  const monthlyCommitments = commitments.filter(c => c.frequency?.startsWith('MENSUAL_ACUMULATIVO'));
  const quarterlyCommitments = commitments.filter(c => c.frequency?.startsWith('TRIMESTRAL_ACUMULATIVO'));
  
  const renderCommitmentList = (tasks: Pulse[]) => {
    if (tasks.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-4">No hay compromisos para este período.</p>;
    }
    return (
         <div className="space-y-2">
            {tasks.map((commitment) => (
              <HabitTaskListItem
                key={commitment.id}
                item={commitment}
                onToggle={handleToggle}
                onUndo={handleUndo}
                onEdit={handleEdit}
                onArchive={handleArchive}
                selectedDate={selectedDate}
                variant="dashboard"
              />
            ))}
          </div>
    )
  }

  

  return (
      <Card className="h-full w-full flex flex-col transition-all duration-300 ease-in-out shadow-none border-0">
        <CardHeader className="flex flex-row items-center justify-between p-3">
            <div className="w-full">
              <CardTitle className="font-headline text-base flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-primary" />
                  Compromisos
              </CardTitle>
              <CardDescription className="text-xs">Metas sin día fijo.</CardDescription>
            </div>
            
        </CardHeader>
        <CardContent className="flex-grow p-3 overflow-hidden">
        <Tabs 
          defaultValue="weekly" 
          className="w-full h-full flex flex-col"
          onValueChange={(value) => setActiveTab(value as CommitmentTab)}
        >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weekly">Semanal</TabsTrigger>
              <TabsTrigger value="monthly">Mensual</TabsTrigger>
              <TabsTrigger value="quarterly">Trimestral</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-grow mt-2">
                <TabsContent value="weekly" className="mt-2 pr-2">
                {renderCommitmentList(weeklyCommitments)}
                </TabsContent>
                <TabsContent value="monthly" className="mt-2 pr-2">
                    {renderCommitmentList(monthlyCommitments)}
                </TabsContent>
                <TabsContent value="quarterly" className="mt-2 pr-2">
                {renderCommitmentList(quarterlyCommitments)}
                </TabsContent>
            </ScrollArea>
        </Tabs>
        </CardContent>
         <CardFooter className="p-3">
            <Button size="sm" className="w-full" onClick={() => onAddCommitment(tabToFrequencyMap[activeTab])}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Compromiso
            </Button>
        </CardFooter>
      </Card>
  );
}
