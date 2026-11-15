'use client';

import { useHotkeys } from 'react-hotkeys-hook';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { useTacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '@/lib/tactical/domain/clipboard';
import { getToolShortcutMap } from '../components/toolbar/drawing-tool-plugin';
import type { SelectedObject } from '../types';

export interface UseCanvasShortcutsOptions {
  disabled?: boolean;
}

export function useCanvasShortcuts({
  disabled = false,
}: UseCanvasShortcutsOptions = {}) {
  const { documentStore, sessionStore } = useTacticalStoresContext();

  const isEnabled = !disabled;

  // Undo: Mod+Z
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      e.preventDefault();
      documentStore.getState().undo();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, isEnabled],
  );

  // Redo: Mod+Shift+Z / Mod+Y
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      e.preventDefault();
      documentStore.getState().redo();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, isEnabled],
  );

  // Select All: Mod+A
  useHotkeys(
    ['mod+a', 'meta+a'],
    (e) => {
      e.preventDefault();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const slide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!slide) return;
      const all: SelectedObject[] = [
        ...slide.arrows.map((a) => ({ id: a.id, kind: 'arrow' as const })),
        ...slide.zones.map((z) => ({ id: z.id, kind: 'zone' as const })),
        ...slide.texts.map((t) => ({ id: t.id, kind: 'text' as const })),
        ...slide.players.map((p) => ({ id: p.id, kind: 'player' as const })),
      ];
      sessionStore.getState().selectObjects(all);
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, sessionStore, isEnabled],
  );

  // Copy: Mod+C
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      e.preventDefault();
      const { activePhaseId, activeSlideId, selectedObjects } =
        sessionStore.getState();
      if (selectedObjects.length === 0) return;
      const slide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!slide) return;
      const clipboard = extractSelectedObjects(slide, selectedObjects);
      sessionStore.getState().setClipboard(clipboard);
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, sessionStore, isEnabled],
  );

  // Paste: Mod+V
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      e.preventDefault();
      const { activePhaseId, activeSlideId, clipboard } =
        sessionStore.getState();
      if (!clipboard) return;
      const cloned = cloneAndOffsetClipboard(clipboard);
      documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
        type: 'INSERT_ENTITIES',
        players: cloned.players,
        arrows: cloned.arrows,
        zones: cloned.zones,
        texts: cloned.texts,
      });
      sessionStore.getState().selectObjects(cloned.selectedRefs);
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, sessionStore, isEnabled],
  );

  // Duplicate: Mod+D
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      e.preventDefault();
      const { activePhaseId, activeSlideId, selectedObjects } =
        sessionStore.getState();
      if (selectedObjects.length === 0) return;
      const slide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!slide) return;
      const clipboard = extractSelectedObjects(slide, selectedObjects);
      const cloned = cloneAndOffsetClipboard(clipboard);
      documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
        type: 'INSERT_ENTITIES',
        players: cloned.players,
        arrows: cloned.arrows,
        zones: cloned.zones,
        texts: cloned.texts,
      });
      sessionStore.getState().selectObjects(cloned.selectedRefs);
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, sessionStore, isEnabled],
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

  // Escape: setDrawingPreview(null), cancelConnecting, clearSelection, setActiveTool('select')
  useHotkeys(
    'escape',
    (e) => {
      e.preventDefault();
      const session = sessionStore.getState();
      session.setDrawingPreview(null);
      session.setConnectingPlayerId(null);
      session.clearSelection();
      session.setActiveTool('select');
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [sessionStore, isEnabled],
  );

  // Delete / Backspace: removeSelected
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      e.preventDefault();
      const { activePhaseId, activeSlideId, selectedObjects } =
        sessionStore.getState();
      if (selectedObjects.length === 0) return;
      documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, {
        type: 'DELETE_ENTITIES',
        ids: selectedObjects.map((o) => o.id),
      });
      sessionStore.getState().clearSelection();
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [documentStore, sessionStore, isEnabled],
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
        sessionStore.getState().setActiveTool(tool);
      }
    },
    { enabled: isEnabled, enableOnFormTags: false },
    [sessionStore, isEnabled],
  );
}
