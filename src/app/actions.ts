'use server';

import { getDashboardData, getCalendarData, getAnalyticsData } from "@/app/server/queries";
import { parseISO } from "date-fns";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { suggestRelatedHabitsTasks, type SuggestRelatedHabitsTasksInput } from "@/ai/flows/suggest-related-habits-tasks";
import { Pulse, ProgressLog } from "@/lib/types";
import { SimpleTask } from "@/lib/simple-tasks-types";
import { logError } from "@/lib/logger";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";


async function getCurrentUserId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error('User not authenticated, redirecting to login.');
        redirect('/login');
    }
    return user.id;
}


export async function login(formData: FormData) {
    const supabase = await createClient();

    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
      console.error('Login error:', error.message);  
      redirect("/login?message=Could not authenticate user");
    }

    revalidatePath("/", "layout");
    redirect("/day");
}

export async function loginAsGuest() {
  const supabase = await createClient();

  const data = {
    email: "test@example.com",
    password: "password",
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    console.error('Guest login error:', error.message);
    redirect("/login?message=No se pudo iniciar sesión como invitado. Asegúrate de que el usuario 'test@example.com' exista.");
  }

  revalidatePath("/", "layout");
  redirect("/day");
}


export async function signup(formData: FormData) {
    const hdrs = await headers();
    const origin = hdrs.get("origin") || "";
    const supabase = await createClient();
    
    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error('Signup error:', error.message);
      redirect("/login?message=Could not authenticate user");
    }

    redirect("/login?message=Check email to continue sign in process");
}


export async function getAiSuggestions(input: SuggestRelatedHabitsTasksInput): Promise<string[]> {
  try {
    const result = await suggestRelatedHabitsTasks(input);
    return result.suggestions || [];
  } catch (error) {
    await logError(error, { at: 'getAiSuggestions', input });
    console.error("Error al obtener sugerencias de la IA:", error);
    return [];
  }
}

