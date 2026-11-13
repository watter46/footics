# TASK-181kdb: useKeyboardShortcuts テスト第2弾（Mod+]・削除・ツール・シーン操作）移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181kda
- **Commit**: `test(tactical): migrate Mod+], entity deletion, tool, and scene navigation keyboard shortcut tests`

---

## 🎯 目的・背景

`TASK-181kda` で導入した `createKeyboardHarness()` を用い、`use-keyboard-shortcuts.test.ts` 第2弾（L264-L508: `Mod+]`・選択オブジェクト削除・ツール切替・`d`/`f`/`r` シーン操作）を3周波数ストアベースへ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- L264-L508 内の移行済みテストに `useTacticalUnifiedStore` / `createDefaultPlayer` の参照を残してはならない。
- `vi.mock` による内部ストア・内部フックのモックを追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: L264-L508 移行（1テストファイル）

---

### Phase 1: L264-L508 移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`（L264-L508）

**Before:**
```ts
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
```
**After:**
```ts
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import {
  selectDomainActivePhaseSlides,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
```

**Before:**
```ts
  describe('右パネル開閉ショートカット Mod+]', () => {
    it('Ctrl+] / Cmd+] で右パネルの開閉がトグルされる', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.setRightPanelOpen(true);
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );

      // 1. Ctrl+] で閉じる
      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          ctrlKey: true,
        });
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        false,
      );

      // 2. Cmd+] で開く
      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          metaKey: true,
        });
      });
      expect(useTacticalUnifiedStore.getState().panels.isRightPanelOpen).toBe(
        true,
      );
    });
  });

  it('Delete / Backspace で選択中のオブジェクトが削除される', () => {
    renderHook(() => useKeyboardShortcuts());
    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;

    const initialCount =
      useTacticalUnifiedStore.getState().project.slides[0]?.players.length ?? 0;

    const player = createDefaultPlayer('home', 50, 50, '#034694');
    act(() => {
      store.addPlayer(player);
      store.selectObject({ id: player.id, kind: 'player' });
    });

    expect(
      useTacticalUnifiedStore.getState().project.slides[0]?.players,
    ).toHaveLength(initialCount + 1);

    act(() => {
      fireEvent.keyDown(document, {
        key: 'Delete',
        code: 'Delete',
      });
    });

    const activeSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((s) => s.id === slideId);
    expect(activeSlide?.players).toHaveLength(initialCount);
    expect(useTacticalUnifiedStore.getState().selectedObjects).toHaveLength(0);
  });

  it('描画ツールショートカットは v (select) のみ動作し、他の文字キー (l, a, w, m) では切り替わらないこと', () => {
    renderHook(() => useKeyboardShortcuts());

    act(() => {
      useTacticalUnifiedStore.getState().setActiveTool('line');
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'w', code: 'KeyW' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(useTacticalUnifiedStore.getState().activeTool).toBe('select');
  });
```
**After:**
```ts
  describe('右パネル開閉ショートカット Mod+]', () => {
    it('Ctrl+] / Cmd+] で右パネルの開閉がトグルされる', () => {
      const { sessionStore, wrapper } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        sessionStore.getState().setRightPanelOpen(true);
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);

      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          ctrlKey: true,
        });
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(false);

      act(() => {
        fireEvent.keyDown(document, {
          key: ']',
          code: 'BracketRight',
          metaKey: true,
        });
      });
      expect(sessionStore.getState().panels.isRightPanelOpen).toBe(true);
    });
  });

  it('Delete / Backspace で選択中のオブジェクトが削除される', () => {
    const { documentStore, sessionStore, phaseId, slideId, wrapper } =
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
      sessionStore.getState().selectObject({ id: player.id, kind: 'player' });
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
        key: 'Delete',
        code: 'Delete',
      });
    });

    const activeSlide = selectDomainActiveSlide(
      documentStore.getState().project,
      phaseId,
      slideId,
    );
    expect(activeSlide?.players).toHaveLength(initialCount);
    expect(sessionStore.getState().selectedObjects).toHaveLength(0);
  });

  it('描画ツールショートカットは v (select) のみ動作し、他の文字キー (l, a, w, m) では切り替わらないこと', () => {
    const { sessionStore, wrapper } = createKeyboardHarness();
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    act(() => {
      sessionStore.getState().setActiveTool('line');
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'a', code: 'KeyA' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'w', code: 'KeyW' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'm', code: 'KeyM' });
    });
    expect(sessionStore.getState().activeTool).toBe('line');

    act(() => {
      fireEvent.keyDown(document, { key: 'v', code: 'KeyV' });
    });
    expect(sessionStore.getState().activeTool).toBe('select');
  });
```

