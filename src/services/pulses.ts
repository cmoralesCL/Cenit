import { createClient } from "@/lib/supabase/server";
import { Pulse } from "@/lib/types";

export async function fetchAndMapHabitTasks(userId: string, groupId: string | null): Promise<Pulse[]> {
    const supabase = await createClient();
    let query = supabase
        .from('habit_tasks')
        .select('*');

    if (groupId) {
        query = query.eq('group_id', groupId);
    } else {
        query = query.eq('user_id', userId).is('group_id', null);
    }

    const { data: tasks, error: tasksError } = await query.order('display_order', { nullsFirst: true });
    if (tasksError) throw tasksError;

    const { data: links, error: linksError } = await supabase
        .from('habit_task_area_prk_links')
        .select('habit_task_id, area_prk_id');
    if (linksError) throw linksError;

    const linksByTaskId = links.reduce((acc, link) => {
        if (!acc[link.habit_task_id]) {
            acc[link.habit_task_id] = [];
        }
        acc[link.habit_task_id].push(link.area_prk_id);
        return acc;
    }, {} as Record<string, string[]>);

    return tasks.map(task => ({
        ...task,
        phase_ids: linksByTaskId[task.id] || [],
    }));
}
