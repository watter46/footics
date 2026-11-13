# TASK-181kdc: useKeyboardShortcuts テスト第3弾（複製/再生/Undo・削除〜Tab・旧依存完全削除）

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181kdb
- **Commit**: `test(tactical): complete useKeyboardShortcuts test migration and remove legacy store references`

---

## 🎯 目的・背景

`use-keyboard-shortcuts.test.ts` の後半（L510-L732: `Ctrl+M`・`Space`・`Undo/Redo`・スライド削除・最低1枚制限・独立 Provider・`Tab`）を `createKeyboardHarness()` へ移行し、残存していた `tactical-unified-store` / `tactical-unified-store-provider` / `createDefaultPlayer` を完全削除する。

## 🚨 残存禁止条件 (Negative Contracts)

- `use-keyboard-shortcuts.test.ts` 全体に `tactical-unified-store` / `tactical-unified-store-provider` / `createDefaultPlayer` が 1 箇所も残ってはならない。
- `vi.mock` による内部ストア・内部フックのモックを追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: L510-L732 移行 & 旧インポート完全削除（1テストファイル）

---

### Phase 1: L510-L732 移行 & 旧インポート完全削除

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`（L510-L732 + 旧インポート削除）

**Before:**
```ts
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';
```
**After:**
```ts
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';
```

**Before:**
```ts
describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    (document.activeElement as HTMLElement)?.blur();
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    store.setIsPlaying(false);
    store.clearSelection();
  });
```
**After:**
```ts
describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    (document.activeElement as HTMLElement)?.blur();
  });
```

**Before:**
```ts
  it('Ctrl+M / Cmd+M でアクティブシーンが複製され、ツール切替 (m) と競合しない', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const initialSlideId = store.activeSlideId;
    const initialSlidesCount = store.project.slides.length;

    // 1. Ctrl+M (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        ctrlKey: true,
      });
    });

    const slidesAfterCtrlM = useTacticalUnifiedStore.getState().project.slides;
    expect(slidesAfterCtrlM).toHaveLength(initialSlidesCount + 1);
    const newSlideId = useTacticalUnifiedStore.getState().activeSlideId;
    expect(newSlideId).not.toBe(initialSlideId);
    // ツールが player に誤変更されていないこと (Ctrl 修飾キーガード)
    expect(useTacticalUnifiedStore.getState().activeTool).not.toBe('player');

    // 2. Cmd+M (macOS metaKey)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        metaKey: true,
      });
    });

    const slidesAfterCmdM = useTacticalUnifiedStore.getState().project.slides;
    expect(slidesAfterCmdM).toHaveLength(initialSlidesCount + 2);
  });

  it('Space キーで再生トグルが発火する', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);
  });
```
**After:**
```ts
  it('Ctrl+M / Cmd+M でアクティブシーンが複製され、ツール切替 (m) と競合しない', () => {
    const {
      documentStore,
      sessionStore,
      phaseId,
      slideId: initialSlideId,
      wrapper,
    } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const initialSlidesCount = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    ).length;

    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        ctrlKey: true,
      });
    });

    const slidesAfterCtrlM = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    );
    expect(slidesAfterCtrlM).toHaveLength(initialSlidesCount + 1);
    const newSlideId = sessionStore.getState().activeSlideId;
    expect(newSlideId).not.toBe(initialSlideId);
    expect(sessionStore.getState().activeTool).not.toBe('player');

    act(() => {
      fireEvent.keyDown(document, {
        key: 'm',
        code: 'KeyM',
        metaKey: true,
      });
    });

    const slidesAfterCmdM = selectDomainActivePhaseSlides(
      documentStore.getState().project,
      phaseId,
    );
    expect(slidesAfterCmdM).toHaveLength(initialSlidesCount + 2);
  });

  it('Space キーで再生トグルが発火する', () => {
    const { playbackStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(playbackStore.getState().isPlaying).toBe(false);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(playbackStore.getState().isPlaying).toBe(true);

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });
    });
    expect(playbackStore.getState().isPlaying).toBe(false);
  });
```

**Before:**
```ts
  it('Ctrl+Z / Cmd+Z で Undo が実行され、Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y で Redo が実行される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const initialCount =
      store.project.slides.find((s) => s.id === slideId)?.players.length ?? 0;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
    });

    const slideAfterAdd = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterAdd?.players).toHaveLength(initialCount + 1);

    // 1. Ctrl+Z (Undo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    const slideAfterUndo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterUndo?.players).toHaveLength(initialCount);

    // 2. Ctrl+Shift+Z (Redo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });

    const slideAfterRedo = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(slideAfterRedo?.players).toHaveLength(initialCount + 1);

    // 3. Cmd+Z (macOS Undo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        metaKey: true,
      });
    });
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)?.players,
    ).toHaveLength(initialCount);

    // 4. Ctrl+Y (Windows Redo)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
      });
    });
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.find((s) => s.id === slideId)?.players,
    ).toHaveLength(initialCount + 1);
  });
