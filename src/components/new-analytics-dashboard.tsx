'use client';

import * as React from 'react';
import { AnalyticsData } from '@/lib/types';
import { AnalyticsFilters } from './analytics-filters';
import { KpiCards } from './kpi-cards';
import { Button } from '@/components/ui/button';
import { AnalyticsChart } from './analytics-chart';
import { AnalyticsTable } from './analytics-table';

interface NewAnalyticsDashboardProps {
  initialData: AnalyticsData;
}

export function NewAnalyticsDashboard({ initialData }: NewAnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = React.useState<AnalyticsData>(initialData);
  const [viewMode, setViewMode] = React.useState('chart');

  return (
    <div className="space-y-6">
      <AnalyticsFilters data={analyticsData} />
      <KpiCards kpis={analyticsData.kpis} />

      <div className="flex items-center justify-end space-x-2">
        <Button variant={viewMode === 'chart' ? 'secondary' : 'ghost'} onClick={() => setViewMode('chart')}>Gráfico</Button>
        <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} onClick={() => setViewMode('table')}>Tabla</Button>
      </div>

      <div>
        {viewMode === 'chart' ? (
          <AnalyticsChart chartData={analyticsData.chartData} orbits={analyticsData.allOrbits} />
        ) : (
          <AnalyticsTable data={analyticsData} />
        )}
      </div>
    </div>
  );
}
