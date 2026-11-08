# TASK-164: ディレクターモード疑似マルチカメラ（2トラック合成）＆リアルタイムシークバーUIの実装

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-08
- **Target Files**:
  - `src/lib/types/tactical/project.ts` (MODIFY)
  - `src/lib/tactical/interpolation-camera.ts` (MODIFY)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts` (MODIFY)
  - `src/features/tactical-unified/stores/pitch-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/types/tactical/project.ts` に `GlobalCameraKeyframeSchema`, `ActionCameraCueSchema`, `DirectorCameraTrackSchema` が定義され、`TacticalPhaseSchema` にオプショナルで `directorCamera: DirectorCameraTrackSchema.optional()` が追加されていること。
- [x] 2. `src/lib/tactical/interpolation-camera.ts` に `resolveSyntheticDirectorCamera(track, timeMs, totalDurationMs)` が実装され、全体カメラ（Tilt/Yaw の360度最短経路補間）とアクションカメラ（Zoom/Pan の `autoReturn: false` 維持モードおよび `autoReturn: true` 自動復帰モード）を単一の `InterpolatedPitchTransformState` に合成解決できること。
- [x] 3. `getInterpolatedUnifiedSlideFrame(slides, timeMs, directorCamera?)` および `resolveCameraAtTime(..., directorCamera?)` が `directorCamera?.enabled && (directorCamera.globalKeyframes.length > 0 || directorCamera.actionCues.length > 0)` のときに `resolveSyntheticDirectorCamera` を使用し、未設定または空のときは既存のスライド単位 `pitchTransform` 補間にフォールバックすること。
- [x] 4. `PitchSlice` (`src/features/tactical-unified/stores/pitch-slice.ts`) に `upsertGlobalCameraKeyframe`, `deleteGlobalCameraKeyframe`, `upsertActionCameraCue`, `deleteActionCameraCue` が追加され、アクティブPhaseの `directorCamera` をイミュータブルかつ履歴記録付きで更新できること。
- [x] 5. `TacticalSplitPreviewPanel` において、3Dプレビュー上の左ドラッグ（Tilt/Yaw オービット）は `upsertGlobalCameraKeyframe(currentTimeMs, { tilt, yaw })` を呼び出し、Shift+左ドラッグ（Pan）およびホイール（Zoom）は `upsertActionCameraCue(currentTimeMs, { zoom, panX, panY })` を呼び出して現在シーク時刻（`playbackSeekTimeMs ?? 0`）のカメラトラックへ振り分けられること。
- [x] 6. `useExportPreviewAnimation` および `renderTacticalFrameToCanvas` がアクティブPhaseの `directorCamera` を受け取り、再生中・シーク中・静止中のいずれにおいても `resolveSyntheticDirectorCamera` の結果で3Dキャンバスを再描画すること。
- [x] 7. `DirectorCameraTimeline` (`director-camera-timeline.tsx`) が実装され、上部リアルタイム・シークバー（Scrubber）、中段「① 全体カメラトラック（Global Camera: Tilt / Yaw）」、下段「② アクションカメラトラック（Action Camera: Zoom / Pan、秒数チップ `0.5s`/`1.0s`/`2.0s`/`3.0s`、自動で戻る `autoReturn` トグル、削除ボタン）」を備えること。
- [x] 8. `TimelineBar` (`timeline-bar.tsx`) が `workspaceMode === 'director'` のとき、中央領域にスライドカード一覧ではなく `<DirectorCameraTimeline />` を表示すること（左側の `PlaybackControls` は共通利用）。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一カメラ射影パイプラインの維持**: 描画・書き出しエンジン（`tactical-frame-renderer.ts`, `matrix-mvp-engine.ts`）に渡す最終型は単一の `InterpolatedPitchTransformState`（`{ tilt, yaw, zoom, panX, panY, isLocked }`）を維持し、合成は補間解決層（`interpolation-camera.ts`）で完結させること（下流レンダラーの破壊防止）。
  2. **ホスト境界・Store Provider 厳守 (Level 2 / Level 3)**: 新規タイムライン・カメラ制御コンポーネントはすべて `useTacticalUnifiedStoreContext` 経由で状態を取得し、グローバルシングルトン（`useTacticalUnifiedStore` 直呼び出し）を禁止して初期マウント時のチラつき（Flicker）を起こさないこと。
  3. **後方互換性の保証**: `TacticalPhaseSchema` にオプショナルで `directorCamera?: DirectorCameraTrack` を追加し、未設定（またはピン・Cueが空）の既存プロジェクトデータは従来のスライド単位 `pitchTransform` 補間にフォールバックすること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/unified-interpolation.ts` & `src/lib/tactical/interpolation-camera.ts`: `getInterpolatedUnifiedSlideFrame` / `resolveCameraAtTime` に `directorCamera?: DirectorCameraTrack | null` を追加（オプショナル引数とし既存呼び出し元のシグネチャ互換性を100%維持）。
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` & `src/lib/tactical/export/tactical-frame-renderer.ts`: `directorCamera?: DirectorCameraTrack | null` をオプションに追加し、アクティブPhaseの `directorCamera` が存在・有効な場合は静止時・再生時ともに合成カメラで描画。
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`: 3Dプレビュー上のマウス操作（左ドラッグ＝全体カメラのTilt/Yaw更新、Shift+左ドラッグ＝アクションカメラのPan更新、ホイール＝アクションカメラのZoom更新）を現在シーク時刻（`currentTimeMs`）のカメラトラックへ振り分ける（合わせて従来の `updatePitchTransform(activeSlide.id, ...)` も後方互換のため同期または維持）。
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`: `workspaceMode === 'director'` のとき、スライドカード並びの代わりに `<DirectorCameraTimeline />` を描画する。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// Types & Schemas
import { z } from 'zod';
import { EasingSchema, type Easing, type PitchTransform, type Slide } from './slide';
import type {
  ActionCameraCue,
  DirectorCameraTrack,
  GlobalCameraKeyframe,
  TacticalPhase,
} from '@/lib/types/tactical-unified';

// Interpolation
import { applyEasing } from './easing';
import {
  calculateUnifiedTotalDuration,
  getInterpolatedUnifiedSlideFrame,
  resolveSyntheticDirectorCamera,
  type InterpolatedPitchTransformState,
} from '@/lib/tactical/unified-interpolation';

// Store & Selectors
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  selectActivePhase,
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
  selectActivePhaseSlides,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/types/tactical/project.ts に追加するスキーマと型（src/lib/types/tactical-unified.ts から自動で re-export される）
export const GlobalCameraKeyframeSchema = z.object({
  id: z.string(),
  timeMs: z.number().min(0),
  tilt: z.number().min(0).max(65),
  yaw: z.number(),
  easing: EasingSchema.default('ease-in-out').optional(),
});
export type GlobalCameraKeyframe = z.infer<typeof GlobalCameraKeyframeSchema>;

export const ActionCameraCueSchema = z.object({
  id: z.string(),
  startTimeMs: z.number().min(0),
  durationMs: z.number().min(100).default(1000),
  holdMs: z.number().min(0).default(0).optional(),
  returnDurationMs: z.number().min(100).default(800).optional(),
  zoom: z.number().min(0.4).max(3.0),
  panX: z.number(),
  panY: z.number(),
  autoReturn: z.boolean().default(false),
  easing: EasingSchema.default('ease-in-out').optional(),
});
export type ActionCameraCue = z.infer<typeof ActionCameraCueSchema>;

export const DirectorCameraTrackSchema = z.object({
  enabled: z.boolean().default(true),
  globalKeyframes: z.array(GlobalCameraKeyframeSchema).default([]),
  actionCues: z.array(ActionCameraCueSchema).default([]),
});
export type DirectorCameraTrack = z.infer<typeof DirectorCameraTrackSchema>;
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// src/lib/tactical/interpolation-camera.ts:81-85 (Yaw 360度最短経路補間パターン)
let deltaYaw = ((((yawB - yawA) % 360) + 540) % 360) - 180;
if (deltaYaw === -180 && yawB > yawA) deltaYaw = 180;
const rawYaw = yawA + deltaYaw * t;
const yaw = ((rawYaw % 360) + 360) % 360;

// src/features/tactical-unified/stores/slide-playback-slice.ts:55-60 (seekTo アクション)
playbackSeekTimeMs: null,
playbackSeekId: 0,
seekTo: (playbackSeekTimeMs) => set((state) => ({
  playbackSeekTimeMs,
  playbackSeekId: state.playbackSeekId + 1,
})),
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: 疑似マルチカメラ（合成カメラ）スキーマ＆補間エンジン実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/project.ts`
  - `src/lib/tactical/interpolation-camera.ts`
  - `src/lib/tactical/unified-interpolation.ts`
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`
- **契約 (Exact Contract & Formula)**:
  1. **`src/lib/types/tactical/project.ts`**:
     - `EasingSchema` を `./slide` から import し、Section 3.2 の `GlobalCameraKeyframeSchema`, `ActionCameraCueSchema`, `DirectorCameraTrackSchema` とそれぞれの型（`GlobalCameraKeyframe`, `ActionCameraCue`, `DirectorCameraTrack`）を定義・export する。
     - `TacticalPhaseSchema` に `directorCamera: DirectorCameraTrackSchema.optional()` を追加する。
  2. **`src/lib/tactical/interpolation-camera.ts`**:
     - `hasActiveDirectorCameraTrack(track?: DirectorCameraTrack | null): boolean` を実装・export する:
       ```ts
       export function hasActiveDirectorCameraTrack(
         track?: DirectorCameraTrack | null,
       ): track is DirectorCameraTrack {
         if (!track || !track.enabled) return false;
         return (
           (track.globalKeyframes?.length ?? 0) > 0 ||
           (track.actionCues?.length ?? 0) > 0
         );
       }
       ```
     - `resolveSyntheticDirectorCamera(track: DirectorCameraTrack, timeMs: number, _totalDurationMs?: number): InterpolatedPitchTransformState` を実装・export する:
       - **① 全体カメラ (Tilt / Yaw)**:
         - `const sortedGlobal = [...(track.globalKeyframes ?? [])].sort((a, b) => a.timeMs - b.timeMs);`
         - `sortedGlobal.length === 0` のとき: `tilt = 0, yaw = 90`
         - `sortedGlobal.length === 1` または `timeMs <= sortedGlobal[0].timeMs` のとき: `tilt = sortedGlobal[0].tilt, yaw = ((sortedGlobal[0].yaw % 360) + 360) % 360`
         - `timeMs >= sortedGlobal[sortedGlobal.length - 1].timeMs` のとき: 末尾要素の `tilt, yaw`
         - それ以外（`kfA.timeMs <= timeMs <= kfB.timeMs` となる隣接ペア `kfA, kfB`）:
           - `const span = Math.max(1, kfB.timeMs - kfA.timeMs);`
           - `const rawT = Math.min(1, Math.max(0, (timeMs - kfA.timeMs) / span));`
           - `const easeT = applyEasing(rawT, kfB.easing ?? 'ease-in-out');`
           - `tilt = kfA.tilt + (kfB.tilt - kfA.tilt) * easeT;`
           - `let deltaYaw = ((((kfB.yaw - kfA.yaw) % 360) + 540) % 360) - 180;`
           - `if (deltaYaw === -180 && kfB.yaw > kfA.yaw) deltaYaw = 180;`
           - `yaw = (((kfA.yaw + deltaYaw * easeT) % 360) + 360) % 360;`
       - **② アクションカメラ (Zoom / Pan)**:
         - `const sortedCues = [...(track.actionCues ?? [])].sort((a, b) => a.startTimeMs - b.startTimeMs);`
         - 初期基準値 `let zoom = 1, panX = 0, panY = 0;`
         - `for (const cue of sortedCues)` で先頭から時刻順に評価する:
           - `if (timeMs < cue.startTimeMs) break;`
           - 遷移開始前の状態 `const fromZoom = zoom, fromPanX = panX, fromPanY = panY;`
           - `const moveDur = Math.max(100, cue.durationMs ?? 1000);`
           - `const moveEnd = cue.startTimeMs + moveDur;`
           - `if (timeMs <= moveEnd)`:
             - `const rawT = Math.min(1, Math.max(0, (timeMs - cue.startTimeMs) / moveDur));`
             - `const easeT = applyEasing(rawT, cue.easing ?? 'ease-in-out');`
             - `zoom = fromZoom + (cue.zoom - fromZoom) * easeT;`
             - `panX = fromPanX + (cue.panX - fromPanX) * easeT;`
             - `panY = fromPanY + (cue.panY - fromPanY) * easeT;`
             - `break;`
           - `timeMs > moveEnd` のとき:
             - まず目標値に到達: `zoom = cue.zoom; panX = cue.panX; panY = cue.panY;`
             - `if (cue.autoReturn)`（自動復帰モード）の場合:
               - `const holdMs = Math.max(0, cue.holdMs ?? 0);`
               - `const holdEnd = moveEnd + holdMs;`
               - `const returnDur = Math.max(100, cue.returnDurationMs ?? 800);`
               - `const returnEnd = holdEnd + returnDur;`
               - `if (timeMs <= holdEnd)` のときは目標値を維持（次のCueが開始していなければそのまま）。
               - `else if (timeMs <= returnEnd)` のとき:
                 - `const rawReturnT = Math.min(1, Math.max(0, (timeMs - holdEnd) / returnDur));`
                 - `const easeReturnT = applyEasing(rawReturnT, cue.easing ?? 'ease-in-out');`
                 - `zoom = cue.zoom + (1 - cue.zoom) * easeReturnT;`
                 - `panX = cue.panX + (0 - cue.panX) * easeReturnT;`
                 - `panY = cue.panY + (0 - cue.panY) * easeReturnT;`
               - `else`（`timeMs > returnEnd`）のとき:
                 - 基準値へ完全復帰: `zoom = 1; panX = 0; panY = 0;`
             - `autoReturn === false`（維持モード）の場合は `zoom = cue.zoom; panX = cue.panX; panY = cue.panY;` が維持されたまま次のループ（次のCue評価）へ進む。
       - 戻り値: `{ tilt, yaw, zoom, panX, panY, isLocked: true }`
     - `resolveCameraAtTime` に第6引数 `directorCamera?: DirectorCameraTrack | null` を追加し、`hasActiveDirectorCameraTrack(directorCamera)` が true の場合は `{ pitchTransform: resolveSyntheticDirectorCamera(directorCamera, timeMs), isCameraMoving: false }` を返す。
  3. **`src/lib/tactical/unified-interpolation.ts`**:
     - `getInterpolatedUnifiedSlideFrame(slides: Slide[], timeMs: number, directorCamera?: DirectorCameraTrack | null): InterpolatedUnifiedFrame` にオプショナル引数 `directorCamera` を追加する。
     - `slides.length === 1` の分岐でも `hasActiveDirectorCameraTrack(directorCamera)` が true なら `pitchTransform: resolveSyntheticDirectorCamera(directorCamera, timeMs, 0)` を使用し、複数スライド時も `resolveCameraAtTime(slides, segments, activeSegment, timeMs, elapsedInSegment, directorCamera)` に渡す。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/lib/tactical/__tests__/unified-interpolation.test.ts`
  - 以下の具体的な入力値と期待出力値を検証する単体テストを追加すること:
    1. `globalKeyframes`: `[ { id: 'g1', timeMs: 0, tilt: 0, yaw: 90, easing: 'linear' }, { id: 'g2', timeMs: 4000, tilt: 40, yaw: 70, easing: 'linear' } ]` のとき、`resolveSyntheticDirectorCamera(track, 2000, 4000)` で `tilt === 20, yaw === 80` になること（3点以上でも区間ごとに正しく補間されること）。
    2. `actionCues` (`autoReturn: false` 維持モード): `[ { id: 'a1', startTimeMs: 1000, durationMs: 1000, zoom: 2.0, panX: 100, panY: -50, autoReturn: false, easing: 'linear' } ]` のとき、`timeMs = 1500` で `zoom === 1.5, panX === 50, panY === -25`、`timeMs = 3000`（終了後）でも `zoom === 2.0, panX === 100, panY === -50` が維持されること。
    3. `actionCues` (`autoReturn: true` 自動復帰モード): `[ { id: 'a2', startTimeMs: 1000, durationMs: 1000, holdMs: 500, returnDurationMs: 1000, zoom: 2.0, panX: 100, panY: 0, autoReturn: true, easing: 'linear' } ]` のとき、`timeMs = 2250`（hold中）で `zoom === 2.0, panX === 100`、`timeMs = 3000`（復帰50%）で `zoom === 1.5, panX === 50`、`timeMs = 3500` で `zoom === 1.0, panX === 0` に戻ること。
    4. `getInterpolatedUnifiedSlideFrame(slides, 1500, directorCamera)` に `directorCamera` を渡したとき合成カメラが優先され、未指定（`undefined`）のときは従来のスライド `pitchTransform` 補間にフォールバックすること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check src/lib/tactical/__tests__/unified-interpolation.test.ts` で RED 確認 ➔ `project.ts`, `interpolation-camera.ts`, `unified-interpolation.ts` を実装 ➔ `bun run ai:check src/lib/types/tactical/project.ts src/lib/tactical/interpolation-camera.ts src/lib/tactical/unified-interpolation.ts src/lib/tactical/__tests__/unified-interpolation.test.ts` PASS
- **Worker Handoff Log**:
  - `GlobalCameraKeyframeSchema`, `ActionCameraCueSchema`, `DirectorCameraTrackSchema` と各型を export。
  - `hasActiveDirectorCameraTrack`, `resolveSyntheticDirectorCamera` を `interpolation-director.ts` に実装し `interpolation-camera.ts` および `unified-interpolation.ts` から re-export。


---

### Phase 2: Store アクション＆3Dプレビュー操作の自動振り分け連動
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/pitch-slice.ts`
  - `src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. **Store アクション追加 (`src/features/tactical-unified/stores/pitch-slice.ts`)**:
     - `PitchSlice` インターフェースおよび `createPitchSlice` に以下の4アクションを追加する（すべてアクティブPhase `s.activePhaseId` の `directorCamera` を更新し、`recordHistory(s)` と `isDirty: true` を付与する）:
       - `upsertGlobalCameraKeyframe: (timeMs: number, patch: { tilt?: number; yaw?: number; easing?: Easing }, keyframeId?: string) => void`
         - アクティブPhaseの `directorCamera`（未定義なら `{ enabled: true, globalKeyframes: [], actionCues: [] }`）を取得。
         - 対象の特定: `keyframeId` が指定されていれば `kf.id === keyframeId`、未指定なら `Math.abs(kf.timeMs - timeMs) <= 150` を満たす既存ピンを探す。
         - 既存ピンが見つかった場合: そのピンの `timeMs`（`keyframeId` 指定時かつ `timeMs >= 0` なら `Math.round(timeMs)` に更新、未指定スナップ時は既存 `kf.timeMs` 維持）および `tilt, yaw, easing` を `patch` でマージ更新し、`timeMs` 昇順でソートする。
         - 既存ピンが見つからない場合:
           - もし現在 `globalKeyframes.length === 0` かつ `timeMs > 150` であれば、アクティブスライドの初期姿勢（`tilt: activeSlide?.pitchTransform?.tilt ?? 0, yaw: activeSlide?.pitchTransform?.yaw ?? 90, easing: 'ease-in-out'`）で `timeMs: 0` の初期ピン `{ id: 'gkf-init-0', timeMs: 0, tilt: ..., yaw: ..., easing: 'ease-in-out' }` も自動生成して配列に加える。
           - 新規ピン `{ id: keyframeId ?? \`gkf-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, timeMs: Math.max(0, Math.round(timeMs)), tilt: patch.tilt ?? 0, yaw: patch.yaw ?? 90, easing: patch.easing ?? 'ease-in-out' }` を追加し、`timeMs` 昇順でソートする。
       - `deleteGlobalCameraKeyframe: (keyframeId: string) => void`
         - `globalKeyframes.filter((kf) => kf.id !== keyframeId)` で削除する。
       - `upsertActionCameraCue: (startTimeMs: number, patch: Partial<Omit<ActionCameraCue, 'id'>>, cueId?: string) => void`
         - 対象の特定: `cueId` が指定されていれば `c.id === cueId`、未指定なら現在時刻 `startTimeMs` が `[c.startTimeMs - 150, c.startTimeMs + (c.durationMs ?? 1000) + (c.autoReturn ? (c.holdMs ?? 0) + (c.returnDurationMs ?? 800) : 0)]` の範囲に含まれる既存 Cue（複数あれば最も近いもの）を探す。
         - 既存 Cue が見つかった場合: `patch`（`startTimeMs`, `durationMs`, `holdMs`, `returnDurationMs`, `zoom`, `panX`, `panY`, `autoReturn`, `easing`）をマージ更新し、`startTimeMs` 昇順でソートする。
         - 既存 Cue が見つからない場合: 新規 Cue `{ id: cueId ?? \`acue-\${Date.now()}-\${Math.random().toString(36).slice(2, 6)}\`, startTimeMs: Math.max(0, Math.round(startTimeMs)), durationMs: patch.durationMs ?? 1000, holdMs: patch.holdMs ?? 0, returnDurationMs: patch.returnDurationMs ?? 800, zoom: patch.zoom ?? 1.3, panX: patch.panX ?? 0, panY: patch.panY ?? 0, autoReturn: patch.autoReturn ?? false, easing: patch.easing ?? 'ease-in-out' }` を追加し、`startTimeMs` 昇順でソートする。
       - `deleteActionCameraCue: (cueId: string) => void`
         - `actionCues.filter((c) => c.id !== cueId)` で削除する。
  2. **プレビュー＆描画エンジン連動 (`tactical-frame-renderer.ts`, `use-export-preview-animation.ts`)**:
     - `RenderTacticalFrameOptions` (`tactical-frame-renderer.ts`) に `directorCamera?: DirectorCameraTrack | null` を追加し、内部の `getInterpolatedUnifiedSlideFrame(slides, timeMs, directorCamera)` 呼び出し（2箇所: 行93付近および行124付近）に渡す。
     - `UseExportPreviewAnimationParams` (`use-export-preview-animation.ts`) に `directorCamera?: DirectorCameraTrack | null` を追加する。
     - `useExportPreviewAnimation` 内の `mvpMatrix` メモ計算において、`hasActiveDirectorCameraTrack(directorCamera)` が true のとき（かつドラッグオーバーライド `pitchTransform` が渡されていないとき）は `mvpMatrix` を `null` にし、`renderTacticalFrameToCanvas` 内の `getInterpolatedUnifiedSlideFrame(slides, timeMs, directorCamera)` が計算した時刻別合成カメラで3D射影されるようにする（ドラッグ中など明示的に `pitchTransform` が渡されている場合はその `pitchTransform` で即時プレビューする）。
     - `useExportPreviewAnimation` の `drawFrame` から `renderTacticalFrameToCanvas` に `directorCamera` を渡し、静止時再描画の `useEffect` 依存配列にも `directorCamera` を含める。
  3. **3Dプレビュー操作振り分け (`src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx`)**:
     - Store Context から `activePhase = useTacticalUnifiedStoreContext(selectActivePhase)`、`playbackSeekTimeMs = useTacticalUnifiedStoreContext((s) => s.playbackSeekTimeMs)`、`upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext((s) => s.upsertGlobalCameraKeyframe)`、`upsertActionCameraCue = useTacticalUnifiedStoreContext((s) => s.upsertActionCameraCue)` を取得する。
     - 現在シーク時刻 `const currentTimeMs = playbackSeekTimeMs ?? 0;` とし、現在時刻における合成カメラ状態 `resolvedCamera`（`hasActiveDirectorCameraTrack(activePhase?.directorCamera)` なら `resolveSyntheticDirectorCamera(activePhase!.directorCamera!, currentTimeMs)`、そうでなければ `activeSlide?.pitchTransform`）をドラッグ開始時の基準値 `initialTransform` に使用する。
     - `useExportPreviewAnimation` に `directorCamera: activePhase?.directorCamera ?? null` を渡し、`pitchTransform` には `isPlaying ? null : (dragPitchTransform ?? (hasActiveDirectorCameraTrack(activePhase?.directorCamera) ? null : (activeSlide?.pitchTransform ?? null)))` を渡す。
     - ドラッグ種別を `dragModeRef = useRef<'orbit' | 'pan' | null>(null)` で記録する（`handlePointerMove` で `e.shiftKey` なら `'pan'`、Shiftなしなら `'orbit'`）。
     - `handlePointerUp`:
       - `dragModeRef.current === 'pan'` の場合: `upsertActionCameraCue(currentTimeMs, { panX: latest.panX, panY: latest.panY, zoom: latest.zoom })` を呼び出す（後方互換のため `updatePitchTransform(activeSlide.id, latest)` も併せて呼ぶ）。
       - `dragModeRef.current === 'orbit'` の場合: `upsertGlobalCameraKeyframe(currentTimeMs, { tilt: latest.tilt, yaw: latest.yaw })` を呼び出す（後方互換のため `updatePitchTransform(activeSlide.id, latest)` も併せて呼ぶ）。
     - `handleWheel`:
       - `currentZoom` を `resolvedCamera?.zoom ?? activeSlide.pitchTransform?.zoom ?? 1` から計算し、`nextZoom = Math.max(0.4, Math.min(3.0, +(currentZoom - e.deltaY * 0.0015).toFixed(2)))` を算出した上で、`upsertActionCameraCue(currentTimeMs, { zoom: nextZoom, panX: resolvedCamera?.panX ?? 0, panY: resolvedCamera?.panY ?? 0 })` および `updatePitchTransform(activeSlide.id, { zoom: nextZoom })` を呼び出す。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル: `src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx`
  - 検証ケース:
    1. 3Dプレビューキャンバス上で左ドラッグ（Shiftなし、`clientX: 100, clientY: 100` ➔ `clientX: 150, clientY: 60`）して PointerUp したとき、アクティブPhaseの `directorCamera.globalKeyframes` に新しい全体カメラピン（`tilt: 10, yaw: 110`）が追加・更新されること。
    2. 3Dプレビューキャンバス上で Shift+左ドラッグ（`shiftKey: true`, `clientX: 100, clientY: 100` ➔ `clientX: 140, clientY: 80`）して PointerUp したとき、アクティブPhaseの `directorCamera.actionCues` に `panX: 40, panY: -20` のアクションカメラCueが追加・更新されること。
    3. 3Dプレビューキャンバス上でホイール操作（`deltaY: -100`）したとき、アクティブPhaseの `directorCamera.actionCues` に `zoom: 1.15` のアクションカメラCueが追加・更新されること。
- **Tasks**:
  - [x] 1. TDD実装: `tactical-split-preview-panel.test.tsx` にテストケース追加（RED） ➔ `pitch-slice.ts`, `tactical-frame-renderer.ts`, `use-export-preview-animation.ts`, `tactical-split-preview-panel.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/stores/pitch-slice.ts src/lib/tactical/export/tactical-frame-renderer.ts src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/split-preview/tactical-split-preview-panel.tsx src/features/tactical-unified/panels/split-preview/__tests__/tactical-split-preview-panel.test.tsx` PASS
- **Worker Handoff Log**:
  - `PitchSlice` に `upsertGlobalCameraKeyframe`, `deleteGlobalCameraKeyframe`, `upsertActionCameraCue`, `deleteActionCameraCue` を追加（`director-camera-actions.ts` に分割実装）。
  - `TacticalSplitPreviewPanel` の左ドラッグ（Tilt/Yaw）、Shift+左ドラッグ（Pan）、Wheel（Zoom）を現在シーク時刻のカメラトラック（`directorCamera`）へ自動振り分け連動。


---

### Phase 3: ディレクター専用タイムラインUI（リアルタイムシークバー＋2段カメラトラック）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
- **契約 (Exact Contract & Formula)**:
  1. **`DirectorCameraTimeline` コンポーネント (`src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx`)**:
     - **階層配置**: Level 2 / Level 3 Domain UI パネル。状態はすべて `useTacticalUnifiedStoreContext` 経由で取得する（`useTacticalUnifiedStore` 直呼び出し禁止）。
     - **取得する Store 状態・アクション**:
       - `slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides)`
       - `activePhase = useTacticalUnifiedStoreContext(selectActivePhase)`
       - `playbackSeekTimeMs = useTacticalUnifiedStoreContext((s) => s.playbackSeekTimeMs)`
       - `seekTo = useTacticalUnifiedStoreContext((s) => s.seekTo)`
       - `upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext((s) => s.upsertGlobalCameraKeyframe)`
       - `deleteGlobalCameraKeyframe = useTacticalUnifiedStoreContext((s) => s.deleteGlobalCameraKeyframe)`
       - `upsertActionCameraCue = useTacticalUnifiedStoreContext((s) => s.upsertActionCameraCue)`
       - `deleteActionCameraCue = useTacticalUnifiedStoreContext((s) => s.deleteActionCameraCue)`
     - **時間計算**:
       - `const totalDurationMs = Math.max(1000, calculateUnifiedTotalDuration(slides));`
       - `const currentTimeMs = Math.min(totalDurationMs, Math.max(0, playbackSeekTimeMs ?? 0));`
       - `const directorCamera = activePhase?.directorCamera;`
       - `const globalKeyframes = directorCamera?.globalKeyframes ?? [];`
       - `const actionCues = directorCamera?.actionCues ?? [];`
     - **UI構造と data-testid / 操作仕様**:
       - ルート要素: `<div data-testid="director-camera-timeline" className="flex flex-col gap-1.5 flex-1 min-w-0 py-1 px-2 select-none">`
       - **上段：リアルタイム・シークバー（Scrubber）＋クイック追加ヘッダー**:
         - 現在時刻表示 `<span data-testid="director-scrubber-time">{(currentTimeMs / 1000).toFixed(1)}s / {(totalDurationMs / 1000).toFixed(1)}s</span>`
         - シークスライダー `<input type="range" data-testid="director-scrubber-input" min={0} max={totalDurationMs} step={50} value={Math.round(currentTimeMs)} onChange={(e) => seekTo(Number(e.target.value))} />`
         - 「＋全体ピン追加」ボタン (`data-testid="add-global-keyframe-btn"`): クリックで現在の合成カメラ姿勢を取得し `upsertGlobalCameraKeyframe(currentTimeMs, { tilt: currentResolved.tilt, yaw: currentResolved.yaw })` を発火。
         - 「＋アクション追加」ボタン (`data-testid="add-action-cue-btn"`): クリックで `upsertActionCameraCue(currentTimeMs, { durationMs: 1000, zoom: 1.5, panX: 0, panY: 0, autoReturn: false })` を発火。
       - **中段：① 全体カメラトラック（Global Camera: Tilt / Yaw）**:
         - トラックコンテナ (`data-testid="global-camera-track"`, `relative h-5 bg-[#0D0D0E] rounded border border-white/[0.07]`):
         - 各 `kf` (`globalKeyframes`) を `style={{ left: \`\${Math.min(100, Math.max(0, (kf.timeMs / totalDurationMs) * 100))}%\` }}` の位置にピンボタン (`data-testid={\`global-kf-pin-\${kf.id}\`}`) として表示（ラベルまたは ◆ アイコン）。
         - ピンをクリックすると選択状態 (`selectedGlobalId`) になり、`seekTo(kf.timeMs)` を発火する。
         - 選択中の全体ピンがある場合は、ヘッダーまたはインラインに削除ボタン (`data-testid="delete-global-keyframe-btn"`) を表示し、クリックで `deleteGlobalCameraKeyframe(selectedGlobalId)` を発火する。
       - **下段：② アクションカメラトラック（Action Camera: Zoom / Pan）**:
         - トラックコンテナ (`data-testid="action-camera-track"`, `relative h-6 bg-[#0D0D0E] rounded border border-white/[0.07]`):
         - 各 `cue` (`actionCues`) を開始位置 `leftPct = Math.min(100, Math.max(0, (cue.startTimeMs / totalDurationMs) * 100))`、幅 `widthPct = Math.min(100 - leftPct, Math.max(4, (cue.durationMs / totalDurationMs) * 100))` の演出ブロックボタン (`data-testid={\`action-cue-block-\${cue.id}\`}`) として表示。
         - ブロックをクリックすると選択状態 (`selectedCueId`) になり、`seekTo(cue.startTimeMs)` を発火する。
         - 選択中のアクションCue（`selectedCue`）が存在する場合、コントロールバーを表示:
           - 秒数チップ (`[500, 1000, 2000, 3000]` ➔ 表示 `'0.5s'`, `'1.0s'`, `'2.0s'`, `'3.0s'`、`data-testid={\`action-duration-chip-\${ms}\`}`): クリックで `upsertActionCameraCue(selectedCue.startTimeMs, { durationMs: ms }, selectedCue.id)` を発火。
           - 「自動で戻る (`autoReturn`)」トグルボタンまたはチェックボックス (`data-testid="action-auto-return-toggle"`): クリックで `upsertActionCameraCue(selectedCue.startTimeMs, { autoReturn: !selectedCue.autoReturn }, selectedCue.id)` を発火。
           - 削除ボタン (`data-testid="delete-action-cue-btn"`): クリックで `deleteActionCameraCue(selectedCue.id)` を発火。
  2. **`TimelineBar` のモード分岐 (`src/features/tactical-unified/panels/timeline/timeline-bar.tsx`)**:
     - `const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);` を取得する。
     - `workspaceMode === 'director'` のとき、`<footer ...>` の高さを `h-24`（通常 `'board'` 時は `h-16`）とし、左側の `<PlaybackControls />` の右隣の中央領域にスライドカード一覧（`DndContext`）ではなく `<DirectorCameraTimeline />` を描画する。
- **Testing Strategy (Concrete Test Values)**:
  - テストファイル1: `src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx` (NEW)
    1. シークバー（`director-scrubber-input`）を `value: 2000` に変更したとき、Store の `playbackSeekTimeMs` が `2000` に更新され、`2.0s / ...` が表示されること。
    2. `add-global-keyframe-btn` をクリックすると全体カメラピンが追加され、ピンを選択して `delete-global-keyframe-btn` をクリックすると削除されること。
    3. `add-action-cue-btn` をクリックするとアクションカメラブロックが追加され、ブロックを選択して秒数チップ `action-duration-chip-2000`（`2.0s`）をクリックすると `durationMs === 2000` に更新され、`action-auto-return-toggle` をクリックすると `autoReturn === true` に切り替わること。
  - テストファイル2: `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
    1. `workspaceMode === 'board'` のときは従来のスライドカード一覧が表示され、`workspaceMode === 'director'` に切り替えたときは `data-testid="director-camera-timeline"` が表示されること。
- **Tasks**:
  - [x] 1. TDD実装: `director-camera-timeline.test.tsx` と `timeline-bar.test.tsx` を作成・更新（RED） ➔ `director-camera-timeline.tsx` と `timeline-bar.tsx` を実装（GREEN） ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/director-camera-timeline.tsx src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/__tests__/director-camera-timeline.test.tsx src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` PASS
- **Worker Handoff Log**:
  - `DirectorCameraTimeline` を実装し、トラック表示を `DirectorGlobalTrack` と `DirectorActionTrack` に分割。
  - `TimelineBar` に `workspaceMode === 'director'` の表示分岐（`h-24` / `DirectorCameraTimeline`）を追加。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-08 16:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  全体カメラ（Tilt/Yaw 最短角補間）とアクションカメラ（Zoom/Pan 維持/自動復帰）の合成解決エンジン、Store アクション（イミュータブル・履歴付き更新）、3Dプレビュー操作の自動振り分け連動、およびシークバー付きタイムラインUIが厳密に実装されています。単一カメラ射影パイプラインとStore Provider境界を完全維持し、Concrete Test Valuesを含む全受入要件を満たしていることを確認しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
