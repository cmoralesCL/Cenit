'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnalyticsData, Orbit, Phase, Pulse } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface AnalyticsFiltersProps {
  data: AnalyticsData;
}

export function AnalyticsFilters({ data }: AnalyticsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [level, setLevel] = React.useState(searchParams.get('level') || 'orbits');
  const [orbitId, setOrbitId] = React.useState(searchParams.get('orbitId') || 'all');
  const [phaseId, setPhaseId] = React.useState(searchParams.get('phaseId') || 'all');
  const [pulseId, setPulseId] = React.useState(searchParams.get('pulseId') || 'all');
  const [timePeriod, setTimePeriod] = React.useState(searchParams.get('timePeriod') || 'last30d');
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
    from: searchParams.get('from') ? new Date(search_params_get('from')!) : undefined,
    to: searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined,
  });
  const [scale, setScale] = React.useState(searchParams.get('scale') || 'daily');

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/analytics?${params.toString()}`);
  };

  const handleLevelChange = (newLevel: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('level', newLevel);
    params.delete('orbitId');
    params.delete('phaseId');
    params.delete('pulseId');
    router.push(`/analytics?${params.toString()}`);
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range?.to) {
        const params = new URLSearchParams(searchParams.toString());
        params.set('timePeriod', 'custom');
        params.set('from', format(range.from, 'yyyy-MM-dd'));
        params.set('to', format(range.to, 'yyyy-MM-dd'));
        router.push(`/analytics?${params.toString()}`);
    }
  }

  const filteredPhases = data.allPhases.filter(p => p.life_prk_id === orbitId);
  const filteredPulses = data.allPulses.filter(p => p.phase_ids.includes(phaseId));

  return (
    <div className="p-4 bg-card border-b">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Level Selector */}
        <Select value={level} onValueChange={handleLevelChange}>
          <SelectTrigger><SelectValue placeholder="Nivel" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="orbits">Órbitas</SelectItem>
            <SelectItem value="phases">Fases</SelectItem>
            <SelectItem value="pulses">Pulsos</SelectItem>
          </SelectContent>
        </Select>

        {/* Item Selector */}
        <div className="grid grid-cols-1 gap-2">
            {level === 'orbits' && (
                <Select value={orbitId} onValueChange={(value) => handleFilterChange('orbitId', value)}>
                    <SelectTrigger><SelectValue placeholder="Órbita" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas las Órbitas</SelectItem>
                        {data.allOrbits.map((orbit: Orbit) => (
                            <SelectItem key={orbit.id} value={orbit.id}>{orbit.title}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
            {level === 'phases' && (
                <>
                    <Select value={orbitId} onValueChange={(value) => handleFilterChange('orbitId', value)}>
                        <SelectTrigger><SelectValue placeholder="Órbita" /></SelectTrigger>
                        <SelectContent>
                            {data.allOrbits.map((orbit: Orbit) => (
                                <SelectItem key={orbit.id} value={orbit.id}>{orbit.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={phaseId} onValueChange={(value) => handleFilterChange('phaseId', value)} disabled={orbitId === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Fase" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas las Fases</SelectItem>
                            {filteredPhases.map((phase: Phase) => (
                                <SelectItem key={phase.id} value={phase.id}>{phase.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </>
            )}
            {level === 'pulses' && (
                <>
                    <Select value={orbitId} onValueChange={(value) => handleFilterChange('orbitId', value)}>
                        <SelectTrigger><SelectValue placeholder="Órbita" /></SelectTrigger>
                        <SelectContent>
                            {data.allOrbits.map((orbit: Orbit) => (
                                <SelectItem key={orbit.id} value={orbit.id}>{orbit.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={phaseId} onValueChange={(value) => handleFilterChange('phaseId', value)} disabled={orbitId === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Fase" /></SelectTrigger>
                        <SelectContent>
                            {filteredPhases.map((phase: Phase) => (
                                <SelectItem key={phase.id} value={phase.id}>{phase.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={pulseId} onValueChange={(value) => handleFilterChange('pulseId', value)} disabled={phaseId === 'all'}>
                        <SelectTrigger><SelectValue placeholder="Pulso" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos los Pulsos</SelectItem>
                            {filteredPulses.map((pulse: Pulse) => (
                                <SelectItem key={pulse.id} value={pulse.id}>{pulse.title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </>
            )}
        </div>

        {/* Time Period Selector */}
        <div className="grid grid-cols-1 gap-2">
            <Select value={timePeriod} onValueChange={(value) => handleFilterChange('timePeriod', value)}>
                <SelectTrigger><SelectValue placeholder="Periodo" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="last7d">Últimos 7 días</SelectItem>
                    <SelectItem value="last30d">Últimos 30 días</SelectItem>
                    <SelectItem value="last90d">Últimos 90 días</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
            </Select>
            {timePeriod === 'custom' && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline">
                            {dateRange?.from ? (
                                dateRange.to ? (
                                    <>{format(dateRange.from, "d MMM yyyy", { locale: es })} - {format(dateRange.to, "d MMM yyyy", { locale: es })}</>
                                ) : (
                                    format(dateRange.from, "d MMM yyyy", { locale: es })
                                )
                            ) : (
                                <span>Selecciona un rango</span>
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={handleDateRangeChange}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}
        </div>

        {/* Scale Selector */}
        <Select value={scale} onValueChange={(value) => handleFilterChange('scale', value)}>
            <SelectTrigger><SelectValue placeholder="Escala" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="daily">Diaria</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="monthly">Mensual</SelectItem>
            </SelectContent>
        </Select>
      </div>
    </div>
  );
}
