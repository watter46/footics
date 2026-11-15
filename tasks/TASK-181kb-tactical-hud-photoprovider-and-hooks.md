# TASK-181kb: HUD・PhotoProvider・再生/D&D/自動保存フック移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j-181k)
- **DependsOn**: TASK-181ja, TASK-181jb
- **Commit**: `refactor(tactical): migrate BallHud, TacticalPlayerPhotoProvider, and timeline/playback/drop/auto-save hooks to Domain stores`

---

## 🎯 目的・背景

`BallHud`、`TacticalPlayerPhotoProvider`（＋テスト）、および基本フック群（`tactical-timeline.ts`, `tactical-playback-controls.ts`, `use-tactical-drop-paste.ts`, `use-tactical-auto-save.ts`）を旧 `TacticalUnifiedStoreProvider` / `tactical-unified-selectors` から新3頻度 Domain ストア（`DocumentStore` / `SessionStore` / `PlaybackStore`）へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `ball-hud.tsx`, `tactical-player-photo-provider.tsx`, `tactical-player-photo-provider.test.tsx`, `use-tactical-drop-paste.ts`, `use-tactical-auto-save.ts` に `tactical-unified-store` / `tactical-unified-selectors` / `useTacticalUnifiedStore` の参照を残してはならない。
- `tactical-player-photo-provider.test.tsx` で内部ストア・内部フックへの `vi.mock` を使用してはならない。
- `tactical-timeline.ts` / `tactical-playback-controls.ts` の公開シグネチャは既存テストおよび `core/` 呼び出し互換を保ったまま `readonly DomainSlide[]` を直接受け入れること。

---

## 🏗️ Phase 構成

- **Phase 1**: `ball-hud.tsx`・`tactical-player-photo-provider.tsx`・`tactical-player-photo-provider.test.tsx`（2プロダクション＋1テスト）
- **Phase 2**: `tactical-timeline.ts`・`tactical-playback-controls.ts`・`use-tactical-drop-paste.ts`・`use-tactical-auto-save.ts`（4プロダクション＋0テスト）

---

### Phase 1: `BallHud`・`TacticalPlayerPhotoProvider`・テスト

- **担当ファイル**:
  - `src/features/tactical-unified/components/hud/ball-hud.tsx`
  - `src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx`
  - `src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/components/hud/ball-hud.tsx`

**Before:**
```tsx
import { registerHudContentRenderer } from '@/features/tactical-unified/core';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export function BallHud(): React.ReactElement | null {
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const setBallSizeScale = useTacticalUnifiedStoreContext(
    (s) => s.setBallSizeScale,
  );
```
**After:**
```tsx
import { registerHudContentRenderer } from '@/features/tactical-unified/core';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export function BallHud(): React.ReactElement | null {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
```

**Before:**
```tsx
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (!Number.isNaN(next)) {
            setBallSizeScale(activeSlideId, next);
          }
        }}
```
**After:**
```tsx
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (!Number.isNaN(next) && activePhaseId && activeSlideId) {
            dispatchSlide(activePhaseId, activeSlideId, {
              type: 'UPDATE_BALL',
              patch: { sizeScale: next },
            });
          }
        }}
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx`

**Before:**
```tsx
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

export interface TacticalPlayerPhotoProviderProps {
  children: ReactNode;
}

export function TacticalPlayerPhotoProvider({
  children,
}: TacticalPlayerPhotoProviderProps): React.JSX.Element {
  const activeSlides = useTacticalUnifiedStoreContext(selectActivePhaseSlides);
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players ?? []),
    [activeSlides],
  );
```
**After:**
```tsx
import { PlayerPhotoProvider } from '@/features/tactical-unified/core';
import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { selectDomainActivePhaseSlides } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';

export interface TacticalPlayerPhotoProviderProps {
  children: ReactNode;
}

export function TacticalPlayerPhotoProvider({
  children,
}: TacticalPlayerPhotoProviderProps): React.JSX.Element {
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlides = useDocumentStore((s) =>
    selectDomainActivePhaseSlides(s.project, activePhaseId),
  );
  const allPhasePlayers = useMemo(
    () => activeSlides.flatMap((s) => s.players),
    [activeSlides],
  );
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx`

**Before:**
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePlayerPhotoContext } from '@/features/tactical-unified/core';
import { TacticalPlayerPhotoProvider } from '../tactical-player-photo-provider';

