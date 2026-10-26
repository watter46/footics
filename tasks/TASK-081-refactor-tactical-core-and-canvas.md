# TASK-081: [Tactical Core & Canvas] 戦術ボード描画・Konvaピッチ・幾何エンジンの垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/matrix-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/AnnotationLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/ArrowObject.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/TextObject.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-control-points.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-end-handle.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-handles-group.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-head-node.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/arrow-start-handle.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/annotations/use-arrow-sync.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/use-zone-polygon.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/use-zone-shape.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/types.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-focus-spotlight.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-ring.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-vision-cone.tsx` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/player-formatting.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `core/utils/canvas-coordinates.ts` (351行) および `matrix-coordinates.ts` (388行) を補助モジュールへ分割し、両方とも 300行以下にすること（公開関数の re-export 維持）
- [x] 2. `core/components/` 配下（`AnnotationLayer`, `ContextHud`, `PitchGroundLayer`, `annotations/*`, `hud/*`, `zones/*`）の Konva イベント・Node Ref に厳密な `Konva.KonvaEventObject` / `Konva.Node` 型を適用し、`any` (計22件) を全廃すること
- [x] 3. `BillboardObjectLayer.tsx` (386行) と `PlayerLayer.tsx` (307行) を 300行以下に分割し、`objects/player/` 配下の `any` (計10件) を全廃すること
- [x] 4. `src/lib/tactical/unified-interpolation.ts` (1065行) と `player-formatting.ts` (368行・`any` 1件) を責務ごとに 300行以下のサブモジュールへ分割し、`any` を全廃すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
```

### 3.2 Key Interfaces & Types
```ts
export type KonvaDragEvent = KonvaEventObject<DragEvent>;
export type KonvaMouseEvent = KonvaEventObject<MouseEvent>;
export type KonvaTouchEvent = KonvaEventObject<TouchEvent>;
export type KonvaPointerEvent = KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. Level 2 コア領域 (src/features/tactical-unified/core/) では useTacticalUnifiedStore の直接 import や DB 参照は厳禁（.dependency-cruiser で遮断される）
// 2. 300行超ファイルを分割する際は、元のファイルから公開シンボルを re-export し、外部の import パスを一切壊さないこと
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Core 型定義と座標計算ユーティリティの 300行以下分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/types.ts`, `src/features/tactical-unified/core/utils/canvas-coordinates.ts`, `src/features/tactical-unified/core/utils/matrix-coordinates.ts`
- **契約 (Interface)**:
  ```ts
  // canvas-coordinates.ts / matrix-coordinates.ts の既存 export 関数を維持したまま、補助関数を別ファイルへ分離して各 300行以下にする
  ```
- **Testing Strategy**: 座標変換・投影関連の既存テストがすべて PASS し、3ファイルの行数 <= 300・`explicitAny` === 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: `core/types.ts` の `any` 排除と座標ユーティリティ2件の 300行以下分割 ➔ `bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/utils/canvas-coordinates.ts src/features/tactical-unified/core/utils/matrix-coordinates.ts` PASS
- **Worker Handoff Log**:
  - `canvas-screen-coordinates.ts` (204L) と `matrix-mvp-engine.ts` (279L) を新設し、元ファイル経由で全シンボルを re-export（既存 import パス完全保護）。
  - `updatePlayerTrajectory` の引数を `PlayerTrajectory | undefined`（optional）に厳密型付けし `explicitAny` 0件達成。全5ファイルが <= 300L。

### Phase 2: Konva Annotation / HUD / Zone コンポーネントの any 全廃
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/AnnotationLayer.tsx`, `ContextHud.tsx`, `PitchGroundLayer.tsx`, `annotations/*`, `hud/*`, `zones/*`
- **契約 (Interface)**:
  ```ts
  // Konva Node Ref やイベント引数 (e: any) を KonvaEventObject<MouseEvent | TouchEvent | DragEvent> や Konva.Group / Konva.Shape 等に厳密化
  ```
