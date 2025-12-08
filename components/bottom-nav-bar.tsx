
'use client';

import { Compass, Calendar as CalendarIcon, LineChart, CheckSquare, Sun, Plus, Target, Orbit as OrbitIcon, Layers, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDialog } from "@/hooks/use-dialog";
import { Button } from "./ui/button";
import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


export function BottomNavBar() {
    const pathname = usePathname();
    const { onOpenOrbit, onOpenPhase, onOpenPulse } = useDialog();

    const handleFabClick = () => {
         // This is a trick. DayView has a hidden button that this click will trigger.
         const dayViewFab = document.getElementById('day-view-fab-trigger') as HTMLButtonElement | null;
         if (dayViewFab && pathname.startsWith('/day')) {
            dayViewFab.click();
         } else {
            // Default action for other pages if not panel
            onOpenOrbit();
         }
    };

    const navLinks = [
        { href: "/day", label: "Mi Día", icon: Sun },
        { href: "/panel", label: "Panel", icon: Compass },
        { href: "/analytics", label: "Analíticas", icon: LineChart },
        { href: "/tasks", label: "Tareas", icon: CheckSquare },
    ];

    const isPanelPage = pathname.startsWith('/panel');

    const FabButton = () => (
         <Button
            size="icon"
            className="rounded-full w-16 h-16 bg-gradient-to-br from-primary to-cyan-400 text-white shadow-lg"
        >
            <Plus className="h-8 w-8" />
        </Button>
    );

    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-sm border-t z-50">
            <div className="relative flex items-center justify-around h-full max-w-2xl mx-auto">
                {navLinks.map((link, index) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                        <React.Fragment key={link.href}>
                            {/* Placeholder for the FAB */}
                            {index === 2 && <div className="w-16 h-16" />}
                            
                            <Link href={link.href} className="flex flex-col items-center justify-center w-1/5 h-full text-center">
                                <link.icon className={cn(
                                    "h-6 w-6 transition-colors",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )} />
                                <span className={cn(
                                    "text-xs mt-1 transition-colors",
                                     isActive ? "text-primary font-semibold" : "text-muted-foreground"
                                )}>
                                    {link.label}
                                </span>
                            </Link>
                        </React.Fragment>
                    );
                })}

                <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                    {isPanelPage ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <FabButton />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="center" className="mb-2 w-56">
                                <DropdownMenuItem onClick={() => onOpenOrbit()}>
                                    <OrbitIcon className="mr-2 h-4 w-4" />
                                    <span>Agregar Órbita</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenPhase()}>
                                     <Layers className="mr-2 h-4 w-4" />
                                    <span>Agregar Fase</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenPulse()}>
                                    <Zap className="mr-2 h-4 w-4" />
                                    <span>Agregar Pulso</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <div onClick={handleFabClick}>
                           <FabButton />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
