# TASK-181kca: useKeyboardShortcuts の3周波数ストア・ドメインコマンド完全移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **Commit**: `refactor(tactical): migrate useKeyboardShortcuts to three-frequency stores and domain commands`

---

## 🎯 目的・背景

`src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` から `tactical-unified-store-provider`・`tactical-unified-selectors` への依存を完全除去し、`TacticalStoresContext`（`documentStore` / `sessionStore` / `playbackStore`）、純粋セレクタ（`selectDomainActivePhaseSlides` / `selectDomainActiveSlide`）、および純粋ドメイン操作（`clipboard.ts` / `APPLY_SLIDE_COMMAND` / `DUPLICATE_SLIDE` / `DELETE_SLIDE`）へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `use-keyboard-shortcuts.ts` に `tactical-unified-store`・`tactical-unified-store-provider`・`tactical-unified-selectors`・`@/lib/types/tactical-unified` の import を残してはならない。
- 新・旧ストアの二重持ち（フォールバック）を残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `use-keyboard-shortcuts.ts` 移行（1プロダクションファイル）

---

### Phase 1: `use-keyboard-shortcuts.ts` 移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`

**Before:**
```ts
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
```
**After:**
```ts
import {
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { useTacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { isInputFocused } from '@/lib/shortcuts';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '@/lib/tactical/domain/clipboard';

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
  const { documentStore, sessionStore, playbackStore } =
    useTacticalStoresContext();

  // Undo: Mod+Z (Ctrl+Z / Cmd+Z)
  useHotkeys(
    ['mod+z', 'meta+z'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      documentStore.getState().undo();
    },
    { enableOnFormTags: false },
  );

  // Redo: Mod+Shift+Z / Mod+Y (Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y)
  useHotkeys(
    ['mod+shift+z', 'meta+shift+z', 'mod+y', 'meta+y'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      documentStore.getState().redo();
    },
    { enableOnFormTags: false },
  );
```

**Before:**
```ts
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
```
**After:**
```ts
  // Copy: Mod+C (Ctrl+C / Cmd+C)
  useHotkeys(
    ['mod+c', 'meta+c'],
    (e) => {
      if (isInputFocused()) return;
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
      const extracted = extractSelectedObjects(slide, selectedObjects);
      if (
        extracted.players.length === 0 &&
        extracted.arrows.length === 0 &&
        extracted.zones.length === 0 &&
        extracted.texts.length === 0
      ) {
        return;
      }
      sessionStore.getState().setClipboard(extracted);
    },
    { enableOnFormTags: false },
  );

  // Paste: Mod+V (Ctrl+V / Cmd+V)
  useHotkeys(
    ['mod+v', 'meta+v'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const { activePhaseId, activeSlideId, clipboard } =
        sessionStore.getState();
      if (!clipboard) return;
      if (
        clipboard.players.length === 0 &&
        clipboard.arrows.length === 0 &&
        clipboard.zones.length === 0 &&
        clipboard.texts.length === 0
      ) {
        return;
      }
      const targetSlide = selectDomainActiveSlide(
        documentStore.getState().project,
        activePhaseId,
        activeSlideId,
      );
      if (!targetSlide) return;
      const cloned = cloneAndOffsetClipboard(clipboard);
      documentStore.getState().dispatchSlide(activePhaseId, targetSlide.id, {
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

  // Duplicate: Mod+D (Ctrl+D / Cmd+D)
  useHotkeys(
    ['mod+d', 'meta+d'],
    (e) => {
      if (isInputFocused()) return;
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
      const extracted = extractSelectedObjects(slide, selectedObjects);
      if (
        extracted.players.length === 0 &&
        extracted.arrows.length === 0 &&
        extracted.zones.length === 0 &&
        extracted.texts.length === 0
      ) {
        return;
      }
      sessionStore.getState().setClipboard(extracted);
      const cloned = cloneAndOffsetClipboard(extracted);
      documentStore.getState().dispatchSlide(activePhaseId, slide.id, {
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
```

