import * as React from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { AnalyticsData, Orbit } from '@/lib/types';

interface AnalyticsChartProps {
  chartData: AnalyticsData['chartData'];
  orbits?: Orbit[];
}

const COLOR_MAP: Record<string, string> = {
  mint: 'hsl(150, 60%, 45%)',       // Vibrant Mint Green
  sapphire: 'hsl(210, 80%, 55%)',   // Bright Sapphire Blue
  amethyst: 'hsl(270, 70%, 65%)',   // Rich Amethyst Purple
  coral: 'hsl(15, 85%, 65%)',       // Warm Coral
  rose: 'hsl(330, 80%, 60%)',       // Deep Rose
  solar: 'hsl(45, 95%, 50%)',       // Bright Solar Yellow
  default: 'hsl(220, 10%, 60%)'     // Neutral Gray
};

export function AnalyticsChart({ chartData, orbits = [] }: AnalyticsChartProps) {
  const keys = React.useMemo(() => {
    return chartData.length > 0 ? Object.keys(chartData[0]).filter(k => k !== 'date' && k !== 'progress') : [];
  }, [chartData]);

  const chartConfig = React.useMemo(() => {
    const config: Record<string, { label: string; color: string }> = {
      progress: {
        label: "Progreso General",
        color: "hsl(var(--primary))",
      },
    };

    keys.forEach((key, index) => {
      // Try to find the orbit matching the key (Title)
      // Note: This matches by Title. Ideally we'd use ID, but the chart data structure uses Title as key currently.
      const orbit = orbits.find(o => o.title === key);
      const colorKey = orbit?.color_theme || 'default';

      // If we run out of defined colors, use a fallback from a palette or rotate
      const color = COLOR_MAP[colorKey] || `hsl(${(index * 137.5) % 360}, 70%, 50%)`;

      config[key] = {
        label: key,
        color: color,
      };
    });

    return config;
  }, [keys, orbits]);

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full h-[400px]">
      <LineChart
        accessibilityLayer
        data={chartData}
        margin={{
          top: 5,
          right: 20,
          left: -10,
          bottom: 5,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => {
            if (!value) return '';
            const date = new Date(value);
            return date.toLocaleDateString('es-CL', { month: 'short', day: 'numeric' });
          }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
        />
        <ChartTooltip
          cursor={true}
          content={<ChartTooltipContent indicator="line" />}
        />
        <ChartLegend content={<ChartLegendContent />} />

        {/* General Progress Line */}
        <Line
          dataKey="progress"
          type="monotone"
          stroke={chartConfig.progress.color}
          strokeWidth={3}
          dot={false}
          activeDot={{ r: 6 }}
        />

        {/* Dynamic Lines for Orbits/Phases */}
        {keys.map((key) => (
          <Line
            key={key}
            dataKey={key}
            type="monotone"
            stroke={chartConfig[key]?.color}
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}
