# TASK-181je: Toolbar Leaf コンポーネント・メニュー移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `refactor(tactical): migrate toolbar leaf components and menus to 3-frequency Domain stores`

---

## 🎯 目的・背景

`panels/toolbar/` 配下の Leaf コンポーネント（`drawing-tool-config.ts`, `top-bar-history.tsx`, `top-bar-title.tsx`, `top-bar-more-menu-sections.tsx`）とメニュー（`top-bar-more-menu.tsx`, `x-media-preset-menu.tsx`）、および `top-bar-history.test.tsx` / `top-bar-title.test.tsx` を旧 `tactical-unified-store` から 3頻度 Domain ストア（`DocumentStore` / `SessionStore`）へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記8ファイルに `tactical-unified-store` / `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` の参照を残してはならない。
- `top-bar-more-menu.tsx` に `match-to-tactical-bridge` の `injectMatchToTactical` 呼び出しを残してはならない（`buildMatchToDomainProject` を使用すること）。

---

## 🏗️ Phase 構成

- **Phase 1**: Toolbar Leaf 4ファイル + テスト2ファイル（4プロダクション＋2テスト）
- **Phase 2**: `top-bar-more-menu.tsx`・`x-media-preset-menu.tsx`（2プロダクション）

---

### Phase 1: Toolbar Leaf 4ファイル + テスト2ファイル

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts`
  - `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx`
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu-sections.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-history.test.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-title.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts`

**Before:**
```ts
import type React from 'react';
import { getDrawingTools } from '@/features/tactical-unified/core/components/toolbar';
import type { DrawingTool } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import type React from 'react';
import { getDrawingTools } from '@/features/tactical-unified/core/components/toolbar';
import type { DrawingTool } from '@/lib/types/tactical/project';
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-history.tsx`

**Before:**
```tsx
import { Redo2, Undo2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function TopBarHistory() {
  const undo = useTacticalUnifiedStoreContext((s) => s.undo);
  const redo = useTacticalUnifiedStoreContext((s) => s.redo);
  const canUndo = useTacticalUnifiedStoreContext((s) => s.past.length > 0);
  const canRedo = useTacticalUnifiedStoreContext((s) => s.future.length > 0);
```
**After:**
```tsx
import { Redo2, Undo2 } from 'lucide-react';
import { IconButton } from '@/components/ui/icon-button';
import { useDocumentStore } from '@/features/tactical-unified/stores/tactical-store-provider';

export function TopBarHistory() {
  const undo = useDocumentStore((s) => s.undo);
  const redo = useDocumentStore((s) => s.redo);
  const canUndo = useDocumentStore((s) => s.past.length > 0);
  const canRedo = useDocumentStore((s) => s.future.length > 0);
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx`

**Before:**
```tsx
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function TopBarTitle() {
  const projectTitle = useTacticalUnifiedStoreContext(
    (s) => s.project.title || 'Untitled Project',
  );
  const setTitle = useTacticalUnifiedStoreContext((s) => s.setTitle);
  const saveStatus = useTacticalUnifiedStoreContext((s) => s.saveStatus);
  const openProjectManagerModal = useTacticalUnifiedStoreContext(
    (s) => s.openProjectManagerModal,
  );
```
**After:**
```tsx
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export function TopBarTitle() {
  const projectTitle = useDocumentStore(
    (s) => s.project.title || 'Untitled Project',
  );
  const dispatch = useDocumentStore((s) => s.dispatch);
  const saveStatus = useSessionStore((s) => s.saveStatus);
  const openProjectManagerModal = useSessionStore(
    (s) => s.openProjectManagerModal,
  );
```

**Before:**
```tsx
  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim() || 'Untitled Project';
    setTitle(trimmed);
    setIsEditingTitle(false);
  };
```
**After:**
```tsx
  const handleSaveTitle = () => {
    const trimmed = tempTitle.trim() || 'Untitled Project';
    dispatch({ type: 'UPDATE_PROJECT_META', patch: { title: trimmed } });
    setIsEditingTitle(false);
  };
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-more-menu-sections.tsx`

**Before:**
```ts
  createSixSlideBenchmarkProject,
  createTenSlideFullSequenceBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
import type { TacticalProject } from '@/lib/types/tactical-unified';
```
**After:**
```ts
  createSixSlideBenchmarkProject,
  createTenSlideFullSequenceBenchmarkProject,
} from '@/lib/tactical/benchmark-presets';
```