export async function addOrbit(values: { title: string; description?: string, color_theme?: string }) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    let groupId = cookies().get('groupId')?.value || null;

    // Validate the groupId
    if (groupId) {
        const { data: groupMember, error: groupError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (groupError || !groupMember) {
            console.warn(`Invalid or non-member groupId (${groupId}) found in cookie. Falling back to personal orbit.`);
            groupId = null; // Invalidate if user is not a member or group doesn't exist
        }
    }

    try {
        const { data, error } = await supabase.from('life_prks').insert([{ 
            title: values.title, 
            description: values.description || '',
            color_theme: values.color_theme || 'mint',
            user_id: userId,
            group_id: groupId,
        }]).select();

        if(error) throw error;
    } catch(error) {
        await logError(error, { at: 'addOrbit', values });
        console.error("Error adding Orbit:", error);
        throw error;
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function updateOrbit(id: string, values: { title: string; description?: string, color_theme?: string }) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        const { error } = await supabase
            .from('life_prks')
            .update({ 
                title: values.title, 
                description: values.description || '',
                color_theme: values.color_theme || 'mint',
            })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        await logError(error, { at: 'updateOrbit', id, values });
        console.error("Error updating Orbit:", error);
        throw error;
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function addPhase(values: { title: string; description?: string, life_prk_id: string }) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    let groupId = cookies().get('groupId')?.value || null;

    // Validate the groupId
    if (groupId) {
        const { data: groupMember, error: groupError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (groupError || !groupMember) {
            console.warn(`Invalid or non-member groupId (${groupId}) found in cookie. Falling back to personal phase.`);
            groupId = null; // Invalidate if user is not a member or group doesn't exist
        }
    }

    try {
        const { data, error } = await supabase.from('area_prks').insert([{ 
            title: values.title,
            description: values.description || '',
            unit: '%', // Hardcode default unit
            life_prk_id: values.life_prk_id,
            target_value: 100,
            current_value: 0,
            user_id: userId,
            group_id: groupId,
         }]).select();

        if(error) throw error;
    } catch(error) {
        await logError(error, { at: 'addPhase', values });
        console.error('Supabase error adding Phase:', error);
        throw error;
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function updatePhase(id: string, values: { title: string; description?: string; life_prk_id: string }) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        const { error } = await supabase
            .from('area_prks')
            .update({ 
                title: values.title,
                description: values.description || '',
                life_prk_id: values.life_prk_id,
            })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        await logError(error, { at: 'updatePhase', id, values });
        console.error('Supabase error updating Phase:', error);
        throw error;
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function addPulse(values: Partial<Omit<Pulse, 'id' | 'created_at' | 'archived_at' | 'archived'>>) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    let groupId = cookies().get('groupId')?.value || null;

    // Validate the groupId
    if (groupId) {
        const { data: groupMember, error: groupError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('group_id', groupId)
            .eq('user_id', userId)
            .single();

        if (groupError || !groupMember) {
            console.warn(`Invalid or non-member groupId (${groupId}) found in cookie. Falling back to personal pulse.`);
            groupId = null; // Invalidate if user is not a member or group doesn't exist
        }
    }
    
    const { phase_ids, ...taskData } = values;
    const dataToInsert: any = { ...taskData, user_id: userId, group_id: groupId };

    if (dataToInsert.frequency === 'UNICA') {
        dataToInsert.frequency = null;
    }
    
    try {
        const { data: newTask, error } = await supabase.from('habit_tasks').insert([dataToInsert]).select().single();
        if (error) throw error;

        if (phase_ids && phase_ids.length > 0) {
            const links = phase_ids.map(phase_id => ({
                habit_task_id: newTask.id,
                area_prk_id: phase_id,
            }));
            const { error: linkError } = await supabase.from('habit_task_area_prk_links').insert(links);
            if (linkError) throw linkError;
        }

    } catch (error) {
        await logError(error, { at: 'addPulse', values: dataToInsert, phase_ids });
        console.error("Error adding Pulse:", error);
        throw error;
    }
    revalidatePath('/panel');
    revalidatePath('/calendar');
    revalidatePath('/day');
}

export async function updatePulse(id: string, values: Partial<Omit<Pulse, 'id' | 'created_at' | 'archived' | 'archived_at' | 'user_id'>>): Promise<void> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    
    const { phase_ids, ...updateData } = values;

    if ('frequency' in updateData && updateData.frequency === 'UNICA') {
        (updateData as any).frequency = null;
    }

    try {
        const { error } = await supabase
            .from('habit_tasks')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
        
        // This now checks if phase_ids is provided in the update.
        // If it's not, we don't touch the links.
        if (phase_ids && Array.isArray(phase_ids)) {
            // Delete existing links
            const { error: deleteError } = await supabase.from('habit_task_area_prk_links').delete().eq('habit_task_id', id);
            if (deleteError) throw deleteError;
            
            // Insert new links if the array is not empty
            if (phase_ids.length > 0) {
                 const links = phase_ids.map(phase_id => ({
                    habit_task_id: id,
                    area_prk_id: phase_id,
                }));
                const { error: linkError } = await supabase.from('habit_task_area_prk_links').insert(links);
                if (linkError) throw linkError;
            }
        }
    } catch (error) {
        await logError(error, { at: 'updatePulse', id, values });
        console.error("Error updating Pulse:", error);
        throw error;
    }

    revalidatePath('/panel');
    revalidatePath('/calendar');
    revalidatePath('/day');
}


export async function updatePulseOrder(orderedIds: string[]): Promise<void> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    try {
        const { error } = await supabase.rpc('update_pulse_order', {
            p_ordered_ids: orderedIds,
            p_user_id: userId
        });

        if (error) throw error;
    } catch (error) {
        await logError(error, { at: 'updatePulseOrder', orderedIds });
        console.error("Error updating pulse order:", error);
        throw new Error("Failed to update pulse order.");
    }
    revalidatePath('/day');
}


export async function logPulseCompletion(pulseId: string, type: 'habit' | 'task', completionDate: string, progressValue?: number) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    try {
        // --- Get Task Details ---
        const { data: task, error: taskError } = await supabase
            .from('habit_tasks')
            .select('frequency, measurement_type, measurement_goal')
            .eq('id', pulseId)
            .eq('user_id', userId)
            .single();

        if (taskError || !task) {
            throw new Error(`Could not find task with id ${pulseId}.`);
        }

        // --- Handle one-off tasks completion status ---
        if (type === 'task' && !task.frequency && progressValue === undefined) {
            const { error: updateError } = await supabase
                .from('habit_tasks')
                .update({ completion_date: completionDate })
                .eq('id', pulseId)
                .eq('user_id', userId);
            if (updateError) throw updateError;
        }

        // --- Logic for different measurement types ---
        // For both binary and quantitative accumulative tasks, we upsert to accumulate.
        
        // 1. Get existing log for the day
        const { data: existingLog } = await supabase
            .from('progress_logs')
            .select('progress_value')
            .eq('habit_task_id', pulseId)
            .eq('completion_date', completionDate)
            .single();
        
        // 2. Calculate new total progress value
        const currentValue = existingLog?.progress_value ?? 0;
        const newValue = currentValue + (progressValue ?? 1);

        // 3. Calculate completion percentage
        let completionPercentage = 1.0;
        if (task.measurement_type === 'quantitative' || task.frequency?.includes('ACUMULATIVO')) {
            const target = task.measurement_goal?.target_count;
            if (typeof target === 'number' && target > 0) {
                completionPercentage = newValue / target;
            } else {
                completionPercentage = newValue > 0 ? 1 : 0;
            }
        }
        
        // 4. Upsert the accumulated value
        const { error: logErrorObj } = await supabase.from('progress_logs').upsert({
            habit_task_id: pulseId,
            completion_date: completionDate,
            progress_value: newValue,
            completion_percentage: completionPercentage,
            user_id: userId,
        }, { onConflict: 'habit_task_id, completion_date, user_id' });

        if (logErrorObj) throw logErrorObj;

        revalidatePath('/panel');
        revalidatePath('/calendar');
        revalidatePath('/day');
    } catch (error) {
        await logError(error, { at: 'logPulseCompletion', pulseId, completionDate, progressValue });
        console.error('Error in logPulseCompletion:', error);
        throw new Error('Failed to log task completion.');
    }
}

export async function removePulseCompletion(pulseId: string, type: 'habit' | 'task', completionDate: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        if (type === 'task') {
             const { data: taskDetails, error: taskError } = await supabase.from('habit_tasks').select('frequency').eq('id', pulseId).eq('user_id', userId).single();
            if (taskError) throw taskError;
            if (!taskDetails.frequency) {
                 const { error } = await supabase
                    .from('habit_tasks')
                    .update({ completion_date: null })
                    .eq('id', pulseId)
                    .eq('user_id', userId);
                if (error) throw error;
            }
        }
        
        const { error } = await supabase
            .from('progress_logs')
            .delete()
            .eq('habit_task_id', pulseId)
            .eq('completion_date', completionDate)
            .eq('user_id', userId);

        if (error) {
            console.warn(`Could not find a log to delete for habit ${pulseId} on ${completionDate}:`, error.message);
        }
        
        revalidatePath('/panel');
        revalidatePath('/calendar');
        revalidatePath('/day');
    } catch (error) {
        await logError(error, { at: 'removePulseCompletion', pulseId, completionDate });
        console.error('Error in removePulseCompletion:', error);
        throw new Error('Failed to remove task completion log.');
    }
}

