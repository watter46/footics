'use client';

import { useEffect, useMemo } from 'react';
import type { SelectedObject } from '../types';
import {
  dispatchCanvasShortcut,
  type ShortcutActions,
} from '../utils/canvas-shortcuts-handler';
import { useCanvasStoreApi } from './use-canvas-store';

export interface UseCanvasShortcutsOptions {
  disabled?: boolean;
}

export function useCanvasShortcuts({
  disabled = false,
}: UseCanvasShortcutsOptions = {}) {
  const store = useCanvasStoreApi();

  const actions = useMemo<ShortcutActions>(
    () => ({
      setActiveTool: (tool) => store.getState().setActiveTool(tool),
      removeSelected: () => store.getState().removeSelected(),
      clearSelection: () => store.getState().clearSelection(),
      undo: () => store.getState().undo(),
      redo: () => store.getState().redo(),
      copy: () => store.getState().copySelectedObjects(),
      paste: () => store.getState().pasteObjects(),
      duplicate: () => store.getState().duplicateSelectedObjects(),
      selectAll: () => {
        const { arrows, zones, texts, markers } = store.getState().annotations;
        const all: SelectedObject[] = [
          ...arrows.map((a) => ({ id: a.id, kind: 'arrow' as const })),
          ...zones.map((z) => ({ id: z.id, kind: 'zone' as const })),
          ...texts.map((t) => ({ id: t.id, kind: 'text' as const })),
          ...markers.map((m) => ({ id: m.id, kind: 'player' as const })),
        ];
        store.getState().setSelectedObjects(all);
      },
    }),
    [store],
  );

  useEffect(() => {
    if (disabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      dispatchCanvasShortcut(e, actions);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, actions]);
}
