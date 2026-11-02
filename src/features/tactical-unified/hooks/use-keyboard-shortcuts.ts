/**
 * use-keyboard-shortcuts.ts
 * Keyboard shortcuts: Delete, Escape, Backspace, Copy (Mod+C), Paste (Mod+V), Duplicate (Mod+D), Tool switching, Tab (Workspace Mode), Space (Playback), Undo/Redo
 */

import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { getToolShortcutMap } from '@/features/tactical-unified/core/components/toolbar';
import {
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { isInputFocused } from '@/lib/shortcuts';

const OBJECT_KIND_TO_COLLECTION: Record<
  string,
  'players' | 'arrows' | 'zones' | 'texts'
> = {
  player: 'players',
  arrow: 'arrows',
  zone: 'zones',
  text: 'texts',
};

export function useKeyboardShortcuts() {
  const storeApi = useTacticalUnifiedStoreApi();

  // Undo: Mod+Z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().undo();
    },
    { enableOnFormTags: false },
  );

  // Redo: Mod+Shift+Z / Mod+Y (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().redo();
    },
    { enableOnFormTags: false },
  );

  // Copy: Mod+C (Ctrl+C / Cmd+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().copySelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Paste: Mod+V (Ctrl+V / Cmd+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().pasteObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Duplicate: Mod+D (Ctrl+D / Cmd+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().duplicateSelectedObjects(currentSlideId);
    },
    { enableOnFormTags: false },
  );

  // Duplicate Scene: Mod+M (Ctrl+M / Cmd+M)
  useHotkeys(
    ['mod+m', 'meta+m'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const currentSlideId = storeApi.getState().activeSlideId;
      storeApi.getState().duplicateSlide(currentSlideId);
      toast.success('シーンを複製しました');
    },
    { enableOnFormTags: false },
  );

  // Playback: Space
  useHotkeys(
    'space',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().togglePlayback();
    },
    { enableOnFormTags: false },
  );

  // Workspace mode: Tab (Board <-> Director)
  useHotkeys(
    'tab',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().toggleWorkspaceMode();
    },
    { enableOnFormTags: false },
  );

  // Escape: Clear selection
  useHotkeys(
    'escape',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      storeApi.getState().clearSelection();
    },
    { enableOnFormTags: false },
  );

  // Tools: registered shortcuts
  const shortcutMap = getToolShortcutMap();
  const toolShortcutKeys = Object.keys(shortcutMap);

  useHotkeys(
    toolShortcutKeys,
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const currentMap = getToolShortcutMap();
      const tool = currentMap[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        storeApi.getState().setActiveTool(tool);
      }
    },
    { enableOnFormTags: false },
  );

  // Delete / Backspace: Remove selected objects or slide
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const store = storeApi.getState();
      const currentSlideId = store.activeSlideId;
      const currentSelected = store.selectedObjects;

      if (currentSelected.length > 0) {
        const slide = selectActiveSlide(store);
        const hasLockedObject = currentSelected.some((obj) => {
          const collectionKey = OBJECT_KIND_TO_COLLECTION[obj.kind];
          if (!collectionKey || !slide) return false;
          const list = slide[collectionKey];
          return Boolean(
            (list as { id: string; locked?: boolean }[]).find(
              (item) => item.id === obj.id,
            )?.locked,
          );
        });

        store.deleteSelectedObjects(currentSlideId);

        if (hasLockedObject) {
          toast.info('ロック中のオブジェクトは保護されています');
        }
      } else {
        // ピッチ上オブジェクト非選択時はアクティブスライドを削除
        const activeSlides = selectActivePhaseSlides(store);
        if (activeSlides.length <= 1) {
          toast.error('これ以上スライドを削除できません（最低1枚必要です）');
          return;
        }
        store.deleteSlide(currentSlideId);
        toast.success('スライドを削除しました（Ctrl+Zで復元可能）');
      }
    },
    { enableOnFormTags: false },
  );
}
