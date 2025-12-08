

'use client';

import { CheckCircle, Circle, Zap, Star } from 'lucide-react';
import type { Pulse, ColorTheme } from '@/lib/types';
import { THEMES } from '@/lib/themes';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Archive } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ProgressCircle } from './ui/progress-circle';

interface PulseListItemProps {
  pulse: Pulse;
  colorTheme: ColorTheme;
  onEdit: () => void;
  onArchive: () => void;
}

function ImpactRating({ rating }: { rating: number }) {
    return (
      <div className="flex items-center gap-0.5" title={`Impacto: ${rating}/5`}>
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "h-4 w-4",
              i < rating ? "fill-yellow-400 text-yellow-500" : "fill-muted stroke-muted-foreground/50"
            )}
          />
        ))}
      </div>
    );
}


export function PulseListItem({
  pulse,
  colorTheme,
  onEdit,
  onArchive,
}: PulseListItemProps) {
  const theme = THEMES[colorTheme];
  const progress = pulse.progress ?? 0;
  const isCompleted = progress >= 100;
  const CompletionIcon = isCompleted ? CheckCircle : Circle;

  return (
    <div className="flex items-center gap-3 py-2 text-sm">
        <CompletionIcon 
            className={cn("h-5 w-5 flex-shrink-0", isCompleted ? 'text-green-500' : 'text-muted-foreground')} 
            style={{ color: isCompleted ? theme.gradient.split(', ')[1].slice(0, -1) : undefined }}
        />
        <div className="flex-grow">
            <p className="font-medium text-foreground">{pulse.title}</p>
            <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">{pulse.type === 'habit' ? 'Hábito' : 'Tarea'}</Badge>
                <ImpactRating rating={pulse.weight} />
            </div>
        </div>
        <div className="flex items-center gap-2">
            {pulse.progress !== undefined && (
                <ProgressCircle progress={progress} className="h-10 w-10" />
            )}
            {pulse.is_critical && <Zap className="h-4 w-4 text-yellow-500" title="Pulso Crítico" />}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onEdit}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar Pulso
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onArchive}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archivar Pulso
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
  );
}
