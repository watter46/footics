# TASK-181jf: Toolbar コンテナ (`TopBarCenter`/`TopBar`) と Menu テスト移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `refactor(tactical): migrate TopBarCenter, TopBar, and menu tests to Domain stores`

---

## 🎯 目的・背景

`TopBarCenter` と `TopBar` を 3頻度 Domain ストア（`DocumentStore` / `SessionStore` / `useTacticalStoresContext`）および `selectDomainRenderSnapshot` へ移行し、`top-bar-more-menu.test.tsx`・`x-media-preset-menu.test.tsx` を `TacticalStoreProvider` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `top-bar-center.tsx`, `top-bar.tsx`, `top-bar-more-menu.test.tsx`, `x-media-preset-menu.test.tsx` に `tactical-unified-store` / `tactical-unified-selectors` / `useTacticalUnifiedStore` の参照を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: `top-bar-center.tsx`・`top-bar.tsx` + テスト2ファイル（2プロダクション＋2テスト）

---

### Phase 1: `TopBarCenter`・`TopBar` + Menu テスト2ファイル

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`

**Before:**
```tsx
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import { selectActivePhaseAspectRatio } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { AspectRatio } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { selectDomainActivePhaseAspectRatio } from '@/features/tactical-unified/stores/domain-selectors';
import { isVerticalPitch } from '@/features/tactical-unified/stores/slide-flip-helpers';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type { AspectRatio } from '@/lib/types/tactical/primitives';
```

**Before:**
```tsx
export function TopBarCenter() {
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const toggleWorkspaceMode = useTacticalUnifiedStoreContext(
    (s) => s.toggleWorkspaceMode,
  );
  const aspectRatio = useTacticalUnifiedStoreContext(
    selectActivePhaseAspectRatio,
  );
  const setAspectRatio = useTacticalUnifiedStoreContext(
    (s) => s.setAspectRatio,
  );
  const teamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.teamVisibility,
  );
  const setTeamVisibility = useTacticalUnifiedStoreContext(
    (s) => s.setTeamVisibility,
  );
  const homeColor = useTacticalUnifiedStoreContext(
    (s) => s.project.homeColor.primary,
  );
  const awayColor = useTacticalUnifiedStoreContext(
    (s) => s.project.awayColor.primary,
  );
  const swapTeamSides = useTacticalUnifiedStoreContext((s) => s.swapTeamSides);
  const resetSlideKeepSquad = useTacticalUnifiedStoreContext(
    (s) => s.resetSlideKeepSquad,
  );
