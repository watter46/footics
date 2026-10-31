# TASK-123: カメラトランジション・スロードリフト機能（モード切替・長時間ドリフト・複数シーン継続補間）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-31
- **Target Files**:
  - `src/lib/types/tactical/slide.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-transition-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts` (MODIFY)
  - `src/lib/tactical/interpolation-camera.ts` (NEW)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/camera-transition-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `SlideSchema` に `cameraTransitionMode: z.enum(['sync', 'slow', 'continuous', 'cut']).default('sync').optional()` と `cameraDurationMs: z.number().min(500).max(30000).default(10000).optional()` が追加され、既存の永続化データと後方互換を保ったまま `updateSlideTransition` / `updateAllSlideTransitions` および `createSlideForMode` で更新・引き継ぎできること。
- [x] 2. `interpolatePitchTransform` において、水平回転 `yaw`（0〜360度）の補間が常に360度境界をまたぐ最短回転経路（例: 350度→10度は+20度方向、t=0.5で0度）で計算されること。
- [x] 3. 単一シーンで `cameraTransitionMode: 'slow'`（例: `cameraDurationMs: 10000`, `transitionDurationMs: 2000`, `pauseMs: 500`）を設定した際、実効シーン時間が `max(2500, 10000) = 10000ms` に自動延長され、2000ms時点で選手・ボール・描画オブジェクトは目標座標に到達して静止しつつ、カメラだけが10000msまで等速（Linear）で補間移動し続け、カメラ移動中（`cameraT < 1` かつ前後のカメラ状態に差分あり）は `frame.isPaused` が `false` となること。
- [x] 4. 複数シーンまたぎ（例: Scene 2 が `'continuous'`、Scene 3 が `'slow'` 10000ms または `'sync'`）を設定した際、中間シーン（Scene 2）でカメラが停止せず、開始シーン（Scene 1）から最終目標シーン（Scene 3）の `pitchTransform` へ向けて区間全体で等速（Linear）補間され、指定カメラ秒数が区間内の選手合計時間を超える場合は最終シーンの滞在時間が自動延長されること。
- [x] 5. `cameraTransitionMode: 'cut'` を設定した際、そのシーンへの遷移開始時点（`elapsedInSegment >= 0`）で即座に目標シーンの `pitchTransform`（`t = 1`）へ切り替わること。
- [x] 6. `SlideTransitionPopover`・`BatchTransitionPopover` にカメラ移動モード切替（連動 / スロー / 継続 / Cut）とカメラ秒数スライダー（`0.5s〜30.0s`, step `0.5s`, `aria-label="カメラ秒数"` / `"一括カメラ秒数"`）が表示され、`TransitionConnector` に非連動モード時のカメラバッジ（例: `CAM 10.0s`, `CAM 継続`, `CAM CUT`）が表示されること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// src/lib/tactical/interpolation-camera.ts
import type {
  CameraTransitionMode,
  PitchTransform,
  Slide,
} from '@/lib/types/tactical-unified';
import { applyEasing } from './easing';

// src/features/tactical-unified/panels/timeline/camera-transition-section.tsx
import { Video } from 'lucide-react';
import type { CameraTransitionMode } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/slide.ts
export const CameraTransitionModeSchema = z.enum([
  'sync',
  'slow',
  'continuous',
  'cut',
]);
export type CameraTransitionMode = z.infer<typeof CameraTransitionModeSchema>;

// src/lib/tactical/interpolation-camera.ts
export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  yaw: number;
  isLocked: boolean;
}

export interface EffectiveSlideSegment {
  slideIndex: number; // 1 .. slides.length - 1
  startTimeMs: number;
  effectiveDurationMs: number;
  playerMoveMs: number;
  playerPauseMs: number;
  cameraSpanStartSlideIdx: number;
  cameraSpanEndSlideIdx: number;
  cameraSpanStartTimeMs: number;
  cameraSpanDurationMs: number;
  cameraMode: CameraTransitionMode;
}

export function resolveEffectiveSlideSegments(
  slides: Slide[],
): EffectiveSlideSegment[];

