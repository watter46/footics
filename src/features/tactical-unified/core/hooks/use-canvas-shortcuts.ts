'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { getToolShortcutMap } from '../components/toolbar/drawing-tool-plugin';
import type { SelectedObject } from '../types';
import { useCanvasStoreApi } from './use-canvas-store';

export interface UseCanvasShortcutsOptions {
  disabled?: boolean;
}

export function useCanvasShortcuts({
  disabled = false,
}: UseCanvasShortcutsOptions = {}) {
  const store = useCanvasStoreApi();

  const isEnabled = !disabled;

  // Undo: Mod+Z
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      e.preventDefault();
      store.getState().undo();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Redo: Mod+Shift+Z / Mod+Y
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      e.preventDefault();
      store.getState().redo();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Select All: Mod+A
  useHotkeys(
    ['mod+a', 'meta+a'],
    (e) => {
      e.preventDefault();
      const { arrows, zones, texts, markers } = store.getState().annotations;
      const all: SelectedObject[] = [
        ...arrows.map((a) => ({ id: a.id, kind: 'arrow' as const })),
        ...zones.map((z) => ({ id: z.id, kind: 'zone' as const })),
        ...texts.map((t) => ({ id: t.id, kind: 'text' as const })),
        ...markers.map((m) => ({ id: m.id, kind: 'player' as const })),
      ];
      store.getState().setSelectedObjects(all);
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Copy: Mod+C
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      e.preventDefault();
      store.getState().copySelectedObjects();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Paste: Mod+V
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      e.preventDefault();
      store.getState().pasteObjects();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Duplicate: Mod+D
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      e.preventDefault();
      store.getState().duplicateSelectedObjects();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Space: Prevent default
  useHotkeys(
    'space',
    (e) => {
      e.preventDefault();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [isEnabled],
  );

  // Escape: cancelConnecting, clearSelection, setActiveTool('select')
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      store.getState().setConnectingPlayerId(null);
      store.getState().clearSelection();
      store.getState().setActiveTool('select');
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Delete / Backspace: removeSelected
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      e.preventDefault();
      store.getState().removeSelected();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );

  // Tools: registered shortcuts (v, l, r, a, d, w, z, p, t, m, o, e)
  const shortcutMap = getToolShortcutMap();
  const toolShortcutKeys = Object.keys(shortcutMap);

  useHotkeys(
    toolShortcutKeys,
    (e) => {
      const currentMap = getToolShortcutMap();
      const tool = currentMap[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        store.getState().setActiveTool(tool);
      }
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [store, isEnabled],
  );
}
