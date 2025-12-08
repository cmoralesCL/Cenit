'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useEffect } from 'react';
import { Check } from 'lucide-react';

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
import { Textarea } from '@/components/ui/textarea';
import type { Orbit, ColorTheme } from '@/lib/types';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { THEMES } from '@/lib/themes';
import { ScrollArea } from './ui/scroll-area';

const formSchema = z.object({
  title: z.string().min(3, {
    message: 'El título debe tener al menos 3 caracteres.',
  }),
  description: z.string().optional(),
  color_theme: z.custom<ColorTheme>().optional().default('mint'),
});

type FormValues = z.infer<typeof formSchema>;

interface OrbitDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (values: FormValues) => void;
  orbit: Orbit | null;
}

export function AddOrbitDialog({ isOpen, onOpenChange, onSave, orbit }: OrbitDialogProps) {
  const isEditing = !!orbit;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      color_theme: 'mint',
    },
  });

  useEffect(() => {
    if(isOpen) {
      if (isEditing && orbit) {
        form.reset({
          title: orbit.title,
          description: orbit.description,
          color_theme: orbit.color_theme || 'mint',
        });
      } else {
        form.reset({
          title: '',
          description: '',
          color_theme: 'mint',
        });
      }
    }
  }, [isOpen, isEditing, orbit, form]);

  const onSubmit = (values: FormValues) => {
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
                {isEditing ? 'Editar Órbita' : 'Definir una Nueva Órbita'}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                  ? 'Actualiza los detalles de tu pilar de vida.'
                  : 'Una Órbita es un pilar de vida, una gran área perpetua. ¿En qué quieres enfocarte?'
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4" id="orbit-form">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título</FormLabel>
                          <FormControl>
                            <Input placeholder="Ej: Salud y Bienestar" {...field} />
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
                              placeholder="Describe tu visión ideal para esta área de tu vida."
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
                      name="color_theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color del Tema</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2"
                            >
                              {Object.entries(THEMES).map(([themeKey, themeValue]) => (
                                <FormItem key={themeKey}>
                                    <FormControl>
                                        <RadioGroupItem value={themeKey} id={themeKey} className="peer sr-only" />
                                    </FormControl>
                                    <FormLabel
                                      htmlFor={themeKey}
                                      className={cn(
                                        "flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                                      )}
                                    >
                                        <div className="flex items-center justify-center w-full gap-2">
                                            <span className="w-5 h-5 rounded-full" style={{ background: themeValue.gradient }}></span>
                                            <span className="text-sm font-medium">{themeValue.name}</span>
                                        </div>
                                    </FormLabel>
                                </FormItem>
                              ))}
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                <DialogFooter className="pt-4">
                  <Button type="submit" form="orbit-form">{isEditing ? 'Guardar Cambios' : 'Agregar Órbita'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}