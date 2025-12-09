
import * as React from 'react';
import { Panel } from '@/components/panel';
import { getPanelData } from '@/app/server/queries';
import { createClient } from '@/lib/supabase/server';
import { getSafeCookieStore } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

// Helper function to isolate the dynamic cookies() call
async function getGroupId() {
  const cookieStore = await getSafeCookieStore();
  return cookieStore.get('groupId')?.value || null;
}

export default async function PanelPage() {
  let groupId = await getGroupId();

  // Validate the groupId from the cookie
  if (groupId) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: groupMember, error } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('group_id', groupId)
        .eq('user_id', user.id)
        .single();

      if (error || !groupMember) {
        console.warn(`Invalid or non-member groupId (${groupId}) in cookie for PanelPage. Falling back to personal data.`);
        groupId = null;
      }
    } else {
      // No user, so can't be in a group
      groupId = null;
    }
  }

  // Fetch data specifically for the strategic panel view, without date filtering.
  const { orbits, phases, allPulses } = await getPanelData(groupId);

  return (
    <Panel
      orbits={orbits}
      phases={phases}
      allPulses={allPulses}
    />
  );
}
