# TASK-181ke: Left Panel 群（SceneCanvasThumbnail / PhaseSection / LeftPanel & Tests）Domain 型移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181k)
- **DependsOn**: TASK-181jm
- **Commit**: `refactor(tactical): migrate left-panel components and tests to Domain types and renderTacticalPhaseFrameToCanvas`

---

## 🎯 目的・背景

`src/features/tactical-unified/panels/left-panel/` 配下の `scene-canvas-thumbnail.tsx`・`phase-section.tsx`・`left-panel.tsx` および `left-panel.test.tsx` から `@/lib/types/tactical-unified`（`Slide` / `TacticalPhase` / `createDefaultSlide`）への依存を完全除去し、`DomainSlide` / `DomainTacticalPhase` および `renderTacticalPhaseFrameToCanvas` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `panels/left-panel/**` 全体に `@/lib/types/tactical-unified` の import を残してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `scene-canvas-thumbnail.tsx`・`phase-section.tsx`・`left-panel.tsx`・`left-panel.test.tsx` 移行（3プロダクション + 1テスト）

---

### Phase 1: Left Panel コンポーネント・テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`
  - `src/features/tactical-unified/panels/left-panel/phase-section.tsx`
  - `src/features/tactical-unified/panels/left-panel/left-panel.tsx`
  - `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`

**Before:**
```tsx
import { memo, useEffect, useMemo, useRef } from 'react';
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import type {
  AspectRatio,
  PitchAppearanceConfig,
  Slide,
} from '@/lib/types/tactical-unified';

export interface SceneCanvasThumbnailProps {
  slide: Slide;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  pitchAppearance?: PitchAppearanceConfig;
  className?: string;
}
```
**After:**
```tsx
import { memo, useEffect, useMemo, useRef } from 'react';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
import {
  type BoundaryBox,
  getDefaultBoundaryBoxForAspect,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical/slide';

export interface SceneCanvasThumbnailProps {
  slide: DomainSlide;
  width?: number;
  height?: number;
  aspectRatio?: AspectRatio;
  boundaryBox?: BoundaryBox;
  pitchAppearance?: PitchAppearanceConfig;
  className?: string;
}
```

**Before:**
```tsx
export const SceneCanvasThumbnail = memo(function SceneCanvasThumbnail({
  slide,
  width = 120,
  height: propHeight,
  aspectRatio = '16:9',
  pitchAppearance,
  className,
}: SceneCanvasThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = calculateDimensions(width, propHeight, aspectRatio);

  const phase = useMemo(
    () =>
      normalizePhases({
        slides: [slide],
        aspectRatio,
        boundaryBox: slide.boundaryBox,
      })[0],
    [slide, aspectRatio],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(dims.width * dpr);
    canvas.height = Math.round(dims.height * dpr);
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderTacticalFrameToCanvas(ctx, {
      slides: [slide],
      phase,
      timeMs: 0,
      width: dims.width,
      height: dims.height,
      aspectRatio,
      boundaryBox: slide.boundaryBox,
      pitchAppearance,
      applyEffects: false,
    });
    ctx.restore();
  }, [slide, phase, dims.width, dims.height, aspectRatio, pitchAppearance]);
```
**After:**
```tsx
export const SceneCanvasThumbnail = memo(function SceneCanvasThumbnail({
  slide,
  width = 120,
  height: propHeight,
  aspectRatio = '16:9',
  boundaryBox,
  pitchAppearance,
  className,
}: SceneCanvasThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dims = calculateDimensions(width, propHeight, aspectRatio);

  const phase = useMemo<DomainTacticalPhase>(
    () => ({
      id: slide.id,
      name: slide.label || 'Scene',
      aspectRatio,
      boundaryBox: boundaryBox ?? getDefaultBoundaryBoxForAspect(aspectRatio),
      backgroundType: 'pitch',
      slides: [slide],
    }),
    [slide, aspectRatio, boundaryBox],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr =
      typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.round(dims.width * dpr);
    canvas.height = Math.round(dims.height * dpr);
    canvas.style.width = `${dims.width}px`;
    canvas.style.height = `${dims.height}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    renderTacticalPhaseFrameToCanvas({
      ctx,
      phase,
      timeMs: 0,
      width: dims.width,
      height: dims.height,
      pitchAppearance,
      applyEffects: false,
    });
    ctx.restore();
  }, [phase, dims.width, dims.height, pitchAppearance]);
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/left-panel/phase-section.tsx`

**Before:**
```tsx
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type {
  PitchAppearanceConfig,
  TacticalPhase,
} from '@/lib/types/tactical-unified';
import { cn } from '@/lib/utils';
import { SceneCanvasThumbnail } from './scene-canvas-thumbnail';

