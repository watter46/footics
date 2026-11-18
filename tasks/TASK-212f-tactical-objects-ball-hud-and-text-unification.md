# TASK-212f: BallHud統合・norm-pxユーティリティ集約・TextObjectのobjects配置統一

- **Status**: `TODO`
- **Commit**: `refactor(tactical): integrate BallHud into core hud and move TextObject to objects/text`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel)
  - Wave 2: Phase 3 (sequential after Phase 2)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/components/hud/ball-hud.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/TextObject.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/math-utils.ts`
  - `rg: @/features/tactical-unified/components/hud/ball-hud|annotations/TextObject|annotations/math-utils`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. Web と Chrome Extension で共用する `core/` および `objects/text/` に `extension/` や `src/lib/db/` 依存を混入させない。
  2. `BallHud` は他の盤面要素（Player / Arrow / Zone / Text / ConnectLine）と同じ `HUD_CONTENT_RENDERERS` マップに直接登録し、特定のビュー（`FullTacticalCanvas`）の副作用 import に依存しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `components/hud/ball-hud.tsx` を `core/components/hud/ball-hud.tsx` へ移設し、末尾の `registerHudContentRenderer('ball', ...)` 副作用呼び出しを削除して `ContextHud.tsx` に直接登録する。
  2. `annotations/math-utils.ts` の座標変換ヘルパーを `core/utils/norm-px-utils.ts` へ集約し、矢印ハンドル群の import を更新する。
  3. `annotations/TextObject.tsx` を `objects/text/components/text-object.tsx`（+ `objects/text/index.ts`）へ移設し、`billboard-item-node.tsx` の参照を切り替えて旧ファイルを物理削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`
  - `src/features/tactical-unified/core/components/billboard-item-node.tsx`

## 2. Implementation Phases

### Phase 1: `BallHud` の `core/components/hud/` 移設と `ContextHud` 直接登録
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/components/hud/ball-hud.tsx` (~48 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/hud/index.ts` (BallHud export 追加)
  - `[MODIFY]` `src/features/tactical-unified/core/components/ContextHud.tsx` (L38-L56, ball レンダラ直接登録)
  - `[MODIFY]` `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (L19, 副作用 import 削除)
  - `[DELETE]` `src/features/tactical-unified/components/hud/ball-hud.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/components/hud/ball-hud.tsx`
- **Contract**:
  ```ts
  export function BallHud(): React.ReactElement | null;
  ```
  - 振る舞い仕様・境界条件:
    1. `core/components/hud/ball-hud.tsx` では末尾の `registerHudContentRenderer` 呼び出しを削除し、`BallHud` コンポーネントのみをエクスポートする。
    2. `ContextHud.tsx` の `HUD_CONTENT_RENDERERS` 初期配列に `['ball', () => <BallHud />]` を追加する。
    3. `FullTacticalCanvas.tsx` から `import '@/features/tactical-unified/components/hud/ball-hud';` を削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/context-hud.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `FullTacticalCanvas` をマウントしない単体 `ContextHud` 描画で `selectedObjects: [{ kind: 'ball', id: 'ball' }]` 指定時に `BallHud` が描画されること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/hud/ball-hud.tsx src/features/tactical-unified/core/components/hud/index.ts src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/views/FullTacticalCanvas.tsx src/features/tactical-unified/__tests__/context-hud.test.tsx`

### Phase 2: `core/utils/norm-px-utils.ts` 新設と矢印ハンドルの参照切替
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/core/utils/norm-px-utils.ts` (~30 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx` (L1-L15, import 更新)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx` (L1-L15, import 更新)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx` (L1-L15, import 更新)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/annotations/math-utils.ts`
- **Contract**:
  ```ts
  export function normX(v: number, w: number): number;
  export function normY(v: number, h: number): number;
  export function pxToNormX(px: number, w: number): number;
  export function pxToNormY(py: number, h: number): number;
  export function cpPxToNormX(px: number, w: number): number;
  export function cpPxToNormY(py: number, h: number): number;
  ```
  - 振る舞い仕様・境界条件:
    1. `annotations/math-utils.ts` の全6関数を `core/utils/norm-px-utils.ts` へ移植し、矢印ハンドル3ファイルの import を `@/features/tactical-unified/core/utils/norm-px-utils` へ更新する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 矢印および制御点のドラッグ・座標変換テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/utils/norm-px-utils.ts src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`

### Phase 3: `objects/text/` 移設・`billboard-item-node` 更新・旧 `TextObject`/`math-utils` 削除
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/text/components/text-object.tsx` (~90 lines)
  - `[ADD]` `src/features/tactical-unified/objects/text/index.ts` (~5 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/billboard-item-node.tsx` (L1-L20, import path)
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/TextObject.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/math-utils.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/annotations/TextObject.tsx`
- **Contract**:
  ```ts
  export { TextObject, type TextObjectProps } from './components/text-object';
  ```
  - 振る舞い仕様・境界条件:
    1. `text-object.tsx` は `@/features/tactical-unified/core/utils/norm-px-utils` から `pxToNormX`, `pxToNormY` を参照する。
    2. `billboard-item-node.tsx` の `TextObject` import を `@/features/tactical-unified/objects/text` へ切り替え、旧 `TextObject.tsx` と `math-utils.ts` を物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `TextObject` のドラッグライフサイクル・座標更新テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/text/components/text-object.tsx src/features/tactical-unified/objects/text/index.ts src/features/tactical-unified/core/components/billboard-item-node.tsx src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`
