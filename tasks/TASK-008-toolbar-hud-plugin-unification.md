# TASK-008: ツールバー & HUD のプラグイン化統合 (Task 1-B)

## 状態: COMPLETED
- 起草日: 2026-10-19
- 完了日: 2026-10-19
- 親計画: `tactical-unified-refactoring-phase1.md`
- 目的: Web 側ツールバー (`panels/toolbar`) と HUD (`panels/hud`) を `core` 側のプラグイン構造 (`CoreDrawingToolbar`, `ContextHud`) に統合し、二重管理を解消する。

---

## 現状と課題
1. **ツールバー二重管理**: Web 側 `panels/toolbar/drawing-toolbar.tsx` (231行) はハードコードされた旧実装。`core/components/CoreDrawingToolbar.tsx` はプラグイン型だが `markerMode` props が未サポート。
2. **HUD の機能差**: `core/components/ContextHud.tsx` に `ball` (ボール固定/解除) の HUD が未実装。ホスト境界を侵害せずプラグイン注入型で実現する。
3. **後方互換性**: Web 側のテストや外部 import (`src/features/tactical-unified/index.ts` 等) を壊さずに安全に移行する必要がある。

---

## 実装フェーズ

### [x] Phase 1: Core HUD へのプラグイン拡張 & Ball 統合 (TDD)
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts`
  - `src/features/tactical-unified/core/components/hud/index.ts`
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` (新規)
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **作業内容**:
  - `resolveHudTarget` に `resolveExtraTarget?: (selected: SelectedObject, offset: HudOffsetRect) => HudTarget | null` を受け取れるようにし先頭で呼び出し。また `selected.kind === 'ball'` で `nodesRegistryRef?.current?.ballNode` からの座標解決をフォールバックとして提供。
  - `useHudPosition` に `resolveExtraTarget` を伝達。
  - `ContextHud` に `renderExtraHud` と `resolveExtraTarget` props を追加。コンテナ内末尾で `{renderExtraHud?.(selected)}` を描画。
  - `context-hud-extra.test.tsx` で TDD サイクル（RED → GREEN）を確認。

### [x] Phase 2: CoreDrawingToolbar の markerMode 対応 (TDD)
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`
  - `src/features/tactical-unified/core/components/toolbar/index.ts`
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx`
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **作業内容**:
  - `getDrawingTools(markerMode?: '2d-only' | '3d-only' | 'all')` を追加・export。
  - `CoreDrawingToolbar` に `markerMode` props を追加し、`tools = tools ?? getDrawingTools(markerMode)` を `ToolbarToolsGroup` に渡す。
  - `toolbar.test.tsx` に markerMode 出し分けテストを追加し GREEN を確認。

### [x] Phase 3: panels/toolbar および panels/hud の Core 移行
- **対象ファイル**:
  - `src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx`
  - `src/features/tactical-unified/panels/hud/context-hud.tsx`
  - `src/features/tactical-unified/core/components/toolbar/ToolbarEraser.tsx`
  - `src/features/tactical-unified/core/components/toolbar/ToolbarResetButton.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx`
  - `src/features/tactical-unified/panels/hud/__tests__/context-hud.test.tsx`
- **作業内容**:
  - `drawing-toolbar.tsx` を `CoreDrawingToolbar` を呼び出す薄いアダプターラッパーに刷新（231行から大幅削減）。
  - `context-hud.tsx` を `core/components/ContextHud` を呼び出す薄いアダプターラッパーに刷新し、`renderExtraHud`（`BallHud`）と `resolveExtraTarget`（`activeSlide?.ball`）を注入。
  - `ToolbarEraser` と `ToolbarResetButton` のアクセシブルネーム（`aria-label`）を Web 互換に統一。
  - 既存テスト群（`drawing-toolbar.test.tsx`, `drawing-toolbar-marker-mode.test.tsx`, `context-hud.test.tsx`）がすべて PASS することを確認。

### [x] Phase 4: 全体検証
- **対象ファイル**: 全変更ファイル
- **作業内容**:
  - `bun run ai:check` による TypeScript 型検査、Biome リント、Vitest 差分テストが完全 PASS (Exit Code 0)。

---

## 完了条件 (Definition of Done)
1. `core/components/ContextHud.tsx` でボール選択時に HUD が表示されロック切替できる [x]
2. `CoreDrawingToolbar` が `markerMode` props に対応し 2D/3D ツールを適切に出し分けられる [x]
3. `panels/toolbar` と `panels/hud` の既存テストが全てグリーン [x]
4. `bun run ai:check` が警告ゼロ・Exit Code 0 [x]

---

## Worker Handoff Log
- **実装内容**:
  1. **ホスト境界厳守**: `core/` は Level 2 コンポーネントとして、Web 専用ストア（`useTacticalUnifiedStore`）への直接依存を排除。拡張機能は `renderExtraHud` / `resolveExtraTarget` を通じたプラグイン型で外部注入。
  2. **Core HUD 拡張**:
     - `hud-targets.ts` に `resolveExtraTarget` プラグインと `selected.kind === 'ball'` 時の Konva ノード座標解決フォールバックを実装。
     - `use-hud-position.ts` および `ContextHud.tsx` に `resolveExtraTarget` と `renderExtraHud` を配線。
  3. **Core Drawing Toolbar の markerMode 対応**:
     - `getDrawingTools(markerMode)` を提供し、`CoreDrawingToolbar` で `2d-only`, `3d-only`, `all` の出し分けをサポート。
  4. **Web 側 Core 移行**:
     - `panels/toolbar/drawing-toolbar.tsx`: `CoreDrawingToolbar` の薄いラッパーに刷新。
     - `panels/hud/context-hud.tsx`: `CoreContextHud` の薄いラッパーに刷新し、`renderExtraHud` で `BallHud`、`resolveExtraTarget` で `getBallTarget` を注入。
  5. **検証**:
     - `bun run ai:check` で 15 ファイルすべて型検査・Biome・Vitest (18 tests) PASS を確認。
     - `panels/hud/__tests__/context-hud.test.tsx` (8 tests) および `panels/toolbar/__tests__/drawing-toolbar*.test.tsx` (7 tests) もすべて PASS。
