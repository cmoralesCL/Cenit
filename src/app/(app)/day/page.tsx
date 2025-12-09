
import * as React from 'react';
import DayViewWrapper from './day-view-wrapper';

// This page is now a simple, non-async component that renders the client wrapper.
export const dynamic = 'force-dynamic';

export default function DayPage() {
  return <DayViewWrapper />;
}