```
**After:**
```tsx
export function TopBarCenter() {
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const toggleWorkspaceMode = useSessionStore((s) => s.toggleWorkspaceMode);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const teamVisibility = useSessionStore((s) => s.teamVisibility);
  const setTeamVisibility = useSessionStore((s) => s.setTeamVisibility);

  const aspectRatio = useDocumentStore((s) =>
    selectDomainActivePhaseAspectRatio(s.project, activePhaseId),
  );
  const homeColor = useDocumentStore((s) => s.project.homeColor.primary);
  const awayColor = useDocumentStore((s) => s.project.awayColor.primary);
  const dispatch = useDocumentStore((s) => s.dispatch);

  const setAspectRatio = (next: AspectRatio) => {
    dispatch({
      type: 'CHANGE_PHASE_ASPECT_RATIO',
      phaseId: activePhaseId,
      aspectRatio: next,
    });
  };
  const swapTeamSides = () => {
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: { type: 'SWAP_TEAM_SIDES' },
    });
  };
  const resetSlideKeepSquad = () => {
    dispatch({
      type: 'RESET_SLIDE_KEEP_SQUAD',
      phaseId: activePhaseId,
      slideId: activeSlideId,
    });
  };
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar.tsx`

**Before:**
```tsx
import { selectTacticalRenderSnapshot } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { preloadSlidePlayerPhotos } from '@/lib/tactical/export/share-payload';
```
**After:**
```tsx
import { selectDomainRenderSnapshot } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  preloadSlidePlayerPhotos,
  type TacticalSceneLike,
} from '@/lib/tactical/export/share-payload';
```

**Before:**
```tsx
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectMatchId = useTacticalUnifiedStoreContext(
    (s) => s.project.matchId,
  );
  const matchId = searchParams?.get('matchId') || projectMatchId;

  const handleBack = () => {
    if (matchId) {
      router.push(`/match/${matchId}`);
    } else {
      router.back();
    }
  };

  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const openExportModal = useTacticalUnifiedStoreContext(
    (s) => s.openExportModal,
  );
  const sidebarOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.sidebarOpen,
  );
  const toggleSidebar = useTacticalUnifiedStoreContext((s) => s.toggleSidebar);
  const storeApi = useTacticalUnifiedStoreApi();
  const { toastMessage, showToast } = useCanvasToast();

  async function handleCopySlideImage() {
    if (workspaceMode === 'director') {
      const snapshot = selectTacticalRenderSnapshot(storeApi.getState());
      const activeSlide = snapshot.activeSlide ?? snapshot.slides[0];
      if (activeSlide) {
        const baseW = 1920;
        const baseH = 1080;
        const boundaryBox = snapshot.boundaryBox;
        const crop = calculateBoundaryCrop(boundaryBox, baseW, baseH, 1);
        const canvas = document.createElement('canvas');
        canvas.width = crop.exportWidth;
        canvas.height = crop.exportHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const playerPhotos = await preloadSlidePlayerPhotos([activeSlide]);
          try {
            renderTacticalFrameToCanvas(ctx, {
              slides: [activeSlide],
              timeMs: 0,
```
**After:**
```tsx
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectMatchId = useDocumentStore((s) => s.project.matchId);
  const matchId = searchParams?.get('matchId') || projectMatchId;

  const handleBack = () => {
    if (matchId) {
      router.push(`/match/${matchId}`);
    } else {
      router.back();
    }
  };

  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const openExportModal = useSessionStore((s) => s.openExportModal);
  const sidebarOpen = useSessionStore((s) => s.panels.sidebarOpen);
  const toggleSidebar = useSessionStore((s) => s.toggleSidebar);
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const { toastMessage, showToast } = useCanvasToast();

  async function handleCopySlideImage() {
    if (workspaceMode === 'director') {
      const docState = documentStore.getState();
      const sessState = sessionStore.getState();
      const snapshot = selectDomainRenderSnapshot(
        docState.project,
        sessState.activePhaseId,
        sessState.activeSlideId,
        sessState.teamVisibility,
      );
      const activeSlide = snapshot.activeSlide ?? snapshot.slides[0];
      if (activeSlide) {
        const baseW = 1920;
        const baseH = 1080;
        const boundaryBox = snapshot.boundaryBox;
        const crop = calculateBoundaryCrop(boundaryBox, baseW, baseH, 1);
        const canvas = document.createElement('canvas');
        canvas.width = crop.exportWidth;
        canvas.height = crop.exportHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const playerPhotos = await preloadSlidePlayerPhotos([
            activeSlide as unknown as TacticalSceneLike,
          ]);
          try {
            renderTacticalFrameToCanvas(ctx, {
              slides: [],
              phase: snapshot.activePhase,
              timeMs: 0,
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import * as matchHelper from '@/lib/db/tactical-match-helper';
import * as matchBridge from '@/lib/tactical/match-to-tactical-bridge';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Match } from '@/types';
import { TopBarMoreMenu } from '../top-bar-more-menu';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

describe('TopBarMoreMenu component', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(null);
    window.confirm = vi.fn(() => true);
  });

  it('toggles menu open and closed', () => {
    render(<TopBarMoreMenu />);
```
**After:**
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import * as matchHelper from '@/lib/db/tactical-match-helper';
import * as matchTranslator from '@/lib/tactical/acl/match-project-translator';
import * as tacticalStorage from '@/lib/tactical/tactical-storage';
import type { Match } from '@/types';
import { TopBarMoreMenu } from '../top-bar-more-menu';

const mockUseSearchParams = vi.fn();
vi.mock('next/navigation', () => ({
  useSearchParams: () => mockUseSearchParams(),
}));

function createTestStores(matchId?: string) {
  const base = createDefaultTacticalProject();
  const project = matchId !== undefined ? { ...base, matchId } : base;
  const p0 = project.phases[0];
  return {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      activePhaseId: p0?.id ?? '',
      activeSlideId: p0?.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore(),
  };
}

describe('TopBarMoreMenu component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSearchParams.mockReturnValue(null);
    window.confirm = vi.fn(() => true);
  });

  it('toggles menu open and closed', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );
```

**Before:**
```tsx
  it('URL に matchId がない場合、New Project 押下時は injectMatchToTactical を呼ばず resetProject と clearActiveProjectFromDb(null) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''));
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const injectSpy = vi.spyOn(matchBridge, 'injectMatchToTactical');

    // プロジェクトに前回の matchId が残っている場合でも、URL に matchId がなければ単独リセット
    useTacticalUnifiedStore.getState().project.matchId = 'previous-match-id';

    render(<TopBarMoreMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith(null);
    });
    expect(injectSpy).not.toHaveBeenCalled();
    expect(useTacticalUnifiedStore.getState().project.matchId).toBeUndefined();
  });

  it('URL に matchId がある場合、New Project 押下時は当該試合の0分として injectMatchToTactical を呼び clearActiveProjectFromDb(matchId) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('matchId=10'));
    const mockMatch = {
      id: '10',
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
    } as unknown as Match;
    vi.spyOn(matchHelper, 'getMatchForTacticalProject').mockResolvedValue(
      mockMatch,
    );
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const injectSpy = vi.spyOn(matchBridge, 'injectMatchToTactical');

    render(<TopBarMoreMenu />);
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith('10');
    });
    expect(injectSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        match: mockMatch,
        minute: 0,
        storeApi: expect.anything(),
      }),
    );
  });
```
**After:**
```tsx
  it('URL に matchId がない場合、New Project 押下時は buildMatchToDomainProject を呼ばず新規初期化と clearActiveProjectFromDb(null) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams(''));
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const buildSpy = vi.spyOn(matchTranslator, 'buildMatchToDomainProject');
    const stores = createTestStores('previous-match-id');

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith(null);
    });
    expect(buildSpy).not.toHaveBeenCalled();
    expect(stores.documentStore.getState().project.matchId).toBeUndefined();
  });

  it('URL に matchId がある場合、New Project 押下時は当該試合の0分として buildMatchToDomainProject を呼び clearActiveProjectFromDb(matchId) を実行する', async () => {
    mockUseSearchParams.mockReturnValue(new URLSearchParams('matchId=10'));
    const mockMatch = {
      id: '10',
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
    } as unknown as Match;
    vi.spyOn(matchHelper, 'getMatchForTacticalProject').mockResolvedValue(
      mockMatch,
    );
    const clearSpy = vi
      .spyOn(tacticalStorage, 'clearActiveProjectFromDb')
      .mockResolvedValue();
    const buildSpy = vi.spyOn(matchTranslator, 'buildMatchToDomainProject');
    const stores = createTestStores();

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarMoreMenu />
      </TacticalStoreProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }));
    fireEvent.click(screen.getByText('New Project'));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledWith('10');
    });
    expect(buildSpy).toHaveBeenCalledWith(mockMatch, { minute: 0 });
  });
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { XMediaPresetMenu } from '../x-media-preset-menu';

describe('XMediaPresetMenu rendering and toggle', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
  });

  it('renders trigger button and toggles menu on click', () => {
    render(<XMediaPresetMenu />);
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveBoundaryBox } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { XMediaPresetMenu } from '../x-media-preset-menu';

function renderPresetMenu() {
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
        <XMediaPresetMenu />
      </TacticalStoreProvider>,
    ),
  };
}

describe('XMediaPresetMenu rendering and toggle', () => {
  it('renders trigger button and toggles menu on click', () => {
    renderPresetMenu();
```

**Before:**
```tsx
  it('displays all 4 primary X presets and pitch fit reset option', () => {
    render(<XMediaPresetMenu />);
```
**After:**
```tsx
  it('displays all 4 primary X presets and pitch fit reset option', () => {
    renderPresetMenu();
```

**Before:**
```tsx
  it('closes menu when Escape key is pressed', () => {
    render(<XMediaPresetMenu />);
```
**After:**
```tsx
  it('closes menu when Escape key is pressed', () => {
    renderPresetMenu();
```

**Before:**
```tsx
describe('XMediaPresetMenu preset selection actions', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
    useTacticalUnifiedStore.getState().setAspectRatio('16:9');
  });

  it('applies 4:5 preset when clicked and updates slide boundaryBox', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    fireEvent.click(screen.getByText(/画像1枚 \(4:5\)/i));
    expect(screen.queryByRole('dialog')).toBeNull();

    const state = useTacticalUnifiedStore.getState();
    const activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.enabled).toBe(true);
    expect(activeSlide?.boundaryBox?.height).toBe(100);
    expect(activeSlide?.boundaryBox?.width).toBe(45);
  });

  it('applies 9:16 preset and pitch fit reset option', () => {
    render(<XMediaPresetMenu />);

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/画像2枚カルーセル \(9:16\)/i));

    let state = useTacticalUnifiedStore.getState();
    let activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.width).toBe(31.64);

    // Apply pitch_fit
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/ピッチ白線フィット/i));

    state = useTacticalUnifiedStore.getState();
    activeSlide = state.project.slides.find(
      (s) => s.id === state.activeSlideId,
    );
    expect(activeSlide?.boundaryBox?.x).toBe(0);
    expect(activeSlide?.boundaryBox?.y).toBe(0);
    expect(activeSlide?.boundaryBox?.width).toBe(100);
    expect(activeSlide?.boundaryBox?.height).toBe(100);
  });
});
```
**After:**
```tsx
describe('XMediaPresetMenu preset selection actions', () => {
  it('applies 4:5 preset when clicked and updates phase boundaryBox', () => {
    const { stores } = renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);

    fireEvent.click(screen.getByText(/画像1枚 \(4:5\)/i));
    expect(screen.queryByRole('dialog')).toBeNull();

    const activePhaseId = stores.sessionStore.getState().activePhaseId;
    const box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.enabled).toBe(true);
    expect(box.height).toBe(100);
    expect(box.width).toBe(45);
  });

  it('applies 9:16 preset and pitch fit reset option', () => {
    const { stores } = renderPresetMenu();

    const triggerBtn = screen.getByRole('button', {
      name: /Xメディア最適化比率メニュー/i,
    });
    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/画像2枚カルーセル \(9:16\)/i));

    const activePhaseId = stores.sessionStore.getState().activePhaseId;
    let box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.width).toBe(31.64);

    fireEvent.click(triggerBtn);
    fireEvent.click(screen.getByText(/ピッチ白線フィット/i));

    box = selectDomainActiveBoundaryBox(
      stores.documentStore.getState().project,
      activePhaseId,
    );
    expect(box.x).toBe(0);
    expect(box.y).toBe(0);
    expect(box.width).toBe(100);
    expect(box.height).toBe(100);
  });
});
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar-center.tsx src/features/tactical-unified/panels/toolbar/top-bar.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-more-menu.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx
  ```
