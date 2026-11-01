# TASK-127: ios-video-export-optimization

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/features/tactical-unified/panels/export/ios-export-presets.ts` (MODIFY)
  - `src/features/tactical-unified/components/use-share-page-export.ts` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (MODIFY)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (MODIFY)
  - `src/app/export/__tests__/export-pages.test.tsx` (MODIFY)
  - `src/lib/tactical/export/video-export-types.ts` (MODIFY)
  - `src/lib/tactical/export/share-photos.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/share-payload.test.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny.worker.ts` (NEW)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-video-exporter.ts` (MODIFY)
  - `src/lib/tactical/__tests__/video-export-engine.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/tactical-video-exporter.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `ios-export-presets.ts` に `24mbps`（24Mbps, 60fps, GOP 2s, quality）と `14mbps`（14Mbps, 60fps, GOP 1s, quality）のプリセット定義および `IOS_COMPARISON_PRESET_KEYS` を提供し、既存の `IOS_ENCODER_PRESET` / `iphone12` / `iosGeneral` 後方互換も維持すること。
- [x] 2. `useSharePageExport`、`SharePageClientView`、`SharedExportView` で `24mbps` / `14mbps` プリセットを切り替えてエクスポートでき、`SharedExportView` の `scale: 1` と `pitchAppearance` 渡し漏れを修正すること。
- [x] 3. `share-photos.ts` の `createBitmapFromUrlOrBase64` / `preloadSlidePlayerPhotos` を `globalThis.createImageBitmap` 判定（Worker互換）に修正し、大理石背景用の `preloadMarbleTextureBitmap(pitchAppearance)` を追加すること。
- [x] 4. `tactical-frame-renderer.ts` の `RenderTacticalFrameOptions` に `precomputedFrame?: InterpolatedUnifiedSlideFrame` を追加し、`video-mediabunny-export.ts` で補間計算の2重実行排除と静止区間（`frameIdx > 0 && interpolated.isPaused && lastRenderedSlideIdx === interpolated.currentSlideIndex`）での Canvas 再描画スキップを実装すること。
- [x] 5. `video-mediabunny-export.ts` で Mediabunny の `CanvasSource` に `latencyMode` / `hardwareAcceleration: 'prefer-hardware'` / `fullCodecString` を渡し、`marbleTexture` 描画対応、進捗通知の15フレーム間引き、Worker実行時の `setTimeout(0)` スキップ、および `finally` での `canvas.width = 0; canvas.height = 0;` 解放を行うこと。
- [x] 6. `video-mediabunny.worker.ts` を新設し、`video-export-engine.ts` の `createVideoExportWorker` / `exportVideoWithWorker` で `ImageBitmap` の Transferable 転送と Worker 実行（非対応時やエラー時は `exportVideoDirect` へ自動フォールバック）を結線し、`tactical-video-exporter.ts` で `playerPhotos` と `marbleTexture` の一括事前ロード・RAII `.close()` 解放を行うこと。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { getInterpolatedUnifiedSlideFrame, type InterpolatedUnifiedSlideFrame } from '@/lib/tactical/unified-interpolation';
import { preloadMarbleTextureBitmap, preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
import {
  IOS_COMPARISON_PRESET_KEYS,
  IOS_ENCODER_PRESET,
  IOS_ENCODER_PRESETS,
  type IosEncoderPreset,
  type IosEncoderPresetKey,
} from '@/features/tactical-unified/panels/export/ios-export-presets';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/panels/export/ios-export-presets.ts
export type IosEncoderPresetKey = '24mbps' | '14mbps';
export interface IosEncoderPreset {
  readonly id: IosEncoderPresetKey;
  readonly label: string;
  readonly shortLabel: string;
  readonly description: string;
  readonly codec: 'avc1.64002a';
  readonly maxQueueSize: number;
  readonly bitrateMbps: 24 | 14;
  readonly fps: 60;
  readonly latencyMode: 'quality';
  readonly keyFrameIntervalSec: 2 | 1;
}

// src/lib/tactical/export/video-export-types.ts (追加フィールド)
export interface VideoExportOptions {
  // 既存フィールドを維持した上で以下を追加:
  fullCodecString?: string;
  marbleTexture?: CanvasImageSource | null;
  isWorkerContext?: boolean;
}

// src/lib/tactical/export/tactical-frame-renderer.ts (追加フィールド)
export interface RenderTacticalFrameOptions {
  // 既存フィールドを維持した上で以下を追加:
  precomputedFrame?: InterpolatedUnifiedSlideFrame;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. Vitest (JSDOM) ではデフォルトで typeof Worker === 'undefined' のため、createVideoExportWorker() は typeof Worker === 'undefined' なら null を返すこと（既存テスト「returns null safely without throwing」と完全互換）。
// 2. video-mediabunny-export.ts では既存テストの vi.mock('mediabunny') が CanvasSource をモックしているため、CanvasSource を引き続き使用し、静止フレーム時は renderTacticalFrameToCanvas(ctx, ...) の呼び出しのみをスキップして await canvasSource.add(timestamp, frameDuration) を呼ぶこと。
// 3. onProgress は frameIdx === 0 || (frameIdx + 1) % 15 === 0 || frameIdx === totalFrames - 1 のタイミングで発火させ、短尺テスト（totalFrames < 15）でも必ず進捗イベントが発火するようにすること。
// 4. Worker へ ImageBitmap を Transferable 転送する際は、`typeof ImageBitmap !== 'undefined' && item instanceof ImageBitmap` で判定して transferList に積むこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: iOS Bitrate Comparison Presets (24Mbps vs 14Mbps) & Share UI Wiring
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/export/ios-export-presets.ts`
  - `src/features/tactical-unified/components/use-share-page-export.ts`
  - `src/features/tactical-unified/components/share-page-client-view.tsx`
  - `src/features/tactical-unified/components/shared-export-view.tsx`
  - `src/app/export/__tests__/export-pages.test.tsx`