// Mocks
vi.mock(
  '@/features/tactical-unified/stores/tactical-unified-store-provider',
  () => ({
    useTacticalUnifiedStoreContext: vi.fn(),
  }),
);

vi.mock(
  '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry',
  () => ({
    usePlayerPhotoRegistry: vi.fn(),
  }),
);

import { usePlayerPhotoRegistry } from '@/features/tactical-unified/objects/player/hooks/use-player-photo-registry';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';

function TestConsumer() {
  const photos = usePlayerPhotoContext();
  return (
    <div>
      <span data-testid="photo-count">{photos ? photos.size : 'null'}</span>
      <span data-testid="has-p1">{photos?.has('p1') ? 'yes' : 'no'}</span>
    </div>
  );
}
```
**After:**
```tsx
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayerPhotoContext } from '@/features/tactical-unified/core';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import * as resolver from '@/lib/tactical/player-photo-resolver';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { TacticalPlayerPhotoProvider } from '../tactical-player-photo-provider';

function makePhotoPlayer(
  id: string,
  playerId: string,
  name: string,
  area: 'pitch' | 'bench',
): DomainPlayer {
  return {
    id,
    playerId,
    team: 'home',
    name,
    shirtNo: area === 'bench' ? 9 : 17,
    position: 'MF',
    x: clampToScreenNorm(area === 'bench' ? 0 : 40),
    y: clampToScreenNorm(area === 'bench' ? 0 : 50),
    area,
    isStarter: area === 'pitch',
    connectLines: [],
    badges: [],
    style: {
      markerType: 'circle',
      insideContent: 'photo',
      photoUrl: `https://example.com/${playerId}.png`,
    },
  };
}

