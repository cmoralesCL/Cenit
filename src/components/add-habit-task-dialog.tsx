
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from './ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Calendar } from './ui/calendar';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Phase, Pulse, HabitFrequency } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { MultiSelect } from './ui/multi-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from './ui/scroll-area';

const numberPreprocess = (val: any) => (val === '' || val === null ? undefined : val);

const formSchema = z.object({
    title: z.string().min(3, { message: 'El título debe tener al menos 3 caracteres.' }),
    description: z.string().optional(),
    phase_ids: z.array(z.string()).min(1, { message: "Debes seleccionar al menos una Fase."}),
    type: z.enum(['task', 'habit']),
    start_date: z.date().optional(),
    due_date: z.date().optional(),
    weight: z.coerce.number().min(1, { message: 'El impacto debe ser al menos 1.' }).max(5, { message: 'El impacto no puede ser mayor a 5.' }).default(1),
    is_critical: z.boolean().default(false),
    
    // Habit specific fields
    frequency: z.custom<HabitFrequency>().optional(),
    frequency_interval: z.preprocess(numberPreprocess, z.coerce.number().min(1, "El intervalo debe ser al menos 1.").optional()),
    frequency_days: z.array(z.string()).optional(),
    frequency_day_of_month: z.preprocess(numberPreprocess, z.coerce.number().min(1, "El día debe ser entre 1 y 31.").max(31, "El día debe ser entre 1 y 31.").optional()),
    
    measurement_type: z.enum(['binary', 'quantitative']).optional(),
    measurement_goal: z.object({
        target_count: z.preprocess(numberPreprocess, z.coerce.number().min(1, "El objetivo debe ser mayor que 0.").optional()),
        unit: z.string().optional(),
    }).optional(),
}).superRefine((data, ctx) => {
    // Due date must be after start date
    if (data.start_date && data.due_date && data.due_date < data.start_date) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "La fecha de fin no puede ser anterior a la de inicio.",
            path: ['due_date'],
        });
    }

    if (!data.frequency) return;

    // --- Validations for specific frequencies based on 'frecuencia.md' ---
    const freq = data.frequency;

    // Rule: Frequencies with intervals must have an interval value.
    if (freq.includes('INTERVALO') || freq.includes('RECURRENTE')) {
        if (data.frequency_interval === undefined || data.frequency_interval === null) {
             ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: 'El intervalo es requerido y debe ser mayor a 0.', 
                path: ['frequency_interval'] 
            });
        }
    }

    // Rule: Frequencies with fixed days must have days selected.
    if (freq.includes('DIAS_FIJOS')) {
        if (!data.frequency_days || data.frequency_days.length === 0) {
            ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: 'Debes seleccionar al menos un día.', 
                path: ['frequency_days'] 
            });
        }
    }
    
    // Rule: Frequencies with a fixed day of month must have that day specified.
    if (freq.includes('DIA_FIJO')) {
         if (data.frequency_day_of_month === undefined || data.frequency_day_of_month === null) {
            ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: 'Debes especificar el día del mes.', 
                path: ['frequency_day_of_month'] 
            });
        }
    }
    
    // Rule: Accumulative frequencies OR quantitative tasks must have a measurement goal.
    if (freq.includes('ACUMULATIVO') || data.measurement_type === 'quantitative') {
        if (data.measurement_type === 'binary' && freq.includes('ACUMULATIVO') && data.measurement_goal?.target_count === undefined) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El objetivo (X veces) es requerido.', path: ['measurement_goal.target_count'] });
        }
        if (data.measurement_type === 'quantitative' && data.measurement_goal?.target_count === undefined) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El objetivo a sumar es requerido.', path: ['measurement_goal.target_count'] });
        }
    }
});


export type PulseFormValues = z.infer<typeof formSchema>;

interface AddPulseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: Partial<Pulse>) => void;
  pulse: Pulse | null;
  defaultPhaseIds?: string[];
  defaultDate?: Date;
  phases: Phase[];
  defaultValues?: Partial<PulseFormValues>;
}

