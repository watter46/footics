import type { ComponentType } from 'react';

import { cn } from '@/lib/utils/cn';

interface HistoryTimelineMarkerProps {
  colorClass: string;
  icon: ComponentType<{ className?: string }>;
}

export const HistoryTimelineMarker = ({
  colorClass,
  icon: Icon,
}: HistoryTimelineMarkerProps) => (
  <div className="relative flex items-center justify-center">
    <span
      aria-hidden="true"
      className={cn(
        'z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-900 bg-slate-950 text-base shadow-sm',
        colorClass
      )}
    >
      <Icon className="h-4 w-4" />
    </span>
  </div>
);