**Before:**
```ts
export interface PresetsSectionProps {
  onLoadProject: (project: TacticalProject) => void;
  onClose: () => void;
}
```
**After:**
```ts
export interface PresetsSectionProps {
  onLoadProject: (project: unknown) => void;
  onClose: () => void;
}
```

#### Task 1.5 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-history.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarHistory } from '../top-bar-history';

describe('TopBarHistory', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders undo and redo buttons with IconButton accessibility attributes', () => {
    render(<TopBarHistory />);

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect(undoButton).toBeDefined();
    expect(redoButton).toBeDefined();
    // initially cannot undo or redo
    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls undo and redo on click when enabled', () => {
    const undoSpy = vi.fn();
    const redoSpy = vi.fn();

    // Set store past and future to enable buttons
    useTacticalUnifiedStore.setState({
      past: [{ slides: [] }] as any,
      future: [{ slides: [] }] as any,
      undo: undoSpy,
      redo: redoSpy,
    });

    render(<TopBarHistory />);

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect((undoButton as HTMLButtonElement).disabled).toBe(false);
    expect((redoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(undoButton);
    expect(undoSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(redoButton);
    expect(redoSpy).toHaveBeenCalledTimes(1);
  });
});
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBarHistory } from '../top-bar-history';

function createTestStores() {
  const project = createDefaultTacticalProject();
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

describe('TopBarHistory', () => {
  it('renders undo and redo buttons with IconButton accessibility attributes', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarHistory />
      </TacticalStoreProvider>,
    );

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect(undoButton).toBeDefined();
    expect(redoButton).toBeDefined();
    expect((undoButton as HTMLButtonElement).disabled).toBe(true);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('calls undo and redo on click when enabled', () => {
    const stores = createTestStores();
    const initialTitle = stores.documentStore.getState().project.title;
    stores.documentStore.getState().dispatch({
      type: 'UPDATE_PROJECT_META',
      patch: { title: 'Renamed Tactics' },
    });

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarHistory />
      </TacticalStoreProvider>,
    );

    const undoButton = screen.getByRole('button', { name: 'Undo' });
    const redoButton = screen.getByRole('button', { name: 'Redo' });

    expect((undoButton as HTMLButtonElement).disabled).toBe(false);
    expect((redoButton as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(undoButton);
    expect(stores.documentStore.getState().project.title).toBe(initialTitle);
    expect((redoButton as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(redoButton);
    expect(stores.documentStore.getState().project.title).toBe(
      'Renamed Tactics',
    );
  });
});
```

#### Task 1.6 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/__tests__/top-bar-title.test.tsx`

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { TopBarTitle } from '../top-bar-title';

describe('TopBarTitle', () => {
  beforeEach(() => {
    useTacticalUnifiedStore.getState().resetProject();
  });

  it('renders project manager button and triggers openProjectManagerModal', () => {
    const openModalSpy = vi.fn();
    useTacticalUnifiedStore.setState({ openProjectManagerModal: openModalSpy });

    render(<TopBarTitle />);

    const projectsButton = screen.getByRole('button', {
      name: /Projects/i,
    });
    expect(projectsButton).toBeDefined();

    fireEvent.click(projectsButton);
    expect(openModalSpy).toHaveBeenCalledTimes(1);
  });

  it('does not contain deprecated blue-500 classes in container or buttons', () => {
    const { container } = render(<TopBarTitle />);
    const html = container.innerHTML;
    expect(html).not.toContain('blue-500');
    expect(html).not.toContain('blue-600');
    expect(html).not.toContain('blue-300');
    expect(html).not.toContain('blue-200');
    expect(html).not.toContain('blue-400');
  });

  it('allows renaming the project title', () => {
    useTacticalUnifiedStore.setState({
      project: {
        ...useTacticalUnifiedStore.getState().project,
        title: 'Initial Tactics',
      },
    });

    render(<TopBarTitle />);

    const titleButton = screen.getByRole('button', {
      name: /Initial Tactics/i,
    });
    fireEvent.click(titleButton);

    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('Initial Tactics');

    fireEvent.change(input, { target: { value: 'Updated Tactics' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useTacticalUnifiedStore.getState().project.title).toBe(
      'Updated Tactics',
    );
  });
});
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { TopBarTitle } from '../top-bar-title';

function createTestStores(title?: string) {
  const base = createDefaultTacticalProject();
  const project = title ? { ...base, title } : base;
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

describe('TopBarTitle', () => {
  it('renders project manager button and opens projectManagerModal', () => {
    const stores = createTestStores();
    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );

    const projectsButton = screen.getByRole('button', {
      name: /Projects/i,
    });
    expect(projectsButton).toBeDefined();

    fireEvent.click(projectsButton);
    expect(stores.sessionStore.getState().panels.projectManagerModalOpen).toBe(
      true,
    );
  });

  it('does not contain deprecated blue-500 classes in container or buttons', () => {
    const stores = createTestStores();
    const { container } = render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );
    const html = container.innerHTML;
    expect(html).not.toContain('blue-500');
    expect(html).not.toContain('blue-600');
    expect(html).not.toContain('blue-300');
    expect(html).not.toContain('blue-200');
    expect(html).not.toContain('blue-400');
  });

  it('allows renaming the project title', () => {
    const stores = createTestStores('Initial Tactics');

    render(
      <TacticalStoreProvider stores={stores}>
        <TopBarTitle />
      </TacticalStoreProvider>,
    );

    const titleButton = screen.getByRole('button', {
      name: /Initial Tactics/i,
    });
    fireEvent.click(titleButton);

    const input = screen.getByRole('textbox');
    expect(input).toBeDefined();
    expect((input as HTMLInputElement).value).toBe('Initial Tactics');

    fireEvent.change(input, { target: { value: 'Updated Tactics' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(stores.documentStore.getState().project.title).toBe(
      'Updated Tactics',
    );
  });
});
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/drawing-tool-config.ts src/features/tactical-unified/panels/toolbar/top-bar-history.tsx src/features/tactical-unified/panels/toolbar/top-bar-title.tsx src/features/tactical-unified/panels/toolbar/top-bar-more-menu-sections.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-history.test.tsx src/features/tactical-unified/panels/toolbar/__tests__/top-bar-title.test.tsx
  ```

---

### Phase 2: `top-bar-more-menu.tsx`・`x-media-preset-menu.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`
  - `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`

**Before:**
```tsx
import { injectMatchToTactical } from '@/features/tactical-unified/hooks/use-tactical-match-init';
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
```
**After:**
```tsx
import { selectDomainActivePhase } from '@/features/tactical-unified/stores/domain-selectors';
import {
  createDefaultTacticalProject,
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { getMatchForTacticalProject } from '@/lib/db/tactical-match-helper';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { buildMatchToDomainProject } from '@/lib/tactical/acl/match-project-translator';
import { clearActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
```

**Before:**
```tsx
export function TopBarMoreMenu() {
  const storeApi = useTacticalUnifiedStoreApi();
  const searchParams = useSearchParams();
  const urlMatchId = searchParams?.get('matchId') ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setImageBackground = useTacticalUnifiedStoreContext(
    (s) => s.setImageBackground,
  );
  const resetProject = useTacticalUnifiedStoreContext((s) => s.resetProject);
  const isImageBackground = useTacticalUnifiedStoreContext(
    (s) => s.project.backgroundType === 'image',
  );
  const restoreDefaultPitch = useTacticalUnifiedStoreContext(
    (s) => s.restoreDefaultPitch,
  );
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) setImageBackground(dataUrl);
      };
      reader.readAsDataURL(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  const handleNewProject = async () => {
    const confirmed = window.confirm(
      '現在の戦術プロジェクトをリセットして、まっさらなピッチで新規作成しますか？',
    );
    if (!confirmed) return;

    if (urlMatchId) {
      const match = await getMatchForTacticalProject(urlMatchId);
      if (match) {
        resetProject();
        injectMatchToTactical({ match, minute: 0, storeApi });
        await clearActiveProjectFromDb(urlMatchId);
        storeApi.getState().setSaveStatus('saved');
        setIsOpen(false);
        return;
      }
    }

    resetProject();
    await clearActiveProjectFromDb(null);
    storeApi.getState().setSaveStatus('saved');
    setIsOpen(false);
  };
```
**After:**
```tsx
export function TopBarMoreMenu() {
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const searchParams = useSearchParams();
  const urlMatchId = searchParams?.get('matchId') ?? null;
  const [isOpen, setIsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const isImageBackground = useDocumentStore(
    (s) =>
      selectDomainActivePhase(s.project, activePhaseId)?.backgroundType ===
      'image',
  );

  const resetToFreshProject = () => {
    const fresh = createDefaultTacticalProject();
    const p0 = fresh.phases[0];
    documentStore.getState().loadProject(fresh);
    sessionStore.getState().resetSession({
      activePhaseId: p0?.id ?? '',
      activeSlideId: p0?.slides[0]?.id ?? '',
      saveStatus: 'saved',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && files[0]?.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (dataUrl) {
          dispatch({
            type: 'APPLY_IMAGE_BACKGROUND',
            phaseId: activePhaseId,
            slideId: activeSlideId,
            url: dataUrl,
          });
        }
      };
      reader.readAsDataURL(files[0]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsOpen(false);
  };

  const handleNewProject = async () => {
    const confirmed = window.confirm(
      '現在の戦術プロジェクトをリセットして、まっさらなピッチで新規作成しますか？',
    );
    if (!confirmed) return;

    if (urlMatchId) {
      const match = await getMatchForTacticalProject(urlMatchId);
      if (match) {
        const bundle = buildMatchToDomainProject(match, { minute: 0 });
        documentStore.getState().loadProject(bundle.project);
        sessionStore.getState().resetSession({
          activePhaseId: bundle.activePhaseId,
          activeSlideId: bundle.activeSlideId,
          saveStatus: 'saved',
        });
        await clearActiveProjectFromDb(urlMatchId);
        setIsOpen(false);
        return;
      }
    }

    resetToFreshProject();
    await clearActiveProjectFromDb(null);
    setIsOpen(false);
  };

  const handleLoadPreset = (rawProject: unknown) => {
    const bundle = normalizeTacticalProject(rawProject);
    documentStore.getState().loadProject(bundle.project);
    sessionStore.getState().resetSession({
      activePhaseId: bundle.activePhaseId,
      activeSlideId: bundle.activeSlideId,
    });
  };
```

**Before:**
```tsx
        <MoreMenuPitchSection
          isImageBackground={isImageBackground}
          onRestoreDefaultPitch={restoreDefaultPitch}
          onImportClick={() => fileInputRef.current?.click()}
          onClose={() => setIsOpen(false)}
        />

        <DropdownMenuSeparator />

        <MoreMenuPresetsSection
          onLoadProject={loadProject}
          onClose={() => setIsOpen(false)}
        />
```
**After:**
```tsx
        <MoreMenuPitchSection
          isImageBackground={isImageBackground}
          onRestoreDefaultPitch={() =>
            dispatch({ type: 'RESTORE_DEFAULT_PITCH', phaseId: activePhaseId })
          }
          onImportClick={() => fileInputRef.current?.click()}
          onClose={() => setIsOpen(false)}
        />

        <DropdownMenuSeparator />

        <MoreMenuPresetsSection
          onLoadProject={handleLoadPreset}
          onClose={() => setIsOpen(false)}
        />
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`

**Before:**
```tsx
import {
  selectActivePhaseAspectRatio,
  selectActivePhaseBoundaryBox,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  ASPECT_RATIOS,
  type AspectRatio,
  type BoundaryBox,
  X_MEDIA_PRESETS,
  type XMediaPresetKey,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import {
  selectDomainActiveBoundaryBox,
  selectDomainActivePhaseAspectRatio,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import type {
  AspectRatio,
  XMediaPresetKey,
} from '@/lib/types/tactical/primitives';
import {
  type BoundaryBox,
  X_MEDIA_PRESETS,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function XMediaPresetMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const applyXMediaPreset = useTacticalUnifiedStoreContext(
    (s) => s.applyXMediaPreset,
  );
  const activePhaseId = useTacticalUnifiedStoreContext((s) => s.activePhaseId);
  const project = useTacticalUnifiedStoreContext((s) => s.project);

  const activeBoundaryBox = selectActivePhaseBoundaryBox({
    project,
    activePhaseId,
  });
  const activeAspect = selectActivePhaseAspectRatio({
    project,
    activePhaseId,
  });
  const activePresetKey = detectActivePreset(activeBoundaryBox, activeAspect);

  const handleSelectPreset = useCallback(
    (presetKey: XMediaPresetKey | 'pitch_fit') => {
      applyXMediaPreset(presetKey);
      setIsOpen(false);
    },
    [applyXMediaPreset],
  );
```
**After:**
```tsx
export function XMediaPresetMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const dispatch = useDocumentStore((s) => s.dispatch);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const project = useDocumentStore((s) => s.project);

  const activeBoundaryBox = selectDomainActiveBoundaryBox(
    project,
    activePhaseId,
  );
  const activeAspect = selectDomainActivePhaseAspectRatio(
    project,
    activePhaseId,
  );
  const activePresetKey = detectActivePreset(activeBoundaryBox, activeAspect);

  const handleSelectPreset = useCallback(
    (presetKey: XMediaPresetKey | 'pitch_fit') => {
      dispatch({
        type: 'APPLY_X_MEDIA_PRESET',
        phaseId: activePhaseId,
        presetKey,
      });
      setIsOpen(false);
    },
    [dispatch, activePhaseId],
  );
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx
  ```
