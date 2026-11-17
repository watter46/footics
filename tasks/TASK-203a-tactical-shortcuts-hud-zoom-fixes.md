# TASK-203a: ショートカット一本化・ボードズームパン無効化・HUD表示タイミング修正

- **Status**: `DONE`
- **Commit**: `fix(tactical): unify shortcuts, disable board zoom-pan, and keep hud closed after drag`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4 (parallel)
  - Wave 2: Phase 5 (sequential after Phase 1, Phase 2)
- **Negative Contracts**:
  - `rg: useCanvasShortcuts`
  - `absent: src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`
  - `absent: src/features/tactical-unified/core/hooks/__tests__/use-canvas-shortcuts.test.tsx`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. Web ボード画面（`useKeyboardShortcuts`）の Undo/Redo・Copy/Paste/Duplicate/Escape/Delete/Tool 切替は 1 回のキー押下で 1 回のみ発火すること（二重登録ゼロ）。
  2. Chrome Extension（`QuickTacticalCanvas` / `QuickAnnotationCanvas`）でも、Undo/Redo（`useQuickCanvasShortcuts`）の二重発火を起こさず、かつ全選択・コピー・ペースト・複製・削除・Escape・ツール切替が引き続き動作すること。
  3. レイアウト画面（`TacticalSplitPreviewPanel`）のカメラ操作（`usePreviewWheelZoom`・Orbit/Pan）は影響を受けず維持されること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `useCanvasShortcuts` は `disabled` フラグや併用フォールバックを残さず完全廃止（`[DELETE]`）し、`CanvasStageContainer` からグローバルショートカット登録を切り離す。
  2. `useKeyboardShortcuts` に `Mod+A`（全選択）を統合して Web 側の唯一正本とし、Extension 側には Undo/Redo を除いたキャンバス編集ショートカットフック `useQuickAnnotationShortcuts` を新設して `QuickAnnotationCanvasInner` に配置する。
  3. ボード画面では `useCanvasPointerInteraction` 内で `useCanvasZoomPan({ vRect, disabled: true })` とし、ホイールズーム・中クリック/Space パンを無効化する。
  4. `selectObjectTransition` が内部で `isHudOpen: true` を設定するため、`useMarkerDragHandlers` の `handleDragStart` では未選択マーカーへの `selectObject(...)` 呼び出しの**後**に `setIsHudOpen(false)` を実行し、`handleDragEnd` の `setIsHudOpen(true)` は削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx`
  - `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
  - `src/features/tactical-unified/core/index.ts`

## 2. Implementation Phases

