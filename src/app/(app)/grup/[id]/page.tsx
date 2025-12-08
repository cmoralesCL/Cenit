
import { getGroupDetails, getGroupMembers } from "@/app/server/queries";
import { GroupMembersList } from "@/components/group-members-list";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteUserDialog } from "@/components/invite-user-dialog";

export const dynamic = 'force-dynamic';

export default async function GroupDetailsPage({ params }: { params: { id: string } }) {
  const groupId = params.id;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  let group, members;

  try {
    [group, members] = await Promise.all([
      getGroupDetails(groupId),
      getGroupMembers(groupId)
    ]);
  } catch (error) {
    console.error("Error fetching group data:", error);
    // If the user is not a member, the query throws an error, leading to a 404.
    notFound();
  }

  if (!group) {
    notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {user && user.id === group.owner_id && (
          <InviteUserDialog groupId={group.id} />
        )}
      </div>
      <p className="text-muted-foreground mb-6">{group.description}</p>
      
      <GroupMembersList members={members} />
    </div>
  );
}
