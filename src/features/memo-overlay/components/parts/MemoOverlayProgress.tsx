import { getEventMetadata } from '@/lib/event-definitions';
import type { EventPhase } from '@/lib/features/memo-overlay/memoOverlayLogic';

interface MemoOverlayProgressBarProps {
  phase: EventPhase;
}

export function MemoOverlayProgressBar({ phase }: MemoOverlayProgressBarProps) {
  return (
    <div className="flex-shrink-0 flex h-1 bg-white/[0.08]">
      <div
        className="bg-accent-orange transition-all duration-500"
        style={{ width: `${((phase + 1) / 4) * 100}%` }}
      />
    </div>
  );
}

interface MemoOverlayRecapProps {
  phase: EventPhase;
  displayTime: string;
  selectedLabels: string[];
  onRemoveLabel: (index: number) => void;
}

export function MemoOverlayRecap({
  phase,
  displayTime,
  selectedLabels,
  onRemoveLabel,
}: MemoOverlayRecapProps) {
  if (phase === 0) return null;

  return (
    <div className="flex-shrink-0 px-5 py-2.5 bg-surface-l0/40 border-b border-white/[0.08] flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
            Time
          </span>
          <span className="text-[14px] font-mono text-accent-orange font-black">
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
                key={lbl}
                className="text-[10px] px-2 py-0.5 rounded-full text-white font-bold border border-white/10 shadow-sm flex items-center gap-1"
                style={{ backgroundColor: meta?.groupColor ?? '#222226' }}
              >
                {lbl}
                <button
                  type="button"
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
}