// Main Dialog Component
export function AddPulseDialog({ 
    isOpen, onOpenChange, onSave, pulse, 
    defaultPhaseIds, defaultDate, phases, defaultValues
}: AddPulseDialogProps) {
  const isEditing = !!pulse;

  const form = useForm<PulseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '', description: '', type: 'task',
      start_date: defaultDate,
      phase_ids: defaultPhaseIds || [], 
      weight: 1, is_critical: false,
      frequency: 'UNICA',
      frequency_interval: undefined,
      frequency_day_of_month: undefined,
      frequency_days: [],
      measurement_goal: { target_count: undefined, unit: '' },
      ...defaultValues
    },
  });

  const type = form.watch('type');
  const frequency = form.watch('frequency');
  const showDueDate = !(type === 'task' && frequency === 'UNICA');

  useEffect(() => {
    if (!showDueDate) {
        form.setValue('due_date', undefined);
    }
  }, [showDueDate, form]);
  
  useEffect(() => {
    if (isOpen) {
      if (isEditing && pulse) {
        // --- Populate Form ---
        form.reset({
          ...pulse,
          phase_ids: pulse.phase_ids || [],
          frequency: pulse.frequency ?? 'UNICA',
          start_date: pulse.start_date ? parseISO(pulse.start_date) : (defaultDate || undefined),
          due_date: pulse.due_date ? parseISO(pulse.due_date) : undefined,
          frequency_interval: pulse.frequency_interval ?? undefined,
          frequency_day_of_month: pulse.frequency_day_of_month ?? undefined,
          measurement_goal: {
            target_count: pulse.measurement_goal?.target_count ?? undefined,
            unit: pulse.measurement_goal?.unit ?? '',
          },
          frequency_days: pulse.frequency_days ?? [],
        });
      } else { // Reset for new task
        form.reset({
          title: '', description: '', type: 'task', 
          start_date: defaultDate, 
          due_date: undefined,
          phase_ids: defaultPhaseIds || [], 
          weight: 1, is_critical: false,
          frequency: 'UNICA',
          frequency_days: [],
          frequency_interval: undefined,
          frequency_day_of_month: undefined,
          measurement_type: 'binary',
          measurement_goal: { target_count: undefined, unit: '' },
          ...defaultValues,
        });
      }
    }
  }, [isOpen, isEditing, pulse, form, defaultPhaseIds, defaultDate, defaultValues]);

  const onSubmit = (values: PulseFormValues) => {
    const dataToSave: Partial<Pulse> = {
        title: values.title,
        description: values.description,
        phase_ids: values.phase_ids,
        type: values.type,
        start_date: values.start_date ? format(values.start_date, 'yyyy-MM-dd') : undefined,
        due_date: values.due_date ? format(values.due_date, 'yyyy-MM-dd') : undefined,
        weight: values.weight,
        is_critical: values.is_critical,
    };

    // --- Frequency Data ---
    dataToSave.frequency = values.frequency === 'UNICA' ? null : values.frequency;
    dataToSave.measurement_type = values.measurement_type;

    // Reset all frequency related fields before setting them
    dataToSave.frequency_interval = null;
    dataToSave.frequency_days = null;
    dataToSave.frequency_day_of_month = null;
    dataToSave.measurement_goal = null;

    const freq = values.frequency;
    
    if (freq && freq !== 'UNICA') {
        if (freq.includes('INTERVALO') || freq.includes('RECURRENTE')) {
            dataToSave.frequency_interval = values.frequency_interval;
        }

        if (freq === 'SEMANAL_DIAS_FIJOS' || freq === 'INTERVALO_SEMANAL_DIAS_FIJOS') {
            dataToSave.frequency_days = values.frequency_days;
        }

        if (freq === 'MENSUAL_DIA_FIJO' || freq === 'INTERVALO_MENSUAL_DIA_FIJO') {
            dataToSave.frequency_day_of_month = values.frequency_day_of_month;
        }
    }
    
    if (values.measurement_type === 'binary' || values.measurement_type === 'quantitative') {
        dataToSave.measurement_goal = {
            target_count: values.measurement_goal?.target_count,
            unit: values.measurement_goal?.unit,
        };
    }

    if (freq === 'UNICA') {
        dataToSave.frequency = null;
         if (values.measurement_type === 'binary') {
            dataToSave.measurement_goal = null;
        }
    }
    
    onSave(dataToSave);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 pb-20">
            <DialogHeader>
              <DialogTitle className="font-headline">{isEditing ? 'Editar Pulso' : 'Crear Pulso'}</DialogTitle>
              <DialogDescription>Define una acción o hábito concreto para impulsar una Fase.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4" id="pulse-form">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem><FormLabel>Título</FormLabel><FormControl><Input placeholder="Ej: Correr 5km" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Añade notas, enlaces o detalles aquí."
                          className="resize-none"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel>Tipo de Pulso</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="grid grid-cols-2 gap-4"
                        >
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem value="task" id="task" className="peer sr-only" />
                            </FormControl>
                            <Label
                              htmlFor="task"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              Tarea
                              <span className="text-xs font-normal text-muted-foreground mt-1 text-center">Una acción única o recurrente.</span>
                            </Label>
                          </FormItem>
                          <FormItem>
                            <FormControl>
                              <RadioGroupItem value="habit" id="habit" className="peer sr-only" />
                            </FormControl>
                            <Label
                              htmlFor="habit"
                              className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                            >
                              Hábito
                              <span className="text-xs font-normal text-muted-foreground mt-1 text-center">Una acción recurrente para formar una costumbre.</span>
                            </Label>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phase_ids"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fase(s) Asociada(s)</FormLabel>
                      <FormControl>
                        <MultiSelect
                            options={phases ? phases.map(ap => ({ label: ap.title, value: ap.id })) : []}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            placeholder="Selecciona una o más Fases..."
                            className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                
                <FormField control={form.control} name="start_date" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Fecha de Inicio</FormLabel><Popover>
                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                      {field.value ? format(field.value, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                  </Popover><FormMessage /></FormItem>
                )}/>
                
                {showDueDate && (
                    <FormField
                    control={form.control}
                    name="due_date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha Límite (Opcional)</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={'outline'}
                                className={cn(
                                    'pl-3 text-left font-normal',
                                    !field.value && 'text-muted-foreground'
                                )}
                                >
                                {field.value ? (
                                    format(field.value, 'PPP', { locale: es })
                                ) : (
                                    <span>Elige una fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => {
                                const startDate = form.getValues('start_date');
                                return startDate ? date < startDate : false;
                                }}
                                initialFocus
                            />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                )}

                <FrequencyBuilder form={form} />
                
                <FormField control={form.control} name="weight" render={({ field }) => (
                  <FormItem><FormLabel>Nivel de Impacto (1-5)</FormLabel><FormControl><Input type="number" min="1" max="5" placeholder="1" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>

                <FormField control={form.control} name="is_critical" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><FormLabel>¿Es Crítico?</FormLabel><FormMessage /></div>
                    <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>

                <DialogFooter className="pt-4">
                  <Button type="submit" form="pulse-form" disabled={!phases || phases.length === 0}>{isEditing ? 'Guardar Cambios' : 'Agregar Pulso'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

const daysOfWeek = [
    { id: 'L', label: 'L' }, { id: 'M', label: 'M' }, { id: 'X', label: 'X' },
    { id: 'J', label: 'J' }, { id: 'V', label: 'V' }, { id: 'S', label: 'S' },
    { id: 'D', label: 'D' },
];


function FrequencyBuilder({ form }: { form: any }) {
    const [behavior, setBehavior] = useState<'date' | 'period'>('date');
    const frequency: HabitFrequency | undefined = form.watch('frequency');
    const measurementType: 'binary' | 'quantitative' | undefined = form.watch('measurement_type');

    useEffect(() => {
        const freq = form.getValues('frequency');
        if (freq?.includes('ACUMULATIVO')) {
            setBehavior('period');
        } else {
            setBehavior('date');
        }
    }, [form, frequency]);


    const handleBehaviorChange = (value: 'date' | 'period') => {
        setBehavior(value);
        if (value === 'date') {
            form.setValue('frequency', 'UNICA');
            form.setValue('measurement_type', 'binary');
        } else {
            form.setValue('frequency', 'SEMANAL_ACUMULATIVO');
            form.setValue('measurement_type', 'binary');
        }
    };

    const handleDayToggle = (dayId: string) => {
        const currentDays = form.getValues('frequency_days') || [];
        const newDays = currentDays.includes(dayId)
            ? currentDays.filter((d: string) => d !== dayId)
            : [...currentDays, dayId];
        form.setValue('frequency_days', newDays, { shouldValidate: true });
    };
    
    const showMeasurementOptions = true;

    return (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <FormLabel>Frecuencia</FormLabel>
            <RadioGroup value={behavior} onValueChange={handleBehaviorChange} className="flex gap-4">
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="date" id="date" />
                    <Label htmlFor="date">Pulso con Fecha Específica</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="period" id="period" />
                    <Label htmlFor="period">Compromiso por Período</Label>
                </div>
            </RadioGroup>
            
            {behavior === 'date' && (
                <div className="space-y-4 pt-2">
                    <FormField control={form.control} name="frequency" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={(value) => {
                            field.onChange(value);
                            if (value === 'UNICA' && form.getValues('measurement_type') === undefined) {
                                form.setValue('measurement_type', 'binary');
                            }
                        }} value={field.value ?? 'UNICA'}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona una frecuencia" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="UNICA">Acción Única (una sola vez)</SelectItem>
                                <SelectItem value="DIARIA">Diaria</SelectItem>
                                <SelectItem value="SEMANAL_DIAS_FIJOS">Días Específicos de la Semana</SelectItem>
                                <SelectItem value="MENSUAL_DIA_FIJO">Día Fijo del Mes</SelectItem>
                                <SelectItem value="ANUAL_FECHA_FIJA">Anual (Fecha Fija)</SelectItem>
                                <SelectItem value="INTERVALO_DIAS">Intervalo de Días</SelectItem>
                                <SelectItem value="INTERVALO_SEMANAL_DIAS_FIJOS">Intervalo Semanal con Días Fijos</SelectItem>
                                <SelectItem value="INTERVALO_MENSUAL_DIA_FIJO">Intervalo Mensual con Día Fijo</SelectItem>
                            </SelectContent>
                        </Select>
                      </FormItem>
                    )}/>

                    {(frequency === 'INTERVALO_DIAS' || frequency === 'INTERVALO_SEMANAL_DIAS_FIJOS' || frequency === 'INTERVALO_MENSUAL_DIA_FIJO') && (
                         <FormField control={form.control} name="frequency_interval" render={({ field }) => (
                           <FormItem>
                                <FormLabel>
                                    {frequency === 'INTERVALO_DIAS' && 'Cada (N) días'}
                                    {frequency === 'INTERVALO_SEMANAL_DIAS_FIJOS' && 'Cada (N) semanas'}
                                    {frequency === 'INTERVALO_MENSUAL_DIA_FIJO' && 'Cada (N) meses'}
                                </FormLabel>
                                <FormControl><Input type="number" min="1" placeholder="Ej: 3" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                    )}

                    {(frequency === 'SEMANAL_DIAS_FIJOS' || frequency === 'INTERVALO_SEMANAL_DIAS_FIJOS') && (
                        <div>
                             <FormLabel>En los días</FormLabel>
                             <div className="flex flex-wrap gap-1.5 pt-2">
                                {daysOfWeek.map(day => (
                                    <Button
                                        type="button"
                                        key={day.id}
                                        variant={(form.watch('frequency_days') || []).includes(day.id) ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleDayToggle(day.id)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {day.label}
                                    </Button>
                                ))}
                             </div>
                              <FormField control={form.control} name="frequency_days" render={() => <FormMessage />} />
                        </div>
                    )}
                     {(frequency === 'MENSUAL_DIA_FIJO' || frequency === 'INTERVALO_MENSUAL_DIA_FIJO') && (
                         <FormField control={form.control} name="frequency_day_of_month" render={({ field }) => (
                           <FormItem><FormLabel>El día del mes</FormLabel><FormControl><Input type="number" min="1" max="31" placeholder="Ej: 15" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    )}
                </div>
            )}

            {behavior === 'period' && (
                 <div className="space-y-4 pt-2">
                     <FormField control={form.control} name="frequency" render={({ field }) => (
                      <FormItem>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un período" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="SEMANAL_ACUMULATIVO">Por Semana (Acumulativo)</SelectItem>
                                <SelectItem value="MENSUAL_ACUMULATIVO">Por Mes (Acumulativo)</SelectItem>
                                <SelectItem value="TRIMESTRAL_ACUMULATIVO">Por Trimestre (Acumulativo)</SelectItem>
                                <SelectItem value="ANUAL_ACUMULATIVO">Anual (Compromiso Flexible)</SelectItem>
                                <SelectItem value="SEMANAL_ACUMULATIVO_RECURRENTE">Compromiso Semanal Recurrente</SelectItem>
                                <SelectItem value="MENSUAL_ACUMULATIVO_RECURRENTE">Compromiso Mensual Recurrente</SelectItem>
                                <SelectItem value="TRIMESTRAL_ACUMULATIVO_RECURRENTE">Compromiso Trimestral Recurrente</SelectItem>
                            </SelectContent>
                        </Select>
                      </FormItem>
                    )}/>

                    {frequency?.includes('RECURRENTE') && (
                         <FormField control={form.control} name="frequency_interval" render={({ field }) => (
                           <FormItem>
                                <FormLabel>
                                    {frequency === 'SEMANAL_ACUMULATIVO_RECURRENTE' && 'Cada (N) semanas'}
                                    {frequency === 'MENSUAL_ACUMULATIVO_RECURRENTE' && 'Cada (N) meses'}
                                    {frequency === 'TRIMESTRAL_ACUMULATIVO_RECURRENTE' && 'Cada (N) trimestres'}
                                </FormLabel>
                               <FormControl><Input type="number" min="1" placeholder="Ej: 2" {...field} /></FormControl>
                               <FormMessage />
                           </FormItem>
                        )}/>
                    )}
                </div>
            )}
            
            {showMeasurementOptions && (
                 <div className="space-y-4 pt-4 border-t mt-4">
                     <FormField
                        control={form.control}
                        name="measurement_type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Tipo de Meta</FormLabel>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex gap-4 pt-1"
                                >
                                    <FormItem className="flex items-center space-x-2">
                                        <FormControl>
                                            <RadioGroupItem value="binary" id="binary" />
                                        </FormControl>
                                        <Label htmlFor="binary">Completar Tarea</Label>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2">
                                        <FormControl>
                                            <RadioGroupItem value="quantitative" id="quantitative" />
                                        </FormControl>
                                        <Label htmlFor="quantitative">Sumar Valores</Label>
                                    </FormItem>
                                </RadioGroup>
                            </FormItem>
                        )}
                    />
                    
                    {measurementType === 'binary' && frequency?.includes('ACUMULATIVO') && (
                        <FormField control={form.control} name="measurement_goal.target_count" render={({ field }) => (
                           <FormItem><FormLabel>Meta (veces por período)</FormLabel><FormControl><Input type="number" min="1" placeholder="Ej: 3" {...field} /></FormControl><FormMessage /></FormItem>
                        )}/>
                    )}
                    {measurementType === 'quantitative' && (
                        <div className="flex gap-2">
                             <FormField control={form.control} name="measurement_goal.target_count" render={({ field }) => (
                               <FormItem className="flex-grow"><FormLabel>Meta (valor total)</FormLabel><FormControl><Input type="number" min="1" placeholder="Ej: 100" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="measurement_goal.unit" render={({ field }) => (
                                <FormItem className="w-1/3"><FormLabel>Unidad</FormLabel><FormControl><Input placeholder="km, hrs..." {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
