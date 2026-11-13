# TASK-181jq: Export Share & Export Modal テストの 3ストア・Domain V3 移行

- **Status**: TODO
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `test(tactical): migrate useExportShare and ExportModal tests to TacticalStoreProvider and Domain V3`

---

## 🎯 目的・背景

`use-export-share.test.ts` と `export-modal.test.tsx` から旧 `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` を排除し、`TacticalStoreProvider` と Domain V3 プロジェクト構造（Phase 単位の `boundaryBox`）へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `useTacticalUnifiedStore` / `TacticalUnifiedStoreProvider` / `@/lib/types/tactical-unified` を対象テスト内に残してはならない。
- 内部ストアやカスタムフックの `vi.mock` を追加してはならない。
- `...existing code...` 等の省略記法を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Share フック & Export Modal テスト移行（2テストファイル）

---

### Phase 1: Share フック & Export Modal テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`
  - `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts`

**Before:**
```tsx
import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useExportShare } from '../use-export-share';
```
**After:**
```tsx
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import type { DomainTacticalProject } from '@/lib/types/tactical/domain-hierarchy';
import { useExportShare } from '../use-export-share';

function buildShareTestProject(): DomainTacticalProject {
  return normalizeTacticalProject({
    id: 'proj-1',
    title: 'Tactical Analysis',
    screenBackground: { type: 'cinematic' },
    pitchAppearance: {
      lineColor: '#ffffff',
      lineWidth: 2,
      lineOpacity: 0.8,
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.2,
    },
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        aspectRatio: '4:5',
        boundaryBox: {
          enabled: true,
          x: 10,
          y: 20,
          width: 800,
          height: 1000,
        },
        directorCamera: {
          enabled: true,
          globalKeyframes: [{ id: 'k1', timeMs: 0, tilt: 25, yaw: 10 }],
          actionCues: [],
        },
        slides: [
          {
            id: 'slide-1',
            index: 0,
            label: 'Scene 1',
            pitchTransform: {
              tilt: 25,
              yaw: 90,
              zoom: 1.2,
              panX: 10,
              panY: 0,
            },
            players: [],
            arrows: [],
            zones: [],
            texts: [],
          },
          {
            id: 'slide-2',
            index: 1,
            label: 'Scene 2',
            players: [],
            arrows: [],
            zones: [],
            texts: [],
          },
        ],
      },
    ],
  }).project;
}
```

**Before:**
```tsx
  beforeEach(() => {
    vi.clearAllMocks();
    useTacticalUnifiedStore.setState({
      activePhaseId: 'phase-1',
      activeSlideId: 'slide-1',
      project: {
        id: 'proj-1',
        title: 'Tactical Analysis',
        aspectRatio: '4:5',
        screenBackground: {
          type: 'cinematic',
        },
        pitchAppearance: {
          lineColor: '#ffffff',
          lineWidth: 2,
          lineOpacity: 0.8,
          pitchBackgroundType: 'marble',
          overlayColor: '#0B303E',
          overlayOpacity: 0.2,
        },
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            aspectRatio: '4:5',
            boundaryBox: {
              enabled: true,
              x: 10,
              y: 20,
              width: 800,
              height: 1000,
            },
            directorCamera: {
              enabled: true,
              globalKeyframes: [{ id: 'k1', timeMs: 0, tilt: 25, yaw: 10 }],
              actionCues: [],
            },
            slides: [
              {
                id: 'slide-1',
                name: 'Scene 1',
                boundaryBox: {
                  enabled: true,
                  x: 10,
                  y: 20,
                  width: 800,
                  height: 1000,
                },
                pitchTransform: {
                  pitchTilt: 25,
                  pitchPan: 10,
                  pitchZoom: 1.2,
                  cameraElevation: 45,
                },
                players: [],
                balls: [],
                lines: [],
                arrows: [],
                shapes: [],
                zones: [],
                textLabels: [],
              },
              {
                id: 'slide-2',
                name: 'Scene 2',
                players: [],
                balls: [],
                lines: [],
                arrows: [],
                shapes: [],
                zones: [],
                textLabels: [],
              },
            ],
          },
        ],
        slides: [
          {
            id: 'slide-1',
            name: 'Scene 1',
            boundaryBox: {
              enabled: true,
              x: 10,
              y: 20,
              width: 800,
              height: 1000,
            },
            pitchTransform: {
              pitchTilt: 25,
              pitchPan: 10,
              pitchZoom: 1.2,
              cameraElevation: 45,
            },
            players: [],
            balls: [],
            lines: [],
            arrows: [],
            shapes: [],
            zones: [],
            textLabels: [],
          },
          {
            id: 'slide-2',
            name: 'Scene 2',
            players: [],
            balls: [],
            lines: [],
            arrows: [],
            shapes: [],
            zones: [],
            textLabels: [],
          },
        ],
      } as any,
    });
  });
```
**After:**
```tsx
  beforeEach(() => {
    vi.clearAllMocks();
  });
```