**Before:**
```ts
  describe('シーン操作ショートカット (d: 前へ, f: 次へ, r: 初めから再生)', () => {
    it('d キーで前のシーンに移動し、f キーで次のシーンに移動する', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      // スライドを3つ作成 (A, B, C)
      act(() => {
        store.addSlide(); // B
      });
      act(() => {
        store.addSlide(); // C
      });

      const slides = useTacticalUnifiedStore.getState().project.slides;
      expect(slides).toHaveLength(3);
      const [slideA, slideB, slideC] = slides;

      // 現在 B をアクティブにする
      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideB.id);
        useTacticalUnifiedStore.getState().setPlaybackIndices(1, null);
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);

      // 1. d キー押下 -> A (インデックス 0) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideA.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(0);

      // 先頭 (インデックス 0) でさらに d を押しても変化しない
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideA.id);

      // 2. f キー押下 -> B (インデックス 1) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(1);

      // f キー押下 -> C (インデックス 2) へ移動
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
      expect(useTacticalUnifiedStore.getState().playbackSlideIndex).toBe(2);

      // 末尾でさらに f を押しても変化しない
      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
    });

    it('r キーで先頭シーンに移動し、シーク時間0で再生を開始する', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide(); // B
      });
      act(() => {
        store.addSlide(); // C
      });

      const slides = useTacticalUnifiedStore.getState().project.slides;
      const [slideA, , slideC] = slides;

      // C をアクティブ、再生停止、シーク時間を 5000ms に設定
      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideC.id);
        useTacticalUnifiedStore.getState().setPlaybackIndices(2, null);
        useTacticalUnifiedStore.getState().seekTo(5000);
        useTacticalUnifiedStore.getState().setIsPlaying(false);
      });

      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideC.id);
      expect(useTacticalUnifiedStore.getState().isPlaying).toBe(false);

      // r キー押下 -> A へ移動し再生開始
      act(() => {
        fireEvent.keyDown(document, { key: 'r', code: 'KeyR' });
      });

      const updatedStore = useTacticalUnifiedStore.getState();
      expect(updatedStore.activeSlideId).toBe(slideA.id);
      expect(updatedStore.playbackSlideIndex).toBe(0);
      expect(updatedStore.playbackSeekTimeMs).toBe(0);
      expect(updatedStore.isPlaying).toBe(true);
    });
```
**After:**
```ts
  describe('シーン操作ショートカット (d: 前へ, f: 次へ, r: 初めから再生)', () => {
    it('d キーで前のシーンに移動し、f キーで次のシーンに移動する', () => {
      const {
        documentStore,
        sessionStore,
        playbackStore,
        phaseId,
        wrapper,
      } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });

      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );
      expect(slides).toHaveLength(3);
      const [slideA, slideB, slideC] = slides;

      act(() => {
        sessionStore.getState().setActiveSlideId(slideB.id);
        playbackStore.getState().setPlaybackIndices(1, null);
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(0);

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(1);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(2);

      act(() => {
        fireEvent.keyDown(document, { key: 'f', code: 'KeyF' });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
    });

    it('r キーで先頭シーンに移動し、シーク時間0で再生を開始する', () => {
      const {
        documentStore,
        sessionStore,
        playbackStore,
        phaseId,
        wrapper,
      } = createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });

      const slides = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );
      const [slideA, , slideC] = slides;

      act(() => {
        sessionStore.getState().setActiveSlideId(slideC.id);
        playbackStore.getState().setPlaybackIndices(2, null);
        playbackStore.getState().seekTo(5000);
        playbackStore.getState().pausePlayback();
      });

      expect(sessionStore.getState().activeSlideId).toBe(slideC.id);
      expect(playbackStore.getState().isPlaying).toBe(false);

      act(() => {
        fireEvent.keyDown(document, { key: 'r', code: 'KeyR' });
      });

      expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      expect(playbackStore.getState().playbackSlideIndex).toBe(0);
      expect(Number(playbackStore.getState().timeMs)).toBe(0);
      expect(playbackStore.getState().isPlaying).toBe(true);
    });
```

**Before:**
```ts
    it('input / textarea にフォーカス中は d, f, r が発火しないこと', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide();
      });
      const [slideA] = useTacticalUnifiedStore.getState().project.slides;

      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideA.id);
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        act(() => {
          fireEvent.keyDown(inputElement, { key: 'f', code: 'KeyF' });
        });
        // スライドは変化しない
        expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(
          slideA.id,
        );
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('Ctrl / Meta / Alt などの修飾キー付きではシーン操作 (d, f, r) が発火しないこと', () => {
      renderHook(() => useKeyboardShortcuts());
      const store = useTacticalUnifiedStore.getState();

      act(() => {
        store.addSlide();
      });
      const [, slideB] = useTacticalUnifiedStore.getState().project.slides;

      act(() => {
        useTacticalUnifiedStore.getState().setActiveSlide(slideB.id);
      });

      // Ctrl+D (オブジェクト複製等) -> d によるシーン移動は発火しない
      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
      });
      expect(useTacticalUnifiedStore.getState().activeSlideId).toBe(slideB.id);
    });
  });
```
**After:**
```ts
    it('input / textarea にフォーカス中は d, f, r が発火しないこと', () => {
      const { documentStore, sessionStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });
      const [slideA] = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );

      act(() => {
        sessionStore.getState().setActiveSlideId(slideA.id);
      });

      const inputElement = document.createElement('input');
      document.body.appendChild(inputElement);
      try {
        inputElement.focus();
        act(() => {
          fireEvent.keyDown(inputElement, { key: 'f', code: 'KeyF' });
        });
        expect(sessionStore.getState().activeSlideId).toBe(slideA.id);
      } finally {
        if (inputElement.parentNode) {
          document.body.removeChild(inputElement);
        }
      }
    });

    it('Ctrl / Meta / Alt などの修飾キー付きではシーン操作 (d, f, r) が発火しないこと', () => {
      const { documentStore, sessionStore, phaseId, wrapper } =
        createKeyboardHarness();
      renderHook(() => useKeyboardShortcuts(), { wrapper });

      act(() => {
        documentStore.getState().dispatch({ type: 'ADD_SLIDE', phaseId });
      });
      const [, slideB] = selectDomainActivePhaseSlides(
        documentStore.getState().project,
        phaseId,
      );

      act(() => {
        sessionStore.getState().setActiveSlideId(slideB.id);
      });

      act(() => {
        fireEvent.keyDown(document, { key: 'd', code: 'KeyD', ctrlKey: true });
      });
      expect(sessionStore.getState().activeSlideId).toBe(slideB.id);
    });
  });
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts
```
