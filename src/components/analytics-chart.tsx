'use client';

import * as React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AnalyticsData } from '@/lib/types';

interface AnalyticsChartProps {
  chartData: AnalyticsData['chartData'];
}

export function AnalyticsChart({ chartData }: AnalyticsChartProps) {
  const keys = chartData.length > 0 ? Object.keys(chartData[0]).filter(k => k !== 'date' && k !== 'progress') : [];

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="progress" stroke="#8884d8" name="Progreso General" />
        {keys.map((key, index) => (
          <Line key={key} type="monotone" dataKey={key} stroke={`#${Math.floor(Math.random()*16777215).toString(16)}`} name={key} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
