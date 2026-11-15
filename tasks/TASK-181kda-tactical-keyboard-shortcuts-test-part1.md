# TASK-181kda: useKeyboardShortcuts テスト第1弾（Harness 導入・Copy/Paste〜Escape）移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181kca
- **Commit**: `test(tactical): introduce 3-store harness and migrate Copy/Paste and Escape keyboard shortcut tests`

---

## 🎯 目的・背景

`TASK-181kca` に伴い、`use-keyboard-shortcuts.test.ts` に `createKeyboardHarness()`（3周波数ストア＋`TacticalStoreProvider` ラッパー）を導入し、第1弾（L1-L263: コピー/ペースト・フォーカスガード・段階的 Escape）を移行する。残りのテストと旧インポート完全除去は `TASK-181kdb` / `TASK-181kdc` で完了する。

## 🚨 残存禁止条件 (Negative Contracts)

- L1-L263 内の移行済みテストに `useTacticalUnifiedStore` / `createDefaultPlayer` の参照を残してはならない。
- `vi.mock` による内部ストア・内部フックのモックを追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Harness 導入 & L1-L263 移行（1テストファイル）

---

### Phase 1: Harness 導入 & L1-L263 移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`（L1-L263）

**Before:**
```ts
import { act, fireEvent, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createTacticalUnifiedStore,
  useTacticalUnifiedStore,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';
import { useKeyboardShortcuts } from '../use-keyboard-shortcuts';

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
import { act, fireEvent, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
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

function createTestPlayer(
  team: 'home' | 'away',
  x: number,
  y: number,
  color: string,
): DomainPlayer {
  return {
    id: crypto.randomUUID(),
    team,
    area: 'pitch',
    shirtNo: '10',
    position: 'MF',
    x: clampToScreenNorm(x),
    y: clampToScreenNorm(y),
    style: {
      markerType: 'circle',
      insideContent: 'number',
      bottomLabel: 'name',
      color,
      strokeColor: '#ffffff',
      strokeWidth: 2,
      sizeScale: 1,
      numberSizeScale: 1,
      labelSizeScale: 1,
    },
    connectLines: [],
    badges: [],
  };
}

function createKeyboardHarness() {
  const project = createDefaultTacticalProject();
  const phaseId = project.phases[0]?.id ?? '';
  const slideId = project.phases[0]?.slides[0]?.id ?? '';
  const documentStore = createDocumentStore(project);
  const sessionStore = createSessionStore({
    activePhaseId: phaseId,
    activeSlideId: slideId,
  });
  const playbackStore = createPlaybackStore();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(
      TacticalStoreProvider,
      { stores: { documentStore, sessionStore, playbackStore } },
      children,
    );
  return {
    documentStore,
    sessionStore,
    playbackStore,
    phaseId,
    slideId,
    wrapper,
  };
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    (document.activeElement as HTMLElement)?.blur();
    const store = useTacticalUnifiedStore.getState();
    store.resetProject();
    store.setIsPlaying(false);
    store.clearSelection();
  });
```

**Before:**
```ts
  it('Ctrl+C / Cmd+C で選択中オブジェクトがコピーされ、Ctrl+V / Cmd+V でペーストされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    // 1. Ctrl+C (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().clipboard).not.toBeNull();
    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    // 2. Ctrl+V (Windows/Linux)
    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const selectedObjects = useTacticalUnifiedStore.getState().selectedObjects;

    expect(selectedObjects).toHaveLength(1);
    expect(selectedObjects[0]?.id).not.toBe(player.id);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(53);
    expect(pastedPlayer?.y).toBeCloseTo(53);
  });

  it('Cmd+C / Cmd+V (macOS metaKey) でも正常にコピー＆ペーストされる', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const player = createDefaultPlayer('away', 30, 40, '#dc2626');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        metaKey: true,
      });
    });

    expect(useTacticalUnifiedStore.getState().clipboard?.players).toHaveLength(
      1,
    );

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    const selectedObjects = useTacticalUnifiedStore.getState().selectedObjects;
    expect(selectedObjects).toHaveLength(1);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(33);
    expect(pastedPlayer?.y).toBeCloseTo(43);
  });
```
**After:**
```ts
  it('Ctrl+C / Cmd+C で選択中オブジェクトがコピーされ、Ctrl+V / Cmd+V でペーストされる', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(sessionStore.getState().clipboard).not.toBeNull();
    expect(sessionStore.getState().clipboard?.players).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        ctrlKey: true,
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    const selectedObjects = sessionStore.getState().selectedObjects;

    expect(selectedObjects).toHaveLength(1);
    expect(selectedObjects[0]?.id).not.toBe(player.id);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(53);
    expect(pastedPlayer?.y).toBeCloseTo(53);
  });

  it('Cmd+C / Cmd+V (macOS metaKey) でも正常にコピー＆ペーストされる', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('away', 30, 40, '#dc2626');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    act(() => {
      fireEvent.keyDown(document, {
        key: 'c',
        code: 'KeyC',
        metaKey: true,
      });
    });

    expect(sessionStore.getState().clipboard?.players).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'v',
        code: 'KeyV',
        metaKey: true,
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    const selectedObjects = sessionStore.getState().selectedObjects;
    expect(selectedObjects).toHaveLength(1);
    const pastedPlayer = activeSlide?.players.find(
      (p) => p.id === selectedObjects[0]?.id,
    );
    expect(pastedPlayer?.x).toBeCloseTo(33);
    expect(pastedPlayer?.y).toBeCloseTo(43);
  });
```

