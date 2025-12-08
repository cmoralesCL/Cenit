'use client';

import * as React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AnalyticsData } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface AnalyticsTableProps {
  data: AnalyticsData;
}

export function AnalyticsTable({ data }: AnalyticsTableProps) {
  const exportToCsv = () => {
    const headers = Object.keys(data.chartData[0]);
    const csvRows = [
      headers.join(','),
      ...data.chartData.map(row => headers.map(header => row[header]).join(','))
    ];
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'analytics_data.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!data.chartData || data.chartData.length === 0) {
    return <p>No hay datos para mostrar.</p>;
  }

  const headers = Object.keys(data.chartData[0]);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={exportToCsv}>Exportar a CSV</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map(header => <TableHead key={header}>{header}</TableHead>)}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.chartData.map((row, index) => (
            <TableRow key={index}>
              {headers.map(header => <TableCell key={header}>{row[header]}</TableCell>)}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
