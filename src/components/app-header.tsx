'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { LogOut, Users, User, ChevronsUpDown } from 'lucide-react';
import { useMode } from '@/hooks/use-mode.tsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Group } from '@/lib/types';

interface AppHeaderProps {
    userEmail?: string | null;
    groups: Group[];
}

export function AppHeader({ userEmail, groups }: AppHeaderProps) {
    const router = useRouter();
    const { mode, setMode, groupId, setGroupId } = useMode();

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleModeChange = (newMode: 'individual' | 'group', newGroupId: string | null) => {
        setMode(newMode);
        setGroupId(newGroupId);
        // TODO: Persist the mode selection in localStorage
        router.refresh();
    };

    const selectedGroup = groups.find(g => g.id === groupId);

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur-sm">
            <div className="container mx-auto flex h-14 items-center px-2 sm:px-4 lg:px-6">
                <div className="flex flex-1 items-center justify-between">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                {mode === 'group' && selectedGroup ? (
                                    <>
                                        <Users className="h-4 w-4" />
                                        <span>{selectedGroup.name}</span>
                                    </>
                                ) : (
                                    <>
                                        <User className="h-4 w-4" />
                                        <span>Individual</span>
                                    </>
                                )}
                                <ChevronsUpDown className="h-4 w-4 opacity-50" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleModeChange('individual', null)}>
                                <User className="mr-2 h-4 w-4" />
                                <span>Individual</span>
                            </DropdownMenuItem>
                            {groups.map(group => (
                                <DropdownMenuItem key={group.id} onClick={() => handleModeChange('group', group.id)}>
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>{group.name}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        <Button variant="ghost" size="sm" onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Cerrar Sesión
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
