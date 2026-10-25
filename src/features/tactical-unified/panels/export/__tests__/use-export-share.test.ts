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
      activeSlideId: 'slide-1',
      project: {
        id: 'proj-1',
        title: 'Tactical Analysis',
        aspectRatio: '4:5',
        slides: [
          {
            id: 'slide-1',
            name: 'Scene 1',
            boundaryBox: {
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
    expect(body.scenes).toHaveLength(2);

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('iPhone'),
    );
  });
});
