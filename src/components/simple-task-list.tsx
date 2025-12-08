
'use client';

import { useState, useTransition, useEffect } from 'react';
import { SimpleTask } from '@/lib/simple-tasks-types';
import { addSimpleTask, deleteSimpleTask, updateSimpleTaskCompletion, updateSimpleTask, getRegisteredUsers, shareTaskWithUser, unshareTaskWithUser, assignSimpleTask } from '@/app/actions';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Trash2, Plus, Loader2, Calendar as CalendarIcon, Pencil, Save, XCircle, Share2, User, UserX, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DatePicker } from './ui/date-picker';
import { format, differenceInDays, startOfToday, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Separator } from './ui/separator';

interface SimpleTaskListProps {
  initialTasks: SimpleTask[];
  userId?: string;
}

export function SimpleTaskList({ initialTasks, userId }: SimpleTaskListProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDueDate, setEditedDueDate] = useState<Date | undefined>();

  // State for sharing dialog
  const [isManageDialogOpen, setManageDialogOpen] = useState(false);
  const [managingTask, setManagingTask] = useState<SimpleTask | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<{ id: string, email: string }[]>([]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (isManageDialogOpen && registeredUsers.length === 0) {
        startTransition(async () => {
            const users = await getRegisteredUsers();
            setRegisteredUsers(users);
        });
    }
  }, [isManageDialogOpen, registeredUsers.length]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "El título de la tarea no puede estar vacío.",
        });
        return;
    }
    startTransition(async () => {
      try {
        const dueDateString = dueDate ? format(dueDate, 'yyyy-MM-dd') : null;
        await addSimpleTask(newTaskTitle, dueDateString);
        setNewTaskTitle('');
        setDueDate(undefined);
        toast({ title: '¡Tarea agregada!' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo agregar la tarea.',
        });
      }
    });
  };

  const handleToggleTask = (id: string, isCompleted: boolean) => {
    startTransition(async () => {
      try {
        await updateSimpleTaskCompletion(id, isCompleted);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo actualizar la tarea.',
        });
      }
    });
  };

  const handleDeleteTask = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSimpleTask(id);
        toast({ title: 'Tarea eliminada' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo eliminar la tarea.',
        });
      }
    });
  };

  const handleEditClick = (task: SimpleTask) => {
    setEditingTaskId(task.id);
    setEditedTitle(task.title);
    setEditedDueDate(task.due_date ? parseISO(task.due_date) : undefined);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editedTitle.trim()) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "El título de la tarea no puede estar vacío.",
        });
        return;
    }
    startTransition(async () => {
      try {
        const dueDateString = editedDueDate ? format(editedDueDate, 'yyyy-MM-dd') : null;
        await updateSimpleTask(id, editedTitle, dueDateString);
        setEditingTaskId(null);
        toast({ title: '¡Tarea actualizada!' });
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No se pudo actualizar la tarea.',
        });
      }
    });
  };

  const openManageDialog = (task: SimpleTask) => {
    setManagingTask(task);
    setManageDialogOpen(true);
  };

  const handleShare = (userIdToShareWith: string) => {
    if (!managingTask) return;
    startTransition(async () => {
        try {
            await shareTaskWithUser(managingTask.id, userIdToShareWith);
            toast({ title: "Tarea compartida!"});
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo compartir la tarea.' });
        }
    });
  };
  
  const handleUnshare = (userIdToUnshare: string) => {
    if (!managingTask) return;
     startTransition(async () => {
        try {
            await unshareTaskWithUser(managingTask.id, userIdToUnshare);
            toast({ title: "Acceso revocado"});
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo revocar el acceso.' });
        }
    });
  };
  
  const handleAssign = (assignedToUserId: string) => {
    if (!managingTask) return;
    const newAssignedId = assignedToUserId === 'unassigned' ? null : assignedToUserId;
    startTransition(async () => {
        try {
            await assignSimpleTask(managingTask.id, newAssignedId);
            toast({ title: "Tarea asignada!"});
        } catch(error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No se pudo asignar la tarea.' });
        }
    });
  };


  const DueDateInfo = ({ dueDate }: { dueDate: string | null }) => {
    if (!dueDate) return null;

    const today = startOfToday();
    const dueDateObj = parseISO(dueDate);
    const daysLeft = differenceInDays(dueDateObj, today);

    let text = '';
    let textColor = '';

    if (daysLeft < 0) {
        text = `Venció hace ${Math.abs(daysLeft)} días`;
        textColor = 'text-destructive';
    } else if (daysLeft === 0) {
        text = 'Vence hoy';
        textColor = 'text-orange-600';
    } else if (daysLeft === 1) {
        text = 'Vence mañana';
        textColor = 'text-yellow-600';
    } else if (daysLeft <= 7) {
        text = `Vence en ${daysLeft} días`;
         textColor = 'text-yellow-700';
    } else {
        text = `Vence el ${format(dueDateObj, 'd MMM', { locale: es })}`;
    }
    
    return (
        <div className="flex items-center gap-2 mt-1">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
             <span className={cn("text-xs font-medium", textColor || 'text-muted-foreground')}>{text}</span>
        </div>
    );
  };


  return (
    <>
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Mis Tareas</CardTitle>
        <CardDescription>
          Una lista simple para tus pendientes, con la opción de asignar y compartir.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <Input
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="¿Qué necesitas hacer?"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            disabled={isPending}
            className="flex-grow"
          />
          <div className="flex gap-2">
            <DatePicker date={dueDate} setDate={setDueDate} />
            <Button onClick={handleAddTask} disabled={isPending} className="w-full sm:w-auto">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                <span className="hidden sm:inline ml-2">Agregar</span>
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {tasks.map((task) => {
            const isOwner = task.user_id === userId;
            return (
            <div
              key={task.id}
              className={cn(
                "flex items-start gap-4 p-3 rounded-lg border transition-colors",
                task.is_completed ? "bg-muted/50" : "bg-card",
                editingTaskId === task.id && "bg-secondary/50"
              )}
            >
              <Checkbox
                id={`task-${task.id}`}
                checked={task.is_completed}
                onCheckedChange={(checked) => handleToggleTask(task.id, !!checked)}
                className="h-5 w-5 mt-1"
                disabled={isPending || editingTaskId === task.id}
              />
              <div className="flex-grow">
                 {editingTaskId === task.id ? (
                    <div className="space-y-2">
                        <Input 
                            value={editedTitle}
                            onChange={(e) => setEditedTitle(e.target.value)}
                            className="h-9"
                            disabled={isPending}
                        />
                        <DatePicker date={editedDueDate} setDate={setEditedDueDate} />
                    </div>
                 ) : (
                    <>
                        <Label
                            htmlFor={`task-${task.id}`}
                            className={cn(
                            "text-sm font-medium",
                            task.is_completed && "line-through text-muted-foreground"
                            )}
                        >
                            {task.title}
                        </Label>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
                            <DueDateInfo dueDate={task.due_date} />
                            {task.assigned_to_email && (
                                <Badge variant="secondary" className="mt-1 sm:mt-0 max-w-fit">
                                    <UserPlus className="h-3 w-3 mr-1.5" />
                                    Asignada a: {task.assigned_to_email}
                                </Badge>
                            )}
                            {isOwner ? (
                                <Badge variant="outline" className="mt-1 sm:mt-0 max-w-fit">Creada por ti</Badge>
                            ) : (
                                <Badge variant="outline" className="mt-1 sm:mt-0 max-w-fit">Creada por {task.owner_email}</Badge>
                            )}
                        </div>
                    </>
                 )}
              </div>
              <div className="flex gap-1">
                {editingTaskId === task.id ? (
                    <>
                        <Button variant="ghost" size="icon" onClick={() => handleSaveEdit(task.id)} className="h-8 w-8 text-green-600 hover:bg-green-100 hover:text-green-700" disabled={isPending}>
                            <Save className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={handleCancelEdit} className="h-8 w-8 text-muted-foreground hover:bg-gray-200" disabled={isPending}>
                            <XCircle className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <>
                        {isOwner && (
                            <>
                            <Button variant="ghost" size="icon" onClick={() => openManageDialog(task)} className="h-8 w-8 text-muted-foreground hover:bg-blue-100 hover:text-blue-600" disabled={isPending}>
                                <Share2 className="h-4 w-4" />
                            </Button>
                             <Button variant="ghost" size="icon" onClick={() => handleEditClick(task)} className="h-8 w-8 text-muted-foreground hover:bg-blue-100 hover:text-blue-600" disabled={isPending}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive flex-shrink-0"
                                disabled={isPending}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            </>
                        )}
                    </>
                )}
              </div>
            </div>
          )})}
           {tasks.length === 0 && !isPending && (
            <p className="text-center text-muted-foreground py-8">
              ¡Todo listo! No tienes tareas pendientes.
            </p>
          )}
        </div>
      </CardContent>
    </Card>

    <Dialog open={isManageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-md">
            <DialogHeader>
                <DialogTitle>Gestionar Tarea</DialogTitle>
                <DialogDescription>
                    Asigna o comparte "{managingTask?.title}" con otros usuarios.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-6">
                {/* --- Asignar Tarea --- */}
                <div className="space-y-2">
                    <Label htmlFor="assign-user" className="font-semibold">Asignar a</Label>
                    <Select 
                        value={managingTask?.assigned_to_user_id ?? 'unassigned'} 
                        onValueChange={handleAssign}
                        disabled={isPending}
                    >
                        <SelectTrigger id="assign-user">
                            <SelectValue placeholder="Seleccionar un usuario..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                            {registeredUsers.map(user => (
                                <SelectItem key={user.id} value={user.id}>{user.email}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">La persona asignada será la responsable principal de completar la tarea.</p>
                </div>
                
                <Separator />

                {/* --- Compartir Tarea --- */}
                <div className="space-y-3">
                    <Label className="font-semibold">Compartir con (solo lectura)</Label>
                    <ScrollArea className="h-48">
                        <div className="space-y-2 pr-4">
                            {isPending && registeredUsers.length === 0 && <Loader2 className="mx-auto my-4 h-6 w-6 animate-spin" />}
                            {registeredUsers.map(user => {
                                const isSharedWith = managingTask?.shared_with?.some(su => su.user_id === user.id);
                                return (
                                    <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-secondary">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{user.email.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">{user.email}</span>
                                        </div>
                                        {isSharedWith ? (
                                            <Button variant="outline" size="sm" onClick={() => handleUnshare(user.id)} disabled={isPending}>
                                                <UserX className="mr-2 h-4 w-4" />
                                                Dejar de compartir
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => handleShare(user.id)} disabled={isPending}>
                                                <User className="mr-2 h-4 w-4" />
                                                Compartir
                                            </Button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </ScrollArea>
                </div>
            </div>
             <DialogFooter>
                <Button variant="secondary" onClick={() => setManageDialogOpen(false)}>Cerrar</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