function TestConsumer() {
  const photos = usePlayerPhotoContext();
  return (
    <div>
      <span data-testid="photo-count">{photos ? photos.size : 'null'}</span>
      <span data-testid="has-p1">{photos?.has('101') ? 'yes' : 'no'}</span>
      <span data-testid="has-p2">{photos?.has('102') ? 'yes' : 'no'}</span>
    </div>
  );
}
```

**Before:**
```tsx
describe('TacticalPlayerPhotoProvider', () => {
  it('collects all active phase players (including bench) and provides photo map to children', () => {
    const mockPlayers = [
      {
        id: 'p1',
        name: 'Haaland',
        area: 'bench' as const,
        style: { insideContent: 'photo' },
      },
      {
        id: 'p2',
        name: 'De Bruyne',
        area: 'pitch' as const,
        style: { insideContent: 'photo' },
      },
    ];

    vi.mocked(useTacticalUnifiedStoreContext).mockImplementation(
      (selector: any) => {
        // simulate returning active slides
        return [{ players: mockPlayers }];
      },
    );

    const mockPhotoMap = new Map<string, HTMLImageElement>([
      ['p1', {} as HTMLImageElement],
    ]);
    vi.mocked(usePlayerPhotoRegistry).mockReturnValue(mockPhotoMap);

    render(
      <TacticalPlayerPhotoProvider>
        <TestConsumer />
      </TacticalPlayerPhotoProvider>,
    );

    // Verify usePlayerPhotoRegistry was called with mockPlayers
    expect(usePlayerPhotoRegistry).toHaveBeenCalledWith(mockPlayers);

    // Verify context is provided to child
    expect(screen.getByTestId('photo-count').textContent).toBe('1');
    expect(screen.getByTestId('has-p1').textContent).toBe('yes');
  });

  it('handles slides with undefined players safely', () => {
    vi.mocked(useTacticalUnifiedStoreContext).mockReturnValue([{}]);
    vi.mocked(usePlayerPhotoRegistry).mockReturnValue(new Map());

    render(
      <TacticalPlayerPhotoProvider>
        <TestConsumer />
      </TacticalPlayerPhotoProvider>,
    );

    expect(usePlayerPhotoRegistry).toHaveBeenCalledWith([]);
    expect(screen.getByTestId('photo-count').textContent).toBe('0');
  });
});
```
**After:**
```tsx
describe('TacticalPlayerPhotoProvider', () => {
  let originalImage: typeof Image;

  beforeEach(() => {
    originalImage = globalThis.Image;
    class MockImage {
      onload: (() => void) | null = null;
      private _src = '';
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onload?.());
      }
      get src() {
        return this._src;
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    vi.restoreAllMocks();
  });

  it('collects all active phase players (including bench) and provides loaded photo map to children', async () => {
    const resolveSpy = vi
      .spyOn(resolver, 'resolvePlayerPhotoSources')
      .mockImplementation(async (targets) =>
        new Map(targets.map((t) => [t.key, { kind: 'url', url: `https://example.com/${t.key}.png` }])),
      );
    const project = createDefaultTacticalProject();
    const basePhase = project.phases[0]!;
    const baseSlide = basePhase.slides[0]!;
    const players = [
      makePhotoPlayer('p1', '101', 'Haaland', 'bench'),
      makePhotoPlayer('p2', '102', 'De Bruyne', 'pitch'),
    ];
    const stores = {
      documentStore: createDocumentStore({
        ...project,
        phases: [{ ...basePhase, slides: [{ ...baseSlide, players }] }],
      }),
      sessionStore: createSessionStore({ activePhaseId: basePhase.id, activeSlideId: baseSlide.id }),
      playbackStore: createPlaybackStore(),
    };
    render(
      <TacticalStoreProvider stores={stores}>
        <TacticalPlayerPhotoProvider><TestConsumer /></TacticalPlayerPhotoProvider>
      </TacticalStoreProvider>,
    );
    await vi.waitFor(() => expect(screen.getByTestId('photo-count').textContent).toBe('2'));
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('has-p1').textContent).toBe('yes');
    expect(screen.getByTestId('has-p2').textContent).toBe('yes');
  });

  it('handles unknown activePhaseId safely with empty photo map', () => {
    const project = createDefaultTacticalProject();
    const stores = {
      documentStore: createDocumentStore(project),
      sessionStore: createSessionStore({ activePhaseId: 'non-existent-phase', activeSlideId: '' }),
      playbackStore: createPlaybackStore(),
    };
    render(
      <TacticalStoreProvider stores={stores}>
        <TacticalPlayerPhotoProvider><TestConsumer /></TacticalPlayerPhotoProvider>
      </TacticalStoreProvider>,
    );
    expect(screen.getByTestId('photo-count').textContent).toBe('0');
    expect(screen.getByTestId('has-p1').textContent).toBe('no');
  });
});
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/components/hud/ball-hud.tsx src/features/tactical-unified/objects/player/components/tactical-player-photo-provider.tsx src/features/tactical-unified/objects/player/components/__tests__/tactical-player-photo-provider.test.tsx
  ```

---

### Phase 2: Timeline・PlaybackControls・DropPaste・AutoSave フック移行

- **担当ファイル**:
  - `src/features/tactical-unified/hooks/tactical-timeline.ts`
  - `src/features/tactical-unified/hooks/tactical-playback-controls.ts`
  - `src/features/tactical-unified/hooks/use-tactical-drop-paste.ts`
  - `src/features/tactical-unified/hooks/use-tactical-auto-save.ts`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/hooks/tactical-timeline.ts`

**Before:**
```ts
import { resolvePlaybackDurationMs } from '@/lib/tactical/unified-interpolation';
import type { Slide } from '@/lib/types/tactical-unified';
```
**After:**
```ts
import {
  resolvePlaybackDurationMs,
  type SlideTimingLike,
} from '@/lib/tactical/unified-interpolation';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { Slide } from '@/lib/types/tactical-unified';
```

**Before:**
```ts
export function createTacticalTimeline(
  slides: Slide[],
  onUpdate: (timeMs: number) => void,
  options?: TacticalTimelineOptions,
): gsap.core.Timeline {
```
**After:**
```ts
export function createTacticalTimeline(
  slides: readonly (Slide | DomainSlide | SlideTimingLike)[],
  onUpdate: (timeMs: number) => void,
  options?: TacticalTimelineOptions,
): gsap.core.Timeline {
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/hooks/tactical-playback-controls.ts`

**Before:**
```ts
  setActiveSlide,
  setPlaybackIndices,
}: {
  slides: Slide[];
  refs: AnimationPlaybackRefs;
```
**After:**
```ts
  setActiveSlide,
  setPlaybackIndices,
}: {
  slides: readonly (Slide | DomainSlide)[];
  refs: AnimationPlaybackRefs;
```

