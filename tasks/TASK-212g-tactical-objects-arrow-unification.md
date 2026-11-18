# TASK-212g: 矢印オブジェクト (`annotations/` 残存7ファイル) の `objects/arrow/` 統合

- **Status**: `TODO`
- **Commit**: `refactor(tactical): unify arrow components under objects/arrow and remove annotations dir`
- **Execution Waves**:
  - Wave 1: Phase 1
  - Wave 2: Phase 2 (sequential after Phase 1)
  - Wave 3: Phase 3 (sequential after Phase 2)
  - Wave 4: Phase 4 (sequential after Phase 3)
  - Wave 5: Phase 5 (sequential after Phase 4)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`
  - `absent: src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`
  - `rg: core/components/annotations`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `objects/arrow/` は Web・Extension 共用境界（Level 2）のため、`extension/` や `src/lib/db/` 依存を一切持たないこと。
  2. `ArrowObject` のドラッグ・端点ハンドル・制御点ハンドル・波線/ルート線描画の振る舞いは移設前後で完全に同一であること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `core/components/annotations/` 配下の矢印7ファイルを `objects/arrow/components/` へ移設し、`objects/arrow/components/index.ts` と `objects/arrow/index.ts` から `ArrowObject`, `ArrowObjectProps` を公開する。
  2. `PitchGroundLayer.tsx` の import を `@/features/tactical-unified/objects/arrow` へ切り替え、旧 `annotations/` の7ファイルをすべて物理削除して空ディレクトリを消滅させる。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/objects/arrow/components/index.ts`
  - `src/features/tactical-unified/objects/arrow/index.ts`

## 2. Implementation Phases

### Phase 1: 矢印サブノード・ハンドル部品の `objects/arrow/components/` 移設
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-head-node.tsx` (~61 lines)
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-line-node.tsx` (~140 lines)
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-start-handle.tsx` (~109 lines)
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-end-handle.tsx` (~112 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 4ファイルの実装・公開型をそのまま `objects/arrow/components/` へ移植する（`arrow-start-handle.tsx` と `arrow-end-handle.tsx` の `norm-px-utils` 相対/エイリアス参照を正しく解決する）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 矢印コンポーネントのレンダリング・ハンドル操作が既存通り動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/arrow/components/arrow-head-node.tsx src/features/tactical-unified/objects/arrow/components/arrow-line-node.tsx src/features/tactical-unified/objects/arrow/components/arrow-start-handle.tsx src/features/tactical-unified/objects/arrow/components/arrow-end-handle.tsx`

### Phase 2: `ArrowObject` 本体・制御点グループ移設とバレル更新
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-control-points.tsx` (~128 lines)
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-handles-group.tsx` (~67 lines)
  - `[ADD]` `src/features/tactical-unified/objects/arrow/components/arrow-object.tsx` (~295 lines)
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/components/index.ts` (ArrowObject export 追加)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
- **Contract**:
  ```ts
  export { ArrowObject, type ArrowObjectProps } from './arrow-object';
  ```
  - 振る舞い仕様・境界条件:
    1. `arrow-object.tsx` 内の子コンポーネント import を同一ディレクトリ `./arrow-*` へ統一する。
    2. `objects/arrow/components/index.ts` に `ArrowObject`, `ArrowObjectProps` を追加する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `route_line` と通常矢印の描画・トリミングが既存通り動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/arrow/components/arrow-control-points.tsx src/features/tactical-unified/objects/arrow/components/arrow-handles-group.tsx src/features/tactical-unified/objects/arrow/components/arrow-object.tsx src/features/tactical-unified/objects/arrow/components/index.ts`

### Phase 3: `PitchGroundLayer` 切替と旧ハンドル3ファイル削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/objects/arrow/index.ts` (ArrowObject, ArrowObjectProps re-export)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L1-L25, import path)
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/arrow/index.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `PitchGroundLayer.tsx` の `ArrowObject` import を `@/features/tactical-unified/objects/arrow` へ切り替える。
    2. 旧 `arrow-handles-group.tsx`, `arrow-control-points.tsx`, `arrow-head-node.tsx` を物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `PitchGroundLayer` 経由の矢印・`route_line` 描画テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/arrow/index.ts src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`

### Phase 4: 大型テスト `arrow-object-interaction.test.tsx` 更新
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx` (357 lines; L1-L10, ArrowObject import path)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/arrow/index.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `arrow-object-interaction.test.tsx`（300行超のため単独 Phase）の `ArrowObject` import を `@/features/tactical-unified/objects/arrow` へ切り替える。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: 矢印インタラクション全5ケースが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`

### Phase 5: 旧 `annotations/` 残存4ファイルの完全物理削除
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx` (統合後最終確認)
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/arrow/index.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 旧 `annotations/` 配下の残存4ファイルを物理削除し、空となった `core/components/annotations/` を消滅させる。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `route_line` 描画の既存テスト全ケースが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx`
