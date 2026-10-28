'use client';

export function TimelineHeader() {
  return (
    <div className="bg-surface-l1/90 backdrop-blur-md border-b border-white/[0.08] flex-shrink-0 sticky top-0 z-20">
      <div className="flex items-center h-10 px-4">
        <div className="w-28 text-white/60 font-medium tracking-wider text-xs uppercase">
          Time
        </div>
        <div className="flex-1 text-white/60 font-medium tracking-wider text-xs uppercase">
          Player
        </div>
        <div className="w-32 text-white/60 font-medium tracking-wider text-xs uppercase">
          Team
        </div>
        <div className="w-40 text-white/60 font-medium tracking-wider text-xs uppercase">
          Event Type
        </div>
        <div className="w-40 text-white/60 font-medium tracking-wider text-xs uppercase">
          Scopes
        </div>
        <div className="w-24 text-white/60 font-medium tracking-wider text-xs uppercase">
          Outcome
        </div>
        <div className="w-10 text-white/60 font-medium tracking-wider text-xs uppercase text-center">
          Tactical
        </div>
      </div>
    </div>
  );
}
