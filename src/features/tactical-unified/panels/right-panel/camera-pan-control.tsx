'use client';

import type React from 'react';

export interface CameraPanControlProps {
  panX: number;
  panY: number;
  onChange: (panX: number, panY: number) => void;
}

export function CameraPanControl({
  panX,
  panY,
  onChange,
}: CameraPanControlProps): React.ReactElement {
  return (
    <div className="p-3 rounded-lg bg-black/20 border border-white/[0.06] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-[11px] font-medium text-white/80">
            Pan (パン移動)
          </span>
          <span className="text-[10px] text-white/40">
            Offset coordinates (X, Y)
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChange(0, 0)}
          className="text-[10px] text-white/50 hover:text-white px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          Reset Pan
        </button>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-white/50 font-mono">X:</span>
          <input
            type="number"
            value={panX}
            aria-label="Pan X"
            onChange={(e) =>
              onChange(Number.parseInt(e.target.value, 10), panY)
            }
            className="w-full px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-1">
          <span className="text-[10px] text-white/50 font-mono">Y:</span>
          <input
            type="number"
            value={panY}
            aria-label="Pan Y"
            onChange={(e) =>
              onChange(panX, Number.parseInt(e.target.value, 10))
            }
            className="w-full px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-right font-mono text-[11px] text-white focus:outline-none focus:border-[#FF8100]/60"
          />
        </div>
      </div>
    </div>
  );
}
