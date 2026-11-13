# TASK-181ha: フェーズ比率変換・背景画像適用・境界線フィット計算の追加（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `DONE`
- **Commit**: `feat(tactical): add aspect transform, image background and boundary fit domain functions`
- **Series**: 旧ストア完全廃止シリーズ。181ga/181gb ➔ 181ha（本タスク）➔ 181hb（一括スタイル・ピッチ操作命令）➔ 181i ➔ 181j〜。
- **Goal**: 旧 `slide-aspect-helpers.ts`（`transformSlideForAspect`）、`slide-background-helpers.ts`（`applyImageBackgroundToProject`）、`boundary-box-helpers.ts` / `pitch-slice.ts`（`autoFitBoundaryBox`・`applyXMediaPreset`）の幾何・配置ロジックを、新ドメイン型の純粋関数へ移す。旧スライスの削除は 181l。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（追加のみ。Consumer 移行と旧削除は 181j〜181l）
- **旧操作 ➔ 新機能 対応表（Worker は参照のみ）**:
  - `transformSlideForAspect` ➔ `src/lib/tactical/domain/aspect-transform.ts` の `transformSlideForAspect`
  - `applyImageBackgroundToProject` / `setImageBackground` / `restoreDefaultPitch` ➔ `src/lib/tactical/domain/background-image.ts` の `isDefaultInitialSlide` / `applyImageBackgroundToPhase` / `restoreDefaultPitchInPhase`
  - `autoFitBoundaryBox` / `applyXMediaPreset` ➔ `src/lib/tactical/domain/boundary-box.ts` の `computeAutoFitBoundaryBox` / `computeXMediaPresetBoundaryBox`

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. 新ドメイン（`DomainSlide` / `DomainTacticalPhase`）では `aspectRatio`・`boundaryBox`・`backgroundType`・`backgroundImageUrl` はスライドではなくフェーズ（`DomainTacticalPhase`）が一次保持する。
  2. アスペクト比変換（`transformSlideForAspect`）では、ピッチ上の選手とボール（およびその `trajectory.controlPoint`）は `clampToScreenNorm` でクランプし、ベンチ選手の座標は無変更で維持する。矢印・ポリゴンゾーン・テキストは `clamp: false`（`toScreenNormCoord` / `toScreenNormPoint(..., false)`）で画面外はみ出し座標を保持する。矩形・楕円ゾーン（`rect` / `ellipse`）は対角2点を変換して正規化する。
  3. 背景画像適用（`applyImageBackgroundToPhase`）では、指定スライドが未編集の初期配置（`isDefaultInitialSlide === true`）ならそのスライドをその場でクリア（選手全員ベンチ化・ボール非表示・追従矢印除去）し、編集中なら直後に新規クリア済みスライドを挿入する。新規スライド ID は呼び出し側が `createSlideId` で注入し、純粋関数内で `crypto.randomUUID` を使わない。
  4. 境界線の自動フィット（`computeAutoFitBoundaryBox`）は、画像背景時は `DEFAULT_BOUNDARY_BOX_SCREENSHOT` 基準、ピッチ背景時は `getScreenOuterPitchRect(aspectRatio)` 基準とし、`pitchTransform`（`panX`, `panY`, `zoom`）がある場合はオフセット・拡大率を反映する。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - 本タスクは純粋関数の新規追加のみ。プロジェクト Reducer への配線は 181hb、UI Consumer 移行は 181j〜181k で行う。

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: 比率変換・背景画像・境界線純粋関数の実装
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/domain/aspect-transform.ts`
  - `[ADD]` `src/lib/tactical/domain/background-image.ts`
  - `[ADD]` `src/lib/tactical/domain/boundary-box.ts`
  - `[ADD]` `src/lib/tactical/__tests__/phase-domain-helpers.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/domain/aspect-transform.ts`
以下 1.1a〜1.1b の 2 ブロックを上から順に 1 ファイルへ連結して作成する。

**1.1a ヘルパー関数**
```ts
import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  DomainPlayerTrajectory,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import {
  type AspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';

function transformTrajectory(
  trajectory: DomainPlayerTrajectory | undefined,
  from: AspectRatio,
  to: AspectRatio,
): DomainPlayerTrajectory | undefined {
  if (!trajectory || !trajectory.controlPoint) return trajectory;
  const cp = transformCoord(trajectory.controlPoint, from, to, { clamp: true });
  return { ...trajectory, controlPoint: toScreenNormPoint(cp.x, cp.y, true) };
}

function transformPlayer(
  player: DomainPlayer,
  from: AspectRatio,
  to: AspectRatio,
): DomainPlayer {
  if (player.area === 'bench') return player;
  const pos = transformCoord({ x: player.x, y: player.y }, from, to, {
    clamp: true,
  });
  return {
    ...player,
    x: clampToScreenNorm(pos.x),
    y: clampToScreenNorm(pos.y),
    trajectory: transformTrajectory(player.trajectory, from, to),
  };
}

function transformZone(
  zone: DomainZoneAnnotation,
  from: AspectRatio,
  to: AspectRatio,
): DomainZoneAnnotation {
  if (zone.shapeType === 'polygon') {
    return {
      ...zone,
      points: zone.points.map((pt) => {
        const next = transformCoord(pt, from, to, { clamp: false });
        return toScreenNormPoint(next.x, next.y, false);
      }),
    };
  }
  const p1 = transformCoord({ x: zone.x, y: zone.y }, from, to, {
    clamp: false,
  });
  const p2 = transformCoord(
    { x: zone.x + zone.width, y: zone.y + zone.height },
    from,
    to,
    { clamp: false },
  );
  return {
    ...zone,
    x: clampToScreenNorm(Math.min(p1.x, p2.x)),
    y: clampToScreenNorm(Math.min(p1.y, p2.y)),
    width: Math.max(0.1, Math.abs(p2.x - p1.x)),
    height: Math.max(0.1, Math.abs(p2.y - p1.y)),
  };
}
```

**1.1b `transformSlideForAspect` 本体**
```ts
/**
 * アスペクト比変更に伴いスライド内の全オブジェクト座標を幾何変換する純粋関数。
 */
export function transformSlideForAspect(
  slide: DomainSlide,
  from: AspectRatio,
  to: AspectRatio,
): DomainSlide {
  if (from === to) return slide;

  const ballPos = transformCoord(
    { x: slide.ball.x, y: slide.ball.y },
    from,
    to,
    { clamp: true },
  );

  return {
    ...slide,
    players: slide.players.map((p) => transformPlayer(p, from, to)),
    arrows: slide.arrows.map((a) => {
      const cp = a.controlPoint
        ? transformCoord(a.controlPoint, from, to, { clamp: false })
        : undefined;
      return {
        ...a,
        points: a.points.map((pt) => {
          const next = transformCoord(pt, from, to, { clamp: false });
          return toScreenNormPoint(next.x, next.y, false);
        }),
        controlPoint: cp ? toScreenNormPoint(cp.x, cp.y, false) : undefined,
      };
    }),
    zones: slide.zones.map((z) => transformZone(z, from, to)),
    texts: slide.texts.map((t) => {
      const next = transformCoord({ x: t.x, y: t.y }, from, to, {
        clamp: false,
      });
      return {
        ...t,
        x: toScreenNormCoord(next.x),
        y: toScreenNormCoord(next.y),
      };
    }),
    ball: {
      ...slide.ball,
      x: clampToScreenNorm(ballPos.x),
      y: clampToScreenNorm(ballPos.y),
      trajectory: transformTrajectory(slide.ball.trajectory, from, to),
    },
  };
}
```

#### Task 1.2: `[ADD]` `src/lib/tactical/domain/background-image.ts`
以下 1.2a〜1.2b の 2 ブロックを上から順に 1 ファイルへ連結して作成する。

**1.2a 初期配置判定ヘルパー**
```ts
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  DEFAULT_442_AWAY,
  DEFAULT_442_HOME,
  DEFAULT_4231_HOME,
} from '@/lib/types/tactical/formations';
import {
  type AspectRatio,
  isVerticalAspectRatio,
  transformCoord,
} from '@/lib/types/tactical/primitives';
import { DEFAULT_BOUNDARY_BOX_SCREENSHOT } from '@/lib/types/tactical/slide';
import { toBenchPlayer } from './invariants';