**Before:**
```ts
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
```
**After:**
```ts
  // Duplicate Scene: Mod+M (Ctrl+M / Cmd+M)
  useHotkeys(
    ['mod+m', 'meta+m'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const newSlideId = crypto.randomUUID();
      documentStore.getState().dispatch({
        type: 'DUPLICATE_SLIDE',
        phaseId: activePhaseId,
        slideId: activeSlideId,
        newSlideId,
      });
      sessionStore.getState().setActiveSlideId(newSlideId);
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
      playbackStore.getState().togglePlayback();
    },
    { enableOnFormTags: false },
  );

  // Workspace mode: Tab (Board <-> Director)
  useHotkeys(
    'tab',
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      sessionStore.getState().toggleWorkspaceMode();
    },
    { enableOnFormTags: false },
  );
```

**Before:**
```ts
  // Previous Scene: D
  useHotkeys(
    'd',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const store = storeApi.getState();
      const slides = selectActivePhaseSlides(store);
      const currentIndex = slides.findIndex(
        (s) => s.id === store.activeSlideId,
      );
      if (currentIndex > 0) {
        const target = slides[currentIndex - 1];
        store.setActiveSlide(target.id);
        store.setPlaybackIndices(currentIndex - 1, null);
        const snapTime = getSlideSnapTime(slides, currentIndex - 1);
        store.seekTo(snapTime);
      }
    },
    { enableOnFormTags: false },
  );

  // Next Scene: F
  useHotkeys(
    'f',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const store = storeApi.getState();
      const slides = selectActivePhaseSlides(store);
      const currentIndex = slides.findIndex(
        (s) => s.id === store.activeSlideId,
      );
      if (currentIndex >= 0 && currentIndex < slides.length - 1) {
        const target = slides[currentIndex + 1];
        store.setActiveSlide(target.id);
        store.setPlaybackIndices(currentIndex + 1, null);
        const snapTime = getSlideSnapTime(slides, currentIndex + 1);
        store.seekTo(snapTime);
      }
    },
    { enableOnFormTags: false },
  );

  // Restart & Play: R
  useHotkeys(
    'r',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const store = storeApi.getState();
      const slides = selectActivePhaseSlides(store);
      if (slides.length > 0) {
        store.setActiveSlide(slides[0].id);
        store.setPlaybackIndices(0, null);
        store.seekTo(0);
        store.setIsPlaying(true);
      }
    },
    { enableOnFormTags: false },
  );
```
**After:**
```ts
  // Previous Scene: D
  useHotkeys(
    'd',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        activePhaseId,
      );
      const currentIndex = slides.findIndex((s) => s.id === activeSlideId);
      if (currentIndex > 0) {
        const target = slides[currentIndex - 1];
        sessionStore.getState().setActiveSlideId(target.id);
        playbackStore.getState().setPlaybackIndices(currentIndex - 1, null);
        const snapTime = getSlideSnapTime(slides, currentIndex - 1);
        playbackStore.getState().seekTo(snapTime);
      }
    },
    { enableOnFormTags: false },
  );

  // Next Scene: F
  useHotkeys(
    'f',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const { activePhaseId, activeSlideId } = sessionStore.getState();
      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        activePhaseId,
      );
      const currentIndex = slides.findIndex((s) => s.id === activeSlideId);
      if (currentIndex >= 0 && currentIndex < slides.length - 1) {
        const target = slides[currentIndex + 1];
        sessionStore.getState().setActiveSlideId(target.id);
        playbackStore.getState().setPlaybackIndices(currentIndex + 1, null);
        const snapTime = getSlideSnapTime(slides, currentIndex + 1);
        playbackStore.getState().seekTo(snapTime);
      }
    },
    { enableOnFormTags: false },
  );

  // Restart & Play: R
  useHotkeys(
    'r',
    (e) => {
      if (isInputFocused()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      const { activePhaseId } = sessionStore.getState();
      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        activePhaseId,
      );
      if (slides.length > 0) {
        sessionStore.getState().setActiveSlideId(slides[0].id);
        playbackStore.getState().setPlaybackIndices(0, null);
        playbackStore.getState().seekTo(0);
        playbackStore.getState().startPlayback();
      }
    },
    { enableOnFormTags: false },
  );
```