- **契約 (Interface)**:
  ```ts
  export const IOS_PRESET_24MBPS: IosEncoderPreset;
  export const IOS_PRESET_14MBPS: IosEncoderPreset;
  export const IOS_COMPARISON_PRESET_KEYS: readonly ['24mbps', '14mbps'];
  // useSharePageExport の返却値に presetKey: IosEncoderPresetKey, setPresetKey: (key: IosEncoderPresetKey) => void を追加
  ```
- **Testing Strategy**:
  - `src/app/export/__tests__/export-pages.test.tsx`: デフォルトで 24Mbps (`bitrate: 24_000_000`, `keyFrameIntervalSec: 2`) で呼ばれること、14Mbps プリセットボタン選択時に `bitrate: 14_000_000`, `keyFrameIntervalSec: 1` が `exportMultiSlideMp4Video` に渡されることを検証。
- **Tasks**:
  - [x] 1. TDD: `ios-export-presets.ts` に `24mbps` (GOP 2s) / `14mbps` (GOP 1s) 定義を追加し、`use-share-page-export.ts`、`share-page-client-view.tsx`、`shared-export-view.tsx`（`scale: 1` と `pitchAppearance` 補完含む）を更新。
  - [x] 2. `export-pages.test.tsx` に 24Mbps / 14Mbps プリセット切り替えテストを追加し、`bun run ai:check src/features/tactical-unified/panels/export/ios-export-presets.ts src/features/tactical-unified/components/use-share-page-export.ts src/features/tactical-unified/components/share-page-client-view.tsx src/features/tactical-unified/components/shared-export-view.tsx src/app/export/__tests__/export-pages.test.tsx` PASS。
- **Worker Handoff Log**:
  - `IosEncoderPresetKey` (`'24mbps' | '14mbps'`), `IOS_PRESET_24MBPS`, `IOS_PRESET_14MBPS`, `IOS_COMPARISON_PRESET_KEYS`, `IOS_ENCODER_PRESET`, `IOS_ENCODER_PRESETS` を export。`useSharePageExport` は `{ presetKey, setPresetKey, activePreset }` を公開し、`SharedExportView` の `scale: 1`・`pitchAppearance` 渡し漏れも修正済み。

---

### Phase 2: Asset Preload (Worker-Safe & Marble Texture) + Static Frame Skip in Mediabunny Exporter
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-export-types.ts`
  - `src/lib/tactical/export/share-photos.ts`
  - `src/lib/tactical/export/share-payload.ts`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/lib/tactical/export/video-mediabunny-export.ts`
  - `src/lib/tactical/export/__tests__/share-payload.test.ts`
  - `src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts`
- **契約 (Interface)**:
  ```ts
  export async function preloadMarbleTextureBitmap(
    pitchAppearance?: PitchAppearanceConfig,
  ): Promise<ImageBitmap | null>;
  ```