**Before:**
```tsx
    const onError = vi.fn();
    const { result } = renderHook(() => useExportShare({ onError }));

    await act(async () => {
      await result.current.createShareLink();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tactical-export/share');
    expect(requestInit.method).toBe('POST');

    const body = JSON.parse(requestInit.body);
    expect(body.title).toBe('Tactical Analysis');
    expect(body.aspectRatio).toBe('4:5');
    expect(body.boundaryBox).toEqual({
      enabled: true,
      x: 10,
      y: 20,
      width: 800,
      height: 1000,
    });
    expect(body.pitchTransform).toEqual({
      pitchTilt: 25,
      pitchPan: 10,
      pitchZoom: 1.2,
      cameraElevation: 45,
    });
```
**After:**
```tsx
    const initialProject = buildShareTestProject();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider
        initialProject={initialProject}
        initialSession={{ activePhaseId: 'phase-1', activeSlideId: 'slide-1' }}
      >
        {children}
      </TacticalStoreProvider>
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useExportShare({ onError }), {
      wrapper,
    });

    await act(async () => {
      await result.current.createShareLink();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, requestInit] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tactical-export/share');
    expect(requestInit.method).toBe('POST');

    const body = JSON.parse(requestInit.body);
    expect(body.title).toBe('Tactical Analysis');
    expect(body.aspectRatio).toBe('4:5');
    expect(body.boundaryBox).toEqual(initialProject.phases[0].boundaryBox);
    expect(body.pitchTransform).toEqual({
      tilt: 25,
      yaw: 90,
      zoom: 1.2,
      panX: 10,
      panY: 0,
    });
```

**Before:**
```tsx
  it('prefers activeSlide.boundaryBox over activePhase.boundaryBox in share payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        shareId: 'test-share-456',
        shareUrl: '/export/share/test-share-456',
      }),
    });
    global.fetch = fetchMock as any;

    const state = useTacticalUnifiedStore.getState();
    useTacticalUnifiedStore.setState({
      ...state,
      teamVisibility: 'home',
      project: {
        ...state.project,
        phases: [
          {
            ...state.project.phases[0],
            boundaryBox: {
              enabled: true,
              x: 0,
              y: 0,
              width: 100,
              height: 100,
            },
            slides: [
              {
                ...state.project.phases[0].slides[0],
                boundaryBox: {
                  enabled: false,
                  visible: false,
                  x: 28.9,
                  y: 3,
                  width: 42.2,
                  height: 94,
                },
              },
              state.project.phases[0].slides[1],
            ],
          },
        ],
      } as any,
    });

    const onError = vi.fn();
    const { result } = renderHook(() => useExportShare({ onError }));

    await act(async () => {
      await result.current.createShareLink();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body);

    expect(body.boundaryBox).toEqual({
      enabled: false,
      visible: false,
      x: 28.9,
      y: 3,
      width: 42.2,
      height: 94,
    });
    expect(body.teamVisibility).toBe('home');
  });
```
**After:**
```tsx
  it('uses activePhase.boundaryBox and session teamVisibility in share payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        shareId: 'test-share-456',
        shareUrl: '/export/share/test-share-456',
      }),
    });
    global.fetch = fetchMock as any;

    const baseProject = buildShareTestProject();
    const customBox = {
      enabled: false,
      visible: false,
      fitTarget: 'pitch' as const,
      x: 28.9,
      y: 3,
      width: 42.2,
      height: 94,
    };
    const initialProject: DomainTacticalProject = {
      ...baseProject,
      phases: [{ ...baseProject.phases[0], boundaryBox: customBox }],
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <TacticalStoreProvider
        initialProject={initialProject}
        initialSession={{
          activePhaseId: 'phase-1',
          activeSlideId: 'slide-1',
          teamVisibility: 'home',
        }}
      >
        {children}
      </TacticalStoreProvider>
    );

    const onError = vi.fn();
    const { result } = renderHook(() => useExportShare({ onError }), {
      wrapper,
    });

    await act(async () => {
      await result.current.createShareLink();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const body = JSON.parse(requestInit.body);

    expect(body.boundaryBox).toEqual(customBox);
    expect(body.teamVisibility).toBe('home');
  });
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx`

