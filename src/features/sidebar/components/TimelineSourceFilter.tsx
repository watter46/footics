'use client';

import {
  SegmentedControl,
  type SegmentOption,
} from '@/components/ui/segmented-control';

type TimelineSource = 'all' | 'whoscored' | 'custom';

const TIMELINE_SOURCE_OPTIONS: SegmentOption<TimelineSource>[] = [
  { id: 'all', label: 'All Events' },
  { id: 'custom', label: 'My Memos' },
  { id: 'whoscored', label: 'WhoScored' },
];

interface TimelineSourceFilterProps {
  timelineSource: TimelineSource;
  onChange: (source: TimelineSource) => void;
}

export function TimelineSourceFilter({
  timelineSource,
  onChange,
}: TimelineSourceFilterProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-[#71717A]">
        Timeline Source
      </div>
      <SegmentedControl
        value={timelineSource}
        options={TIMELINE_SOURCE_OPTIONS}
        onChange={onChange}
      />
    </div>
  );
}