**Before:**
```ts
  if (slides.length === 0) return;

  const currentTime = refs.currentPlaybackTimeRef.current;
  const frame = getInterpolatedUnifiedSlideFrame(slides, currentTime);
```
**After:**
```ts
  if (slides.length === 0) return;

  const currentTime = refs.currentPlaybackTimeRef.current;
  const frame = getInterpolatedUnifiedSlideFrame(
    slides as Slide[],
    currentTime,
  );
```

**Before:**
```ts
export function stopPlayback({
  slides = [],
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setIsPlaying,
  setActiveSlide,
}: {
  slides?: Slide[];
```
**After:**
```ts
export function stopPlayback({
  slides = [],
  refs,
  registry,
  pitchDimensions,
  applyFrameToCanvas,
  setIsPlaying,
  setActiveSlide,
}: {
  slides?: readonly (Slide | DomainSlide)[];
```

**Before:**
```ts
export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
  options?: {
    slides?: Slide[];
    registry?: CanvasNodesRegistry | undefined;
```
**After:**
```ts
export function pausePlayback(
  refs: AnimationPlaybackRefs,
  setIsPlaying: (playing: boolean) => void,
  options?: {
    slides?: readonly (Slide | DomainSlide)[];
    registry?: CanvasNodesRegistry | undefined;
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/hooks/use-tactical-drop-paste.ts`

