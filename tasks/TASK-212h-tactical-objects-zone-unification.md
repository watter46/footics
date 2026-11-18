# TASK-212h: ゾーンオブジェクト (`core/components/zones/`) の `objects/zone/` 統合

- **Status**: `TODO`
- **Commit**: `refactor(tactical): unify zone components and hooks under objects/zone`
- **Execution Waves**:
  - Wave 1: Phase 1
  - Wave 2: Phase 2 (sequential after Phase 1)
  - Wave 3: Phase 3 (sequential after Phase 2)
  - Wave 4: Phase 4 (sequential after Phase 3)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/core/components/zones/ZoneObject.tsx`
  - `absent: src/features/tactical-unified/core/components/zones/ZonePolygonHandles.tsx`
  - `absent: src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `absent: src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `absent: src/features/tactical-unified/core/components/zones/use-zone-polygon.ts`
  - `absent: src/features/tactical-unified/core/components/zones/use-zone-shape.ts`
  - `absent: src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `rg: core/components/zones`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `objects/zone/` は Web・Extension 共用境界（Level 2）のため、`extension/` や `src/lib/db/` 依存を一切持たないこと。
  2. 矩形・楕円・多角形ゾーンの描画、頂点ドラッグ、リサイズ・回転ハンドルの挙動を完全に維持すること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `core/components/zones/` の7ファイルを `objects/zone/` 配下（`zone-geometry.ts`, `hooks/`, `components/`, `index.ts`）へ統合する。
  2. `PitchGroundLayer.tsx` と `zone-object-components.test.ts` の参照を `@/features/tactical-unified/objects/zone` へ切り替え、旧 `zones/` の7ファイルをすべて物理削除する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`

## 2. Implementation Phases

### Phase 1: `objects/zone/` 幾何・フック層の構築
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/zone/zone-geometry.ts` (~108 lines)
  - `[ADD]` `src/features/tactical-unified/objects/zone/hooks/use-zone-polygon.ts` (~94 lines)
  - `[ADD]` `src/features/tactical-unified/objects/zone/hooks/use-zone-shape.ts` (~132 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `src/features/tactical-unified/core/components/zones/use-zone-polygon.ts`
  - `src/features/tactical-unified/core/components/zones/use-zone-shape.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `zone-geometry.ts` と2つのカスタムフックを `objects/zone/` へ移植し、フック内の `../zone-geometry` 参照を整合させる。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`（純粋関数 I/O）:
    - `case 1`: `zone-geometry` のメトリクス計算・変換パッチテストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/zone/zone-geometry.ts src/features/tactical-unified/objects/zone/hooks/use-zone-polygon.ts src/features/tactical-unified/objects/zone/hooks/use-zone-shape.ts`

### Phase 2: `objects/zone/components/` 4コンポーネントとバレル構築
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/zone/components/zone-polygon-handles.tsx` (~146 lines)
  - `[ADD]` `src/features/tactical-unified/objects/zone/components/zone-polygon-node.tsx` (~107 lines)
  - `[ADD]` `src/features/tactical-unified/objects/zone/components/zone-shape-node.tsx` (~144 lines)
  - `[ADD]` `src/features/tactical-unified/objects/zone/components/zone-object.tsx` (~17 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/components/zones/ZonePolygonHandles.tsx`
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZoneObject.tsx`
- **Contract**:
  ```ts
  export { ZoneObject } from './zone-object';
  export { ZonePolygonNode, type ZoneNodeProps } from './zone-polygon-node';
  export { ZoneShapeNode } from './zone-shape-node';
  ```
  - 振る舞い仕様・境界条件:
    1. 4コンポーネントを `objects/zone/components/` へケバブケースファイル名で移植し、`../hooks/*` および `../zone-geometry` を正しく参照する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `ZoneShapeNode` および `ZonePolygonNode` のドラッグライフサイクルが動作すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/zone/components/zone-polygon-handles.tsx src/features/tactical-unified/objects/zone/components/zone-polygon-node.tsx src/features/tactical-unified/objects/zone/components/zone-shape-node.tsx src/features/tactical-unified/objects/zone/components/zone-object.tsx`

### Phase 3: `objects/zone/index.ts`・Consumers 切替と旧ファイル削除 (Part 1)
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/objects/zone/index.ts` (~15 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (L1-L25, ZoneObject import 更新)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (import path 更新)
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/ZoneObject.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/ZonePolygonHandles.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/zone/components/zone-object.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `objects/zone/index.ts` から `ZoneObject`, `ZonePolygonNode`, `ZoneShapeNode`, `ZonePolygonHandles`, `zone-geometry` 公開関数を再エクスポートする。
    2. `PitchGroundLayer.tsx` と `zone-object-components.test.ts` の import を `@/features/tactical-unified/objects/zone` へ切り替え、旧2ファイルを物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts`（実 StoreProvider 接続）:
    - `case 1`: 既存のゾーンコンポーネント・ジオメトリ全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/objects/zone/index.ts src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/__tests__/zone-object-components.test.ts`

### Phase 4: 旧 `zones/` 残存5ファイルの完全物理削除 (Part 2)
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx` (統合後検証)
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/use-zone-polygon.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/use-zone-shape.ts`
  - `[DELETE]` `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/objects/zone/index.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 旧 `core/components/zones/` 配下の残存5ファイルを物理削除し、空となった旧ディレクトリを消滅させる。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `ZoneShapeNode` と `ZonePolygonNode` の全ドラッグテストが通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`