**Before:**
```ts
  it('INPUT / TEXTAREA / isContentEditable にフォーカス中はショートカットが発火しない', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    const inputElement = document.createElement('input');
    document.body.appendChild(inputElement);
    inputElement.focus();

    act(() => {
      fireEvent.keyDown(inputElement, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    // input 上でのキーイベントのためクリップボードは null のまま
    expect(useTacticalUnifiedStore.getState().clipboard).toBeNull();
    document.body.removeChild(inputElement);
  });

  it('Escape で選択が解除される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Escape',
        code: 'Escape',
      });
    });

    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  describe('段階的 Escape キー', () => {
    it('① input / textarea にフォーカス中は blur され、オブジェクト選択や右パネル開閉は変化しない', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      const player = createDefaultPlayer('home', 50, 50, '#034694');
      act(() => {
        store.setRightPanelOpen(true);
        store.addPlayer(player);
        store.selectObject({ id: player.id, kind: 'player' });
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        expect(document.activeElement).toBe(inputElement);

        act(() => {
          fireEvent.keyDown(inputElement, {
            key: 'Escape',
            code: 'Escape',
          });
        });

        // input が blur される
        expect(document.activeElement).not.toBe(inputElement);
        // オブジェクト選択は解除されない
        expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
          1,
        );
        // 右パネルも開いたまま
        expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
          true,
        );
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });
```
**After:**
```ts
  it('INPUT / TEXTAREA / isContentEditable にフォーカス中はショートカットが発火しない', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    const inputElement = document.createElement('input');
    document.body.appendChild(inputElement);
    inputElement.focus();

    act(() => {
      fireEvent.keyDown(inputElement, {
        key: 'c',
        code: 'KeyC',
        ctrlKey: true,
      });
    });

    expect(sessionStore.getState().clipboard).toBeNull();
    document.body.removeChild(inputElement);
  });

  it('Escape で選択が解除される', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
      createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });
    const player = createTestPlayer('home', 50, 50, '#034694');
    act(() => {
      documentStore.getState().dispatchSlide(phaseId, slideId, {
        type: 'INSERT_ENTITIES',
        players: [player],
      });
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
    });

    expect(sessionStore.getState().selectedObjects).toHaveLength(1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Escape',
        code: 'Escape',
      });
    });

    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
  });

  describe('段階的 Escape キー', () => {
    it('① input / textarea にフォーカス中は blur され、オブジェクト選択や右パネル開閉は変化しない', () => {
      const { documentStore, sessionStore, phaseId, slideId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const player = createTestPlayer('home', 50, 50, '#034694');
      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'INSERT_ENTITIES',
          players: [player],
        });
        sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        expect(document.activeElement).toBe(inputElement);

        act(() => {
          fireEvent.keyDown(inputElement, {
            key: 'Escape',
            code: 'Escape',
          });
        });

        expect(document.activeElement).not.toBe(inputElement);
        expect(sessionStore.getState().selectedObjects).toHaveLength(1);
        expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });
```

**Before:**
```ts
    it('② オブジェクト選択中は clearSelection のみ実行され、右パネルは閉じない', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      const player = createDefaultPlayer('home', 50, 50, '#034694');
      act(() => {
        store.setRightPanelOpen(true);
        store.addPlayer(player);
        store.selectObject({ id: player.id, kind: 'player' });
      });

      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        1,
      );
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      // オブジェクト選択は解除される
      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        0,
      );
      // 右パネルは開いたまま維持される
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );
    });

    it('③ オブジェクト非選択かつ右パネル展開中は右パネルが閉じられる', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();
      act(() => {
        store.clearSelection();
        store.setRightPanelOpen(true);
      });

      expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(
        0,
      );
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      // 右パネルが閉じる
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        false,
      );
    });
  });
```
**After:**
```ts
    it('② オブジェクト選択中は clearSelection のみ実行され、右パネルは閉じない', () => {
      const { documentStore, sessionStore, phaseId, slideId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      const player = createTestPlayer('home', 50, 50, '#034694');
      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
        documentStore.getState().dispatchSlide(phaseId, slideId, {
          type: 'INSERT_ENTITIES',
          players: [player],
        });
        sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(1);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(0);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
    });

    it('③ オブジェクト非選択かつ右パネル展開中は右パネルが閉じられる', () => {
      const { sessionStore, wrapper } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });
      act(() => {
        sessionStore.getState().clearSelection();
        sessionStore.getState().setRightPanelOpen(true);
      });

      expect(sessionStore.getState().selectedObjects).toHaveLength(0);
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: 'Escape',
          code: 'Escape',
        });
      });

      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(false);
    });
  });
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts
```
