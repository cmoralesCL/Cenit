
'use client';

import { Compass, Calendar as CalendarIcon, LineChart, CheckSquare, Sun, Plus, Target, Orbit as OrbitIcon, Layers, Zap, X, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useDialog } from "@/hooks/use-dialog";
import { Button } from "./ui/button";
import * as React from 'react';


export function BottomNavBar() {
    const pathname = usePathname();
    const { onOpenOrbit, onOpenPhase, onOpenPulse } = useDialog();
    const [isFabMenuOpen, setFabMenuOpen] = React.useState(false);

    const isFabActivePage = pathname.startsWith('/panel') || pathname.startsWith('/day');

    const handleFabClick = () => {
         if (isFabActivePage) {
            setFabMenuOpen(prev => !prev);
         } else {
            // Default action for other pages if not the main ones
            onOpenPulse();
         }
    };

    const navLinks = [
        { href: "/day", label: "Mi Día", icon: Sun },
        { href: "/calendar", label: "Calendario", icon: CalendarIcon },
        { href: "/tasks", label: "Tareas", icon: CheckSquare },
        { href: "/panel", label: "Panel", icon: Compass },
        { href: "/analytics", label: "Analíticas", icon: LineChart },
        { href: "/grup", label: "Grupos", icon: Users },
    ];
    // Mantener el FAB centrado aunque cambie la cantidad de items
    const placeholderIndex = Math.floor(navLinks.length / 2);

    const fabMenuItems = [
        { label: 'Agregar Pulso', icon: Zap, action: onOpenPulse },
        { label: 'Agregar Fase', icon: Layers, action: onOpenPhase },
        { label: 'Agregar Órbita', icon: OrbitIcon, action: onOpenOrbit },
    ];

    const FabButton = () => (
         <Button
            size="icon"
            className={cn(
                "rounded-full w-16 h-16 bg-gradient-to-br from-primary to-cyan-400 text-white shadow-lg transition-transform duration-300 ease-in-out",
                isFabMenuOpen && isFabActivePage && "rotate-45"
            )}
        >
            <Plus className="h-8 w-8" />
        </Button>
    );

    return (
        <>
            {isFabActivePage && isFabMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-40" 
                    onClick={() => setFabMenuOpen(false)}
                ></div>
            )}
            <div className="fixed bottom-0 left-0 right-0 h-20 bg-card/95 backdrop-blur-sm border-t z-50">
                <div className="flex items-center justify-around h-full max-w-2xl mx-auto">
                    {[...navLinks.slice(0, placeholderIndex), { isFab: true }, ...navLinks.slice(placeholderIndex)].map((item, index) => {
                        if (item.isFab) {
                            return (
                                <div key="fab" className="relative flex-shrink-0" style={{ top: '-1.5rem' }}>
                                    <div className="relative flex flex-col items-center">
                                        {isFabActivePage && isFabMenuOpen && (
                                            <div 
                                                className="absolute bottom-full mb-4 flex flex-col items-center gap-3 transition-all duration-300"
                                                style={{
                                                    opacity: isFabMenuOpen ? 1 : 0,
                                                    transform: isFabMenuOpen ? 'translateY(0)' : 'translateY(10px)',
                                                }}
                                            >
                                                {fabMenuItems.map((menuItem, itemIndex) => (
                                                    <Button
                                                        key={menuItem.label}
                                                        className={cn(
                                                            "w-48 justify-start rounded-full h-12 pl-5 text-base font-semibold shadow-lg transition-all duration-300 ease-in-out transform",
                                                            isFabMenuOpen ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                                                            "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                                                        )}
                                                        style={{ transitionDelay: `${itemIndex * 50}ms`}}
                                                        onClick={() => {
                                                            if (menuItem.action) {
                                                                menuItem.action();
                                                            }
                                                            setFabMenuOpen(false);
                                                        }}
                                                    >
                                                        <menuItem.icon className="h-5 w-5 mr-3" />
                                                        <span>{menuItem.label}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        <div onClick={handleFabClick}>
                                            <FabButton />
                                        </div>
                                    </div>
                                </div>
                            );
                        }
                        
                        const link = item as typeof navLinks[0];
                        const isActive = pathname.startsWith(link.href);
                        return (
                            <Link key={link.href} href={link.href} className="flex flex-col items-center justify-center flex-1 h-full text-center">
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
                        );
                    })}
                </div>
            </div>
        </>
    );
}
