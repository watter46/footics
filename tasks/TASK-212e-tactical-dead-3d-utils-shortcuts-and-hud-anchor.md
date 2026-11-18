# TASK-212e: 死蔵旧3D処理削除・ショートカット統一・HUD位置計算純化

- **Status**: `TODO`
- **Commit**: `refactor(tactical): remove legacy 3d utils, unify Mod+] shortcut, and simplify hud anchor`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 3 (parallel)
  - Wave 2: Phase 2 (sequential after Phase 1), Phase 4 (sequential after Wave 1)
  - Wave 3: Phase 5 (sequential after Phase 4)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/utils/matrix-coordinates.ts`
  - `absent: src/features/tactical-unified/core/utils/matrix-mvp-engine.ts`
  - `absent: src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts`
  - `absent: src/features/tactical-unified/core/components/CanvasOverlays.tsx`
  - `rg: unprojectScreenYToCssRotateX|computeClampedHudPos|CanvasOverlays`
  - `rg(src/features): document\.addEventListener\(['"]keydown['"]`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `core/index.ts` は Web と Chrome Extension 双方の公開境界であり、削除対象外の実用座標ヘルパー（`normToScreen`, `pitchToScreen`, `screenToPitch`, `getPitchAndNormPos`, `DEFAULT_PITCH_PERSPECTIVE`）はそのまま維持する。
  2. `Mod+]` ショートカットはテキスト入力欄（`isInputFocused()`）にフォーカス中は誤作動しないこと。
  3. `ContextHud` は `@floating-ui/react`（`offset(16)`, `flip`, `shift`）で画面端クランプ・上下反転を行うため、手動クランプ計算を持たないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 本番画面から利用ゼロの `matrix-coordinates.ts`, `matrix-mvp-engine.ts`, `CanvasOverlays.tsx`, `unprojectScreenYToCssRotateX` をテストごと物理削除する。
  2. `use-keyboard-shortcuts.ts` の `Mod+]` 用 `useEffect` + `document.addEventListener('keydown')` を `useHotkeys('mod+]', ...)` へ置き換える。
  3. `use-hud-position.ts` は `computeClampedHudPos` を削除し、アンカー情報 `{ targetX, targetY, targetHeight, isBelow }` のみを返す純粋なターゲット解決フックへ簡素化する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/index.ts`
  - `src/features/tactical-unified/core/utils/canvas-coordinates.ts`
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/hud/index.ts`

## 2. Implementation Phases

### Phase 1: `unprojectScreenYToCssRotateX` と旧3D行列参照の削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts` (L175-L203, unprojectScreenYToCssRotateX 削除)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/canvas-coordinates.ts` (L25-L33, L190-L201, 旧 re-export 削除)
  - `[MODIFY]` `src/features/tactical-unified/core/utils/__tests__/canvas-coordinates.test.ts` (L15-L20, L235-L295, 該当テスト削除)
  - `[DELETE]` `src/features/tactical-unified/core/utils/__tests__/matrix-coordinates.test.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `canvas-screen-coordinates.ts` から `unprojectScreenYToCssRotateX` を削除する。
    2. `canvas-coordinates.ts` から `unprojectScreenYToCssRotateX` および `./matrix-coordinates` からの re-export 一式を削除する。
    3. `canvas-coordinates.test.ts` から `unprojectScreenYToCssRotateX` の describe ブロックと import を削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/utils/__tests__/canvas-coordinates.test.ts`（純粋関数 I/O）:
    - `case 1`: 残存する `normToPx`, `pxToNorm`, `stageToPitch`, `normToScreen` 等の全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/canvas-screen-coordinates.ts src/features/tactical-unified/core/utils/canvas-coordinates.ts src/features/tactical-unified/core/utils/__tests__/canvas-coordinates.test.ts`

### Phase 2: `core/index.ts` 整理と死蔵3D/オーバーレイ物理削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/index.ts` (L15-L18, L114, L140-L155)
  - `[DELETE]` `src/features/tactical-unified/core/utils/matrix-coordinates.ts`
  - `[DELETE]` `src/features/tactical-unified/core/utils/matrix-mvp-engine.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/CanvasOverlays.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/index.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `core/index.ts` から `CanvasOverlays`, `CanvasOverlaysProps`, `unprojectScreenYToCssRotateX`, および `./utils/matrix-coordinates` re-export ブロックを削除する。
    2. 旧3D計算2ファイルと `CanvasOverlays.tsx` を物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/utils/__tests__/geometry-and-viewport.test.ts`（純粋関数 I/O）:
    - `case 1`: `core/index.ts` 経由の幾何・座標ユーティリティテストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/utils/__tests__/geometry-and-viewport.test.ts`

### Phase 3: `Mod+]` キーボードショートカットの `useHotkeys` 統一
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (L180-L202)
  - `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` (Mod+] テスト追加・確認)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `use-keyboard-shortcuts.ts` の `document.addEventListener('keydown', ...)` を撤去し、`useHotkeys('mod+]', ..., { enableOnFormTags: false }, [sessionStore])` で右パネル開閉トグルと閉じ時の `blur()` を実行する。
    2. `isInputFocused()` ガードと `e.preventDefault()` は既存挙動通り保持する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`（実 StoreProvider 接続）:
    - `case 1`: `Ctrl+]`（または `Meta+]`）押下で `sessionStore.getState().panels.isRightPanelOpen` がトグルされること。
    - `case 2`: `<input>` フォーカス中は `Ctrl+]` を押下しても `isRightPanelOpen` が変化しないこと。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`

### Phase 4: `use-hud-position.ts` の手動クランプ廃止と `ContextHud` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/hud/use-hud-position.ts` (L26-L95)
  - `[MODIFY]` `src/features/tactical-unified/core/components/hud/index.ts` (L31-L38)
  - `[MODIFY]` `src/features/tactical-unified/core/components/ContextHud.tsx` (L88-L165)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` (アンカー座標検証更新)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
- **Contract**:
  ```ts
  export interface HudPosition {
    targetX: number;
    targetY: number;
    targetHeight: number;
    isBelow: boolean;
  }
  export function useHudPosition(props: UseHudPositionProps): HudPosition | null;
  ```
  - 振る舞い仕様・境界条件:
    1. `computeClampedHudPos` と `clampedX` / `clampedY` を削除する。
    2. `useHudPosition` は `resolveHudTarget` の結果から `{ targetX: target.x, targetY: target.y, targetHeight: target.height, isBelow: target.y - target.height / 2 < 86 }` を返す（`target` なしなら `null`）。
    3. `ContextHud.tsx` は Floating UI の `x`/`y` をそのまま使用し、JSDOM 等で `x` が `0` の初期フレームのみ `position.targetX` / `position.targetY` を配置フォールバック値として使う（手動クランプ分岐は削除）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `useHudPosition` が画面端に近い座標でもクランプせず生の `targetX`, `targetY`, `targetHeight` を返し、上端近傍のみ `isBelow: true` となること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/hud/use-hud-position.ts src/features/tactical-unified/core/components/hud/index.ts src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`

### Phase 5: 大型テスト `context-hud.test.tsx` の `computeClampedHudPos` テスト整理
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/context-hud.test.tsx` (471 lines; 該当テスト整理)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `context-hud.test.tsx`（300行超のため単独 Phase）から `computeClampedHudPos` の import および専用テストを削除し、必要に応じて `ContextHud` + Floating UI による表示テストへ整理する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/context-hud.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 既存 `ContextHud` 表示・操作テストがすべて通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/context-hud.test.tsx`
