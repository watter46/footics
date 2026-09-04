'use client';

import { Loader2 } from 'lucide-react';
import type { DashboardLoadingViewProps } from '../types';

export function DashboardLoadingView({
  status,
  message,
}: DashboardLoadingViewProps) {
  const defaultMessage =
    status === 'initializing'
      ? 'Initializing DuckDB-WASM...'
      : 'Loading match data...';

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      <span className="ml-3 text-lg font-medium">
        {message || defaultMessage}
      </span>
    </div>
  );
}
