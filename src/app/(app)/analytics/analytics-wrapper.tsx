'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { getAnalyticsDataAction } from '@/app/actions';
import { NewAnalyticsDashboard } from '@/components/new-analytics-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { useMode } from '@/hooks/use-mode.tsx';

type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsDataAction>>;
type Level = 'orbits' | 'phases' | 'pulses';
type TimePeriod = 'all' | 'last7d' | 'last30d' | 'last90d' | 'custom';

function AnalyticsContainer() {
  const searchParams = useSearchParams();
  const level = (searchParams.get('level') as Level) || 'orbits';
  const timePeriod = (searchParams.get('timePeriod') as TimePeriod) || 'last30d';
  const from = searchParams.get('from') || null;
  const to = searchParams.get('to') || null;
  const scale = (searchParams.get('scale') as 'daily' | 'weekly' | 'monthly') || 'daily';
  const orbitId = searchParams.get('orbitId') || null;
  const phaseId = searchParams.get('phaseId') || null;
  const pulseId = searchParams.get('pulseId') || null;

  const { groupId } = useMode();

  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    const filters = { 
        level, 
        timePeriod, 
        from: from ?? undefined, 
        to: to ?? undefined, 
        scale, 
        orbitId: orbitId ?? undefined, 
        phaseId: phaseId ?? undefined, 
        pulseId: pulseId ?? undefined 
    };
    getAnalyticsDataAction(filters, groupId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [level, timePeriod, from, to, scale, orbitId, phaseId, pulseId, groupId]);

  if (loading || !data) {
    return (
        <div className="space-y-4 p-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-80 w-full" />
        </div>
    );
  }

  return (
    <NewAnalyticsDashboard 
      initialData={data}
    />
  );
}

export default function AnalyticsWrapper() {
  return (
    <React.Suspense fallback={<div className="p-4"><Skeleton className="h-screen w-full" /></div>}>
      <AnalyticsContainer />
    </React.Suspense>
  );
}
