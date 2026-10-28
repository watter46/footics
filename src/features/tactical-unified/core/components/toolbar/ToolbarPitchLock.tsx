'use client';

import { Lock, Unlock } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';

export function ToolbarPitchLock() {
  const isPitchLocked = useCanvasStore((s) => s.pitchTransform.isLocked);
  const setPitchLocked = useCanvasStore((s) => s.setPitchLocked);

  return (
    <IconButton
      onClick={() => setPitchLocked(!isPitchLocked)}
      isActive={isPitchLocked}
      variant="ghost"
      size="sm"
      title={
        isPitchLocked
          ? 'Pitch Lock: ON (Pan/Zoom locked)'
          : 'Pitch Lock: OFF (Click to lock)'
      }
      aria-label="Pitch Lock"
      className="shrink-0"
    >
      {isPitchLocked ? <Lock size={16} /> : <Unlock size={16} />}
    </IconButton>
  );
}
