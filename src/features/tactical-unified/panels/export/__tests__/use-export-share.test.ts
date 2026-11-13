import { act, renderHook } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useExportShare', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends aspectRatio, boundaryBox, and pitchTransform in payload and shows success toast', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        shareId: 'test-share-123',
        shareUrl: '/export/share/test-share-123',
      }),
    });
    global.fetch = fetchMock as any;

    const initialProject = buildShareTestProject();
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalStoreProvider,
        {
          initialProject,
          initialSession: {
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
          },
        },
        children,
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
    expect(body.pitchTransform).toMatchObject({
      tilt: 25,
      yaw: 90,
      zoom: 1.2,
      panX: 10,
      panY: 0,
    });
    expect(body.pitchAppearance).toEqual({
      lineColor: '#ffffff',
      lineWidth: 2,
      lineOpacity: 0.8,
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.2,
    });
    expect(body.directorCamera).toEqual(
      initialProject.phases[0].directorCamera,
    );
    expect(body.screenBackground).toEqual({
      type: 'cinematic',
    });
    expect(body.scenes).toHaveLength(2);

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('iPhone'),
    );
  });

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

    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(
        TacticalStoreProvider,
        {
          initialProject,
          initialSession: {
            activePhaseId: 'phase-1',
            activeSlideId: 'slide-1',
            teamVisibility: 'home',
          },
        },
        children,
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
});
