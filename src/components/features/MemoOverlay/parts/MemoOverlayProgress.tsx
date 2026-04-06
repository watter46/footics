import React from "react";
import { type EventPhase } from "@/lib/features/MemoOverlay/memoOverlayLogic";
import { getEventMetadata } from "@/lib/event-definitions";

interface MemoOverlayProgressBarProps {
  phase: EventPhase;
}

export const MemoOverlayProgressBar: React.FC<MemoOverlayProgressBarProps> = ({ phase }) => {
  return (
    <div className="flex-shrink-0 flex h-1 bg-slate-800">
      <div
        className="bg-amber-500 transition-all duration-500"
        style={{ width: `${((phase + 1) / 4) * 100}%` }}
      />
    </div>
  );
};

interface MemoOverlayRecapProps {
  phase: EventPhase;
  displayTime: string;
  selectedLabels: string[];
  onRemoveLabel: (index: number) => void;
}

export const MemoOverlayRecap: React.FC<MemoOverlayRecapProps> = ({
  phase,
  displayTime,
  selectedLabels,
  onRemoveLabel,
}) => {
  if (phase === 0) return null;

  return (
    <div className="flex-shrink-0 px-5 py-2.5 bg-slate-950/20 border-b border-slate-800/50 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Time
          </span>
          <span className="text-[14px] font-mono text-amber-500 font-black">
            {displayTime}
          </span>
        </div>
      </div>
      
      {phase >= 1 && selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {selectedLabels.map((lbl, i) => {
            const meta = getEventMetadata(lbl);
            return (
              <span 
                key={i} 
                className="text-[10px] px-2 py-0.5 rounded-full text-slate-100 font-bold border border-white/10 shadow-sm flex items-center gap-1"
                style={{ backgroundColor: meta?.groupColor ?? "#334155" }}
              >
                {lbl}
                <button
                  onClick={() => onRemoveLabel(i)}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
