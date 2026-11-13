# TASK-181jg: Toolbar Center・Copy・Layout・DrawingToolbar テスト移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): migrate TopBar center, copy, layout, and DrawingToolbar tests to Domain stores`

---

## 🎯 目的・背景

`top-bar-center.test.tsx`, `top-bar-copy.test.tsx`, `top-bar-layout.test.tsx`, `drawing-toolbar.test.tsx`, `drawing-toolbar-marker-mode.test.tsx` から旧 `tactical-unified-store` / `TacticalUnifiedStoreProvider` 依存を根絶する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記5テストファイルに `tactical-unified-store` / `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` の参照を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `top-bar-center.test.tsx`・`top-bar-copy.test.tsx`（0プロダクション＋2テスト）
- **Phase 2**: `top-bar-layout.test.tsx`・`drawing-toolbar.test.tsx`（0プロダクション＋2テスト）
- **Phase 3**: `drawing-toolbar-marker-mode.test.tsx`（0プロダクション＋1テスト）

---

### Phase 1: `top-bar-center.test.tsx`・`top-bar-copy.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-center.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-center.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarCenter } from '../top-bar-center';

const radio = (name: string) => screen.getByRole('radio', { name });

describe('TopBarCenter aspect ratio selector', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
  });

  it('renders all 4 aspect ratio options (16:9, 9:16, 4:5, 1:1)', () => {
    render(<TopBarCenter />);
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import { TopBarCenter } from '../top-bar-center';

const radio = (name: string) => screen.getByRole('radio', { name });

function renderTopBarCenter() {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const documentStore = createDocumentStore(project);
  documentStore.getState().dispatch({
    type: 'CHANGE_PHASE_ASPECT_RATIO',
    phaseId: p0.id,
    aspectRatio: '16:9',
  });
  const stores = {
    documentStore,
    sessionStore: createSessionStore({
      activePhaseId: p0.id,
      activeSlideId: p0.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(),
  };
  return {
    stores,
    ...render(
      <TacticalStoreProvider stores={stores}>
        <TopBarCenter />
      </TacticalStoreProvider>,
    ),
  };
}

describe('TopBarCenter aspect ratio selector', () => {
  it('renders all 4 aspect ratio options (16:9, 9:16, 4:5, 1:1)', () => {
    renderTopBarCenter();
```

**Before:**
```tsx
  it('defaults to 16:9 as active and allows switching to 9:16, 4:5, 1:1', () => {
    render(<TopBarCenter />);

    expect(radio('16:9').getAttribute('aria-checked')).toBe('true');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('9:16'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('9:16');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('true');
    expect(radio('16:9').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('4:5'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('4:5');

    fireEvent.click(radio('1:1'));
    expect(useTacticalUnifiedStore.getState().project.aspectRatio).toBe('1:1');
  });

  it('allows toggling team visibility', () => {
    render(<TopBarCenter />);

    fireEvent.click(radio('Home'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('home');

    fireEvent.click(radio('Away'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('away');

    fireEvent.click(radio('Both'));
    expect(useTacticalUnifiedStore.getState().teamVisibility).toBe('both');
  });

  it('renders reset squad button and triggers resetSlideKeepSquad', () => {
    render(<TopBarCenter />);

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();

    const store = useTacticalUnifiedStore.getState();
    const slideId = store.activeSlideId;
    const player0 = store.project.slides[0]?.players[0];
    expect(player0).toBeDefined();
    store.movePlayer(slideId, player0?.id ?? '', 99, 99);

    fireEvent.click(resetBtn);

    const updatedSlide = useTacticalUnifiedStore
      .getState()
      .project.slides.find((sl) => sl.id === slideId);
    const updatedPlayer0 = updatedSlide?.players.find(
      (p) => p.id === player0?.id,
    );
    expect(updatedPlayer0?.x).not.toBe(99);
    expect(updatedPlayer0?.y).not.toBe(99);
  });

  it('renders Swap and Reset icon buttons with shrink-0', () => {
    render(<TopBarCenter />);
```
**After:**
```tsx
  it('defaults to 16:9 as active and allows switching to 9:16, 4:5, 1:1', () => {
    const { stores } = renderTopBarCenter();

    expect(radio('16:9').getAttribute('aria-checked')).toBe('true');
    expect(radio('9:16').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('9:16'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '9:16',
    );
    expect(radio('9:16').getAttribute('aria-checked')).toBe('true');
    expect(radio('16:9').getAttribute('aria-checked')).toBe('false');

    fireEvent.click(radio('4:5'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '4:5',
    );

    fireEvent.click(radio('1:1'));
    expect(stores.documentStore.getState().project.phases[0]?.aspectRatio).toBe(
      '1:1',
    );
  });

  it('allows toggling team visibility', () => {
    const { stores } = renderTopBarCenter();

    fireEvent.click(radio('Home'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('home');

    fireEvent.click(radio('Away'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('away');

    fireEvent.click(radio('Both'));
    expect(stores.sessionStore.getState().teamVisibility).toBe('both');
  });

  it('renders reset squad button and triggers RESET_SLIDE_KEEP_SQUAD', () => {
    const { stores } = renderTopBarCenter();

    const resetBtn = screen.getByRole('button', {
      name: '配置・オブジェクトをリセット（メンバー維持）',
    });
    expect(resetBtn).toBeDefined();

    const { activePhaseId, activeSlideId } = stores.sessionStore.getState();
    const slide0 = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const player0 = slide0?.players[0];
    expect(player0).toBeDefined();
    stores.documentStore.getState().dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: {
        type: 'MOVE_PLAYERS',
        moves: [
          {
            id: player0!.id,
            x: toScreenNormCoord(99),
            y: toScreenNormCoord(99),
          },
        ],
      },
    });

    fireEvent.click(resetBtn);

    const updatedSlide = selectDomainActiveSlide(
      stores.documentStore.getState().project,
      activePhaseId,
      activeSlideId,
    );
    const updatedPlayer0 = updatedSlide?.players.find(
      (p) => p.id === player0?.id,
    );
    expect(updatedPlayer0?.area).toBe('pitch');
    if (updatedPlayer0?.area === 'pitch') {
      expect(updatedPlayer0.x).not.toBe(99);
      expect(updatedPlayer0.y).not.toBe(99);
    }
  });

  it('renders Swap and Reset icon buttons with shrink-0', () => {
    renderTopBarCenter();
```

**Before:**
```tsx
  it('allows toggling workspace mode using Toggle Layout Mode button', () => {
    render(<TopBarCenter />);

    expect(screen.queryByRole('radio', { name: '作図' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '演出' })).toBeNull();

    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(toggleBtn).toBeDefined();
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');

    fireEvent.click(toggleBtn);
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('director');

    fireEvent.click(toggleBtn);
    expect(useTacticalUnifiedStore.getState().workspaceMode).toBe('board');
  });
```
**After:**
```tsx
  it('allows toggling workspace mode using Toggle Layout Mode button', () => {
    const { stores } = renderTopBarCenter();

    expect(screen.queryByRole('radio', { name: '作図' })).toBeNull();
    expect(screen.queryByRole('radio', { name: '演出' })).toBeNull();

    const toggleBtn = screen.getByRole('button', {
      name: 'Toggle Layout Mode',
    });
    expect(toggleBtn).toBeDefined();
    expect(stores.sessionStore.getState().workspaceMode).toBe('board');

    fireEvent.click(toggleBtn);
    expect(stores.sessionStore.getState().workspaceMode).toBe('director');

    fireEvent.click(toggleBtn);
    expect(stores.sessionStore.getState().workspaceMode).toBe('board');
  });
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx`

**Before:**
```tsx
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { TopBar } from '../top-bar';
```
**After:**
```tsx
import type { CanvasCoreHandle } from '@/features/tactical-unified/core';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBar } from '../top-bar';
```

**Before:**
```tsx
    const { getByRole } = render(<TopBar canvasRef={canvasRef} />);
```
**After:**
```tsx
    const { getByRole } = render(
      <TacticalStoreProvider>
        <TopBar canvasRef={canvasRef} />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
    const { getByRole, findByText } = render(
      <TacticalUnifiedStoreProvider
        initialState={{ workspaceMode: 'director' }}
      >
        <TopBar />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    const { getByRole, findByText } = render(
      <TacticalStoreProvider initialSession={{ workspaceMode: 'director' }}>
        <TopBar />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
    const mockSlide = {
      id: 'slide-1',
      index: 0,
      name: 'Slide 1',
      boundaryBox: {
        enabled: true,
        x: 10,
        y: 20,
        width: 50,
        height: 40,
      },
    };

    const { getByRole } = render(
      <TacticalUnifiedStoreProvider
        initialState={{
          workspaceMode: 'director',
          activeSlideId: 'slide-1',
          project: {
            id: 'proj-1',
            title: 'Project 1',
            version: '2.0.0',
            matchId: 'test',
            aspectRatio: '16:9',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
            homeColor: { primary: '#034694' },
            awayColor: { primary: '#ef4444' },
            phases: [
              {
                id: 'phase-1',
                name: 'Phase 1',
                slides: [mockSlide as any],
              },
            ],
          } as any,
        }}
      >
        <TopBar />
      </TacticalUnifiedStoreProvider>,
    );
```
**After:**
```tsx
    const baseProject = createDefaultTacticalProject();
    const firstPhase = baseProject.phases[0]!;
    const domainProject = {
      ...baseProject,
      matchId: 'test',
      phases: [
        {
          ...firstPhase,
          aspectRatio: '16:9' as const,
          boundaryBox: {
            enabled: true,
            x: 10,
            y: 20,
            width: 50,
            height: 40,
          },
        },
      ],
    };

    const { getByRole } = render(
      <TacticalStoreProvider
        initialProject={domainProject}
        initialSession={{
          workspaceMode: 'director',
          activePhaseId: firstPhase.id,
          activeSlideId: firstPhase.slides[0]?.id ?? '',
        }}
      >
        <TopBar />
      </TacticalStoreProvider>,
    );
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/__tests__/top-bar-center.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-copy.test.tsx
  ```

---

### Phase 2: `top-bar-layout.test.tsx`・`drawing-toolbar.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBar } from '../top-bar';
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBar } from '../top-bar';
```

**Before:**
```tsx
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('applies responsive min-w-0 and shrink constraints to header columns', () => {
    const { container } = render(<TopBar />);
```
**After:**
```tsx
    (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
  });

  it('applies responsive min-w-0 and shrink constraints to header columns', () => {
    const { container } = render(
      <TacticalStoreProvider>
        <TopBar />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
  it('does not render Focus mode button even when onToggleFocusMode is passed', () => {
    const { queryByText, queryByTitle } = render(
      <TopBar onToggleFocusMode={() => {}} />,
    );

    expect(queryByText('Focus')).toBeNull();
    expect(queryByTitle(/Focus Mode/i)).toBeNull();
  });

  describe('Back button navigation', () => {
    it('renders back button and navigates back using router.back() when no matchId is present', () => {
      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      expect(backButton).toBeDefined();

      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in searchParams', () => {
      (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn((key: string) => (key === 'matchId' ? 'm-456' : null)),
      });

      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-456');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in store project', () => {
      useTacticalUnifiedStore.setState((s) => ({
        ...s,
        project: {
          ...s.project,
          matchId: 'm-789',
        },
      }));

      render(<TopBar />);

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-789');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
```
**After:**
```tsx
  it('does not render Focus mode button even when onToggleFocusMode is passed', () => {
    const { queryByText, queryByTitle } = render(
      <TacticalStoreProvider>
        <TopBar onToggleFocusMode={() => {}} />
      </TacticalStoreProvider>,
    );

    expect(queryByText('Focus')).toBeNull();
    expect(queryByTitle(/Focus Mode/i)).toBeNull();
  });

  describe('Back button navigation', () => {
    it('renders back button and navigates back using router.back() when no matchId is present', () => {
      render(
        <TacticalStoreProvider>
          <TopBar />
        </TacticalStoreProvider>,
      );

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      expect(backButton).toBeDefined();

      fireEvent.click(backButton);
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in searchParams', () => {
      (useSearchParams as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        get: vi.fn((key: string) => (key === 'matchId' ? 'm-456' : null)),
      });

      render(
        <TacticalStoreProvider>
          <TopBar />
        </TacticalStoreProvider>,
      );

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-456');
      expect(mockBack).not.toHaveBeenCalled();
    });

    it('navigates to /match/${matchId} when matchId is present in store project', () => {
      const project = { ...createDefaultTacticalProject(), matchId: 'm-789' };

      render(
        <TacticalStoreProvider initialProject={project}>
          <TopBar />
        </TacticalStoreProvider>,
      );

      const backButton = screen.getByRole('button', { name: /戻る|Back/i });
      fireEvent.click(backButton);

      expect(mockPush).toHaveBeenCalledWith('/match/m-789');
      expect(mockBack).not.toHaveBeenCalled();
    });
  });
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx`

**Before:**
```tsx
import {
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return render(<CanvasStoreProvider store={store}>{ui}</CanvasStoreProvider>);
}

describe('DrawingToolbar component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders toolbar positioned on the right for 16:9 aspect ratio', () => {
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
    const { container } = renderWithStore(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders toolbar positioned on the right for non-16:9 aspect ratio (e.g. 4:5)', () => {
    useTacticalUnifiedStore.getState().setAspectRatio('4:5');
    const { container } = renderWithStore(<DrawingToolbar />);
```
**After:**
```tsx
import {
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return render(<CanvasStoreProvider store={store}>{ui}</CanvasStoreProvider>);
}

describe('DrawingToolbar component', () => {
  beforeEach(() => {
    // No shared legacy store reset required
  });

  it('renders toolbar positioned on the right for 16:9 aspect ratio', () => {
    const { container } = renderWithStore(<DrawingToolbar />);

    const toolbarEl = container.firstElementChild as HTMLElement;
    expect(toolbarEl).toBeDefined();
    expect(toolbarEl.className).toContain('right-3');
    expect(toolbarEl.className).toContain('top-1/2');
    expect(toolbarEl.className).toContain('flex-col');
  });

  it('renders toolbar positioned on the right for non-16:9 aspect ratio (e.g. 4:5)', () => {
    const { container } = renderWithStore(<DrawingToolbar />);
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/__tests__/top-bar-layout.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar.test.tsx
  ```

---

### Phase 3: `drawing-toolbar-marker-mode.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx`

#### Task 3.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx`

**Before:**
```tsx
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return render(<CanvasStoreProvider store={store}>{ui}</CanvasStoreProvider>);
}

describe('DrawingToolbar markerMode filtering', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });
```
**After:**
```tsx
import { render, screen } from '@testing-library/react';
import type React from 'react';
import { describe, expect, it } from 'vitest';
import {
  CanvasStoreProvider,
  createCanvasStore,
} from '@/features/tactical-unified/core';
import { DrawingToolbar } from '../drawing-toolbar';

function renderWithStore(ui: React.ReactElement) {
  const store = createCanvasStore({ mode: 'tactical-board' });
  return render(<CanvasStoreProvider store={store}>{ui}</CanvasStoreProvider>);
}

describe('DrawingToolbar markerMode filtering', () => {
```

- **検証 (Phase 3)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx
  ```