export async function archiveOrbit(id: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        const { error } = await supabase.from('life_prks').update({ archived: true }).eq('id', id).eq('user_id', userId);
        if(error) throw error;
    } catch (error) {
        await logError(error, { at: 'archiveOrbit', id });
        console.error("Error archiving orbit:", error);
        throw new Error("Failed to archive orbit.");
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function archivePhase(id: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        const { error } = await supabase.from('area_prks').update({ archived: true }).eq('id', id).eq('user_id', userId);
        if(error) throw error;
    } catch(error) {
        await logError(error, { at: 'archivePhase', id });
        console.error("Error archiving phase:", error);
        throw new Error("Failed to archive phase.");
    }
    revalidatePath('/panel');
    revalidatePath('/day');
}

export async function archivePulse(id: string, archiveDate: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();
    try {
        const { error } = await supabase
            .from('habit_tasks')
            .update({ archived: true, archived_at: archiveDate })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        await logError(error, { at: 'archivePulse', id, archiveDate });
        console.error("Error archiving pulse:", error);
        if (error instanceof Error) {
            throw error; // Re-throw the specific error message
        }
        throw new Error("Failed to archive pulse.");
    }

    revalidatePath('/panel');
    revalidatePath('/calendar');
    revalidatePath('/day');
}


export async function createGroup(name: string, description?: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    try {
        const { data: group, error: groupError } = await supabase.from('groups').insert([{ 
            name,
            description,
            owner_id: userId,
        }]).select().single();

        if (groupError) {
            // If the error is a unique constraint violation on the group name, handle it.
            if (groupError.code === '23505') {
                console.warn(`Group with name "${name}" already exists.`);
                // Optionally, you could return the existing group or throw a more specific error.
            }
            throw groupError;
        }

        // The trigger 'on_group_created_add_owner' should handle adding the owner to group_members.
        // The manual insert is removed to prevent duplicate key errors.

    } catch (error) {
        await logError(error, { at: 'createGroup', name, description });
        console.error("Error creating group:", error);
        throw error;
    }
    revalidatePath('/grup');
}