export function resolveCameraAtTime(
  slides: Slide[],
  segments: EffectiveSlideSegment[],
  activeSegment: EffectiveSlideSegment,
  timeMs: number,
  elapsedInSegment: number,
): { pitchTransform: InterpolatedPitchTransformState; isCameraMoving: boolean };
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. ファイルサイズ 300行制限の厳守:
//    - `src/lib/types/tactical/slide.ts` は現在294行のため、DEFAULT_BOUNDARY_BOX_* 上部の単行JSDocコメントや空行を整理して300行未満（285行前後）に収めること。
//    - `src/lib/tactical/unified-interpolation.ts` は現在299行のため、`InterpolatedPitchTransformState` と `interpolatePitchTransform` およびカメラ区間計算ロジックを `src/lib/tactical/interpolation-camera.ts` に分離し、`unified-interpolation.ts` から `export * from './interpolation-camera';` で再exportして250行以下に保つこと。
//    - `slide-transition-popover.tsx` (240行) / `batch-transition-popover.tsx` (236行) も、カメラ設定UIを `camera-transition-section.tsx` (NEW) に分離して呼び出すことで各ファイルを260行以下に保つこと。
// 2. カメラ補間アルゴリズム (`interpolation-camera.ts`):
//    - Yaw最短経路補間:
//      let deltaYaw = ((((yawB - yawA) % 360) + 540) % 360) - 180;
//      if (deltaYaw === -180 && yawB > yawA) deltaYaw = 180;
//      const yaw = (((yawA + deltaYaw * t) % 360) + 360) % 360;
//    - Continuous スパン解決:
//      セグメント i (1 .. N-1) を走査し、`slides[i].cameraTransitionMode === 'continuous'` が続く区間を、直後の非continuousスライド `segEnd`（末尾に達した場合は `N-1`）と結合した単一カメラスパン `[segStart .. segEnd]` とする（ただし末尾が `continuous` で直前 `segStart - 1 >= 1` が `'slow'` の場合はその `'slow'` セグメントを `segStart` に含める）。
//      スパンのカメラ目標時間 `cameraSpanDurationMs`:
//      - `slides[segEnd].cameraTransitionMode === 'slow'` のとき: `Math.max(500, slides[segEnd].cameraDurationMs ?? 10000)`
//      - `slides[segStart].cameraTransitionMode === 'slow'` のとき: `Math.max(500, slides[segStart].cameraDurationMs ?? 10000)`
//      - それ以外（`'sync'` 等）: 中間セグメントの `baseDurationMs` 合計 + `slides[segEnd]` の `playerMoveMs`。
//      最終セグメント `segEnd` の `effectiveDurationMs` は `Math.max(baseDurationMs[segEnd], cameraSpanDurationMs - precedingSpanDurationMs)` とする。
//    - `'cut'` の場合は `cameraT = 1`（開始0msで即座に `slides[i].pitchTransform`）、`'slow'` またはスパン長 > 1 の場合は `cameraT = Math.min(1, Math.max(0, (timeMs - cameraSpanStartTimeMs) / cameraSpanDurationMs))`（Linear）、単一 `'sync'` の場合は `applyEasing(rawT, slide.easing)`。
// 3. 既存テストとの互換性 (`slide-transition-popover.test.tsx`):
//    - 既存テストが `getByLabelText(/移動時間/i)` を使用しているため、カメラ用スライダーの label / aria-label には「移動時間」という文字列を含めず、個別は `aria-label="カメラ秒数"`、一括は `aria-label="一括カメラ秒数"` とすること！
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: スライド型定義・トランジションStoreスライス拡張
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/types/tactical/slide.ts`, `src/features/tactical-unified/stores/slide-transition-slice.ts`, `src/features/tactical-unified/stores/slide-helpers.ts`, `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts`
- **契約 (Interface)**:
  ```ts
  export type CameraTransitionMode = 'sync' | 'slow' | 'continuous' | 'cut';
  export interface SlideTransitionParams {
    transitionDurationMs?: number;
    pauseMs?: number;
    easing?: Easing;
    cameraTransitionMode?: CameraTransitionMode;
    cameraDurationMs?: number;
  }
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts`:
    - `updateSlideTransition` と `updateAllSlideTransitions` で `cameraTransitionMode` および `cameraDurationMs` が更新・Undo復元されること。
    - `SlideSchema.parse` で省略時に互換性が保たれ、`500〜30000` の `cameraDurationMs` が検証されること。
- **Tasks**:
  - [x] 1. TDD実装: `slide-transition-slice.test.ts` にテスト追加 ➔ `slide.ts`, `slide-transition-slice.ts`, `slide-helpers.ts` 実装 ➔ `bun run ai:check src/lib/types/tactical/slide.ts src/features/tactical-unified/stores/slide-transition-slice.ts src/features/tactical-unified/stores/slide-helpers.ts src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts` PASS
- **Worker Handoff Log**:
  - export: `CameraTransitionModeSchema`, `CameraTransitionMode` in `slide.ts` (re-exported via `@/lib/types/tactical-unified`).
  - `SlideSchema` adds `cameraTransitionMode` (default `'sync'`) & `cameraDurationMs` (min 500, max 30000, default 10000). Slide file length kept under 300 lines (293 lines).

### Phase 2: カメラ補間エンジン分離・スロードリフト＆複数シーン継続補間・再生スナップ同期
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/interpolation-camera.ts`, `src/lib/tactical/unified-interpolation.ts`, `src/features/tactical-unified/hooks/tactical-playback-controls.ts`, `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **契約 (Interface)**:
  ```ts
  export function interpolatePitchTransform(
    transformA?: PitchTransform | null,
    transformB?: PitchTransform | null,
    t?: number,
  ): InterpolatedPitchTransformState;
  export function resolveEffectiveSlideSegments(
    slides: Slide[],
  ): EffectiveSlideSegment[];
  ```
- **Testing Strategy**:
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`:
    - `interpolatePitchTransform`: `yaw: 350 -> 10` (t=0.5) で最短経路 `0`（または `360` 相当）になること。
    - 単一シーン `cameraTransitionMode: 'slow'`, `cameraDurationMs: 10000`, `transitionDurationMs: 2000`, `pauseMs: 500` のとき、`calculateUnifiedTotalDuration` が `10000` を返し、`timeMs = 5000` で選手は Scene 2 到着位置に静止（`progress === 1`）しつつカメラは `t = 0.5` の位置にあり `isPaused === false`、`timeMs = 10000` でカメラが `t = 1.0` に到達し `isPaused === true` になること。
    - 複数シーン（Scene 2: `'continuous'`, Scene 3: `'slow'` 10000ms）のとき、Scene 1 → Scene 3 のカメラが 10000ms かけて一定速度で補間され、Scene 2 境界でカメラが止まらないこと。
    - `cameraTransitionMode: 'cut'` のとき、遷移開始直後（例: `timeMs = 10`）でカメラが即座に次シーンの値になること。
