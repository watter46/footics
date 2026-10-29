'use client';

import { Redo2, Undo2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function TopBarHistory() {
  const undo = useTacticalUnifiedStoreContext((s) => s.undo);
  const redo = useTacticalUnifiedStoreContext((s) => s.redo);
  const canUndo = useTacticalUnifiedStoreContext((s) => s.past.length > 0);
  const canRedo = useTacticalUnifiedStoreContext((s) => s.future.length > 0);

  return (
    <div className="flex items-center gap-0.5">
      <IconButton
        variant="ghost"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Ctrl+Z / Cmd+Z)"
      >
        <Undo2 size={13} />
      </IconButton>
      <IconButton
        variant="ghost"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y)"
      >
        <Redo2 size={13} />
      </IconButton>
    </div>
  );
}
