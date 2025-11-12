interface TimelineHeaderProps {
  leftLabel: string;
  rightLabel: string;
}

export const TimelineHeader = ({ leftLabel, rightLabel }: TimelineHeaderProps) => (
  <div className="sticky top-0 z-10 border-b border-slate-800/70 bg-slate-900/95 py-3 backdrop-blur-md">
    <div className="flex items-center text-xs font-semibold tracking-wide text-slate-400 uppercase">
      <div className="w-1/2 text-center text-sm text-slate-300">{leftLabel}</div>
      <div className="w-1/2 text-center text-sm text-slate-300">{rightLabel}</div>
    </div>
  </div>
);
