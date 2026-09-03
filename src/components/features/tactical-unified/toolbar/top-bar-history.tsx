'use client';

import { Redo2, Undo2 } from 'lucide-react';
import { useTacticalUnifiedStore } from '@/stores/tactical-unified-store';

export function TopBarHistory() {
  const undo = useTacticalUnifiedStore((s) => s.undo);
  const redo = useTacticalUnifiedStore((s) => s.redo);
  const canUndo = useTacticalUnifiedStore((s) => s.past.length > 0);
  const canRedo = useTacticalUnifiedStore((s) => s.future.length > 0);

  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={`p-1.5 rounded transition-colors ${
          canUndo
            ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
            : 'text-white/20 cursor-not-allowed'
        }`}
        aria-label="Undo"
        title="Undo (Ctrl+Z / Cmd+Z)"
      >
        <Undo2 size={13} />
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={`p-1.5 rounded transition-colors ${
          canRedo
            ? 'text-white/70 hover:text-white hover:bg-white/10 cursor-pointer'
            : 'text-white/20 cursor-not-allowed'
        }`}
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y)"
      >
        <Redo2 size={13} />
      </button>
    </div>
  );
}
