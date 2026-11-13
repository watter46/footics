# TASK-181jc: Timeline カード・コネクタ・トランジションポップオーバー・Directorトラック移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): migrate timeline card, connector, transition popovers, and director tracks to DomainSlide and 3-frequency stores`

---

## 🎯 目的・背景

`panels/timeline/` 配下のリーフ UI（`SlideCard`, `TransitionConnector`, `SlideTransitionPopover`, `BatchTransitionPopover`, `DirectorActionTrack`, `DirectorGlobalTrack`）およびそのテスト群から Legacy ストア（`useTacticalUnifiedStore*`）と `@/lib/types/tactical-unified` を排除し、`DomainSlide` + `DocumentStore` / `SessionStore` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記 6 プロダクションファイルおよび 3 テストファイル内に `useTacticalUnifiedStore` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` からの import が残存してはならない。
- 新設・更新するテストで `vi.mock` による内部ストア・内部フックのモックを行ってはならない（実 `TacticalStoreProvider` を使用する）。

---

## 🏗️ Phase 構成

- **Phase 1**: SlideCard / TransitionConnector / Popover 群の移行（4プロダクション + 2テスト）
- **Phase 2**: Director トラック型整理（2プロダクション + 1テスト）

---

### Phase 1: SlideCard / TransitionConnector / Popover 群の移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx`
  - `src/features/tactical-unified/panels/timeline/transition-connector.tsx`
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/timeline/slide-card.tsx`

**Before:**
```tsx
import type { Slide } from '@/lib/types/tactical-unified';
import { SlideCardActions } from './slide-card-actions';
import { SlideContextMenu } from './slide-context-menu';
import { SlideTransitionPopover } from './slide-transition-popover';