```
**After:**
```ts
  it('Ctrl+Z / Cmd+Z で Undo が実行され、Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y で Redo が実行される', () => {
    const { documentStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const initialCount =
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players.length ?? 0;

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
        shiftKey: true,
      });
    });

    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        metaKey: true,
      });
    });
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'y',
        code: 'KeyY',
        ctrlKey: true,
      });
    });
    expect(
      selectDomainActiveSlide(
        documentStore.getState().project,
        phaseId,
        slideId,
      )?.players,
    ).toHaveLength(initialCount + 1);
  });
```

**Before:**
```ts
  it('オブジェクト非選択時に Delete キーでアクティブスライドが削除され、Ctrl+Z で復元される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();

    // スライドを追加して2枚にする
    act(() => {
      store.addSlide();
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);
    const addedSlideId = useTacticalUnifiedStore.getState().activeSlideId;

    // オブジェクト非選択状態で Delete キーを押す
    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    // スライドが1枚に減る
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.some((s) => s.id === addedSlideId),
    ).toBe(false);

    // Ctrl+Z で削除前のスライドが完全復元される
    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(2);
    expect(
      useTacticalUnifiedStore
        .getState()
        .project.slides.some((s) => s.id === addedSlideId),
    ).toBe(true);
  });

  it('スライドが1枚のみのときに Delete キーを押しても削除されない（最低1枚制限）', () => {
    renderHook(() => useKeyboardShortcuts());
    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(useTacticalUnifiedStore.getState().project.slides).toHaveLength(1);
  });

  it('TacticalUnifiedStoreContext から渡された独立ストアを正しく操作する', () => {
    const customStore = createTacticalUnifiedStore();
    customStore.getState().setActiveTool('line');
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalUnifiedStoreContext.Provider,
        { value: customStore },
        children,
      );

    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });

    // customStore の activeTool が更新され、グローバルストアは影響を受けない
    expect(customStore.getState().activeTool).toBe('select');
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });

  it('Tab キーで WorkspaceMode (board <-> director) がトグルされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    expect(store.workspaceMode).toBe('board');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
  });
});
```
**After:**
```ts
  it('オブジェクト非選択時に Delete キーでアクティブスライドが削除され、Ctrl+Z で復元される', () => {
    const { documentStore, sessionStore, phaseId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const addedSlideId = crypto.randomUUID();
    act(() => {
      documentStore.getState().dispatch({
        type: 'ADD_SLIDE',
        phaseId,
        newSlideId: addedSlideId,
      });
      sessionStore.getState().setActiveSlideId(addedSlideId);
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(2);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);
    expect(
      selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      ).some((s) => s.id === addedSlideId),
    ).toBe(false);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'z',
        code: 'KeyZ',
        ctrlKey: true,
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(2);
    expect(
      selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      ).some((s) => s.id === addedSlideId),
    ).toBe(true);
  });

  it('スライドが1枚のみのときに Delete キーを押しても削除されない（最低1枚制限）', () => {
    const { documentStore, phaseId, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    expect(
      selectDomainActivePhaseSlides(documentStore.getState().project, phaseId),
    ).toHaveLength(1);
  });

  it('TacticalStoreProvider から渡された独立ストアを正しく操作する', () => {
    const harnessA = createKeyboardHarness();
    const harnessB = createKeyboardHarness();
    harnessA.sessionStore.getState().setActiveTool('line');
    harnessB.sessionStore.getState().setActiveTool('arrow');

    renderHook(() => useKeyboardShortcuts(), { wrapper: harnessA.wrapper });

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });

    expect(harnessA.sessionStore.getState().activeTool).toBe('select');
    expect(harnessB.sessionStore.getState().activeTool).toBe('arrow');
  });

  it('Tab キーで WorkspaceMode (board <-> director) がトグルされる', () => {
    const { sessionStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    expect(sessionStore.getState().workspaceMode).toBe('board');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(sessionStore.getState().workspaceMode).toBe('director');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', code: 'Tab' });
    });

    expect(sessionStore.getState().workspaceMode).toBe('board');
  });
});
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts
```