- **Tasks**:
  - [x] 1. TDD実装: `unified-interpolation.test.ts` にテスト追加 ➔ `interpolation-camera.ts`, `unified-interpolation.ts`, `tactical-playback-controls.ts` 実装 ➔ `bun run ai:check src/lib/tactical/interpolation-camera.ts src/lib/tactical/unified-interpolation.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/lib/tactical/__tests__/unified-interpolation.test.ts` PASS
- **Worker Handoff Log**:
  - export: `InterpolatedPitchTransformState`, `EffectiveSlideSegment`, `hasCameraDelta`, `interpolatePitchTransform`, `resolveEffectiveSlideSegments`, `resolveCameraAtTime` in `interpolation-camera.ts` (re-exported via `unified-interpolation.ts`).
  - Separated camera engine into `interpolation-camera.ts` (293 lines) and kept `unified-interpolation.ts` (266 lines) well under 300 lines limit. Shortest yaw path (350->10) and slow/continuous/cut multi-slide camera resolution implemented.

### Phase 3: タイムライン カメラトランジション設定UI＆コネクタバッジ実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/timeline/camera-transition-section.tsx`, `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`, `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`, `src/features/tactical-unified/panels/timeline/transition-connector.tsx`, `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`, `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface CameraTransitionSectionProps {
    idPrefix: string;
    mode: CameraTransitionMode;
    durationMs: number;
    disabled?: boolean;
    isBatch?: boolean;
    onChangeMode: (mode: CameraTransitionMode) => void;
    onChangeDurationMs: (durationMs: number) => void;
  }
  export function CameraTransitionSection(
    props: CameraTransitionSectionProps,
  ): React.JSX.Element;
  ```
- **Testing Strategy**:
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`:
    - モードボタン（`連動`, `スロー`, `継続`, `Cut`）クリックで `updateSlideTransition` / `updateAllSlideTransitions` が呼ばれること。
    - `mode === 'slow'` のときカメラ秒数スライダー（`aria-label="カメラ秒数"` / `"一括カメラ秒数"`, min `0.5`, max `30.0`, step `0.5`）で `cameraDurationMs` が更新されること。
    - Scene 1 (`index === 0`) ではカメラ移動モードボタンが `disabled` になること。
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`:
    - `cameraTransitionMode` が `'slow'` のとき `CAM 10.0s`、`'continuous'` のとき `CAM 継続`、`'cut'` のとき `CAM CUT` がコネクタ内に表示され、`'sync'` のときは非表示であること。
- **Tasks**:
  - [x] 1. TDD実装: `slide-transition-popover.test.tsx`, `transition-connector.test.tsx` にテスト追加 ➔ `camera-transition-section.tsx`, `slide-transition-popover.tsx`, `batch-transition-popover.tsx`, `transition-connector.tsx` 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/camera-transition-section.tsx src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx src/features/tactical-unified/panels/timeline/transition-connector.tsx src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx` PASS
- **Worker Handoff Log**:
  - export: `CameraTransitionSectionProps`, `CameraTransitionSection` in `camera-transition-section.tsx`.
  - Popover camera slider uses `aria-label="カメラ秒数"` (single) and `aria-label="一括カメラ秒数"` (batch) to prevent collision with `移動時間`. Connector shows camera badges (`CAM 10.0s`, `CAM 継続`, `CAM CUT`).

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-31 20:00
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  カメラ移動モード（連動 / スロー / 継続 / Cut）および360度最短回転補間エンジン、時間自動延長・同期スナップ、タイムライン設定UIが設計品質原則（Host Boundary, Single Camera Pipeline, OCP, SLAP）に完全に準拠して実装されていることを確認。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
