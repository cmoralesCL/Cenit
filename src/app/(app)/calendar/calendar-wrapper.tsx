'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { getCalendarDataAction } from '@/app/actions';
import { CalendarPageClient } from '@/components/calendar-page-client';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useMode } from '@/hooks/use-mode.tsx';

type CalendarData = Awaited<ReturnType<typeof getCalendarDataAction>>;

function CalendarContainer() {
  const searchParams = useSearchParams();
  const monthString = searchParams.get('month');

  const { groupId } = useMode();

  const [data, setData] = React.useState<CalendarData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    getCalendarDataAction(monthString, groupId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [monthString, groupId]);

  if (loading || !data) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Skeleton className="h-[70vh] w-full" />
      </div>
    );
  }

  return (
    <CalendarPageClient 
      initialData={data}
      initialMonthString={monthString || format(new Date(), 'yyyy-MM-dd')}
    />
  );
}

export default function CalendarWrapper() {
  return (
    <React.Suspense fallback={<div className="p-4"><Skeleton className="h-[80vh] w-full" /></div>}>
      <CalendarContainer />
    </React.Suspense>
  );
}
