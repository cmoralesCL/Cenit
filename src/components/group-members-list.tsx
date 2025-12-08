'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Define the type for a single member, matching the data from getGroupMembers
type Member = {
  id: string;
  email: string | undefined;
  role: string;
  avatar_url: string | undefined;
  full_name: string | undefined;
};

export function GroupMembersList({ members }: { members: Member[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Miembros del Grupo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={member.avatar_url || undefined} alt={member.full_name || member.email} />
                  <AvatarFallback>
                    {member.full_name?.charAt(0) || member.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
              </div>
              <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                {member.role}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