**Before:**
```ts
import type React from 'react';
import { useCallback, useEffect } from 'react';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```ts
import type React from 'react';
import { useCallback, useEffect } from 'react';
import {
  useDocumentStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
```

**Before:**
```ts
export function useTacticalDropPaste() {
  const setImageBackground = useTacticalUnifiedStoreContext(
    (s) => s.setImageBackground,
  );
  const movePlayerToPitch = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToPitch,
  );
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
```
**After:**
```ts
export function useTacticalDropPaste() {
  const { documentStore } = useTacticalStoresContext();
  const dispatchSlide = useDocumentStore((s) => s.dispatchSlide);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const setActiveSlideId = useSessionStore((s) => s.setActiveSlideId);

  const setImageBackground = useCallback(
    (url: string) => {
      const targetPhaseId =
        activePhaseId || documentStore.getState().project.phases[0]?.id || '';
      const targetSlideId =
        activeSlideId ||
        documentStore.getState().project.phases[0]?.slides[0]?.id ||
        '';
      if (!targetPhaseId || !targetSlideId) return;

      const newSlideId = crypto.randomUUID();
      documentStore.getState().dispatch({
        type: 'APPLY_IMAGE_BACKGROUND',
        phaseId: targetPhaseId,
        slideId: targetSlideId,
        url,
        newSlideId,
      });
      const updatedPhase = documentStore
        .getState()
        .project.phases.find((p) => p.id === targetPhaseId);
      if (updatedPhase?.slides.some((s) => s.id === newSlideId)) {
        setActiveSlideId(newSlideId);
      }
    },
    [activePhaseId, activeSlideId, documentStore, setActiveSlideId],
  );

  const movePlayerToPitch = useCallback(
    (slideId: string, playerId: string, x: number, y: number) => {
      const targetPhaseId =
        activePhaseId || documentStore.getState().project.phases[0]?.id || '';
      if (!targetPhaseId || !slideId) return;
      dispatchSlide(targetPhaseId, slideId, {
        type: 'MOVE_PLAYER_TO_PITCH',
        id: playerId,
        x: clampToScreenNorm(x),
        y: clampToScreenNorm(y),
      });
    },
    [activePhaseId, dispatchSlide, documentStore],
  );
```

#### Task 2.4 `[MODIFY]` `src/features/tactical-unified/hooks/use-tactical-auto-save.ts`

**Before:**
```ts
import {
  useTacticalUnifiedStoreApi,
  useTacticalUnifiedStoreContext,
} from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
```
**After:**
```ts
import {
  createDefaultTacticalProject,
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import {
  loadActiveProjectFromDb,
  saveActiveProjectToDb,
} from '@/lib/tactical/tactical-storage';
```

**Before:**
```ts
export function useTacticalAutoSave(options: UseTacticalAutoSaveOptions = {}) {
  const { skipRestore = false, matchId = null } = options;
  const storeApi = useTacticalUnifiedStoreApi();
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const isDirty = useTacticalUnifiedStoreContext((s) => s.isDirty);
  const isPlaying = useTacticalUnifiedStoreContext((s) => s.isPlaying);
  const loadProject = useTacticalUnifiedStoreContext((s) => s.loadProject);
  const resetProject = useTacticalUnifiedStoreContext((s) => s.resetProject);
  const setSaveStatus = useTacticalUnifiedStoreContext((s) => s.setSaveStatus);
  const setLastSavedAt = useTacticalUnifiedStoreContext(
    (s) => s.setLastSavedAt,
  );
```
**After:**
```ts
export function useTacticalAutoSave(options: UseTacticalAutoSaveOptions = {}) {
  const { skipRestore = false, matchId = null } = options;
  const { documentStore, sessionStore } = useTacticalStoresContext();
  const isLoadedRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const project = useDocumentStore((s) => s.project);
  const isDirty = useDocumentStore((s) => s.isDirty);
  const loadProject = useDocumentStore((s) => s.loadProject);
  const markSaved = useDocumentStore((s) => s.markSaved);
  const isPlaying = usePlaybackStore((s) => s.isPlaying);
  const setSaveStatus = useSessionStore((s) => s.setSaveStatus);
  const setLastSavedAt = useSessionStore((s) => s.setLastSavedAt);
```

**Before:**
```ts
        if (isMounted) {
          if (savedProject) {
            loadProject(savedProject);
            setSaveStatus('saved');
          } else {
            // 前試合のスライドを引き継がない
            if (matchId && storeApi.getState().project.matchId !== matchId) {
              resetProject();
            } else if (!matchId && storeApi.getState().project.matchId) {
              resetProject();
            }
            setSaveStatus('idle');
          }
          isLoadedRef.current = true;
        }
```
**After:**
```ts
        if (isMounted) {
          if (savedProject) {
            const bundle = normalizeTacticalProject(savedProject);
            loadProject(bundle.project);
            sessionStore.getState().setActivePhaseId(bundle.activePhaseId);
            sessionStore.getState().setActiveSlideId(bundle.activeSlideId);
            setSaveStatus('saved');
          } else {
            const currentMatchId = documentStore.getState().project.matchId;
            if (
              (matchId && currentMatchId !== matchId) ||
              (!matchId && currentMatchId)
            ) {
              const fresh = createDefaultTacticalProject();
              loadProject(fresh);
              const firstPhase = fresh.phases[0];
              if (firstPhase) {
                sessionStore.getState().setActivePhaseId(firstPhase.id);
                sessionStore
                  .getState()
                  .setActiveSlideId(firstPhase.slides[0]?.id ?? '');
              }
            }
            setSaveStatus('idle');
          }
          isLoadedRef.current = true;
        }
```

**Before:**
```ts
  }, [
    loadProject,
    resetProject,
    setSaveStatus,
    skipRestore,
    matchId,
    storeApi,
  ]);
```
**After:**
```ts
  }, [
    loadProject,
    setSaveStatus,
    skipRestore,
    matchId,
    documentStore,
    sessionStore,
  ]);
```

**Before:**
```ts
        await saveActiveProjectToDb(project, matchId);
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        storeApi.setState({ isDirty: false });
      } catch (err) {
```
**After:**
```ts
        await saveActiveProjectToDb(project, matchId);
        setSaveStatus('saved');
        setLastSavedAt(Date.now());
        markSaved();
      } catch (err) {
```

**Before:**
```ts
    setSaveStatus,
    setLastSavedAt,
    storeApi,
  ]);

  // 3. Save on BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = storeApi.getState();
      if (
        state.isDirty &&
```
**After:**
```ts
    setSaveStatus,
    setLastSavedAt,
    markSaved,
  ]);

  // 3. Save on BeforeUnload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = documentStore.getState();
      if (
        state.isDirty &&
```

**Before:**
```ts
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [matchId, storeApi]);
}
```
**After:**
```ts
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [matchId, documentStore]);
}
```

- **検証 (Phase 2)**:
  ```bash
  bun run ai:check src/features/tactical-unified/hooks/tactical-timeline.ts src/features/tactical-unified/hooks/tactical-playback-controls.ts src/features/tactical-unified/hooks/use-tactical-drop-paste.ts src/features/tactical-unified/hooks/use-tactical-auto-save.ts
  ```