export interface PhaseSectionProps {
  phase: TacticalPhase;
  isExpanded: boolean;
```
**After:**
```tsx
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import type { PitchAppearanceConfig } from '@/lib/types/tactical/slide';
import { cn } from '@/lib/utils';
import { SceneCanvasThumbnail } from './scene-canvas-thumbnail';

export interface PhaseSectionProps {
  phase: DomainTacticalPhase;
  isExpanded: boolean;
```

**Before:**
```tsx
                  <SceneCanvasThumbnail
                    slide={slide}
                    width={96}
                    height={54}
                    pitchAppearance={pitchAppearance}
                    className="w-full h-full object-contain"
                  />
```
**After:**
```tsx
                  <SceneCanvasThumbnail
                    slide={slide}
                    width={96}
                    height={54}
                    aspectRatio={phase.aspectRatio}
                    boundaryBox={phase.boundaryBox}
                    pitchAppearance={pitchAppearance}
                    className="w-full h-full object-contain"
                  />
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/left-panel/left-panel.tsx`

**Before:**
```tsx
import { AlertTriangle, FolderPlus, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import type {
  PitchAppearanceConfig,
  Slide,
  TacticalPhase,
} from '@/lib/types/tactical-unified';
import { PhaseSection } from './phase-section';

export interface LeftPanelProps {
  phases?: TacticalPhase[];
  activePhaseId?: string;
  activeSlideId?: string;
  pitchAppearance?: PitchAppearanceConfig;
  onSelectScene?: (phaseId: string, slideId: string) => void;
  onAddPhase?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void;
  onAddSlideToPhase?: (phaseId: string) => void;
  // 後方互換性プロパティ (Phase 4 移行用)
  slides?: Slide[];
  onSelectSlide?: (slideId: string) => void;
  onAddSlide?: () => void;
}
```
**After:**
```tsx
import { AlertTriangle, FolderPlus, Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  getDefaultBoundaryBoxForAspect,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical/slide';
import { PhaseSection } from './phase-section';

export interface LeftPanelProps {
  phases?: readonly DomainTacticalPhase[];
  activePhaseId?: string;
  activeSlideId?: string;
  pitchAppearance?: PitchAppearanceConfig;
  onSelectScene?: (phaseId: string, slideId: string) => void;
  onAddPhase?: () => void;
  onDeletePhase?: (phaseId: string) => void;
  onRenamePhase?: (phaseId: string, name: string) => void;
  onAddSlideToPhase?: (phaseId: string) => void;
  slides?: readonly DomainSlide[];
  onSelectSlide?: (slideId: string) => void;
  onAddSlide?: () => void;
}
```

**Before:**
```tsx
  // フォールバック: phases がなく slides のみ渡された場合は単一フェーズとして扱う
  const phases: TacticalPhase[] =
    propPhases ??
    (slides
      ? [
          {
            id: 'default-phase',
            name: 'Tactical Phase 1',
            slides,
          },
        ]
      : []);
```
**After:**
```tsx
  const phases: readonly DomainTacticalPhase[] =
    propPhases ??
    (slides && slides.length > 0
      ? [
          {
            id: 'default-phase',
            name: 'Tactical Phase 1',
            aspectRatio: '4:5',
            boundaryBox: getDefaultBoundaryBoxForAspect('4:5'),
            backgroundType: 'pitch',
            slides: [slides[0], ...slides.slice(1)],
          },
        ]
      : []);
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import {
  createDefaultSlide,
  type TacticalPhase,
} from '@/lib/types/tactical-unified';
import { LeftPanel } from '../left-panel';
import { SceneCanvasThumbnail } from '../scene-canvas-thumbnail';

vi.mock('@/lib/tactical/export/tactical-frame-renderer', () => ({
  renderTacticalFrameToCanvas: vi.fn(),
}));

describe('LeftPanel (Phase Structuring & PowerPoint-style nested panel)', () => {
  const dummyPhases: TacticalPhase[] = [
    {
      id: 'phase-1',
      name: 'Build-up Phase',
      slides: [
        {
          ...createDefaultSlide(0, 'slide-1-1'),
          label: 'Initial Formation',
          pauseMs: 500,
        },
        {
          ...createDefaultSlide(1, 'slide-1-2'),
          label: 'Progression',
          pauseMs: 1000,
        },
      ],
    },
    {
      id: 'phase-2',
      name: 'Finishing Phase',
      slides: [
        {
          ...createDefaultSlide(0, 'slide-2-1'),
          label: 'Final Pass',
          pauseMs: 800,
        },
      ],
    },
  ];
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type {
  DomainSlide,
  DomainTacticalPhase,
} from '@/lib/types/tactical/domain-hierarchy';
import { getDefaultBoundaryBoxForAspect } from '@/lib/types/tactical/slide';
import { LeftPanel } from '../left-panel';
import { SceneCanvasThumbnail } from '../scene-canvas-thumbnail';

vi.mock('@/lib/tactical/export/tactical-phase-frame-renderer', () => ({
  renderTacticalPhaseFrameToCanvas: vi.fn(),
}));

function createTestSlide(
  index: number,
  id: string,
  label: string,
  pauseMs: number,
): DomainSlide {
  return {
    id,
    index,
    label,
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs: 1000,
    pauseMs,
    easing: 'ease-in-out',
  };
}

describe('LeftPanel (Phase Structuring & PowerPoint-style nested panel)', () => {
  const dummyPhases: DomainTacticalPhase[] = [
    {
      id: 'phase-1',
      name: 'Build-up Phase',
      aspectRatio: '4:5',
      boundaryBox: getDefaultBoundaryBoxForAspect('4:5'),
      backgroundType: 'pitch',
      slides: [
        createTestSlide(0, 'slide-1-1', 'Initial Formation', 500),
        createTestSlide(1, 'slide-1-2', 'Progression', 1000),
      ],
    },
    {
      id: 'phase-2',
      name: 'Finishing Phase',
      aspectRatio: '4:5',
      boundaryBox: getDefaultBoundaryBoxForAspect('4:5'),
      backgroundType: 'pitch',
      slides: [createTestSlide(0, 'slide-2-1', 'Final Pass', 800)],
    },
  ];
```

**Before:**
```tsx
  describe('SceneCanvasThumbnail', () => {
    it('renders SceneCanvasThumbnail and calls renderTacticalFrameToCanvas with valid options', () => {
      // Setup HTMLCanvasElement mock for getContext in JSDOM
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { container } = render(
        <SceneCanvasThumbnail
          slide={slide}
          width={100}
          height={60}
          aspectRatio="16:9"
        />,
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
      expect(renderTacticalFrameToCanvas).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          slides: [slide],
          timeMs: 0,
          width: 100,
          height: 60,
          aspectRatio: '16:9',
          applyEffects: false,
        }),
      );

      getContextSpy.mockRestore();
    });

    it('calculates aspect ratios correctly for 9:16, 4:5, and 1:1', () => {
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { rerender } = render(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="9:16" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 178, // round(100 * 16 / 9)
          aspectRatio: '9:16',
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="4:5" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 125, // round(100 * 5 / 4)
          aspectRatio: '4:5',
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="1:1" />,
      );
      expect(renderTacticalFrameToCanvas).toHaveBeenLastCalledWith(
        mockCtx,
        expect.objectContaining({
          width: 100,
          height: 100,
          aspectRatio: '1:1',
        }),
      );

      getContextSpy.mockRestore();
    });
  });
```
**After:**
```tsx
  describe('SceneCanvasThumbnail', () => {
    it('renders SceneCanvasThumbnail and calls renderTacticalPhaseFrameToCanvas with valid options', () => {
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { container } = render(
        <SceneCanvasThumbnail
          slide={slide}
          width={100}
          height={60}
          aspectRatio="16:9"
        />,
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeDefined();
      expect(renderTacticalPhaseFrameToCanvas).toHaveBeenCalledWith(
        expect.objectContaining({
          ctx: mockCtx,
          phase: expect.objectContaining({
            aspectRatio: '16:9',
            slides: [slide],
          }),
          timeMs: 0,
          width: 100,
          height: 60,
          applyEffects: false,
        }),
      );

      getContextSpy.mockRestore();
    });

    it('calculates aspect ratios correctly for 9:16, 4:5, and 1:1', () => {
      const mockCtx = {
        save: vi.fn(),
        scale: vi.fn(),
        restore: vi.fn(),
      };
      const getContextSpy = vi
        .spyOn(HTMLCanvasElement.prototype, 'getContext')
        .mockReturnValue(mockCtx as unknown as CanvasRenderingContext2D);

      const slide = dummyPhases[0]!.slides[0]!;
      const { rerender } = render(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="9:16" />,
      );
      expect(renderTacticalPhaseFrameToCanvas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ctx: mockCtx,
          width: 100,
          height: 178,
          phase: expect.objectContaining({ aspectRatio: '9:16' }),
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="4:5" />,
      );
      expect(renderTacticalPhaseFrameToCanvas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ctx: mockCtx,
          width: 100,
          height: 125,
          phase: expect.objectContaining({ aspectRatio: '4:5' }),
        }),
      );

      rerender(
        <SceneCanvasThumbnail slide={slide} width={100} aspectRatio="1:1" />,
      );
      expect(renderTacticalPhaseFrameToCanvas).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ctx: mockCtx,
          width: 100,
          height: 100,
          phase: expect.objectContaining({ aspectRatio: '1:1' }),
        }),
      );

      getContextSpy.mockRestore();
    });
  });
```

---

## ✅ 完了検証コマンド

```bash
bun run ai:check src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/panels/left-panel/phase-section.tsx src/features/tactical-unified/panels/left-panel/left-panel.tsx src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx
```