export interface SlideCardProps {
  slide: Slide;
```
**After:**
```tsx
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { SlideCardActions } from './slide-card-actions';
import { SlideContextMenu } from './slide-context-menu';
import { SlideTransitionPopover } from './slide-transition-popover';

export interface SlideCardProps {
  slide: DomainSlide;
```

**Before:**
```tsx
export function SlideCardOverlay({
  slide,
  index,
}: {
  slide: Slide;
  index: number;
}) {
```
**After:**
```tsx
export function SlideCardOverlay({
  slide,
  index,
}: {
  slide: DomainSlide;
  index: number;
}) {
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/timeline/transition-connector.tsx`

**Before:**
```tsx
import type React from 'react';
import { useState } from 'react';
import type { Slide } from '@/lib/types/tactical-unified';
import { SlideTransitionPopover } from './slide-transition-popover';

export interface TransitionConnectorProps {
  targetSlide: Slide;
```
**After:**
```tsx
import type React from 'react';
import { useState } from 'react';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { SlideTransitionPopover } from './slide-transition-popover';

export interface TransitionConnectorProps {
  targetSlide: DomainSlide;
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { Easing, Slide } from '@/lib/types/tactical-unified';

export interface SlideTransitionPopoverProps {
  slide: Slide;
  index: number;
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
}
```
**After:**
```tsx
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { Easing } from '@/lib/types/tactical/slide';

export interface SlideTransitionPopoverProps {
  slide: DomainSlide;
  index: number;
  isOpen: boolean;
  onClose: () => void;
  referenceElement: HTMLElement | null;
}
```

**Before:**
```tsx
export function SlideTransitionPopover({
  slide,
  index,
  isOpen,
  onClose,
  referenceElement,
}: SlideTransitionPopoverProps) {
  const updateSlideTransition = useTacticalUnifiedStoreContext(
    (s) => s.updateSlideTransition,
  );
  const popoverRef = useRef<HTMLDivElement>(null);
```
**After:**
```tsx
export function SlideTransitionPopover({
  slide,
  index,
  isOpen,
  onClose,
  referenceElement,
}: SlideTransitionPopoverProps) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const popoverRef = useRef<HTMLDivElement>(null);
```

**Before:**
```tsx
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateSlideTransition(slide.id, {
        transitionDurationMs: Math.round(val * 1000),
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateSlideTransition(slide.id, {
        pauseMs: Math.round(val * 1000),
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSlideTransition(slide.id, {
      easing: e.target.value as Easing,
    });
  };
```
**After:**
```tsx
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatchSlide(activePhaseId, slide.id, {
        type: 'UPDATE_SLIDE_META',
        patch: { transitionDurationMs: Math.round(val * 1000) },
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatchSlide(activePhaseId, slide.id, {
        type: 'UPDATE_SLIDE_META',
        patch: { pauseMs: Math.round(val * 1000) },
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatchSlide(activePhaseId, slide.id, {
      type: 'UPDATE_SLIDE_META',
      patch: { easing: e.target.value as Easing },
    });
  };
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`

**Before:**
```tsx
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { Easing } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { Easing } from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function BatchTransitionPopover({
  isOpen,
  onClose,
  referenceElement,
}: BatchTransitionPopoverProps) {
  const slides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const updateAllSlideTransitions = useTacticalUnifiedStoreContext(
    (s) => s.updateAllSlideTransitions,
  );
  const popoverRef = useRef<HTMLDivElement>(null);
```
**After:**
```tsx
export function BatchTransitionPopover({
  isOpen,
  onClose,
  referenceElement,
}: BatchTransitionPopoverProps) {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const slides = selectDomainActivePhaseSlides(project, activePhaseId);
  const popoverRef = useRef<HTMLDivElement>(null);
```

**Before:**
```tsx
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateAllSlideTransitions({
        transitionDurationMs: Math.round(val * 1000),
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      updateAllSlideTransitions({
        pauseMs: Math.round(val * 1000),
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateAllSlideTransitions({
      easing: e.target.value as Easing,
    });
  };
```
**After:**
```tsx
  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatch({
        type: 'UPDATE_ALL_SLIDE_TRANSITIONS',
        phaseId: activePhaseId,
        patch: { transitionDurationMs: Math.round(val * 1000) },
      });
    }
  };

  const handlePauseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number.parseFloat(e.target.value);
    if (!Number.isNaN(val)) {
      dispatch({
        type: 'UPDATE_ALL_SLIDE_TRANSITIONS',
        phaseId: activePhaseId,
        patch: { pauseMs: Math.round(val * 1000) },
      });
    }
  };

  const handleEasingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    dispatch({
      type: 'UPDATE_ALL_SLIDE_TRANSITIONS',
      phaseId: activePhaseId,
      patch: { easing: e.target.value as Easing },
    });
  };
```

#### Task 1.5 `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`

`TacticalStoreProvider` + 実 `DocumentStore` / `SessionStore` に差し替え、`updateSlideTransition` スパイではなく実 `docStore.getState().dispatchSlide` / `docStore.getState().project` 状態を検証する（全テストケースの JSX を `<TacticalStoreProvider stores={...}>` ラッパーでラップ）。

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { createDefaultSlide, type Slide } from '@/lib/types/tactical-unified';
import { BatchTransitionPopover } from '../batch-transition-popover';
import { SlideCard } from '../slide-card';
import { SlideCardActions } from '../slide-card-actions';
import { SlideContextMenu } from '../slide-context-menu';
import { SlideTransitionPopover } from '../slide-transition-popover';

describe('SlideTransitionPopover Component', () => {
  const dummySlide = {
    ...createDefaultSlide(1, 'slide-2'),
    label: 'Scene 2',
    transitionDurationMs: 1500,
    pauseMs: 800,
    easing: 'ease-in-out' as const,
  };

  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createDocumentStore,
  type DocumentStore,
} from '@/features/tactical-unified/stores/document-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { BatchTransitionPopover } from '../batch-transition-popover';
import { SlideCard } from '../slide-card';
import { SlideCardActions } from '../slide-card-actions';
import { SlideContextMenu } from '../slide-context-menu';
import { SlideTransitionPopover } from '../slide-transition-popover';

function createTestSetup() {
  const base = createDefaultTacticalProject();
  const phase = base.phases[0]!;
  const slide1 = phase.slides[0]!;
  const slide2: DomainSlide = {
    ...slide1,
    id: 'slide-2',
    index: 1,
    label: 'Scene 2',
    transitionDurationMs: 1500,
    pauseMs: 800,
    easing: 'ease-in-out',
  };
  const project = { ...base, phases: [{ ...phase, slides: [slide1, slide2] }] };
  const docStore = createDocumentStore(project);
  const sessStore = createSessionStore({
    activePhaseId: phase.id,
    activeSlideId: slide2.id,
  });
  const renderWithProvider = (ui: ReactNode) =>
    render(
      <TacticalStoreProvider stores={{ documentStore: docStore, sessionStore: sessStore }}>
        {ui}
      </TacticalStoreProvider>,
    );
  return { docStore, slide1, slide2, renderWithProvider };
}

describe('SlideTransitionPopover Component', () => {
```

注記: Task 1.5 のテスト実装では同ファイル内の 4 箇所（`SlideTransitionPopover` / `SlideCard` / `BatchTransitionPopover` / `Design System`）それぞれで `createTestSetup()` の `renderWithProvider` を呼び、変更アサーションは `docStore.getState().project.phases[0]?.slides[1]` に対して行うこと。

**Before:**
```tsx
  it('updates transitionDurationMs and pauseMs on change', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');

    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const durationInput = screen.getByLabelText(/移動時間/i);
    fireEvent.change(durationInput, { target: { value: '2.5' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      transitionDurationMs: 2500,
    });

    const pauseInput = screen.getByLabelText(/静止時間/i);
    fireEvent.change(pauseInput, { target: { value: '1.2' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      pauseMs: 1200,
    });
  });

  it('updates easing on change', () => {
    const updateSpy = vi.spyOn(
      useTacticalUnifiedStore.getState(),
      'updateSlideTransition',
    );
    const anchor = document.createElement('div');

    render(
      <SlideTransitionPopover
        slide={dummySlide}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    const easingSelect = screen.getByLabelText(/加減速/i);
    fireEvent.change(easingSelect, { target: { value: 'linear' } });

    expect(updateSpy).toHaveBeenCalledWith('slide-2', {
      easing: 'linear',
    });
  });
```
**After:**
```tsx
  it('updates transitionDurationMs and pauseMs on change', () => {
    const { docStore, slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');

    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    fireEvent.change(screen.getByLabelText(/移動時間/i), { target: { value: '2.5' } });
    expect(docStore.getState().project.phases[0]?.slides[1]?.transitionDurationMs).toBe(2500);

    fireEvent.change(screen.getByLabelText(/静止時間/i), { target: { value: '1.2' } });
    expect(docStore.getState().project.phases[0]?.slides[1]?.pauseMs).toBe(1200);
  });

  it('updates easing on change', () => {
    const { docStore, slide2, renderWithProvider } = createTestSetup();
    const anchor = document.createElement('div');

    renderWithProvider(
      <SlideTransitionPopover
        slide={slide2}
        index={1}
        isOpen={true}
        onClose={vi.fn()}
        referenceElement={anchor}
      />,
    );

    fireEvent.change(screen.getByLabelText(/加減速/i), { target: { value: 'linear' } });
    expect(docStore.getState().project.phases[0]?.slides[1]?.easing).toBe('linear');
  });
```

注記: 同ファイル内 `render(<SlideTransitionPopover .../>)`・`render(<SlideCard .../>)`・`render(<BatchTransitionPopover .../>)`・`createDefaultSlide` の残余箇所も `createTestSetup()`（`slide1`, `slide2`, `renderWithProvider`）に置換すること。

#### Task 1.6 `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Slide } from '@/lib/types/tactical-unified';
import { TransitionConnector } from '../transition-connector';

function createMockSlide(overrides?: Partial<Slide>): Slide {
  return {
    id: 'mock-slide-2',
    index: 1,
    label: 'Scene 2',
    players: [],
    drawings: [],
    transitionDurationMs: 1500,
    pauseMs: 500,
    easing: 'ease-in-out',
    ...overrides,
  } as Slide;
}
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import { TransitionConnector } from '../transition-connector';

function renderWithProvider(ui: ReactNode) {
  return render(<TacticalStoreProvider>{ui}</TacticalStoreProvider>);
}

function createMockSlide(overrides?: Partial<DomainSlide>): DomainSlide {
  return {
    id: 'mock-slide-2',
    index: 1,
    label: 'Scene 2',
    players: [],
    arrows: [],
    zones: [],
    texts: [],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs: 1500,
    pauseMs: 500,
    easing: 'ease-in-out',
    ...overrides,
  };
}
```

注記: `transition-connector.test.tsx` 内の全 `render(<TransitionConnector ... />)` を `renderWithProvider(<TransitionConnector ... />)` に置き換えること。

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/timeline/slide-card.tsx src/features/tactical-unified/panels/timeline/transition-connector.tsx src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx src/features/tactical-unified/panels/timeline/__tests__/transition-connector.test.tsx
  ```

---

### Phase 2: Director トラック型整理

- **担当ファイル**:
  - `src/features/tactical-unified/panels/timeline/director-action-track.tsx`
  - `src/features/tactical-unified/panels/timeline/director-global-track.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-action-track.tsx`

**Before:**
```tsx
import type { ActionCameraCue } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type { ActionCameraCue } from '@/lib/types/tactical/project';
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/timeline/director-global-track.tsx`

**Before:**
```tsx
import type { GlobalCameraKeyframe } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type { GlobalCameraKeyframe } from '@/lib/types/tactical/project';
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx`

**Before:**
```tsx
import type {
  ActionCameraCue,
  GlobalCameraKeyframe,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type {
  ActionCameraCue,
  GlobalCameraKeyframe,
} from '@/lib/types/tactical/project';
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/timeline/director-action-track.tsx src/features/tactical-unified/panels/timeline/director-global-track.tsx src/features/tactical-unified/panels/timeline/__tests__/director-tracks-popover.test.tsx
  ```
