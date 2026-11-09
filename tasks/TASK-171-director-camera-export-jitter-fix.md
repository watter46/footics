# TASK-171: ディレクターカメラ（ズーム・全体カメラ）エクスポート時のコマ飛び・カクつき解消

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-09
- **Target Files**:
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/lib/tactical/interpolation-camera.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-director.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-camera.test.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `interpolation-director.ts` に `isDirectorCameraMoving(track: DirectorCameraTrack, timeMs: number, options?: ResolveSyntheticDirectorCameraOptions): boolean` を新設・exportし、前後フレーム（`timeMs ± 16ms` 等）のカメラ姿勢変化を `hasCameraDelta` で判定して、キーフレーム移動中およびCueトランジション/リターン移動中に `true`、完全静止時に `false` を返すこと。
- [x] 2. `interpolation-camera.ts` の `resolveCameraAtTime` で `hasActiveDirectorCameraTrack(directorCamera)` が `true` の場合、ハードコードの `isCameraMoving: false` を廃止し、`isDirectorCameraMoving` の算出結果を返却すること。
- [x] 3. `unified-interpolation.ts` の `getInterpolatedUnifiedSlideFrame` において、スライドが選手静止区間（`isPlayerPaused`）であっても `isCameraMoving: true` の間は `isPaused: false` が維持されること。
- [x] 4. `video-mediabunny-export.ts` の `exportVideoWithMediabunny` で `lastRenderedTransform` を保持し、`shouldSkipRender` の条件に `lastRenderedTransform !== null && !hasCameraDelta(lastRenderedTransform, interpolated.pitchTransform)` を追加して、カメラ姿勢が変化しているフレームは確実に Canvas 再描画されること。
- [x] 5. カメラ姿勢も選手・ボールも完全に同一な静止区間（`isPaused === true` かつ `!hasCameraDelta`）では、既存通り Canvas 再描画をスキップして `canvasSource.add` のみ実行されること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **完全静止時のみ描画スキップ許可（Why: コマ飛び・瞬間移動の根絶）**: エクスポート高速化のための Canvas 再描画スキップは、選手・ボール等のオブジェクトだけでなくカメラ姿勢（`panX`, `panY`, `zoom`, `tilt`, `yaw`）も完全に静止しているフレームのみに限定する。
  2. **二重防御（Why: 将来の別エクスポート方式や補間ロジック変更耐性）**: 補間層（`isCameraMoving`）とエクスポート層（`hasCameraDelta` ガード）の双方で防御し、どちらか片方の境界に修正が入ってもコマ落ちが再発しないアーキテクチャとする。
  3. **微小閾値の統一（Why: 浮動小数点誤差による不要な全フレーム描画の防止）**: カメラ差分判定には既存の `hasCameraDelta`（閾値 `0.001`）を使用し、浮動小数点の丸め誤差で静止スキップが無効化されないようにする。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/interpolation-camera.ts` — `resolveCameraAtTime` の戻り値シグネチャ `{ pitchTransform, isCameraMoving }` の維持。
  - `src/lib/tactical/unified-interpolation.ts` — `getInterpolatedUnifiedSlideFrame` の `isPaused: (isPlayerPaused && !isCameraMoving) || isPastTotal` との整合確認。
  - `src/features/tactical-unified/export/use-export-preview-animation.ts` — プレビュー再生時の動作に悪影響がないことの確認。
  - `src/lib/tactical/export/video-mediabunny-export.ts` — MP4 / WebM エクスポートのフレーム出力と Canvas 解放が正常に完結すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// src/lib/tactical/interpolation-director.ts
import { hasCameraDelta } from './interpolation-camera';
import type { ResolveSyntheticDirectorCameraOptions } from './interpolation-director';

// src/lib/tactical/interpolation-camera.ts
import {
  hasActiveDirectorCameraTrack,
  isDirectorCameraMoving,
  type ResolveSyntheticDirectorCameraOptions,
  resolveSyntheticDirectorCamera,
} from './interpolation-director';

// src/lib/tactical/export/video-mediabunny-export.ts
import { hasCameraDelta, type InterpolatedPitchTransformState } from '@/lib/tactical/interpolation-camera';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/tactical/interpolation-camera.ts
export interface InterpolatedPitchTransformState {
  panX: number;
  panY: number;
  zoom: number;
  tilt: number;
  yaw: number;
  isLocked: boolean;
}

export function hasCameraDelta(
  a?: PitchTransform | null,
  b?: PitchTransform | null,
): boolean;
```

