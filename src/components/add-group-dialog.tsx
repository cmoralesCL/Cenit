
'use client';
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createGroup } from "@/app/actions";
import { toast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
});

export function AddGroupDialog() {
  const [isOpen, setIsOpen] = React.useState(false);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createGroup(values.name, values.description);
      toast({ title: "Grupo creado exitosamente" });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Error al crear el grupo", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          Crear Grupo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Crear un nuevo grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre del grupo</Label>
            <Input id="name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input id="description" {...form.register("description")} />
          </div>
          <Button type="submit">Crear</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