**Before:**
```tsx
import * as konvaExportHelpers from '@/features/tactical-unified/hooks/konva-export-helpers';
import { TacticalUnifiedStoreProvider } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { ExportModal } from '../export-modal';
```
**After:**
```tsx
import * as konvaExportHelpers from '@/features/tactical-unified/hooks/konva-export-helpers';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import { DEFAULT_SESSION_UI_STATE } from '@/features/tactical-unified/stores/session-ui-state';
import { TacticalStoreProvider } from '@/features/tactical-unified/stores/tactical-store-provider';
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { ExportModal } from '../export-modal';
```

**Before:**
```tsx
  const createInitialState = (slideOverrides = {}) => {
    const slide = { ...baseSlide, ...slideOverrides };
    return {
      isExportModalOpen: true,
      pendingExport: {
        format: 'png' as const,
        scope: 'current' as const,
        scale: 2,
      },
      activeSlideId: slide.id,
      project: {
        id: 'proj-1',
        title: 'Tactics A',
        version: '2.0.0',
        matchId: 'match-1',
        aspectRatio: '16:9' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        activePhaseId: 'phase-1',
        activeSlideId: slide.id,
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            slides: [slide as any],
          },
        ],
      } as any,
    };
  };

  it('完全全画面スタイル (w-screen h-screen rounded-none 等) を持つダイアログとしてレンダリングされること', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider initialState={createInitialState()}>
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });
```
**After:**
```tsx
  const createInitialStores = (phaseOverrides: Record<string, unknown> = {}) => {
    const bundle = normalizeTacticalProject({
      id: 'proj-1',
      title: 'Tactics A',
      matchId: 'match-1',
      phases: [
        {
          id: 'phase-1',
          name: 'Phase 1',
          aspectRatio: '16:9',
          slides: [baseSlide],
          ...phaseOverrides,
        },
      ],
    });
    const sessionStore = createSessionStore({
      activePhaseId: bundle.activePhaseId,
      activeSlideId: bundle.activeSlideId,
      pendingExport: { format: 'png', scope: 'current', scale: 2 },
      panels: { ...DEFAULT_SESSION_UI_STATE.panels, exportModalOpen: true },
    });
    return { initialProject: bundle.project, sessionStore };
  };

  it('完全全画面スタイル (w-screen h-screen rounded-none 等) を持つダイアログとしてレンダリングされること', async () => {
    const { initialProject, sessionStore } = createInitialStores();
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalStoreProvider
          initialProject={initialProject}
          stores={{ sessionStore }}
        >
          <ExportModal />
        </TacticalStoreProvider>,
      );
    });
```

**Before:**
```tsx
  it('境界線有効時にプレビュー枠のアスペクト比スタイルが連動し、Boundary Croppedバッジが表示されること', async () => {
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider
          initialState={createInitialState({
            boundaryBox: {
              enabled: true,
              x: 20,
              y: 10,
              width: 40,
              height: 30,
            },
          })}
        >
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });
```
**After:**
```tsx
  it('境界線有効時にプレビュー枠のアスペクト比スタイルが連動し、Boundary Croppedバッジが表示されること', async () => {
    const { initialProject, sessionStore } = createInitialStores({
      boundaryBox: {
        enabled: true,
        x: 20,
        y: 10,
        width: 40,
        height: 30,
      },
    });
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalStoreProvider
          initialProject={initialProject}
          stores={{ sessionStore }}
        >
          <ExportModal />
        </TacticalStoreProvider>,
      );
    });
```

**Before:**
```tsx
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalUnifiedStoreProvider initialState={createInitialState()}>
          <ExportModal />
        </TacticalUnifiedStoreProvider>,
      );
    });
```
**After:**
```tsx
    const { initialProject, sessionStore } = createInitialStores();
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <TacticalStoreProvider
          initialProject={initialProject}
          stores={{ sessionStore }}
        >
          <ExportModal />
        </TacticalStoreProvider>,
      );
    });
```

- **検証 (Phase 1)**:
  ```bash
  bun run ai:check src/features/tactical-unified/panels/export/__tests__/use-export-share.test.ts src/features/tactical-unified/panels/export/__tests__/export-modal.test.tsx
  ```