### 3.3 Reference Pattern (既存のスキップ判定)
```ts
// src/lib/tactical/export/video-mediabunny-export.ts (既存)
const shouldSkipRender =
  frameIdx > 0 &&
  interpolated.isPaused &&
  lastRenderedSlideIdx === interpolated.currentSlideIndex;

// 改善後:
const isTransformIdentical =
  lastRenderedTransform !== null &&
  !hasCameraDelta(lastRenderedTransform, interpolated.pitchTransform);

const shouldSkipRender =
  frameIdx > 0 &&
  interpolated.isPaused &&
  isTransformIdentical &&
  lastRenderedSlideIdx === interpolated.currentSlideIndex;

if (!shouldSkipRender) {
  renderTacticalFrameToCanvas(...);
  lastRenderedSlideIdx = interpolated.isPaused
    ? interpolated.currentSlideIndex
    : -1;
  lastRenderedTransform = interpolated.pitchTransform;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Director Camera Moving Detection & Export Jitter Prevention
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/interpolation-director.ts` (MODIFY)
  - `src/lib/tactical/interpolation-camera.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-director.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/interpolation-camera.test.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
- **契約 (Exact Contract & Formula)**:
  1. `isDirectorCameraMoving(track: DirectorCameraTrack, timeMs: number, options?: ResolveSyntheticDirectorCameraOptions): boolean`:
     - 判定式:
       ```ts
       export function isDirectorCameraMoving(
         track: DirectorCameraTrack,
         timeMs: number,
         options?: ResolveSyntheticDirectorCameraOptions,
       ): boolean {
         if (!hasActiveDirectorCameraTrack(track)) return false;
         const current = resolveSyntheticDirectorCamera(track, timeMs, options);
         const next = resolveSyntheticDirectorCamera(track, timeMs + 16, options);
         const prev = resolveSyntheticDirectorCamera(track, Math.max(0, timeMs - 16), options);
         return hasCameraDelta(current, next) || hasCameraDelta(prev, current);
       }
       ```
  2. `src/lib/tactical/interpolation-camera.ts`:
     ```ts
     if (hasActiveDirectorCameraTrack(directorCamera)) {
       return {
         pitchTransform: resolveSyntheticDirectorCamera(
           directorCamera,
           timeMs,
           directorCameraOptions,
         ),
         isCameraMoving: isDirectorCameraMoving(
           directorCamera,
           timeMs,
           directorCameraOptions,
         ),
       };
     }
     ```
  3. `src/lib/tactical/export/video-mediabunny-export.ts`:
     - ループ開始前に `let lastRenderedTransform: InterpolatedPitchTransformState | null = null;` を定義。
     - `shouldSkipRender`:
       ```ts
       const isTransformIdentical =
         lastRenderedTransform !== null &&
         !hasCameraDelta(lastRenderedTransform, interpolated.pitchTransform);

       const shouldSkipRender =
         frameIdx > 0 &&
         interpolated.isPaused &&
         isTransformIdentical &&
         lastRenderedSlideIdx === interpolated.currentSlideIndex;
       ```
     - `if (!shouldSkipRender)` ブロック内で `lastRenderedTransform = interpolated.pitchTransform;` を記録。
- **Testing Strategy (Concrete Test Values)**:
  - `interpolation-director.test.ts`:
    - `globalKeyframes`: `[ { timeMs: 1000, tilt: 0, yaw: 90 }, { timeMs: 3000, tilt: 30, yaw: 45 } ]`
      - `timeMs = 500`: `isDirectorCameraMoving` ➔ `false`
      - `timeMs = 2000`: `isDirectorCameraMoving` ➔ `true`
      - `timeMs = 4000`: `isDirectorCameraMoving` ➔ `false`
    - `actionCues`: `[ { id: 'c1', startTimeMs: 1000, durationMs: 1000, zoom: 2.0, panX: 10, panY: 0, autoReturn: false } ]`
      - `timeMs = 1100`: `isDirectorCameraMoving` ➔ `true`
      - `timeMs = 2500`: `isDirectorCameraMoving` ➔ `false`
  - `interpolation-camera.test.ts`:
    - `resolveCameraAtTime`: `directorCamera` がアクティブで `timeMs = 2000`（移動中）のとき `isCameraMoving === true` を返すこと。
  - `tactical-frame-renderer.test.ts`:
    - `exportVideoWithMediabunny` のテストにおいて、スライド静止中（`pauseMs` 区間）であっても `directorCamera` の移動中は Canvas 再描画が実行され、完全静止区間のみスキップされること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/__tests__/interpolation-director.test.ts` ➔ 実装 ➔ `bun run ai:check src/lib/tactical/interpolation-director.ts src/lib/tactical/interpolation-camera.ts src/lib/tactical/export/video-mediabunny-export.ts src/lib/tactical/__tests__/interpolation-director.test.ts src/lib/tactical/__tests__/interpolation-camera.test.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` PASS
- **Worker Handoff Log**:
  - 確定シンボル: `isDirectorCameraMoving(track, timeMs, options)`. `exportVideoWithMediabunny` で `lastRenderedTransform` と `hasCameraDelta` による二重防御を描画スキップ判定に追加完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-09 21:10
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  補間層（`isDirectorCameraMoving` ➔ `isCameraMoving` ➔ `isPaused`）とエクスポート層（`hasCameraDelta` による姿勢同一性ガード）の二重防御により、ディレクターカメラ稼働時の描画スキップとコマ飛びが確実に解消されていることを確認。テスト値も具体的で結合挙動まで検証されており品質良好。

## 6. Rejections / Additional Tasks (不可逆修正欄)
