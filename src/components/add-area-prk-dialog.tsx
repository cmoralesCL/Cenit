
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useEffect } from 'react';

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
import type { Phase } from '@/lib/types';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

const formSchema = z.object({
  title: z.string().min(3, {
    message: 'El título debe tener al menos 3 caracteres.',
  }),
  description: z.string().optional(),
  life_prk_id: z.string().uuid({ message: 'Por favor, selecciona una Órbita.' }),
});

export type PhaseFormValues = z.infer<typeof formSchema>;

interface AddPhaseDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: PhaseFormValues) => void;
  phase: Phase | null;
  defaultOrbitId?: string | null;
}

import { useState } from 'react';

export function AddPhaseDialog({ isOpen, onOpenChange, onSave, phase, defaultOrbitId }: AddPhaseDialogProps) {
  const isEditing = !!phase;
  const [lifePrks, setLifePrks] = useState<{ id: string; title: string }[]>([]);

  const form = useForm<PhaseFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      life_prk_id: defaultOrbitId || '',
    },
  });

  useEffect(() => {
    const fetchLifePrks = async () => {
      const supabase = createClient();
          const { data: { user }, error: userError } = await supabase.auth.getUser();

          if (userError || !user) {
            console.error('Error getting user:', userError);
            return;
          }

          const { data, error } = await supabase.from('life_prks').select('id, title').eq('user_id', user.id);
          if (error) {
            console.error('Error fetching life_prks:', error);
          } else {
            setLifePrks(data || []);
          }
    };

    if (isOpen) {
        fetchLifePrks();
        if (isEditing && phase) {
            form.reset({
                title: phase.title,
                description: phase.description || '',
                life_prk_id: phase.life_prk_id || '',
            });
        } else {
            form.reset({
                title: '',
                description: '',
                life_prk_id: defaultOrbitId || '',
            });
        }
    }
  }, [isOpen, isEditing, phase, form, defaultOrbitId]);


  const onSubmit = (values: PhaseFormValues) => {
    onSave(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6 pb-20">
            <DialogHeader>
              <DialogTitle className="font-headline">
                {isEditing ? 'Editar Fase' : 'Crear una Fase'}
              </DialogTitle>
              <DialogDescription>
                {isEditing 
                    ? 'Actualiza los detalles de este proyecto o meta.'
                    : 'Una Fase es un proyecto o meta medible que contribuye a una de tus Órbitas.'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ej: Mejorar mi salud cardiovascular" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descripción (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Define cómo se ve el éxito para esta Fase."
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
                  name="life_prk_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Órbita</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una Órbita" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {lifePrks.map((prk) => (
                            <SelectItem key={prk.id} value={prk.id}>
                              {prk.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4">
                  <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Agregar Fase'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