function isPlayerInInitialPosition(
  p: DomainPlayer,
  aspectRatio: AspectRatio,
): boolean {
  if (
    p.area !== 'pitch' ||
    p.focus ||
    p.visionCone ||
    p.badges.length > 0 ||
    p.connectLines.length > 0 ||
    p.style.markerType !== 'circle'
  ) {
    return false;
  }
  const isVertical = isVerticalAspectRatio(aspectRatio);

  const defInitial =
    p.team === 'home'
      ? DEFAULT_4231_HOME.find((def) => def.shirtNo === p.shirtNo)
      : DEFAULT_442_AWAY.find((def) => def.shirtNo === p.shirtNo);
  if (defInitial) {
    const raw = { x: defInitial.x, y: defInitial.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    if (Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) {
      return true;
    }
  }

  const def442 = DEFAULT_442_HOME.find((def) => def.shirtNo === p.shirtNo);
  if (def442) {
    const raw =
      p.team === 'home'
        ? { x: def442.x, y: def442.y }
        : { x: 100 - def442.x, y: def442.y };
    const pos = isVertical ? transformCoord(raw, '16:9', aspectRatio) : raw;
    if (Math.abs(p.x - pos.x) < 0.01 && Math.abs(p.y - pos.y) < 0.01) {
      return true;
    }
  }

  return false;
}

/**
 * スライドが未編集の初期状態（空、または初期フォーメーション22名のみ）かを判定する。
 */
export function isDefaultInitialSlide(
  slide: DomainSlide | undefined,
  phase: Pick<
    DomainTacticalPhase,
    'backgroundType' | 'backgroundImageUrl' | 'aspectRatio'
  >,
): boolean {
  if (!slide) return false;
  if (
    phase.backgroundType !== 'pitch' ||
    Boolean(phase.backgroundImageUrl) ||
    slide.arrows.length > 0 ||
    slide.zones.length > 0 ||
    slide.texts.length > 0 ||
    slide.ball.x !== 50 ||
    slide.ball.y !== 50 ||
    !slide.ball.visible
  ) {
    return false;
  }
  if (slide.players.length === 0) return true;
  if (slide.players.length !== 22) return false;
  return slide.players.every((p) =>
    isPlayerInInitialPosition(p, phase.aspectRatio),
  );
}
```

**1.2b 背景画像適用・ピッチ復元関数**
```ts
/**
 * フェーズに背景画像を適用する純粋関数。
 * 対象スライドが未編集ならその場で選手をベンチへ下げ、編集中なら新規スライドを挿入する。
 */
export function applyImageBackgroundToPhase(
  phase: DomainTacticalPhase,
  url: string,
  targetSlideId: string,
  createSlideId: () => string,
): {
  readonly phase: DomainTacticalPhase;
  readonly activeSlideId: string;
} {
  const currentSlide =
    phase.slides.find((s) => s.id === targetSlideId) ?? phase.slides[0];
  const screenshotBox = { ...DEFAULT_BOUNDARY_BOX_SCREENSHOT };

  if (!currentSlide) {
    return { phase, activeSlideId: targetSlideId };
  }

  const isEdited = !isDefaultInitialSlide(currentSlide, phase);

  if (isEdited) {
    const newSlideId = createSlideId();
    const slideCount = phase.slides.length;
    const newSlide: DomainSlide = {
      id: newSlideId,
      index: slideCount,
      label: `Scene ${slideCount + 1}`,
      players: currentSlide.players.map((p) => toBenchPlayer(p)),
      arrows: [],
      zones: [],
      texts: [],
      ball: {
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(50),
        visible: false,
      },
      transitionDurationMs: 1000,
      pauseMs: 500,
      easing: 'ease-in-out',
    };

    const currentIdx = phase.slides.findIndex((s) => s.id === currentSlide.id);
    const nextSlides = [...phase.slides];
    if (currentIdx !== -1) {
      nextSlides.splice(currentIdx + 1, 0, newSlide);
    } else {
      nextSlides.push(newSlide);
    }

    return {
      phase: {
        ...phase,
        backgroundType: 'image',
        backgroundImageUrl: url,
        boundaryBox: screenshotBox,
        slides: nextSlides.map((s, idx) => ({ ...s, index: idx })),
      },
      activeSlideId: newSlideId,
    };
  }

  return {
    phase: {
      ...phase,
      backgroundType: 'image',
      backgroundImageUrl: url,
      boundaryBox: screenshotBox,
      slides: phase.slides.map((s) =>
        s.id !== currentSlide.id
          ? s
          : {
              ...s,
              ball: { ...s.ball, visible: false, trajectory: undefined },
              players: s.players.map((p) => toBenchPlayer(p)),
              arrows: s.arrows.filter(
                (a) => !a.sourcePlayerId && !a.targetPlayerId,
              ),
            },
      ),
    },
    activeSlideId: currentSlide.id,
  };
}

/** フェーズの背景を標準ピッチへ戻す純粋関数。 */
export function restoreDefaultPitchInPhase(
  phase: DomainTacticalPhase,
): DomainTacticalPhase {
  return {
    ...phase,
    backgroundType: 'pitch',
    backgroundImageUrl: undefined,
  };
}
```

#### Task 1.3: `[ADD]` `src/lib/tactical/domain/boundary-box.ts`
```ts
import {
  getScreenOuterPitchRect,
  PITCH_BOUNDARY_CONFIGS,
} from '@/lib/tactical/pitch-geometry';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';
import {
  type BoundaryBox,
  createXBoundaryBox,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  type PitchTransform,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical/slide';

export interface AutoFitBoundaryOptions {
  readonly aspectRatio: AspectRatio;
  readonly backgroundType?: 'pitch' | 'image' | 'blank';
  readonly pitchTransform?: PitchTransform;
  readonly pitchRect?: { readonly width: number; readonly height: number };
}

/**
 * ピッチ外枠または背景画像枠にフィットする BoundaryBox を算出する純粋関数。
 */
export function computeAutoFitBoundaryBox(
  options: AutoFitBoundaryOptions,
): BoundaryBox {
  const {
    aspectRatio,
    backgroundType = 'pitch',
    pitchTransform,
    pitchRect,
  } = options;
  const isImageBg = backgroundType === 'image';
  const config =
    PITCH_BOUNDARY_CONFIGS[aspectRatio] ?? PITCH_BOUNDARY_CONFIGS['16:9'];
  const pitchWidth = pitchRect?.width ?? config.widthPx;
  const pitchHeight = pitchRect?.height ?? config.heightPx;

  const panX = pitchTransform?.panX ?? 0;
  const panY = pitchTransform?.panY ?? 0;
  const zoom = pitchTransform?.zoom ?? 1;
  const hasTransform = panX !== 0 || panY !== 0 || zoom !== 1;

  if (isImageBg) {
    return {
      x:
        Math.round(
          ((panX / pitchWidth) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.x * zoom) *
            100,
        ) / 100,
      y:
        Math.round(
          ((panY / pitchHeight) * 100 +
            DEFAULT_BOUNDARY_BOX_SCREENSHOT.y * zoom) *
            100,
        ) / 100,
      width:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.width * zoom * 100) / 100,
      height:
        Math.round(DEFAULT_BOUNDARY_BOX_SCREENSHOT.height * zoom * 100) / 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }

  if (hasTransform) {
    return {
      x: Math.round((panX / pitchWidth) * 100 * 100) / 100,
      y: Math.round((panY / pitchHeight) * 100 * 100) / 100,
      width: Math.round(100 * zoom * 100) / 100,
      height: Math.round(100 * zoom * 100) / 100,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }

  const outer = getScreenOuterPitchRect(aspectRatio);
  return {
    x: outer.left,
    y: outer.top,
    width: outer.width,
    height: outer.height,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  };
}

/**
 * X メディアプリセットキーに応じた BoundaryBox を算出する純粋関数。
 */
export function computeXMediaPresetBoundaryBox(
  presetKey: XMediaPresetKey | 'pitch_fit',
  aspectRatio: AspectRatio,
): BoundaryBox {
  if (presetKey === 'pitch_fit') {
    const outer = getScreenOuterPitchRect(aspectRatio);
    return {
      x: outer.left,
      y: outer.top,
      width: outer.width,
      height: outer.height,
      enabled: true,
      visible: false,
      fitTarget: 'pitch',
    };
  }
  const preset = X_MEDIA_PRESETS[presetKey];
  return createXBoundaryBox(preset?.ratio ?? '16:9', '16:9');
}
```

#### Task 1.4: `[ADD]` `src/lib/tactical/__tests__/phase-domain-helpers.test.ts`
モック不使用。純粋関数 I/O テスト。以下 1.4a〜1.4b の 2 ブロックを上から順に 1 ファイルへ連結して作成する。

**1.4a ヘルパーと比率変換テスト**
```ts
import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormCoord,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import { transformSlideForAspect } from '../domain/aspect-transform';
import {
  applyImageBackgroundToPhase,
  isDefaultInitialSlide,
  restoreDefaultPitchInPhase,
} from '../domain/background-image';
import {
  computeAutoFitBoundaryBox,
  computeXMediaPresetBoundaryBox,
} from '../domain/boundary-box';

const baseStyle = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#034694',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

const makePlayer = (
  id: string,
  x: number,
  y: number,
  overrides?: Partial<PitchPlayer>,
): PitchPlayer => ({
  id,
  area: 'pitch',
  team: 'home',
  x: clampToScreenNorm(x),
  y: clampToScreenNorm(y),
  style: baseStyle,
  connectLines: [],
  badges: [],
  ...overrides,
});

const makeSlide = (overrides?: Partial<DomainSlide>): DomainSlide => ({
  id: 's1',
  index: 0,
  players: [],
  arrows: [],
  zones: [],
  texts: [],
  ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
  transitionDurationMs: 1000,
  pauseMs: 500,
  easing: 'ease-in-out',
  ...overrides,
});

describe('transformSlideForAspect', () => {
  it('選手・ボールはクランプして変換し、矢印・テキストは画面外座標も維持する', () => {
    const slide = makeSlide({
      players: [makePlayer('p1', 80, 30)],
      arrows: [
        {
          id: 'a1',
          annotationType: 'arrow',
          arrowType: 'pass',
          curveType: 'straight',
          points: [
            toScreenNormPoint(-10, 110, false),
            toScreenNormPoint(50, 50),
          ],
          color: '#ffffff',
          strokeWidth: 3,
          dashArray: [],
          startMarker: 'none',
          endMarker: 'arrow',
        },
      ],
      texts: [
        {
          id: 't1',
          annotationType: 'text',
          x: toScreenNormCoord(-5),
          y: toScreenNormCoord(105),
          content: 'Out',
          fontSize: 16,
          color: '#ffffff',
          bold: false,
          italic: false,
        },
      ],
    });

    const transformed = transformSlideForAspect(slide, '16:9', '4:5');
    expect(transformed.players[0].x).toBeGreaterThanOrEqual(-15);
    expect(transformed.players[0].x).toBeLessThanOrEqual(115);
    expect(
      transformed.arrows[0].points[0].x < 0 ||
        transformed.arrows[0].points[0].y > 100,
    ).toBe(true);
    expect(transformed.texts[0].x < 0 || transformed.texts[0].y > 100).toBe(
      true,
    );
  });
});
```

**1.4b 背景画像・境界線テスト**
```ts
const makePhase = (
  overrides?: Partial<DomainTacticalPhase>,
): DomainTacticalPhase => ({
  id: 'ph1',
  name: 'Phase 1',
  aspectRatio: '16:9',
  boundaryBox: {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    enabled: true,
    visible: false,
    fitTarget: 'pitch',
  },
  backgroundType: 'pitch',
  slides: [makeSlide()],
  ...overrides,
});

describe('applyImageBackgroundToPhase & restoreDefaultPitchInPhase', () => {
  it('未編集スライドではその場で背景画像を適用し、編集中スライドでは新規スライドを追加する', () => {
    const initialPhase = makePhase();
    expect(isDefaultInitialSlide(initialPhase.slides[0], initialPhase)).toBe(
      true,
    );

    const first = applyImageBackgroundToPhase(
      initialPhase,
      'data:image/png;base64,img1',
      's1',
      () => 's-unused',
    );
    expect(first.phase.slides).toHaveLength(1);
    expect(first.phase.backgroundType).toBe('image');
    expect(first.phase.backgroundImageUrl).toBe('data:image/png;base64,img1');
    expect(first.phase.boundaryBox.width).toBe(96);
    expect(first.phase.slides[0].ball.visible).toBe(false);

    // すでに image 背景になっているため 2 回目は編集中扱いになり新規スライドが追加される
    const second = applyImageBackgroundToPhase(
      first.phase,
      'data:image/png;base64,img2',
      's1',
      () => 's2',
    );
    expect(second.phase.slides).toHaveLength(2);
    expect(second.activeSlideId).toBe('s2');
    expect(second.phase.backgroundImageUrl).toBe('data:image/png;base64,img2');

    const restored = restoreDefaultPitchInPhase(second.phase);
    expect(restored.backgroundType).toBe('pitch');
    expect(restored.backgroundImageUrl).toBeUndefined();
  });
});

describe('computeAutoFitBoundaryBox & computeXMediaPresetBoundaryBox', () => {
  it('16:9 ズーム・パン時の自動フィットと X メディアプリセットを計算する', () => {
    const zoomed = computeAutoFitBoundaryBox({
      aspectRatio: '16:9',
      pitchTransform: {
        panX: 192,
        panY: 108,
        zoom: 1.5,
        tilt: 0,
        isLocked: false,
      },
    });
    expect(zoomed.x).toBeCloseTo(10, 2);
    expect(zoomed.y).toBeCloseTo(10, 2);
    expect(zoomed.width).toBeCloseTo(150, 2);
    expect(zoomed.height).toBeCloseTo(150, 2);

    const preset45 = computeXMediaPresetBoundaryBox('single_image_4_5', '16:9');
    expect(preset45.width).toBe(45);
    expect(preset45.height).toBe(100);
    expect(preset45.x).toBe(27.5);
  });
});
```
- **Phase 1 検証**: `bun run ai:check src/lib/tactical/domain/aspect-transform.ts src/lib/tactical/domain/background-image.ts src/lib/tactical/domain/boundary-box.ts src/lib/tactical/__tests__/phase-domain-helpers.test.ts`

## 4. 全 Phase 完了後（Planner）
- `GIT_EXTERNAL_DIFF=difft rtk git diff` で Before ➔ After 通りか確認 ➔ Status を `DONE` ➔ `bun run ai:commit -m "feat(tactical): add aspect transform, image background and boundary fit domain functions"`
