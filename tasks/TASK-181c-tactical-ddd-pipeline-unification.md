# TASK-181c: レイアウト・エクスポート・ディレクターカメラの単一描画パイプライン完全統合

- **Status**: `DONE`
- **Commit**: `refactor(tactical): unify director camera export into phase frame renderer pipeline`

## 概要
`tactical-phase-frame-renderer.ts` に `directorCamera` / `directorCameraOptions` / `applyEffects` / `effectTimeMs` およびカメラ変形時のピッチ背景描画同期を追加する。
`tactical-frame-renderer.ts` の `options.directorCamera == null` による旧描画バイパス制限を撤廃し、`phase` 指定時はディレクターカメラ有効時も含めて常に `renderTacticalPhaseFrameToCanvas`（SceneGraph パイプライン）へ委譲する。

## Negative Contracts (残存禁止条件)
- `tactical-frame-renderer.ts` 内でディレクターカメラ描画が旧パイプラインへバイパスされていないこと。

---

## Phase 1: レイアウト・エクスポート・ディレクターカメラの単一描画パイプライン完全統合

### 対象ファイル
- `[MODIFY]` `src/lib/tactical/export/tactical-phase-frame-renderer.ts`
- `[MODIFY]` `src/lib/tactical/export/tactical-frame-renderer.ts`
- `[MODIFY]` `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`

---

### 3-1. `[MODIFY]` `src/lib/tactical/export/tactical-phase-frame-renderer.ts`

#### 3-1-1. import の更新
##### Before
```ts
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  type EvaluatedTimelineFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  type Milliseconds,
  toMilliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
```

##### After
```ts
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import {
  type EvaluatedTimelineFrame,
  evaluateStaticSlideFrame,
  evaluateTimelineFrame,
} from '@/lib/tactical/engine/timeline-evaluator';
import {
  hasActiveDirectorCameraTrack,
  type ResolveSyntheticDirectorCameraOptions,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/interpolation-camera';
import {
  type Milliseconds,
  toMilliseconds,
} from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_PITCH_APPEARANCE,
  type DirectorCameraTrack,
  type PitchAppearanceConfig,
  type PitchTransform,
  type ScreenBackgroundConfig,
} from '@/lib/types/tactical-unified';
```

#### 3-1-2. `RenderTacticalPhaseFrameOptions` へのプロパティ追加
##### Before
```ts
export interface RenderTacticalPhaseFrameOptions {
  ctx: AnyCanvasRenderingContext2D;
  phase: DomainTacticalPhase;
  timeMs: Milliseconds | number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  transparent?: boolean;
  teamVisibility?: 'both' | 'home' | 'away';
  pitchTransform?: PitchTransform | null;
  pitchTransformOverride?: PitchTransform | null;
}
```

##### After
```ts
export interface RenderTacticalPhaseFrameOptions {
  ctx: AnyCanvasRenderingContext2D;
  phase: DomainTacticalPhase;
  timeMs: Milliseconds | number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  transparent?: boolean;
  teamVisibility?: 'both' | 'home' | 'away';
  pitchTransform?: PitchTransform | null;
  pitchTransformOverride?: PitchTransform | null;
  directorCamera?: DirectorCameraTrack | null;
  directorCameraOptions?: ResolveSyntheticDirectorCameraOptions;
  applyEffects?: boolean;
  effectTimeMs?: number;
}
```

#### 3-1-3. `renderTacticalPhaseFrameToCanvas` の options 分解
##### Before
```ts
export function renderTacticalPhaseFrameToCanvas(
  options: RenderTacticalPhaseFrameOptions,
): void {
  const {
    ctx,
    phase,
    timeMs,
    width: w,
    height: h,
    playerPhotos,
    pitchAppearance,
    marbleTexture,
    screenBackground,
    transparent = false,
    teamVisibility = 'both',
    pitchTransform,
    pitchTransformOverride,
  } = options;
```

