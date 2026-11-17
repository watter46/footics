import { useHotkeys } from 'react-hotkeys-hook';
import { getToolShortcutMap } from '@/features/tactical-unified/core/components/toolbar/drawing-tool-plugin';
import type { SelectedObject } from '@/features/tactical-unified/core/types';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { useTacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { isInputFocused } from '@/lib/shortcuts';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '@/lib/tactical/domain/clipboard';

export function useQuickAnnotationShortcuts(): void {
  const { documentStore, sessionStore } = useTacticalStoresContext();

  // Select All (Mod+A)
  useHotkeys(
    ['mod+a', 'meta+a'],
    (e) => {
      if (isInputFocused()) return;
      const { project } = documentStore.getState();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const activeSlide = selectDomainActiveSlide(
        project,
        activePhaseId,
        activeSlideId,
      );
      if (!activeSlide) return;
      e.preventDefault();
      const all: SelectedObject[] = [
        ...activeSlide.arrows.map((a) => ({
          id: a.id,
          kind: 'arrow' as const,
        })),
        ...activeSlide.zones.map((z) => ({
          id: z.id,
          kind: 'zone' as const,
        })),
        ...activeSlide.texts.map((t) => ({
          id: t.id,
          kind: 'text' as const,
        })),
        ...activeSlide.players.map((p) => ({
          id: p.id,
          kind: 'player' as const,
        })),
      ];
      sessionStore.getState().selectObjects(all);
    },
    { enableOnFormTags: false },
  );

  // Copy (Mod+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
      const { selectedObjects, activePhaseId, activeSlideId } =
        sessionStore.getState();
      if (selectedObjects.length === 0) return;
      const activeSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!activeSlide) return;
      e.preventDefault();
      const extracted = extractSelectedObjects(activeSlide, selectedObjects);
      sessionStore.getState().setClipboard(extracted);
    },
    { enableOnFormTags: false },
  );

  // Paste (Mod+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      const { clipboard, activePhaseId, activeSlideId } =
        sessionStore.getState();
      if (!clipboard) return;
      const activeSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!activeSlide) return;
      e.preventDefault();
      const cloned = cloneAndOffsetClipboard(clipboard);
      documentStore.getState().dispatchSlide(activePhaseId, activeSlide.id, {
        type: 'INSERT_ENTITIES',
        players: cloned.players,
        arrows: cloned.arrows,
        zones: cloned.zones,
        texts: cloned.texts,
      });
      sessionStore.getState().selectObjects(cloned.selectedRefs);
    },
    { enableOnFormTags: false },
  );

  // Duplicate (Mod+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
      const { selectedObjects, activePhaseId, activeSlideId } =
        sessionStore.getState();
      if (selectedObjects.length === 0) return;
      const activeSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!activeSlide) return;
      e.preventDefault();
      const extracted = extractSelectedObjects(activeSlide, selectedObjects);
      const cloned = cloneAndOffsetClipboard(extracted);
      documentStore.getState().dispatchSlide(activePhaseId, activeSlide.id, {
        type: 'INSERT_ENTITIES',
        players: cloned.players,
        arrows: cloned.arrows,
        zones: cloned.zones,
        texts: cloned.texts,
      });
      sessionStore.getState().selectObjects(cloned.selectedRefs);
    },
    { enableOnFormTags: false },
  );

  // Space (preventDefault)
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
    },
    { enableOnFormTags: false },
  );

  // Escape
  useHotkeys(
    'escape',
    () => {
      if (isInputFocused()) return;
      const session = sessionStore.getState();
      session.setDrawingPreview(null);
      session.setConnectingPlayerId(null);
      session.clearSelection();
      session.setActiveTool('select');
    },
    { enableOnFormTags: false },
  );

  // Delete / Backspace
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      if (isInputFocused()) return;
      const session = sessionStore.getState();
      if (session.selectedObjects.length === 0) return;
      const activeSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        session.activePhaseId,
        session.activeSlideId,
      );
      if (!activeSlide) return;
      e.preventDefault();
      documentStore
        .getState()
        .dispatchSlide(session.activePhaseId, activeSlide.id, {
          type: 'DELETE_ENTITIES',
          ids: session.selectedObjects.map((o) => o.id),
        });
      session.clearSelection();
    },
    { enableOnFormTags: false },
  );

  // Tool shortcuts (from getToolShortcutMap)
  const toolShortcutMap = getToolShortcutMap();
  const toolKeys = Object.keys(toolShortcutMap);
  useHotkeys(
    toolKeys,
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tool = toolShortcutMap[e.key.toLowerCase()];
      if (!tool) return;
      e.preventDefault();
      sessionStore.getState().setActiveTool(tool);
    },
    { enableOnFormTags: false },
  );
}
