import * as React from 'react';
import { Panel } from '@/components/panel';
import { getPanelData } from '@/app/server/queries';
import { createClient } from '@/lib/supabase/server';
import { getSafeCookieStore } from '@/lib/cookies';
import { logError } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Helper function to isolate the dynamic cookies() call
async function getGroupId() {
  try {
    const cookieStore = await getSafeCookieStore();
    const groupId = cookieStore.get('groupId')?.value || null;
    // await logError(`[Panel Debug] Cookie groupId: ${groupId}`, { at: 'PanelPage.getGroupId' });
    return groupId;
  } catch (error) {
    await logError(error, { at: 'PanelPage.getGroupId', phase: 'cookie-read' });
    return null;
  }
}

export default async function PanelPage() {
  await logError('[Panel Debug] Starting Panel Page Render', { at: 'PanelPage', time: new Date().toISOString() });

  let groupId = await getGroupId();

  try {
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
          await logError(`[Panel Debug] Invalid group membership`, { at: 'PanelPage', groupId, error });
          console.warn(`Invalid or non-member groupId (${groupId}) in cookie for PanelPage. Falling back to personal data.`);
          groupId = null;
        }
      } else {
        await logError(`[Panel Debug] No authenticated user found during group validation`, { at: 'PanelPage' });
        // No user, so can't be in a group
        groupId = null;
      }
    }

    // Fetch data specifically for the strategic panel view, without date filtering.
    const { orbits, phases, allPulses } = await getPanelData(groupId);

    await logError(`[Panel Debug] Data Fetched Successfully`, {
      at: 'PanelPage',
      orbitsCount: orbits.length,
      phasesCount: phases.length,
      pulsesCount: allPulses.length
    });

    return (
      <Panel
        orbits={orbits}
        phases={phases}
        allPulses={allPulses}
      />
    );
  } catch (error) {
    await logError(error, { at: 'PanelPage.render', fatal: true });
    throw error; // Let Error Boundary handle UI
  }
}
