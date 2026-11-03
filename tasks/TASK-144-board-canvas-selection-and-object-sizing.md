# TASK-144: board-canvas-selection-and-object-sizing

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-03
- **Target Files**:
  - `src/features/tactical-unified/core/utils/geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-selection-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (MODIFY)
  - `src/lib/types/tactical/ball.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-ball-slice.ts` (MODIFY)
  - `src/lib/tactical/interpolation-ball.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/ball-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/objects/ball/components/ball-object.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/ball-hud.tsx` (NEW)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-marker-label.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 選手複数範囲選択バグの完全修正: `useCanvasSelectionBox` にて `pitchTransform`（`panX`, `panY`, `zoom`）を考慮した `stageToPitch` 逆変換を適用し、`selectionBoxRef` によりドラッグ座標を同期保持することで、ズーム・パン状態やドラッグ速度に関わらず範囲内のピッチ上選手（`area !== 'bench'` かつ表示中チーム）が確実に一括選択されること
- [x] 2. ステージ座標取得の堅牢化: `getPointerCoordinates` において `stage.setPointersPositions(e.evt)` またはコンテナ `getBoundingClientRect()` による補正を行い、`onPointerDown` / `onPointerMove` 時の座標ズレを防ぐこと
- [x] 3. ボールの大きさ変更（データ・補間・Canvas2D/Konva描画・ミニHUD）: `BallStateSchema` に `sizeScale`（`0.4`〜`2.0`、デフォルト `1.0`）を追加し、`setBallSizeScale` アクション、スライド間補間（`interpolateBall`）、Konva `BallObject`、Canvas2D `renderBall`、およびボール選択時のミニ操作バー（`BallHud`）からサイズ変更できること
- [x] 4. マーカー下部ラベル表示の厳密化: `PlayerMarkerLabel` にて `markerType === 'ring'` のときも `bottomLabel`（`'name' | 'number' | 'none'`）の設定値通りに切り替わり、`none` 選択時に名前が残らないこと

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { getStagePitchAndNormPos } from '../utils/canvas-coordinates';
import { useCanvasStore } from './use-canvas-store';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/ball.ts
export const BallStateSchema = z.object({
  x: z.number(),
  y: z.number(),
  visible: z.boolean().default(true),
  sizeScale: z.number().min(0.4).max(2.0).default(1.0).optional(),
  trajectory: PlayerTrajectorySchema.optional(),
  locked: z.boolean().optional(),
});

// src/features/tactical-unified/stores/slide-ball-slice.ts
export interface SlideBallSlice {
  setBallPosition: (slideId: string, x: number, y: number) => void;
  setBallVisible: (slideId: string, visible: boolean) => void;
  setBallSizeScale: (slideId: string, sizeScale: number) => void;
  updateBallTrajectory: (
    slideId: string,
    trajectory: PlayerTrajectory | undefined,
  ) => void;
  setPitchPosition: (
    slideId: string,
    pos: { x: number; y: number } | undefined,
  ) => void;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
- **範囲選択の座標逆変換**: `useCanvasSelectionBox` では `const pitchTransform = useCanvasStore((s) => s.pitchTransform);` と `const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');` を取得する。`handleSelectionUp` では `getStagePitchAndNormPos({ x: minPxX, y: minPxY }, fullVRect, pitchTransform)` と `getStagePitchAndNormPos({ x: maxPxX, y: maxPxY }, fullVRect, pitchTransform)` を用いて正規化座標の最小・最大を算出する。また、ドラッグ背景判定 `isBg` は `Stage` だけでなく `listening={false}` をすり抜けた背景ノードでも動作するよう、オブジェクト（player, arrow, zone, text, ball）以外のクリックを背景として扱う。
- **ベンチ・非表示チームの除外**: `getEnclosedObjects(annotations, bbox, teamVisibility)` では `m.area !== 'bench'` かつ `teamVisibility === 'both' || m.team === teamVisibility || m.team === 'neutral'` の選手のみを選択対象とする。
- **BallHud**: `ContextHud.tsx` の `HUD_CONTENT_RENDERERS` に `['ball', () => <BallHud />]` を登録する。`BallHud` は `useTacticalUnifiedStoreContext` から `activeSlideId`, `selectActiveSlide` の `ball.sizeScale ?? 1.0`, `setBallSizeScale` を取得し、`0.5`〜`2.0`（step `0.1`）のスライダーと倍率表示を提供する。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 複数選手の範囲選択ドラッグ座標変換バグ修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/utils/geometry.ts`, `src/features/tactical-unified/core/utils/canvas-selection-helpers.ts`, `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts`, `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function getEnclosedObjects(
    annotations: AnnotationsData,
    bbox: NormBBox,
    teamVisibility?: 'both' | 'home' | 'away',
  ): SelectedObject[];
  ```
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` にて、(1) `pitchTransform`（`zoom: 1.5, panX: 80, panY: -40`）適用時にドラッグ範囲選択で視覚的に囲まれた選手が正確に選択されること、(2) `area: 'bench'` の選手や非表示チームの選手が範囲選択に混入しないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/utils/geometry.ts src/features/tactical-unified/core/utils/canvas-selection-helpers.ts src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` PASS
- **Worker Handoff Log**:
  - `getEnclosedObjects` に第3引数 `teamVisibility?: 'both' | 'home' | 'away'` を追加し `area === 'bench'` および非表示チームの選手を除外。
  - `useCanvasSelectionBox` で `selectionBoxRef` を導入し、`pitchTransform` 逆変換（`getStagePitchAndNormPos`）を適用。`getPointerCoordinates` に `stage.setPointersPositions` とコンテナ `getBoundingClientRect` フォールバックを追加。

---

### Phase 2: ボールサイズ（`sizeScale`）のスキーマ・ストア・補間・Canvas2D描画対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/ball.ts`, `src/features/tactical-unified/stores/slide-ball-slice.ts`, `src/lib/tactical/interpolation-ball.ts`, `src/lib/tactical/export/renderers/ball-renderer.ts`
- **契約 (Interface)**:
  ```ts
  export interface InterpolatedBallState {
    x: number;
    y: number;
    visible: boolean;
    opacity: number;
    rotation?: number;
    sizeScale?: number;
  }
  ```
