
import Link from 'next/link';
import { AddGroupDialog } from "./add-group-dialog";
import { Group } from "@/lib/types";

interface GroupListProps {
  groups: Group[];
  userId?: string;
}

export function GroupList({ groups, userId }: GroupListProps) {
  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Grupos</h1>
        <AddGroupDialog />
      </div>
      <div className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Mis Grupos</h2>
        {groups.length > 0 ? (
          <ul className="space-y-4">
            {groups.map(group => (
              <Link href={`/grup/${group.id}`} key={group.id}>
                <li className="flex items-center justify-between p-4 border rounded-lg transition-colors hover:bg-muted/50 cursor-pointer">
                  <div>
                    <h3 className="font-semibold">{group.name}</h3>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </div>
                </li>
              </Link>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            Aún no perteneces a ningún grupo. ¡Crea uno para empezar!
          </p>
        )}
      </div>
    </div>
  );
}