- **Testing Strategy**:
  - `share-payload.test.ts`: `window` 未定義（`globalThis.createImageBitmap` のみ存在）環境での動作検証、および `preloadMarbleTextureBitmap` が `'marble'` 時のみ `ImageBitmap` を返し `'flat'` 時は `null` を返す検証。
  - `tactical-frame-renderer.test.ts`: `precomputedFrame` 指定時にそのフレーム状態が描画に使われること、`video-mediabunny-export.ts` で `pauseMs` 静止区間フレームの Canvas 再描画がスキップされ `CanvasSource.add` のみ呼ばれること、`marbleTexture` が転送されること。
- **Tasks**:
  - [x] 1. TDD: `video-export-types.ts`、`share-photos.ts`、`share-payload.ts`、`tactical-frame-renderer.ts`、`video-mediabunny-export.ts` を実装。
  - [x] 2. `share-payload.test.ts` と `tactical-frame-renderer.test.ts` に単体テストを追加し、`bun run ai:check src/lib/tactical/export/video-export-types.ts src/lib/tactical/export/share-photos.ts src/lib/tactical/export/share-payload.ts src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/video-mediabunny-export.ts src/lib/tactical/export/__tests__/share-payload.test.ts src/lib/tactical/export/__tests__/tactical-frame-renderer.test.ts` PASS。
- **Worker Handoff Log**:
  - `VideoExportOptions` に `fullCodecString`, `marbleTexture`, `isWorkerContext` を追加。`share-photos.ts` / `share-payload.ts` で `preloadMarbleTextureBitmap` と Worker 対応 `globalThis.createImageBitmap` 判定を実装。`tactical-frame-renderer.ts` の `precomputedFrame` 対応および `video-mediabunny-export.ts` の静止区間再描画スキップ・Canvas解放を実装済み。

---

### Phase 3: Off-Thread Web Worker Pipeline & Tactical Video Exporter Integration
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/export/video-mediabunny.worker.ts` (NEW)
  - `src/lib/tactical/export/video-export-engine.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`
  - `src/lib/tactical/__tests__/video-export-engine.test.ts`
  - `src/lib/tactical/__tests__/tactical-video-exporter.test.ts`
- **契約 (Interface)**:
  ```ts
  // video-mediabunny.worker.ts: START_EXPORT メッセージを受信し exportVideoWithMediabunny({ ...payload, isWorkerContext: true }) を実行、PROGRESS / SUCCESS (ArrayBuffer transferable) / ERROR を返信
  export function createVideoExportWorker(): Worker | null;
  export async function exportVideoWithWorker(options: VideoExportOptions): Promise<Blob>;
  ```
- **Testing Strategy**:
  - `video-export-engine.test.ts`: `globalThis.Worker` 未定義時は `createVideoExportWorker()` が `null` を返し `exportVideoDirect` にフォールバックすること、モック `Worker` 定義時は Worker 経由で `START_EXPORT` → `SUCCESS` で MP4 `Blob` が返り `worker.terminate()` が呼ばれること、Worker エラー時は `exportVideoDirect` にフォールバックすること。
  - `tactical-video-exporter.test.ts`: `exportMultiSlideMp4Video` / `exportMultiSlideWebmVideo` が `preloadMarbleTextureBitmap` を呼び出し、完了後に `playerPhotos` と `marbleTexture` の `.close()` を確実に実行すること。
- **Tasks**:
  - [x] 1. TDD: `video-mediabunny.worker.ts` を新設し、`video-export-engine.ts` と `tactical-video-exporter.ts` を更新。
  - [x] 2. `video-export-engine.test.ts` と `tactical-video-exporter.test.ts` にテストを追加し、`bun run ai:check src/lib/tactical/export/video-mediabunny.worker.ts src/lib/tactical/export/video-export-engine.ts src/lib/tactical/export/tactical-video-exporter.ts src/lib/tactical/__tests__/video-export-engine.test.ts src/lib/tactical/__tests__/tactical-video-exporter.test.ts` PASS。
- **Worker Handoff Log**:
  - `video-mediabunny.worker.ts` を新設。`createVideoExportWorker` と `exportVideoWithWorker`（`ImageBitmap` Transferable 転送 & エラー時 direct 自動フォールバック & RAII terminate）を実装し、`tactical-video-exporter.ts` で `marbleTexture` の事前ロードと `.close()` 解放を結線完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 16:20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: Off-Thread Web Worker、静止区間描画スキップ、24Mbps/14Mbps比較プリセット、ImageBitmap RAII解放が完全に設計原則（Zero-Flicker, RAII, ホスト境界）に適合して実装されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
