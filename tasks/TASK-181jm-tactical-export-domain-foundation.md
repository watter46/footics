# TASK-181jm: Export パイプライン＆プレビュー基盤の Domain Slide 型互換化

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): widen export pipeline, konva slide helpers, and preview constants to accept DomainTacticalSlide`

---

## 🎯 目的・背景

動画/画像エクスポート基盤 (`tactical-frame-effects.ts`, `tactical-frame-renderer.ts`, `video-export-types.ts`, `tactical-video-exporter.ts`, `konva-slide-export.ts`, `konva-export-helpers.ts`, `use-export-preview-textures.ts`, `export-preview-constants.ts`) が `DomainTacticalSlide` をキャストなしで受け取れるように型を拡張し、`tactical-unified` 依存を置換する。

## 🚨 残存禁止条件 (Negative Contracts)

- `use-export-preview-textures.ts`・`export-preview-constants.ts`・`konva-slide-export.ts`・`konva-export-helpers.ts` に `@/lib/types/tactical-unified` のインポートを残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: 描画・動画エクスポートエンジン（4プロダクション＋0テスト）
- **Phase 2**: Konva 書き出しヘルパー & プレビュー定数/テクスチャ（4プロダクション＋0テスト）

---

### Phase 1: 描画・動画エクスポートエンジンの Domain Slide 対応

- **担当ファイル**:
  - `src/lib/tactical/export/tactical-frame-effects.ts`
  - `src/lib/tactical/export/tactical-frame-renderer.ts`
  - `src/lib/tactical/export/video-export-types.ts`
  - `src/lib/tactical/export/tactical-video-exporter.ts`

#### Task 1.1 `[MODIFY]` `src/lib/tactical/export/tactical-frame-effects.ts`

**Before:**
```ts
import type { DirectorCameraTrack, Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type { Slide } from '@/lib/types/tactical/slide';

type ExportSlide = Slide | DomainTacticalSlide;
```

**Before:**
```ts
export function hasActiveFrameEffects(slides: Slide[]): boolean {
```
**After:**
```ts
export function hasActiveFrameEffects(slides: readonly ExportSlide[]): boolean {
```

**Before:**
```ts
export function isPauseFrame(
  slides: Slide[],
  timeMs: number,
```
**After:**
```ts
export function isPauseFrame(
  slides: readonly ExportSlide[],
  timeMs: number,
```

**Before:**
```ts
export function computeFrameEffects(
  slides: Slide[],
  timeMs: number,
```
**After:**
```ts
export function computeFrameEffects(
  slides: readonly ExportSlide[],
  timeMs: number,
```

#### Task 1.2 `[MODIFY]` `src/lib/tactical/export/tactical-frame-renderer.ts`

**Before:**
```ts
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
```

**Before:**
```ts
export interface RenderTacticalFrameOptions {
  slides: Slide[];
  timeMs: number;
```
**After:**
```ts
export interface RenderTacticalFrameOptions {
  slides: readonly (Slide | DomainTacticalSlide)[];
  timeMs: number;
```

#### Task 1.3 `[MODIFY]` `src/lib/tactical/export/video-export-types.ts`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  ExportProgress,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import type { BoundaryCropInfo } from './video-crop-calc';

export interface VideoExportOptions {
  format: 'mp4' | 'webm';
  fps: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  keyFrameIntervalSec?: number;
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: number;
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides?: Slide[];
```
**After:**
```ts
import type { ExportProgress } from '@/lib/types/tactical/export';
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
import type { BoundaryCropInfo } from './video-crop-calc';

export interface VideoExportOptions {
  format: 'mp4' | 'webm';
  fps: number;
  scale?: number;
  quality?: 'low' | 'medium' | 'high';
  bitrate?: number;
  h264Profile?: 'baseline' | 'main' | 'high';
  keyFrameIntervalSec?: number;
  latencyMode?: 'realtime' | 'quality';
  maxQueueSize?: number;
  transparent?: boolean;
  totalDurationMs: number;
  boundaryBox?: BoundaryBox | null;
  stageWidth: number;
  stageHeight: number;
  slides?: readonly (Slide | DomainTacticalSlide)[];
```

#### Task 1.4 `[MODIFY]` `src/lib/tactical/export/tactical-video-exporter.ts`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  ExportProgress,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { ExportProgress } from '@/lib/types/tactical/export';
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';
```

**Before:**
```ts
export interface MultiSlideVideoExportOptions {
  slides: Slide[];
  format?: 'mp4' | 'webm';
```
**After:**
```ts
export interface MultiSlideVideoExportOptions {
  slides: readonly (Slide | DomainTacticalSlide)[];
  format?: 'mp4' | 'webm';
```

**Before:**
```ts
export function applySlideTimelineOverrides(
  slides: Slide[],
  overrides?: {
    transitionDurationMs?: number;
    pauseMs?: number;
    easing?: Slide['easing'];
  },
): Slide[] {
  if (
    !overrides ||
    (!overrides.transitionDurationMs && !overrides.pauseMs && !overrides.easing)
  ) {
    return slides;
  }
```
**After:**
```ts
export function applySlideTimelineOverrides<
  T extends Slide | DomainTacticalSlide,
>(
  slides: readonly T[],
  overrides?: {
    transitionDurationMs?: number;
    pauseMs?: number;
    easing?: Slide['easing'];
  },
): readonly T[] {
  if (
    !overrides ||
    (!overrides.transitionDurationMs && !overrides.pauseMs && !overrides.easing)
  ) {
    return slides;
  }
```

---

### Phase 2: Konva 書き出しヘルパー & プレビュー定数・テクスチャ

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/konva-slide-export.ts`
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts`
  - `src/features/tactical-unified/panels/export/use-export-preview-textures.ts`
  - `src/features/tactical-unified/panels/export/export-preview-constants.ts`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/hooks/konva-slide-export.ts`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';

type ExportableSlide = Slide | DomainTacticalSlide;
```

**Before:**
```ts
export interface RenderSlideImageOptions {
  slide: Slide;
  aspectRatio: AspectRatio;
```
**After:**
```ts
export interface RenderSlideImageOptions {
  slide: ExportableSlide;
  aspectRatio: AspectRatio;
```

**Before:**
```ts
export interface ExportSlidesArchiveOptions {
  slides: Slide[];
  aspectRatio: AspectRatio;
```
**After:**
```ts
export interface ExportSlidesArchiveOptions {
  slides: readonly ExportableSlide[];
  aspectRatio: AspectRatio;
```

**Before:**
```ts
  const box =
    options.boundaryBox !== undefined
      ? options.boundaryBox
      : options.slide.boundaryBox;
```
**After:**
```ts
  const box =
    options.boundaryBox !== undefined
      ? options.boundaryBox
      : 'boundaryBox' in options.slide
        ? options.slide.boundaryBox
        : undefined;
```

**Before:**
```ts
      boundaryBox:
        options.boundaryBox !== undefined
          ? options.boundaryBox
          : slide.boundaryBox,
```
**After:**
```ts
      boundaryBox:
        options.boundaryBox !== undefined
          ? options.boundaryBox
          : 'boundaryBox' in slide
            ? slide.boundaryBox
            : undefined,
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/hooks/konva-export-helpers.ts`

**Before:**
```ts
import type { ExportTarget, Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type { DomainTacticalSlide, ExportTarget } from '@/lib/types/tactical/project';
import type { Slide } from '@/lib/types/tactical/slide';

type ExportableSlide = Slide | DomainTacticalSlide;
```

- `getTargetSlides<T extends ExportableSlide>(slides: readonly T[], target: ExportTarget): T[]`・`collectSlideFrames(slides: readonly ExportableSlide[], ...)`・`exportZipSlides`・`ExecuteExportOptions` の `slides: Slide[]` を `slides: readonly ExportableSlide[]` へ変更する。

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/export/use-export-preview-textures.ts`

**Before:**
```ts
import type {
  PitchAppearanceConfig,
  Slide,
} from '@/lib/types/tactical-unified';
import { getCachedMarbleImage, loadMarbleTexture } from './load-marble-texture';

export interface UseExportPreviewTexturesParams {
  slides: Slide[];
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}
```
**After:**
```ts
import type { DomainTacticalSlide } from '@/lib/types/tactical/project';
import type { PitchAppearanceConfig, Slide } from '@/lib/types/tactical/slide';
import { getCachedMarbleImage, loadMarbleTexture } from './load-marble-texture';

export interface UseExportPreviewTexturesParams {
  slides: readonly (Slide | DomainTacticalSlide)[];
  photos?: Record<string, string>;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
}
```

#### Task 2.4 `[MODIFY]` `src/features/tactical-unified/panels/export/export-preview-constants.ts`

**Before:**
```ts
import type {
  AspectRatio,
  BoundaryBox,
  DirectorCameraTrack,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical-unified';

export interface UseExportPreviewAnimationParams {
  slides: Slide[];
```
**After:**
```ts
import type {
  DirectorCameraTrack,
  DomainTacticalSlide,
} from '@/lib/types/tactical/project';
import type {
  AspectRatio,
  BoundaryBox,
  PitchAppearanceConfig,
  PitchTransform,
  ScreenBackgroundConfig,
  Slide,
} from '@/lib/types/tactical/slide';

export interface UseExportPreviewAnimationParams {
  slides: readonly (Slide | DomainTacticalSlide)[];
```
