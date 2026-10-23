# TASK-037: 戦術ボード死蔵・重複UIモジュールの完全撤去

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-23
- **Target Files**:
  - `src/features/tactical-unified/index.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/index.ts` (MODIFY)
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/hud/` (DELETE: 全14ファイル)
  - `src/features/tactical-unified/panels/inspector/` (DELETE: 全22ファイル)
  - `src/features/tactical-unified/panels/slides/` (DELETE: 全2ファイル)
  - `src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx` (DELETE)
  - `src/features/tactical-unified/panels/toolbar/boundary-box-tilt-controls.tsx` (DELETE)
  - `src/features/tactical-unified/panels/toolbar/__tests__/boundary-box-hud.test.tsx` (DELETE)
  - `src/features/tactical-unified/panels/right-panel/formation-sub-panel.tsx` (DELETE)
  - `src/features/tactical-unified/panels/right-panel/__tests__/formation-sub-panel.test.tsx` (DELETE)
  - `src/features/tactical-unified/objects/pitch/` (DELETE: 全8ファイル)
  - `src/features/tactical-unified/objects/zone/` (DELETE: 全10ファイル)
  - `src/features/tactical-unified/objects/player/hooks/` (DELETE: 全8ファイル)
  - `src/features/tactical-unified/objects/player/components/player-marker.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/components/player-connect-lines.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/components/player-badge.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/components/player-onionskin.tsx` (DELETE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. 実画面から参照されていない旧パネル群（`panels/hud/`, `panels/inspector/`, `panels/slides/`, `panels/toolbar/boundary-box-*`, `panels/right-panel/formation-sub-panel.tsx` および関連旧テスト）が完全に削除され、バレルファイル（`src/features/tactical-unified/index.ts`, `panels/toolbar/index.ts`）から該当 export が除去されていること。
- [x] 2. `core/components/` へ移行済みで二重管理となっていた旧オブジェクト群（`objects/pitch/`, `objects/zone/`, `objects/player/hooks/`, および未使用の `player-marker.tsx`, `player-connect-lines.tsx`, `player-badge.tsx`, `player-onionskin.tsx`）が完全に削除されていること。
- [x] 3. `src/features/tactical-unified/__tests__/zone-object-components.test.ts` の `getZoneStyle` import 先が現役の `@/features/tactical-unified/core/components/zones/zone-geometry` に更新され、テストが PASS すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/features/tactical-unified/__tests__/zone-object-components.test.ts の修正後 import
import { describe, expect, it } from 'vitest';
import { getZoneStyle } from '@/features/tactical-unified/core/components/zones/zone-geometry';
import type { ZoneAnnotation } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/index.ts (修正後の確定内容)
export * from './core';
export {
  BoundaryBoxOverlay as BoundaryBox,
  CanvasStageContainer as UnifiedCanvas,
} from './core';
export { ExportModal } from './panels/export/export-modal';
export { RightPanel } from './panels/right-panel/right-panel';
export { TimelineBar } from './panels/timeline/timeline-bar';
export { DrawingToolbar } from './panels/toolbar/drawing-toolbar';
export { TopBar } from './panels/toolbar/top-bar';
export { TacticalUnifiedPage } from './tactical-unified-page';
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// src/features/tactical-unified/panels/toolbar/index.ts (先頭2行の BoundaryBoxHud, BoundaryBoxTiltControls export を削除)
export { ColorPalettePopover } from './color-palette-popover';
export { DrawingToolbar } from './drawing-toolbar';

// src/features/tactical-unified/objects/player/components/index.ts (修正後の確定内容: 現役使用中の5つのみ export)
export {
  PlayerFocusSpotlight,
  type PlayerFocusSpotlightProps,
} from './player-focus-spotlight';
export {
  PlayerGhostTrajectory,
  type PlayerGhostTrajectoryProps,
} from './player-ghost-trajectory';
export {
  PlayerMarkerCircle,
  type PlayerMarkerCircleProps,
} from './player-marker-circle';
export {
  PlayerMarkerLabel,
  type PlayerMarkerLabelProps,
} from './player-marker-label';
export {
  PlayerMarkerRing,
  type PlayerMarkerRingProps,
} from './player-marker-ring';
export {
  PlayerVisionCone,
  type PlayerVisionConeProps,
} from './player-vision-cone';
export {
  PlayerVisionConeHandles,
  type PlayerVisionConeHandlesProps,
} from './player-vision-cone-handles';
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 旧パネル群（hud / inspector / slides / formation-sub-panel / boundary-box-hud）の撤去とバレル整理
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/index.ts`, `src/features/tactical-unified/panels/toolbar/index.ts`, `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts`
- **契約 (Interface)**:
  - `src/features/tactical-unified/index.ts` から `InspectorPanel`, `FormationSubPanel`, `SlideStrip` の export を削除。
  - `src/features/tactical-unified/panels/toolbar/index.ts` から `BoundaryBoxHud`, `BoundaryBoxTiltControls` の export を削除（`core/components/BoundaryBoxHud.tsx` に一本化）。
  - `panels/hud/`, `panels/inspector/`, `panels/slides/`, `panels/toolbar/boundary-box-hud.tsx`, `panels/toolbar/boundary-box-tilt-controls.tsx`, `panels/toolbar/__tests__/boundary-box-hud.test.tsx`, `panels/right-panel/formation-sub-panel.tsx`, `panels/right-panel/__tests__/formation-sub-panel.test.tsx` を物理削除。
