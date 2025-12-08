'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { getDashboardDataAction } from '@/app/actions';
import { DayView } from '@/components/day-view';
import { Orbit, Phase, Pulse, DailyProgressSnapshot } from '@/lib/types';
import { useMode } from '@/hooks/use-mode.tsx';
import { Skeleton } from "@/components/ui/skeleton";

// Define the type for the dashboard data
type DashboardData = Awaited<ReturnType<typeof getDashboardDataAction>>;

function DayViewContainer() {
  const searchParams = useSearchParams();
  const date = searchParams.get('date');

  const { groupId } = useMode();

  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getDashboardDataAction(date ?? undefined, groupId)
      .then(result => {
        // The result from a server action is a plain JSON object, so direct assignment is fine.
        setData(result);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [date, groupId]);

  if (loading || !data) {
    return (
        <div className="space-y-4 p-4">
            <div className="flex justify-between">
                <Skeleton className="h-10 w-40" />
                <Skeleton className="h-10 w-24" />
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-60 w-full" />
                <Skeleton className="h-60 w-full" />
                <Skeleton className="h-60 w-full" />
            </div>
        </div>
    );
  }
  
  const normalizedOrbits: Orbit[] = data.orbits.map((o: any) => ({
    ...o,
    progress: o.progress ?? undefined,
  }));
  const normalizedPhases: Phase[] = data.phases.map((p: any) => ({
    ...p,
    progress: p.progress ?? 0,
  }));

  return (
    <DayView
      orbits={normalizedOrbits}
      phases={normalizedPhases}
      pulses={data.pulses}
      commitments={data.commitments}
      initialSelectedDate={data.date}
      dailyProgressDataForWeek={data.dailyProgressDataForWeek}
      weeklyProgress={data.weeklyProgress}
      monthlyProgress={data.monthlyProgress}
    />
  );
}

export default function DayViewWrapper() {
    return (
        <React.Suspense fallback={<div>Loading...</div>}>
            <DayViewContainer />
        </React.Suspense>
    );
}
