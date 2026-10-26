'use client';

import { Lock, Unlock } from 'lucide-react';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarPitchLock() {
  const isPitchLocked = useCanvasStore((s) => s.pitchTransform.isLocked);
  const setPitchLocked = useCanvasStore((s) => s.setPitchLocked);

  return (
    <button
      type="button"
      onClick={() => setPitchLocked(!isPitchLocked)}
      title={
        isPitchLocked
          ? 'Pitch Lock: ON (Pan/Zoom locked)'
          : 'Pitch Lock: OFF (Click to lock)'
      }
      aria-label="Pitch Lock"
      className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center shrink-0 ${
        isPitchLocked
          ? 'bg-amber-600 text-white shadow-md shadow-amber-500/30 ring-1 ring-amber-400'
          : 'text-white/80 hover:text-white hover:bg-[#333333]'
      }`}
    >
      {isPitchLocked ? <Lock size={16} /> : <Unlock size={16} />}
    </button>
  );
}
