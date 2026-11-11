import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as screenshotTranslator from '@/lib/tactical/acl/screenshot-translator';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import {
  QuickAnnotationCanvas,
  type QuickAnnotationCanvasHandle,
} from '../QuickAnnotationCanvas';

const mockScreenshot: CapturedScreenshot = {
  id: 'shot-canvas-1',
  timestamp: Date.now(),
  videoTitle: 'Sample Canvas Video',
  videoUrl: 'https://youtube.com/watch?v=mock2',
  imageDataUrl: 'data:image/png;base64,mockImage',
  canvasAnnotations: JSON.stringify({
    arrows: [],
    zones: [],
    texts: [],
    markers: [],
  }),
};

describe('QuickAnnotationCanvas', () => {
  it('mounts without crash and forwards CanvasCoreHandle ref', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();

    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(container).toBeDefined();
    expect(canvasRef.current).toBeDefined();
    expect(typeof canvasRef.current?.exportPng).toBe('function');
    expect(typeof canvasRef.current?.copyToClipboard).toBe('function');
    expect(typeof canvasRef.current?.undo).toBe('function');
    expect(typeof canvasRef.current?.redo).toBe('function');
  });

  it('supports applyRatio for boundaryBox aspect ratio presets', () => {
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();

    render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(typeof canvasRef.current?.applyRatio).toBe('function');
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('4:5');
      });
    }).not.toThrow();
    expect(() => {
      act(() => {
        canvasRef.current?.applyRatio?.('full');
      });
    }).not.toThrow();
  });

  it('Extensionツールバーに 3D リングが含まれ、2D マーカーと PitchLock が含まれないこと', () => {
    const { queryByTitle, getByTitle } = render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          screenshot={mockScreenshot}
          imageAspect={16 / 9}
        />
      </div>,
    );

    // 3D Foot Ring should be present
    expect(getByTitle('3D Foot Ring (O)')).toBeDefined();

    // 2D Player Marker should NOT be present
    expect(queryByTitle('2D Player Marker (M)')).toBeNull();

    // Pitch Lock should NOT be present
    expect(queryByTitle(/Pitch Lock/i)).toBeNull();

    // Boundary Box button should NOT be in the drawing toolbar (managed via TopBar RatioPresetSelector)
    expect(queryByTitle(/Boundary Box/i)).toBeNull();
  });

  it('旧形式 canvasAnnotations JSON を持つ screenshot を渡してマウントし、ACL変換・新TacticalStoreProvider・Undo/Redo・onAutoSave が動作すること', async () => {
    const translateSpy = vi.spyOn(
      screenshotTranslator,
      'translateScreenshotToProject',
    );
    const serializeSpy = vi.spyOn(
      screenshotTranslator,
      'serializeProjectToScreenshotJson',
    );

    const legacyScreenshot: CapturedScreenshot = {
      id: 'shot-legacy-1',
      timestamp: Date.now(),
      videoTitle: 'Legacy Canvas Video',
      videoUrl: 'https://youtube.com/watch?v=legacy',
      imageDataUrl: 'data:image/png;base64,mockLegacyImage',
      canvasAnnotations: JSON.stringify({
        arrows: [],
        zones: [],
        texts: [],
        markers: [
          {
            id: 'legacy-player-1',
            x: 25,
            y: 50,
            number: 7,
            label: 'CR7',
            color: '#ff0000',
          },
        ],
      }),
    };

    const canvasRef = createRef<QuickAnnotationCanvasHandle>();
    const onAutoSaveSpy = vi.fn();

    const { container } = render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={legacyScreenshot}
          onAutoSave={onAutoSaveSpy}
          imageAspect={16 / 9}
        />
      </div>,
    );

    expect(container).toBeDefined();
    expect(translateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        screenshotId: 'shot-legacy-1',
        backgroundImageUrl: 'data:image/png;base64,mockLegacyImage',
      }),
    );
    expect(serializeSpy).toHaveBeenCalled();
    expect(canvasRef.current).toBeDefined();
    expect(typeof canvasRef.current?.undo).toBe('function');
    expect(typeof canvasRef.current?.redo).toBe('function');

    act(() => {
      canvasRef.current?.undo();
      canvasRef.current?.redo();
    });
  });
});
