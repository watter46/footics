interface TimelineHeaderProps {
  leftLabel: string;
  rightLabel: string;
}

export const TimelineHeader = ({ leftLabel, rightLabel }: TimelineHeaderProps) => (
  <div className="bg-background/90 sticky top-0 z-10 border-b border-white/5 py-3 backdrop-blur-xl">
    <div className="text-muted-foreground flex items-center text-xs font-semibold tracking-[0.3em] uppercase">
      <div className="text-foreground w-1/2 text-center text-sm">{leftLabel}</div>
      <div className="text-foreground w-1/2 text-center text-sm">{rightLabel}</div>
    </div>
  </div>
);
