'use client';

import { PageLoading } from '@/components/ui/patterns/loading-state';
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
    <div className="flex h-screen w-full items-center justify-center bg-[#0D0D0E] text-white">
      <PageLoading message={message || defaultMessage} />
    </div>
  );
}