- **Testing Strategy**: `src/lib/tactical/__tests__/unified-interpolation.test.ts`（または既存テスト）と `bun run ai:check` で、`setBallSizeScale` によるサイズ更新、`interpolateBall` での `sizeScale` 線形補間、`renderBall` での半径スケール反映を検証。
- **Tasks**:
  - [x] 1. TDD実装: スキーマ・ストア・補間・レンダラー実装 ➔ `bun run ai:check src/lib/types/tactical/ball.ts src/features/tactical-unified/stores/slide-ball-slice.ts src/lib/tactical/interpolation-ball.ts src/lib/tactical/export/renderers/ball-renderer.ts` PASS
- **Worker Handoff Log**:
  - `BallStateSchema` および `InterpolatedBallState` に `sizeScale` を追加し、`interpolateBall` で線形補間（単一側時も引き継ぎ）、`renderBall` で半径スケール乗算を実装。
  - `SlideBallSlice` に `setBallSizeScale(slideId, sizeScale)` を実装し、履歴記録・project更新・dirtyフラグ設定に対応。

---

### Phase 3: Konvaボールサイズ反映・BallHud新設・マーカー下部ラベル修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/objects/ball/components/ball-object.tsx`, `src/features/tactical-unified/core/components/hud/ball-hud.tsx`, `src/features/tactical-unified/core/components/hud/index.ts`, `src/features/tactical-unified/core/components/ContextHud.tsx`, `src/features/tactical-unified/objects/player/components/player-marker-label.tsx`, `src/features/tactical-unified/__tests__/context-hud.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function BallHud(): React.ReactElement | null;
  ```
- **Testing Strategy**: `src/features/tactical-unified/__tests__/context-hud.test.tsx` にて、(1) ボール選択時に `BallHud` が表示されスライダー操作で `sizeScale` が更新されること、(2) `PlayerMarkerLabel` で `bottomLabel: 'none'` のとき `markerType: 'ring'` でもラベルが非表示になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/context-hud.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/objects/ball/components/ball-object.tsx src/features/tactical-unified/core/components/hud/ball-hud.tsx src/features/tactical-unified/core/components/hud/index.ts src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/objects/player/components/player-marker-label.tsx src/features/tactical-unified/__tests__/context-hud.test.tsx` PASS
- **Worker Handoff Log**:
  - `BallHud` を新設して `ContextHud` の `HUD_CONTENT_RENDERERS` に `ball` 用レンダラーを登録。`BallObject` で `ball.sizeScale` を半径計算に乗算。
  - `PlayerMarkerLabel` で `bottomLabel === 'none'` 判定を早期 return に配置し、リングマーカー時もラベル非表示化を徹底。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-03
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  - `pitchTransform` 逆変換（`getStagePitchAndNormPos`）と `selectionBoxRef` によりズーム/パン状態での範囲選択を完全修復。
  - ボール `sizeScale` をスキーマ、ストア、補間、Konva、Canvas2D、BallHud の全レイヤーで一気通貫サポート。
  - `PlayerMarkerLabel` のリング型マーカー時のラベル非表示漏れを解消。全テスト PASS。

## 6. Rejections / Additional Tasks (不可逆修正欄)
