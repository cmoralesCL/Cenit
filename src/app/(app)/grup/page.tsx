
import * as React from 'react';
import { createClient } from '@/lib/supabase/server';
import { getGroupsForUser } from '@/app/server/queries';
import { GroupList } from '@/components/group-list';

export const dynamic = 'force-dynamic';

export default async function GroupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const groups = await getGroupsForUser();

  return <GroupList groups={groups} userId={user?.id} />;
}