##### After
```ts
export function renderTacticalPhaseFrameToCanvas(
  options: RenderTacticalPhaseFrameOptions,
): void {
  const {
    ctx,
    phase,
    timeMs,
    width: w,
    height: h,
    playerPhotos,
    pitchAppearance,
    marbleTexture,
    screenBackground,
    transparent = false,
    teamVisibility = 'both',
    pitchTransform,
    pitchTransformOverride,
    directorCamera,
    directorCameraOptions,
    applyEffects,
    effectTimeMs,
  } = options;
```

#### 3-1-4. カメラ計算とピッチ背景描画
##### Before
```ts
  const cacheKey = `${baseWidth}x${baseHeight}:${phase.aspectRatio}:${JSON.stringify(pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(marbleTexture)}`;

  let pitchDrawn = false;
  if (pitchCache && pitchCache.key === cacheKey) {
    ctx.drawImage(
      pitchCache.canvas as CanvasImageSource,
      0,
      0,
      baseWidth,
      baseHeight,
    );
    pitchDrawn = true;
  } else {
    const created = createPitchCanvasAndContext(baseWidth, baseHeight);

    if (created) {
      const { canvas: cacheCanvas, ctx: cacheCtx } = created;
      const frameContext = createFrameRenderContext({
        ctx: cacheCtx,
        baseWidth,
        baseHeight,
        aspectRatio: phase.aspectRatio,
      });
      renderPitch(
        frameContext,
        phase.aspectRatio,
        transparent,
        pitchAppearance,
        marbleTexture,
        screenBackground,
      );
      pitchCache = { key: cacheKey, canvas: cacheCanvas };
      ctx.drawImage(
        cacheCanvas as CanvasImageSource,
        0,
        0,
        baseWidth,
        baseHeight,
      );
      pitchDrawn = true;
    }
  }

  if (!pitchDrawn) {
    const frameContext = createFrameRenderContext({
      ctx,
      baseWidth,
      baseHeight,
      aspectRatio: phase.aspectRatio,
    });
    renderPitch(
      frameContext,
      phase.aspectRatio,
      transparent,
      pitchAppearance,
      marbleTexture,
      screenBackground,
    );
  }

  const evaluated = evaluateTimelineFrame(
    phase,
    toMilliseconds(Number(timeMs)),
  );

  const effectivePitchTransform =
    pitchTransformOverride ?? pitchTransform ?? evaluated.slide.pitchTransform;
```

##### After
```ts
  const evaluated = evaluateTimelineFrame(
    phase,
    toMilliseconds(Number(timeMs)),
  );

  const effectiveDirectorCamera =
    directorCamera !== undefined ? directorCamera : phase.directorCamera;
  const directorPitchTransform = hasActiveDirectorCameraTrack(
    effectiveDirectorCamera,
  )
    ? resolveSyntheticDirectorCamera(
        effectiveDirectorCamera,
        Number(timeMs),
        directorCameraOptions,
      )
    : undefined;

  const effectivePitchTransform =
    pitchTransformOverride ??
    pitchTransform ??
    directorPitchTransform ??
    evaluated.slide.pitchTransform;

  const hasNonIdentityTransform = Boolean(
    effectivePitchTransform &&
      (effectivePitchTransform.zoom !== 1 ||
        effectivePitchTransform.panX !== 0 ||
        effectivePitchTransform.panY !== 0 ||
        effectivePitchTransform.tilt !== 0 ||
        (effectivePitchTransform.yaw !== undefined &&
          effectivePitchTransform.yaw !== 90)),
  );

  const transformCacheSuffix = hasNonIdentityTransform
    ? `:${JSON.stringify(effectivePitchTransform)}`
    : '';
  const cacheKey = `${baseWidth}x${baseHeight}:${phase.aspectRatio}:${JSON.stringify(pitchAppearance ?? DEFAULT_PITCH_APPEARANCE)}:${Boolean(marbleTexture)}:${transparent}${transformCacheSuffix}`;

  let pitchDrawn = false;
  if (pitchCache && pitchCache.key === cacheKey) {
    ctx.drawImage(
      pitchCache.canvas as CanvasImageSource,
      0,
      0,
      baseWidth,
      baseHeight,
    );
    pitchDrawn = true;
  } else {
    const created = createPitchCanvasAndContext(baseWidth, baseHeight);

    if (created) {
      const { canvas: cacheCanvas, ctx: cacheCtx } = created;
      const frameContext = createFrameRenderContext({
        ctx: cacheCtx,
        baseWidth,
        baseHeight,
        aspectRatio: phase.aspectRatio,
        framePitchTransform: effectivePitchTransform,
      });
      renderPitch(
        frameContext,
        phase.aspectRatio,
        transparent,
        pitchAppearance,
        marbleTexture,
        screenBackground,
      );
      pitchCache = { key: cacheKey, canvas: cacheCanvas };
      ctx.drawImage(
        cacheCanvas as CanvasImageSource,
        0,
        0,
        baseWidth,
        baseHeight,
      );
      pitchDrawn = true;
    }
  }

  if (!pitchDrawn) {
    const frameContext = createFrameRenderContext({
      ctx,
      baseWidth,
      baseHeight,
      aspectRatio: phase.aspectRatio,
      framePitchTransform: effectivePitchTransform,
    });
    renderPitch(
      frameContext,
      phase.aspectRatio,
      transparent,
      pitchAppearance,
      marbleTexture,
      screenBackground,
    );
  }
```

#### 3-1-5. `frameToCompile` の構築
##### Before
```ts
  const frameToCompile: EvaluatedTimelineFrame = {
    ...evaluated,
    slide: slideToCompile,
  };

  const prevSlide =
    phase.slides.length > 0
```

##### After
```ts
  let frameToCompile: EvaluatedTimelineFrame;
  if (applyEffects === false) {
    const staticMaps = evaluateStaticSlideFrame(
      slideToCompile,
      evaluated.slideIndex,
    );
    frameToCompile = {
      ...evaluated,
      timeInSlideMs: 0,
      slide: slideToCompile,
      arrowProgressMap: staticMaps.arrowProgressMap,
      zoneOpacityMap: staticMaps.zoneOpacityMap,
    };
  } else {
    frameToCompile = {
      ...evaluated,
      ...(effectTimeMs !== undefined ? { timeInSlideMs: effectTimeMs } : {}),
      slide: slideToCompile,
    };
  }

  const prevSlide =
    phase.slides.length > 0
```

---

### 3-2. `[MODIFY]` `src/lib/tactical/export/tactical-frame-renderer.ts`

`renderTacticalFrameToCanvas` の `options.directorCamera == null` 条件を撤廃し、`phase` 指定時に `directorCamera`, `directorCameraOptions`, `applyEffects`, `effectTimeMs` を `renderTacticalPhaseFrameToCanvas` へ引き渡す。

#### Before
```ts
  if (
    options.phase != null &&
    mvpMatrix == null &&
    options.precomputedFrame == null &&
    options.directorCamera == null
  ) {
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase: options.phase,
      timeMs,
      width: w,
      height: h,
      baseWidth: options.baseWidth,
      baseHeight: options.baseHeight,
      playerPhotos,
      pitchAppearance,
      marbleTexture,
      screenBackground,
      transparent,
      teamVisibility,
      pitchTransform: options.pitchTransform,
      pitchTransformOverride: options.pitchTransformOverride,
    });
    return;
  }
```

#### After
```ts
  if (
    options.phase != null &&
    mvpMatrix == null &&
    options.precomputedFrame == null
  ) {
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase: options.phase,
      timeMs,
      width: w,
      height: h,
      baseWidth: options.baseWidth,
      baseHeight: options.baseHeight,
      playerPhotos,
      pitchAppearance,
      marbleTexture,
      screenBackground,
      transparent,
      teamVisibility,
      pitchTransform: options.pitchTransform,
      pitchTransformOverride: options.pitchTransformOverride,
      directorCamera,
      directorCameraOptions,
      applyEffects: options.applyEffects,
      effectTimeMs: options.effectTimeMs,
    });
    return;
  }
```

---

### 3-3. `[MODIFY]` `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`

`renderTacticalFrameToCanvas` に `phase` と `directorCamera`（および `applyEffects: false`）を渡した際にも旧経路へフォールバックせず `renderTacticalPhaseFrameToCanvas`（SceneGraph パイプライン）で描画されることを検証するテストを追加する。

#### Before
```ts
      // When boundaryBox is enabled and active, renderBoundaryCropSlice draws offscreen slice to ctx via drawImage
      // cropX = 10% * canonicalW, cropY = 10% * canonicalH
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        0,
        0,
        500,
        300,
      );
    } finally {
      createElementSpy.mockRestore();
      _resetSharedOffscreenCanvas();
    }
  });
});
```

#### After
```ts
      // When boundaryBox is enabled and active, renderBoundaryCropSlice draws offscreen slice to ctx via drawImage
      // cropX = 10% * canonicalW, cropY = 10% * canonicalH
      expect(ctx.drawImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        0,
        0,
        500,
        300,
      );
    } finally {
      createElementSpy.mockRestore();
      _resetSharedOffscreenCanvas();
    }
  });

  it('delegates to renderTacticalPhaseFrameToCanvas even when directorCamera is active', () => {
    const phase: DomainTacticalPhase = {
      id: 'phase-director',
      name: 'Director Camera Phase',
      aspectRatio: '16:9',
      boundaryBox: { x: 0, y: 0, width: 100, height: 100, enabled: false },
      backgroundType: 'pitch',
      slides: [
        {
          id: 'slide-1',
          index: 0,
          players: [
            {
              id: 'p1',
              area: 'pitch',
              team: 'home',
              shirtNo: '10',
              name: 'Messi',
              x: toScreenNormCoord(30),
              y: toScreenNormCoord(40),
              style: {
                markerType: 'circle',
                insideContent: 'number',
                bottomLabel: 'name',
                color: '#034694',
                strokeColor: '#ffffff',
                strokeWidth: 2,
                sizeScale: 1.0,
                numberSizeScale: 1.0,
                labelSizeScale: 1.0,
              },
              connectLines: [],
              badges: [],
            },
          ],
          arrows: [],
          zones: [],
          texts: [],
          ball: {
            x: toScreenNormCoord(50),
            y: toScreenNormCoord(50),
            visible: true,
          },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'linear',
        },
      ],
    };

    const ctx = createMockCanvasContext();
    renderTacticalFrameToCanvas(ctx, {
      slides: [],
      phase,
      timeMs: 200,
      width: 1280,
      height: 720,
      aspectRatio: '16:9',
      directorCamera: {
        enabled: true,
        globalKeyframes: [
          {
            id: 'kf-1',
            timeMs: 0,
            tilt: 25,
            yaw: 90,
            easing: 'ease-in-out',
          },
        ],
        actionCues: [
          {
            id: 'cue-1',
            startTimeMs: 0,
            durationMs: 1000,
            zoom: 1.4,
            panX: 10,
            panY: -5,
            autoReturn: false,
          },
        ],
      },
      applyEffects: false,
    });

    // Cached offscreen pitch transfer + SceneGraph player render
    expect(ctx.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      0,
      0,
      1280,
      720,
    );
    expect(ctx.fillText).toHaveBeenCalledWith(
      '10',
      expect.any(Number),
      expect.any(Number),
    );
  });
});
```

---

### Phase 1 検証コマンド
```bash
bun run ai:check src/lib/tactical/export/tactical-phase-frame-renderer.ts src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts
```

## Worker Handoff Log
- Phase 1: `tactical-phase-frame-renderer.ts` にディレクターカメラおよびエフェクト制御・ピッチ描画同期を追加、`tactical-frame-renderer.ts` の旧バイパス制限を撤廃して単一パイプラインへ統合完了。`ai:check` PASS。
