
'use client';

import { CheckSquare, Repeat, Archive, Pencil, MoreVertical, Plus, Undo2, GripVertical, Star, Minus, Target } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Orbit, Phase, Pulse } from '@/lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { isSameDay, parseISO } from 'date-fns';
import { useState, useEffect } from 'react';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface HabitTaskListItemProps {
  item: Pulse;
  phases?: Phase[];
  orbits?: Orbit[];
  onToggle?: (id: string, completed: boolean, date: Date, progressValue?: number) => void;
  onUndo?: (id: string, date: Date, progressValue?: number) => void;
  onArchive?: (id: string) => void;
  onEdit?: (habitTask: Pulse) => void;
  selectedDate: Date;
  variant?: 'dashboard' | 'calendar' | 'dialog' | 'read-only';
  isDraggable?: boolean;
}

function ImpactRating({ rating }: { rating: number }) {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-yellow-400 text-yellow-500" : "fill-muted text-muted-foreground/50 stroke-none"
            )}
          />
        ))}
      </div>
    );
}

export function HabitTaskListItem({ 
    item,
    phases = [],
    orbits = [], 
    onToggle, 
    onUndo,
    onArchive, 
    onEdit, 
    selectedDate, 
    variant = 'dashboard',
    isDraggable = false,
}: HabitTaskListItemProps) {

  const [isCompleted, setIsCompleted] = useState(item.completedToday ?? false);
  const [progressValue, setProgressValue] = useState('');
  const [currentTotal, setCurrentTotal] = useState(item.current_progress_value ?? 0);
  const [hasLogForSelectedDate, setHasLogForSelectedDate] = useState(false);


  useEffect(() => {
    setIsCompleted(item.completedToday ?? false);
    setCurrentTotal(item.current_progress_value ?? 0)
    setProgressValue('');
    
    if (item.measurement_type === 'binary' && item.frequency?.includes('ACUMULATIVO')) {
        const logExists = item.logs?.some(log => isSameDay(parseISO(log.completion_date), selectedDate));
        setHasLogForSelectedDate(!!logExists);
    }

  }, [item.completedToday, item.current_progress_value, item.logs, selectedDate, item.measurement_type, item.frequency]);

  const handleToggle = (checked: boolean) => {
    setIsCompleted(checked);
    if (onToggle) {
        onToggle(item.id, checked, selectedDate);
    }
  }
  
  const handleSaveQuantitative = (valueToAdd: number) => {
    if (onToggle) {
      if (!isNaN(valueToAdd) && valueToAdd !== 0) {
        onToggle(item.id, true, selectedDate, valueToAdd);
      }
    }
  };

  const handleResetQuantitative = () => {
    if (onUndo) {
        // A specific value is not needed, the server action will handle the reset
        onUndo(item.id, selectedDate);
    }
  };

  const handleArchive = () => {
    if (onArchive) {
      onArchive(item.id);
    }
  }

  const handleEdit = () => {
    if(onEdit) {
      onEdit(item);
    }
  }
  
  const handleAddInstance = () => {
    if (onToggle) {
      onToggle(item.id, true, selectedDate, 1);
    }
  };

  const handleRemoveInstance = () => {
    if (onUndo) {
      // For binary accumulative, we "undo" by logging a -1 value.
      onUndo(item.id, selectedDate, -1);
    }
  };

  // --- Type C: Binary Accumulative (Commitments) ---
  if (item.measurement_type === 'binary' && item.frequency?.includes('ACUMULATIVO')) {
    const target = item.measurement_goal?.target_count ?? 1;
    return (
       <div className="flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors duration-200 group">
          <div className="flex flex-col gap-3 flex-grow">
            <div className="flex items-center justify-between">
              <div className="flex-grow">
                <p className={cn('text-sm font-medium leading-none', isCompleted && "line-through text-muted-foreground")}>
                  {item.title}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                    <Badge variant="outline" className="capitalize">{item.type === 'task' ? 'Tarea' : 'Hábito'}</Badge>
                    <ImpactRating rating={item.weight} />
                    {phases.map(phase => <Badge key={phase.id} variant="secondary">Fase: {phase.title}</Badge>)}
                    {orbits.map(orbit => <Badge key={orbit.id} variant="outline">Órbita: {orbit.title}</Badge>)}
                </div>
              </div>
               <div className="flex items-center -mr-2 -mt-1">
                  {onEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  )}
                  {onArchive && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleArchive}>
                          <Archive className="h-4 w-4 text-muted-foreground" />
                      </Button>
                  )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                 {onUndo && (
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleRemoveInstance} disabled={currentTotal === 0}>
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
                <span className="font-bold text-lg w-12 text-center">{Math.floor(currentTotal)}/{target}</span>
                {onToggle && (
                   <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleAddInstance} disabled={currentTotal >= target}>
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <Progress value={(currentTotal / target) * 100} className="w-full flex-grow h-2" />
            </div>
          </div>
       </div>
    );
  }


  // --- Type B: Quantitative / Frequency Habit ---
  if (item.measurement_type === 'quantitative') {
      const target = item.measurement_goal?.target_count ?? 1;
      const progressPercent = target > 0 ? (currentTotal / target) * 100 : 0;
      const isQuantitativeCompleted = progressPercent >= 100;

      return (
        <div className="flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors duration-200 group">
             {isDraggable && (
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-1 flex-shrink-0" />
            )}
            <div className="flex flex-col gap-3 flex-grow">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                        <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                            <Target className={cn("h-5 w-5 text-muted-foreground", isQuantitativeCompleted && "text-primary")} />
                        </div>
                        <div>
                        <Label className={cn('text-sm font-medium leading-none flex-grow', isQuantitativeCompleted && "line-through text-muted-foreground")}>
                            {item.title}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                            {Math.floor(currentTotal)} / {target} {item.measurement_goal?.unit || ''}
                        </p>
                        </div>
                    </div>
                    <div className="flex items-center -mr-2 -mt-1">
                        {onEdit && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
                                <Pencil className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                        {onArchive && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleArchive}>
                                <Archive className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="pl-9 space-y-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="capitalize">{item.type === 'task' ? 'Tarea' : 'Hábito'}</Badge>
                        <ImpactRating rating={item.weight} />
                        {phases.map(phase => <Badge key={phase.id} variant="secondary">Fase: {phase.title}</Badge>)}
                        {orbits.map(orbit => <Badge key={orbit.id} variant="outline">Órbita: {orbit.title}</Badge>)}
                    </div>

                    {onToggle && (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto">
                            <Input
                                type="number"
                                value={progressValue}
                                onChange={(e) => setProgressValue(e.target.value)}
                                className="h-8 w-20 bg-background"
                                placeholder="Valor"
                            />
                            <Button size="sm" className="h-8" onClick={() => handleSaveQuantitative(Number(progressValue))}>
                            Agregar
                            </Button>
                             {onUndo && (
                                <Button size="sm" variant="outline" className="h-8" onClick={handleResetQuantitative} disabled={currentTotal === 0}>
                                Deshacer
                                </Button>
                            )}
                        </div>
                    )}
                    </div>
                </div>
            </div>
        </div>
      )
  }

  // --- Type A: Default binary/task item (Checklist) ---
  return (
    <div className={cn(
        "flex items-start gap-3 p-3 border rounded-lg transition-colors duration-200 group bg-card"
    )}>
        {isDraggable && (
            <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab mt-1" />
        )}
        <Checkbox
            id={item.id}
            checked={isCompleted}
            onCheckedChange={handleToggle}
            disabled={!onToggle}
            className="h-5 w-5 mt-1"
        />
        <div className="flex-grow">
            <Label
                htmlFor={item.id}
                className={cn(
                    'text-sm font-medium leading-none',
                    isCompleted && 'line-through text-muted-foreground',
                    !onToggle ? "cursor-default" : "cursor-pointer"
                )}
            >
                {item.title}
            </Label>
             <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="capitalize">{item.type === 'task' ? 'Tarea' : 'Hábito'}</Badge>
                <ImpactRating rating={item.weight} />
                {phases.map(phase => <Badge key={phase.id} variant="secondary">Fase: {phase.title}</Badge>)}
                {orbits.map(orbit => <Badge key={orbit.id} variant="outline">Órbita: {orbit.title}</Badge>)}
            </div>
        </div>
        <div className="flex items-center ml-auto">
            {onEdit && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit}>
                    <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
            {onArchive && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleArchive}>
                    <Archive className="h-4 w-4 text-muted-foreground" />
                </Button>
            )}
        </div>
    </div>
  );
}
