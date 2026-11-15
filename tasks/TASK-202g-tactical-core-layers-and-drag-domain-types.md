# TASK-202g: Core Konva Layers & Drag Handlers の Domain 型移行

- **Status**: `TODO`
- **Commit**: `refactor(tactical): migrate core Konva layers, marker drag handlers, and context-hud tests to Domain types`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2, Phase 3
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components): types/tactical/(annotations|player|project|slide)|\b(Player|ArrowAnnotation|ZoneAnnotation|PlayerTrajectory)\b`
  - `rg(src/features/tactical-unified/__tests__/context-hud.test.tsx): from '@/lib/types/tactical-unified'`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `Core` コンポーネントおよびドラッグハンドラは、Store/SceneGraph から受け取る実体と同じ `DomainPlayer` (`PitchPlayer`)・`DomainArrowAnnotation`・`DomainZoneAnnotation`・`DomainPlayerTrajectory` を型として扱う。
  2. ドラッグ更新パッチは `ScreenNormCoord` / `ScreenNormPoint` を保ち、既存のクランプ・ベンチドロップ・矢印追従ロジックを壊さない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `PlayerMarkerItem`・`PlayerConnectingGuide`・`player-ghost-trajectory-list` は `DomainPlayer` を受け取り、必要箇所で `area === 'pitch'` の `PitchPlayer` ナローイングを行う。
  2. `use-marker-drag-handlers.ts` の `updateMarker` / `updateMarkers` パッチ型は `Partial<PitchPlayer>`（または座標・共通フィールドの `Partial<DomainPlayer>`）として呼び出し元 `BillboardObjectLayer` と整合させる。
  3. `PitchGroundLayer.tsx` の共有/型 import 元（`annotations`, `player`）をすべて `domain-entities` へ切り替える。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/*`
  - `src/features/tactical-unified/__tests__/context-hud.test.tsx`

## 2. Implementation Phases

### Phase 1: マーカーアイテム・接続ガイド・ゴーストリスト・ドラッグハンドラの移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerMarkerItem.tsx` (194 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PlayerConnectingGuide.tsx` (139 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx`
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (248 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/primitives.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - `Player` ➔ `DomainPlayer`（`onUpdateVisionCone` 等 `PitchPlayer` 固有は `PitchPlayer` 基準）、`ArrowAnnotation` ➔ `DomainArrowAnnotation`、`PlayerTrajectory` ➔ `DomainPlayerTrajectory`、`AspectRatio` は `@/lib/types/tactical/primitives` へ変更する。
- **Concrete Test Cases**:
  - `player-marker-item.test.tsx`, `player-connect-lines.test.tsx` で検証される挙動を維持する。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/PlayerMarkerItem.tsx src/features/tactical-unified/core/components/PlayerConnectingGuide.tsx src/features/tactical-unified/core/components/player-ghost-trajectory-list.tsx src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`

### Phase 2: `BillboardObjectLayer` & `PitchGroundLayer` の Domain 型完全統一
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (298 lines)
  - `[MODIFY]` `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (290 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - `BillboardObjectLayer.tsx` から `Player` import を除去し、`PitchPlayer` / `DomainPlayer` に統一する。
  - `PitchGroundLayer.tsx` から `ArrowAnnotation`, `ZoneAnnotation`, `PlayerTrajectory` を除去し、`DomainArrowAnnotation`, `DomainZoneAnnotation`, `DomainPlayerTrajectory` に統一する。
- **Concrete Test Cases**:
  - `clean-render.test.tsx` および `full-tactical-canvas-integration.test.tsx` が通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx`

### Phase 3: `context-hud.test.tsx` の Domain 型移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/context-hud.test.tsx` (471 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`
- **Contract**:
  - `Player` from `@/lib/types/tactical-unified` を削除し、既に import 済みの `DomainPlayer` / `PitchPlayer` に統一する。
- **Concrete Test Cases**:
  - `context-hud.test.tsx` 内の全テストケース（Arrow, Zone, Player, BallHud, PlayerMarkerLabel）が通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/context-hud.test.tsx`