export async function inviteUserToGroup(groupId: string, userId: string) {
    const supabase = await createClient();

    try {
        const { error } = await supabase.from('group_members').insert([{ 
            group_id: groupId,
            user_id: userId,
            role: 'member',
        }]);

        if (error) throw error;

    } catch (error) {
        await logError(error, { at: 'inviteUserToGroup', groupId, userId });
        console.error("Error inviting user to group:", error);
        throw error;
    }
    revalidatePath('/grup');
}

// --- Simple Tasks Actions ---

export async function getSimpleTasks(): Promise<SimpleTask[]> {
  const supabase = await createClient();
  
  // This RPC call fetches tasks and their share info in one go.
  const { data, error } = await supabase.rpc('get_user_simple_tasks');

  if (error) {
    await logError(error, { at: 'getSimpleTasks' });
    console.error("Error fetching simple tasks:", error);
    return [];
  }
  
  // The RPC returns a structure that needs to be mapped to our SimpleTask type.
  return data.map((item: any) => ({
    id: item.id,
    user_id: item.user_id,
    created_at: item.created_at,
    title: item.title,
    is_completed: item.is_completed,
    start_date: item.start_date,
    due_date: item.due_date,
    owner_email: item.owner_email,
    assigned_to_user_id: item.assigned_to_user_id,
    assigned_to_email: item.assigned_to_email,
    shared_with: item.shared_with,
  }));
}

export async function addSimpleTask(title: string, description: string | null, dueDate?: string | null): Promise<void> {
  if (!title) {
    throw new Error('Title is required');
  }
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const { error } = await supabase
    .from('simple_tasks')
    .insert({ title, description, user_id: userId, is_completed: false, due_date: dueDate });

  if (error) {
    await logError(error, { at: 'addSimpleTask', title });
    console.error("Error adding simple task:", error);
    throw new Error('Failed to add task.');
  }
  revalidatePath('/tasks');
}

export async function updateSimpleTask(id: string, title: string, dueDate?: string | null): Promise<void> {
    if (!title) {
        throw new Error('Title is required');
    }
    const supabase = await createClient();

    // RLS policy will determine who can update (owner or assignee)
    const { error } = await supabase
        .from('simple_tasks')
        .update({ title, due_date: dueDate })
        .eq('id', id);

    if (error) {
        await logError(error, { at: 'updateSimpleTask', id, title, dueDate });
        console.error("Error updating simple task:", error);
        throw new Error('Failed to update task.');
    }
    revalidatePath('/tasks');
}


export async function updateSimpleTaskCompletion(id: string, is_completed: boolean): Promise<void> {
  const supabase = await createClient();
  
  // RLS policy will enforce who can update it (owner, assignee, or shared user)
  const { error } = await supabase
    .from('simple_tasks')
    .update({ is_completed })
    .eq('id', id)

  if (error) {
    await logError(error, { at: 'updateSimpleTaskCompletion', id, is_completed });
    console.error("Error updating simple task:", error);
    throw new Error('Failed to update task.');
  }
  revalidatePath('/tasks');
}

export async function deleteSimpleTask(id: string): Promise<void> {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  // RLS policy ensures only the owner can delete.
  const { error } = await supabase
    .from('simple_tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    await logError(error, { at: 'deleteSimpleTask', id });
    console.error("Error deleting simple task:", error);
    throw new Error('Failed to delete task.');
  }
  revalidatePath('/tasks');
}