### Phase 1: Web ショートカット統合 (`Mod+A` Select All 追加)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (`useKeyboardShortcuts`, L22-L100)
  - `[ADD]` `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts-select-all.test.ts` (~80 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/domain-selectors.ts` (`selectDomainActiveSlide`)
  - `src/features/tactical-unified/core/types.ts` (`SelectedObject`)
- **Contract**:
  ```ts
  // useKeyboardShortcuts 内に追加する全選択ショートカット契約
  // key: ['mod+a', 'meta+a'], options: { enableOnFormTags: false }
  // isInputFocused() が true なら無視、false なら e.preventDefault() し
  // activeSlide の arrows, zones, texts, players を SelectedObject[] へ変換して
  // sessionStore.getState().selectObjects(all) を呼ぶ。
  ```
  - 振る舞い仕様・境界条件:
    1. `activeSlide` が存在しない場合は何もしない。
    2. 選択配列順序は `arrows -> zones -> texts -> players` とし、それぞれの `kind`（`'arrow' | 'zone' | 'text' | 'player'`）を付与して `selectObjects` を呼ぶ。
    3. 既存の `useKeyboardShortcuts` 内の他キーバインド（Undo/Redo/Copy/Paste/Duplicate/Space/Escape/Delete/Tools 等）は変更しない。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts-select-all.test.ts`（実 `TacticalStoreProvider` 接続、内部 `vi.mock` 禁止）:
    - `case 1`: `Ctrl+A` / `Cmd+A` 押下で `activeSlide` 上の全 player / arrow / zone / text が `sessionStore.selectedObjects` に選択される。
    - `case 2`: `input` / `textarea` フォーカス中の `Ctrl+A` では `sessionStore.selectedObjects` が変化しない。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts-select-all.test.ts`

### Phase 2: Extension クイック編集用ショートカット分離・補完
- **Target Files**:
  - `[ADD]` `extension/features/canvas/hooks/use-quick-annotation-shortcuts.ts` (~125 lines)
  - `[MODIFY]` `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (`QuickAnnotationCanvasInner`, L45-L145)
  - `[ADD]` `extension/features/canvas/hooks/__tests__/use-quick-annotation-shortcuts.test.tsx` (~130 lines)
- **Reference Files (Read-Only)**:
  - `extension/features/canvas/hooks/use-quick-canvas-shortcuts.ts`
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (`getToolShortcutMap`)
  - `src/lib/tactical/domain/clipboard.ts` (`extractSelectedObjects`, `cloneAndOffsetClipboard`)
- **Contract**:
  ```ts
  export function useQuickAnnotationShortcuts(): void;
  // Undo/Redo（Mod+Z / Mod+Shift+Z / Mod+Y）は登録しない（useQuickCanvasShortcuts が単独担当）。
  // 登録対象: Mod+A (Select All), Mod+C (Copy), Mod+V (Paste), Mod+D (Duplicate),
  // Space (preventDefault), Escape (clearPreview + connectingPlayerId=null + clearSelection + select tool),
  // Delete/Backspace (DELETE_ENTITIES + clearSelection), getToolShortcutMap() のツール切替。
  ```
  - 振る舞い仕様・境界条件:
    1. 全ハンドラは `{ enableOnFormTags: false }` とし、`isInputFocused()` 時は即時 return する（`@/lib/shortcuts` を利用）。
    2. `QuickAnnotationCanvasInner` 内で `useQuickAnnotationShortcuts()` を 1 回呼び出す。
    3. `QuickTacticalCanvas` の `useQuickCanvasShortcuts` と Undo/Redo が一切重複しないこと。
- **Concrete Test Cases**:
  - `extension/features/canvas/hooks/__tests__/use-quick-annotation-shortcuts.test.tsx`（実 `TacticalStoreProvider` 接続、内部 `vi.mock` 禁止）:
    - `case 1`: ツールショートカットキー（`v` 等）、`Escape`、`Delete`、`Ctrl+A`、`Ctrl+C` + `Ctrl+V`、`Ctrl+D` が動作する。
    - `case 2`: `Ctrl+Z` / `Ctrl+Shift+Z` を押しても `documentStore` の履歴が変化しない（Undo/Redo 非登録の証明）。
    - `case 3`: `input` 要素フォーカス中はツール切替や削除が発火しない。
- **Verification**:
  - `bun run ai:check extension/features/canvas/hooks/use-quick-annotation-shortcuts.ts extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/hooks/__tests__/use-quick-annotation-shortcuts.test.tsx`

### Phase 3: ボード画面ズーム・パン無効化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts` (`useCanvasPointerInteraction`, L30-L55)
  - `[MODIFY]` `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts` (L95-L175)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts` (`UseCanvasZoomPanOptions`)
- **Contract**:
  ```ts
  // useCanvasPointerInteraction 内の呼び出しを変更:
  const zoomPan = useCanvasZoomPan({ vRect, disabled: true });
  ```
  - 振る舞い仕様・境界条件:
    1. `useCanvasPointerInteraction` を通じたホイール操作で `pitchTransform.zoom` が変更されない。
    2. Space キー押下中のポインタドラッグでも `pitchTransform.panX` / `panY` が変更されない。
    3. `useCanvasZoomPan` 自体の機能・引数契約は維持し、`pitch-pan-outer-margin.test.ts` には影響を与えない。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`（実ストア接続、旧テスト L96-L173 を新仕様へ置換）:
    - `case 1`: ホイール操作（`handleWheel`）を実行しても `activeSlide.pitchTransform` の `zoom` が変化しない（初期値のまま）。
    - `case 2`: Space キー押下中のポインタダウン＋ムーブでも `activeSlide.pitchTransform` の `panX` / `panY` が変化しない。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`

### Phase 4: クイック操作HUD 表示タイミング修正
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (`handleDragStart`, `handleDragEnd`, L66-L185)
  - `[ADD]` `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx` (~120 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/session-ui-transitions.ts` (`selectObjectTransition`)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (`handleMarkerClick`, L171-L207)
- **Contract**:
  ```ts
  // handleDragStart:
  // 1. 未選択マーカーなら selectObject(markerId, isShift) を先に呼ぶ
  // 2. その後に setIsDragging(true) と setIsHudOpen(false) を呼ぶ（selectObjectTransition の isHudOpen: true を上書き防止）
  // handleDragEnd:
  // setIsHudOpen(true) 呼び出しを削除し、ドラッグ終了後も HUD を閉じたままにする。
  ```
  - 振る舞い仕様・境界条件:
    1. 既に選択済みで HUD が開いているマーカーをドラッグ開始した瞬間、HUD は閉じる。
    2. 未選択マーカーをいきなりドラッグ開始した場合も、`selectObject` で選択状態にしつつ `isHudOpen` は `false` のまま維持する。
    3. ドラッグ終了（`handleDragEnd`）後も `isHudOpen` は `false` のまま維持され、クリック（`handleMarkerClick`）時のみ開く。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx`（実 `TacticalStoreProvider` 接続、内部 `vi.mock` 禁止）:
    - `case 1`: 未選択マーカーで `handleDragStart` 呼出時、`selectedObjects` には追加されるが `setIsHudOpen` は最終的に `false`（またはストアの `isHudOpen === false`）となる。
    - `case 2`: `handleDragEnd` 呼出時、`setIsHudOpen(true)` が呼ばれず `isHudOpen` が `false` のまま維持される。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx`

### Phase 5: 旧 `useCanvasShortcuts` 完全廃止と `CanvasStageContainer` 撤去
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (L1-L85)
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (L80-L90)
  - `[DELETE]` `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`
  - `[DELETE]` `src/features/tactical-unified/core/hooks/__tests__/use-canvas-shortcuts.test.tsx`
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` (L205-L325 の旧ショートカットテスト撤去)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `CanvasStageContainer.tsx` から `useCanvasShortcuts` の import と呼び出しを完全に削除する。
    2. `core/index.ts` から `UseCanvasShortcutsOptions`, `useCanvasShortcuts` のエクスポートを削除する。
    3. `use-canvas-shortcuts.ts` および `use-canvas-shortcuts.test.tsx` を物理削除する。
    4. `canvas-stage-container.test.tsx` の旧ショートカットテストブロック（`CanvasStageContainer Tool Shortcuts`, `CanvasStageContainer Action & History Shortcuts` の内ショートカット依存ケース、`テキスト編集中はショートカットが無視される`）を削除し、`toolbar prop` テストや `CanvasCoreHandle`・`Fixed Stage Size`・`Margin` テストは維持する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`:
    - `case 1`: `CanvasStageContainer` マウント状態で `Ctrl+Z` 押下しても自前で `undo()` が発火しないこと（二重発火根絶確認）、および既存レイアウト・エクスポートテストが全 PASS すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
