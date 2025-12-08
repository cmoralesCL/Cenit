
'use client';

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { inviteUserToGroup, getRegisteredUsers } from "@/app/actions";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as React from 'react';

const formSchema = z.object({
  userId: z.string().min(1, "Debes seleccionar un usuario"),
});

interface InviteUserDialogProps {
  groupId: string;
}

export function InviteUserDialog({ groupId }: InviteUserDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [users, setUsers] = React.useState<{ id: string; email: string }[]>([]);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (isOpen) {
      getRegisteredUsers().then(setUsers);
    }
  }, [isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await inviteUserToGroup(groupId, values.userId);
      toast({ title: "Usuario invitado exitosamente" });
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Error al invitar al usuario", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Invitar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario al grupo</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Select onValueChange={(value) => form.setValue("userId", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un usuario" />
            </SelectTrigger>
            <SelectContent>
              {users.map(user => (
                <SelectItem key={user.id} value={user.id}>
                  {user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.userId && (
            <p className="text-red-500 text-sm">{form.formState.errors.userId.message}</p>
          )}
          <Button type="submit">Invitar</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
