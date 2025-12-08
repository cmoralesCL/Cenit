'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsData } from '@/lib/types';

interface KpiCardsProps {
  kpis: AnalyticsData['kpis'];
}

export function KpiCards({ kpis }: KpiCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.overallProgress}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Consistencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.consistency}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Progreso Promedio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.averageProgress}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mejor Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.bestDay.progress}%</div>
          <p className="text-xs text-muted-foreground">{kpis.bestDay.date}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Peor Día</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{kpis.worstDay.progress}%</div>
          <p className="text-xs text-muted-foreground">{kpis.worstDay.date}</p>
        </CardContent>
      </Card>
    </div>
  );
}
