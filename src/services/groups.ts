
import { createClient } from "@/lib/supabase/server";
import { logError } from "@/lib/logger";
import { redirect } from "next/navigation";

async function getCurrentUserId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error('User not authenticated, redirecting to login.');
        redirect('/login');
    }
    return user.id;
}

export async function getGroupsForUser() {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    const { data, error } = await supabase
        .from('group_members')
        .select('groups(*)')
        .eq('user_id', userId);

    if (error) {
        await logError(error, { at: 'getGroupsForUser' });
        throw error;
    }

    return data.map(item => item.groups).filter(Boolean);
}

export async function getGroupMembers(groupId: string): Promise<{ id: string; email: string | undefined; role: string; avatar_url: string | undefined; full_name: string | undefined }[]> {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // First, verify the current user is a member of the group they are trying to view.
    const { data: memberCheck, error: memberCheckError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .single();

    if (memberCheckError || !memberCheck) {
        await logError(new Error('User is not a member of this group or group does not exist.'), { at: 'getGroupMembers', groupId });
        throw new Error("Access denied: You are not a member of this group.");
    }

    // Call the new database function.
    const { data: members, error } = await supabase
        .rpc('get_group_members_with_details', { p_group_id: groupId });

    if (error) {
        await logError(error, { at: 'getGroupMembers RPC call', groupId });
        throw error;
    }

    return members || [];
}

export async function getGroupDetails(groupId: string) {
    const supabase = await createClient();
    const userId = await getCurrentUserId();

    // Verify the current user is a member of the group.
    const { data: memberCheck, error: memberCheckError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .single();

    if (memberCheckError || !memberCheck) {
        await logError(new Error('User is not a member of this group or group does not exist.'), { at: 'getGroupDetails', groupId });
        throw new Error("Access denied: You are not a member of this group.");
    }

    // Fetch the group details.
    const { data: group, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single();

    if (error) {
        await logError(error, { at: 'getGroupDetails', groupId });
        throw error;
    }

    return group;
}
