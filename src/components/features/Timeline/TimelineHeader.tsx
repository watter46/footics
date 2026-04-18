'use client';

import type React from 'react';

export const TimelineHeader: React.FC = () => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex-shrink-0 relative z-20">
      <div className="flex items-center h-10 px-4">
        <div className="w-28 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Time
        </div>
        <div className="flex-1 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Player
        </div>
        <div className="w-32 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Team
        </div>
        <div className="w-40 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Event Type
        </div>
        <div className="w-40 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Scopes
        </div>
        <div className="w-24 text-slate-400 font-medium tracking-wider text-xs uppercase">
          Outcome
        </div>
      </div>
    </div>
  );
};