// --- Task Sharing & Assigning Actions ---
async function createAdminClient() {
    const cookieStore = await cookies();

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
    }

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
            },
            auth: {
                // Esto previene que el cliente de servicio intente usar el JWT del usuario
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export async function getRegisteredUsers(): Promise<{ id: string, email: string }[]> {
    const supabaseAdmin = await createAdminClient();
    const currentUserId = await getCurrentUserId();

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
        await logError(error, { at: 'getRegisteredUsers' });
        console.error('Error fetching users:', error);
        return [];
    }

    return users
        .filter(user => user.id !== currentUserId && user.email)
        .map(user => ({ id: user.id, email: user.email! }));
}


export async function shareTaskWithUser(taskId: string, sharedWithUserId: string): Promise<void> {
    const supabase = await createClient();
    const sharedByUserId = await getCurrentUserId();

    const { error } = await supabase
        .from('task_shares')
        .insert({
            task_id: taskId,
            shared_with_user_id: sharedWithUserId,
            shared_by_user_id: sharedByUserId,
        });

    if (error) {
        await logError(error, { at: 'shareTaskWithUser', taskId, sharedWithUserId });
        console.error('Error sharing task:', error);
        throw new Error('Failed to share task.');
    }
    revalidatePath('/tasks');
}

export async function unshareTaskWithUser(taskId: string, sharedWithUserId: string): Promise<void> {
    const supabase = await createClient();
    const sharedByUserId = await getCurrentUserId();

    const { error } = await supabase
        .from('task_shares')
        .delete()
        .eq('task_id', taskId)
        .eq('shared_with_user_id', sharedWithUserId)
        .eq('shared_by_user_id', sharedByUserId);

    if (error) {
        await logError(error, { at: 'unshareTaskWithUser', taskId, sharedWithUserId });
        console.error('Error unsharing task:', error);
        throw new Error('Failed to unshare task.');
    }
    revalidatePath('/tasks');
}

export async function assignSimpleTask(taskId: string, assignedToUserId: string | null): Promise<void> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    const { error } = await supabase
        .from('simple_tasks')
        .update({ assigned_to_user_id: assignedToUserId })
        .eq('id', taskId)
        .eq('user_id', userId); // Only the owner can assign the task

    if (error) {
        await logError(error, { at: 'assignSimpleTask', taskId, assignedToUserId });
        console.error("Error assigning task:", error);
        throw new Error('Failed to assign task.');
    }
    revalidatePath('/tasks');
}

export async function getDashboardDataAction(date: string | undefined, groupId: string | null) {
  // The server action is the security boundary. It must validate the groupId.
  let validatedGroupId = groupId;
  if (groupId) {
      const supabase = await createClient();
      const userId = await getCurrentUserId();
      const { data: groupMember, error } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .single();

      if (error || !groupMember) {
          console.warn(`Invalid or non-member groupId (${groupId}) passed to getDashboardDataAction. Falling back to personal data.`);
          validatedGroupId = null;
      }
  }
  return getDashboardData(date, validatedGroupId);
}

export async function getCalendarDataAction(monthString: string | null | undefined, groupId: string | null) {
  const monthDate = monthString ? parseISO(monthString) : new Date();
  return getCalendarData(monthDate, groupId);
}

export async function getAnalyticsDataAction(filters: {
    level?: 'orbits' | 'phases' | 'pulses';
    timePeriod?: 'all' | 'last30d' | 'last3m' | 'custom';
    from?: string;
    to?: string;
    scale?: 'daily' | 'weekly' | 'monthly';
    orbitId?: string;
    phaseId?: string;
    pulseId?: string;
}, groupId: string | null) {
    const { level = 'orbits', timePeriod = 'last30d', scale = 'daily', from, to, orbitId, phaseId, pulseId } = filters;
    
    let timePeriodForQuery: 'all' | 'last30d' | 'last3m' | { from: Date; to: Date };

    if (timePeriod === 'custom' && from && to) {
        timePeriodForQuery = {
            from: new Date(from),
            to: new Date(to),
        };
    } else if (timePeriod === 'last3m' || timePeriod === 'all' || timePeriod === 'last30d') {
        timePeriodForQuery = timePeriod;
    } else {
        timePeriodForQuery = 'last30d'; // Default
    }

    return getAnalyticsData({ 
        level, 
        timePeriod: timePeriodForQuery, 
        scale, 
        orbitId, 
        phaseId, 
        pulseId 
    }, groupId);
}