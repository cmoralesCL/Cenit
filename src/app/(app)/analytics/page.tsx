
import * as React from 'react';
import AnalyticsWrapper from './analytics-wrapper';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnalyticsWrapper />
    </main>
  );
}