- **Testing Strategy**: `src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` を作成し、`@/features/tactical-unified` から死蔵シンボル（`InspectorPanel`, `FormationSubPanel`, `SlideStrip`）が export されておらず、現役シンボル（`TacticalUnifiedPage`, `RightPanel`, `TimelineBar`, `TopBar`, `DrawingToolbar`, `BoundaryBox`, `UnifiedCanvas`）が正常に export されていることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` ➔ 旧パネル削除・バレル更新 ➔ `bun run ai:check src/features/tactical-unified/index.ts src/features/tactical-unified/panels/toolbar/index.ts src/features/tactical-unified/__tests__/tactical-barrel-exports.test.ts` PASS
- **Worker Handoff Log**:
  - 死蔵パネル（hud/inspector/slides/formation-sub-panel/boundary-box-hud）と各バレルexportを撤去。残存依存の `ColorInput` は `panels/right-panel/color-input.tsx` へ局所配置。

### Phase 2: 重複・死蔵オブジェクト群（pitch / zone / player未使用パーツ）の撤去とテスト参照更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/objects/player/components/index.ts`, `src/features/tactical-unified/objects/player/index.ts`, `src/features/tactical-unified/__tests__/zone-object-components.test.ts`
- **契約 (Interface)**:
  - `src/features/tactical-unified/__tests__/zone-object-components.test.ts` の `getZoneStyle` import を `@/features/tactical-unified/core/components/zones/zone-geometry` に変更。
  - `objects/pitch/`, `objects/zone/`, `objects/player/hooks/`, および `objects/player/components/` 内の死蔵4ファイル（`player-marker.tsx`, `player-connect-lines.tsx`, `player-badge.tsx`, `player-onionskin.tsx`）を物理削除。
  - `objects/player/components/index.ts` および `objects/player/index.ts` から削除済みファイル・hooks の export を除去。
- **Testing Strategy**: `src/features/tactical-unified/__tests__/zone-object-components.test.ts` で `core/components/zones/zone-geometry` の `getZoneStyle` と、整理後の `@/features/tactical-unified/objects/player/components` の export 整合性を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/zone-object-components.test.ts` ➔ 死蔵オブジェクト削除・export更新 ➔ `bun run ai:check src/features/tactical-unified/objects/player/components/index.ts src/features/tactical-unified/objects/player/index.ts src/features/tactical-unified/__tests__/zone-object-components.test.ts` PASS
- **Worker Handoff Log**:
  - 死蔵オブジェクト（pitch/zone/player/hooks/死蔵パーツ4種）を完全撤去。player/componentsは現役7種exportに限定し、zone-geometryへの参照統合を完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-23 22:49
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  死蔵パネル群および二重管理されていた旧オブジェクト群（計75ファイル）の完全撤去、バレル export の整理、現役モジュール（`zone-geometry` 等）へのテスト参照統合、ならびに `ColorInput` の `right-panel` 局所配置がクリーンに完了していることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