**Before:**
```ts
      // 2. ピッチ上のオブジェクトが選択されている場合は選択解除
      const store = storeApi.getState();
      if (store.selectedObjects.length > 0) {
        store.clearSelection();
        e.preventDefault();
        return;
      }
      // 3. 何も選択されていない場合は右パネルを閉じる
      if (store.panels.isRightPanelOpen) {
        store.setRightPanelOpen(false);
        (document.activeElement as HTMLElement)?.blur();
        e.preventDefault();
      }
    },
    { enableOnFormTags: true },
  );

  // Right panel toggle: Mod+] (Ctrl+] / Cmd+])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === ']' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const store = storeApi.getState();
        const nextOpen = !store.panels.isRightPanelOpen;
        store.setRightPanelOpen(nextOpen);
        if (!nextOpen) {
          (document.activeElement as HTMLElement)?.blur();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [storeApi]);

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
```
**After:**
```ts
      // 2. ピッチ上のオブジェクトが選択されている場合は選択解除
      const session = sessionStore.getState();
      if (session.selectedObjects.length > 0) {
        session.clearSelection();
        e.preventDefault();
        return;
      }
      // 3. 何も選択されていない場合は右パネルを閉じる
      if (session.panels.isRightPanelOpen) {
        session.setRightPanelOpen(false);
        (document.activeElement as HTMLElement)?.blur();
        e.preventDefault();
      }
    },
    { enableOnFormTags: true },
  );

  // Right panel toggle: Mod+] (Ctrl+] / Cmd+])
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === ']' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const session = sessionStore.getState();
        const nextOpen = !session.panels.isRightPanelOpen;
        session.setRightPanelOpen(nextOpen);
        if (!nextOpen) {
          (document.activeElement as HTMLElement)?.blur();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sessionStore]);

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
        sessionStore.getState().setActiveTool(tool);
      }
    },
    { enableOnFormTags: false },
  );
```

**Before:**
```ts
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
```
**After:**
```ts
  // Delete / Backspace: Remove selected objects or slide
  useHotkeys(
    ['delete', 'backspace'],
    (e) => {
      if (isInputFocused()) return;
      e.preventDefault();
      const { activePhaseId, activeSlideId, selectedObjects } =
        sessionStore.getState();
      const project = documentStore.getState().project;

      if (selectedObjects.length > 0) {
        const slide = selectDomainActiveSlide(
          project,
          activePhaseId,
          activeSlideId,
        );
        const lockedRefs = selectedObjects.filter((obj) => {
          const collectionKey = OBJECT_KIND_TO_COLLECTION[obj.kind];
          if (!collectionKey || !slide) return false;
          const list = slide[collectionKey];
          return Boolean(
            (list as readonly { id: string; locked?: boolean }[]).find(
              (item) => item.id === obj.id,
            )?.locked,
          );
        });
        const lockedIdSet = new Set(lockedRefs.map((obj) => obj.id));
        const deletableIds = selectedObjects
          .filter((obj) => !lockedIdSet.has(obj.id))
          .map((obj) => obj.id);

        if (deletableIds.length > 0 && slide) {
          documentStore.getState().dispatchSlide(activePhaseId, slide.id, {
            type: 'DELETE_ENTITIES',
            ids: deletableIds,
          });
        }

        if (lockedRefs.length > 0) {
          sessionStore.getState().selectObjects(lockedRefs);
          toast.info('ロック中のオブジェクトは保護されています');
        } else {
          sessionStore.getState().clearSelection();
        }
      } else {
        // ピッチ上オブジェクト非選択時はアクティブスライドを削除
        const activeSlides = selectDomainActivePhaseSlides(
          project,
          activePhaseId,
        );
        if (activeSlides.length <= 1) {
          toast.error('これ以上スライドを削除できません（最低1枚必要です）');
          return;
        }
        const deletedIndex = activeSlides.findIndex(
          (s) => s.id === activeSlideId,
        );
        const remaining = activeSlides.filter((s) => s.id !== activeSlideId);
        const nextSlide =
          remaining[Math.min(deletedIndex, remaining.length - 1)] ??
          remaining[0];
        documentStore.getState().dispatch({
          type: 'DELETE_SLIDE',
          phaseId: activePhaseId,
          slideId: activeSlideId,
        });
        if (nextSlide) {
          sessionStore.getState().setActiveSlideId(nextSlide.id);
        }
        toast.success('スライドを削除しました（Ctrl+Zで復元可能）');
      }
    },
    { enableOnFormTags: false },
  );
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts
```
