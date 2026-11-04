import { act, renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { buildExportTarget } from '../export-target-builder';
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
        pitchAppearance: {
          lineColor: '#ffffff',
          lineWidth: 2,
          lineOpacity: 0.8,
          pitchBackgroundType: 'marble',
          overlayColor: '#0B303E',
          overlayOpacity: 0.2,
        },
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
    expect(body.pitchAppearance).toEqual({
      lineColor: '#ffffff',
      lineWidth: 2,
      lineOpacity: 0.8,
      pitchBackgroundType: 'marble',
      overlayColor: '#0B303E',
      overlayOpacity: 0.2,
    });
    expect(body.scenes).toHaveLength(2);

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining('iPhone'),
    );
  });

  describe('buildExportTarget with boundaryBox crop integration', () => {
    it('includes boundaryBox and computes cropped dimensions when boundaryBox is enabled', () => {
      const boundaryBox = {
        enabled: true,
        x: 10,
        y: 10,
        width: 50,
        height: 50,
        fitTarget: 'canvas' as const,
      };

      const target = buildExportTarget({
        format: 'mp4',
        scale: 2,
        keyFrameIntervalSec: '2',
        latencyMode: 'quality',
        maxQueueSize: '60',
        boundaryBox,
      });

      expect(target.boundaryBox).toEqual(boundaryBox);
      expect(target.cropInfo).toBeDefined();
      expect(target.cropInfo?.isCropped).toBe(true);
      expect(target.cropInfo?.exportWidth).toBeLessThan(1920);
      expect(target.cropInfo?.exportHeight).toBeLessThan(1080);
    });

    it('keeps 16:9 full dimensions when boundaryBox is not enabled or null', () => {
      const target = buildExportTarget({
        format: 'mp4',
        scale: 2,
        keyFrameIntervalSec: '2',
        latencyMode: 'realtime',
        maxQueueSize: '60',
        boundaryBox: null,
      });

      expect(target.boundaryBox).toBeNull();
      expect(target.cropInfo?.isCropped).toBe(false);
      expect(target.cropInfo?.exportWidth).toBe(1920);
      expect(target.cropInfo?.exportHeight).toBe(1080);
    });

    it('computes vertical dimensions when vertical boundaryBox is specified', () => {
      const verticalBoundary = {
        enabled: true,
        x: 34.18,
        y: 0,
        width: 31.64,
        height: 100,
        fitTarget: 'canvas' as const,
      };

      const target = buildExportTarget({
        format: 'mp4',
        scale: 2,
        keyFrameIntervalSec: '2',
        latencyMode: 'quality',
        maxQueueSize: '60',
        boundaryBox: verticalBoundary,
      });

      expect(target.cropInfo?.isCropped).toBe(true);
      expect(target.cropInfo!.exportHeight).toBeGreaterThan(
        target.cropInfo!.exportWidth,
      );
    });

    it('supports PNG and WebM formats with boundaryBox crop info', () => {
      const boundaryBox = {
        enabled: true,
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        fitTarget: 'canvas' as const,
      };

      const pngTarget = buildExportTarget({
        format: 'png',
        scale: 2,
        boundaryBox,
      });

      expect(pngTarget.format).toBe('png');
      expect(pngTarget.cropInfo?.isCropped).toBe(true);

      const webmTarget = buildExportTarget({
        format: 'webm',
        scale: 2,
        keyFrameIntervalSec: '2',
        latencyMode: 'realtime',
        maxQueueSize: '60',
        boundaryBox,
      });

      expect(webmTarget.format).toBe('webm');
      expect(webmTarget.cropInfo?.isCropped).toBe(true);
    });
  });
});