- **Testing Strategy**: `src/features/tactical-unified/__tests__/` の描画テストが PASS し、対象17ファイルの `explicitAny` が 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: Konva イベント・Ref 型付けによる `any` 22件の完全排除 ➔ `bun run ai:check src/features/tactical-unified/core/components/` PASS
- **Worker Handoff Log**:
  - `nodesRegistryRef` を `React.MutableRefObject<CanvasNodesRegistry>` に統一し、`ArrowHandleCommonProps` で handle 群の props を厳格型付け。
  - Konva Circle/Arrow Ref は直接 `React.RefObject` を渡せるため `as any` を全廃し、イベント引数も `KonvaEventObject<MouseEvent | TouchEvent | PointerEvent>` に厳密化（対象17ファイルで `any` 0件達成）。

### Phase 3: Player Objects の any 全廃と Billboard / PlayerLayer の 300行以下分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `PlayerLayer.tsx`, `src/features/tactical-unified/objects/player/**`
- **契約 (Interface)**:
  ```ts
  // BillboardObjectLayer.tsx (386行) と PlayerLayer.tsx (307行) からサブコンポーネント/ヘルパーを分離し 300行以下化。objects/player の any 10件を排除
  ```
- **Testing Strategy**: プレイヤー描画・ビルボード投影テストが PASS し、行数 <= 300・`explicitAny` === 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: レイヤー分割と Player オブジェクト群の `any` 排除 ➔ `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/PlayerLayer.tsx src/features/tactical-unified/objects/player/` PASS
- **Worker Handoff Log**:
  - `BillboardObjectLayer.tsx` (291L) と `PlayerLayer.tsx` (250L) から `billboard-depth-sort.ts` (50L), `player-bench-drop.ts` (51L), `BillboardItemNode.tsx` (141L), `PlayerGhostTrajectoryList.tsx` (71L) を分離し、全ファイル <= 300L 達成。元ファイルからの re-export により既存 import パス完全保護。
  - `objects/player/types.ts` (`OnionSkinRefs`), `player-focus-spotlight.tsx`, `player-marker-ring.tsx`, `player-vision-cone.tsx`, `player-vision-cone-handles.tsx` の `any` 計10件を Konva 厳密型（`Konva.Group | null`, `Konva.Line | Konva.Arc | null` 等）に置換し `explicitAny` 0件達成。

### Phase 4: 補間エンジン (unified-interpolation.ts) と Player Formatting の分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/unified-interpolation.ts`, `src/lib/tactical/player-formatting.ts`
- **契約 (Interface)**:
  ```ts
  // unified-interpolation.ts (1065行) を interpolation-player.ts, interpolation-ball.ts, interpolation-annotation.ts 等へ 300行以下で分割し re-export
  ```
- **Testing Strategy**: 補間・アニメーション単体テストが全件 PASS し、全分割ファイルの行数 <= 300・`explicitAny` === 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: `unified-interpolation.ts` と `player-formatting.ts` の 300行以下モジュール分割 ➔ `bun run ai:check src/lib/tactical/unified-interpolation.ts src/lib/tactical/player-formatting.ts` PASS
- **Worker Handoff Log**:
  - `player-formatting.ts` (227行) から `player-formatting-helpers.ts` (153行) を抽出し `getShirtNo` の `any` を型安全な `PlayerShirtNoSource` に是正。
  - `unified-interpolation.ts` (277行) を `interpolation-geometry.ts` (190行), `interpolation-ball.ts` (65行), `interpolation-player.ts` (270行), `interpolation-annotation.ts` (280行) に分割し全シンボルを re-export。全7ファイル <= 300行・`any` 0件達成。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 20:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 全4フェーズの受入要件を満たし、全対象ファイルが300行以下かつanyが全廃されていることを確認。re-exportにより公開APIの後方互換性も完全に担保されているためLGTMと判定。

## 6. Rejections / Additional Tasks (不可逆修正欄)
