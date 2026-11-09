import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useExportShare } from '../use-export-share';

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
    expect(body.pitchAppearance).toEqual({
      lineColor: '#ffffff',
      lineWidth: 2,
      lineOpacity: 0.8,
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.2,
    });
    expect(body.directorCamera).toEqual({
      enabled: true,
      globalKeyframes: [{ id: 'k1', timeMs: 0, tilt: 25, yaw: 10 }],
      actionCues: [],
    });
    expect(body.screenBackground).toEqual({
      type: 'cinematic',
    });
    expect(body.scenes).toHaveLength(2);

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('iPhone'),
    );
  });

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
});
