import { act, fireEvent, render } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  TacticalStoreProvider,
  useTacticalStoresContext,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import * as screenshotTranslator from '@/lib/tactical/acl/screenshot-translator';
import type { CapturedScreenshot } from '../../../capture/db/screenshot-db';
import {
  QuickAnnotationCanvas,
  type QuickAnnotationCanvasHandle,
} from '../QuickAnnotationCanvas';
import { RatioPresetSelector } from '../RatioPresetSelector';

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
  afterEach(() => {
    vi.useRealTimers();
  });

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

  it('supports applyRatio for boundaryBox aspect ratio presets and triggers 300ms debounced onAutoSave with DomainTacticalProject JSON', () => {
    vi.useFakeTimers();
    const canvasRef = createRef<QuickAnnotationCanvasHandle>();
    const onAutoSaveSpy = vi.fn();

    render(
      <div style={{ width: 800, height: 600 }}>
        <QuickAnnotationCanvas
          ref={canvasRef}
          screenshot={mockScreenshot}
          onAutoSave={onAutoSaveSpy}
          imageAspect={16 / 9}
        />
      </div>,
    );

    onAutoSaveSpy.mockClear();

    expect(typeof canvasRef.current?.applyRatio).toBe('function');
    act(() => {
      canvasRef.current?.applyRatio?.('4:5');
    });

    // 300ms デバウンス前は発火しない
    expect(onAutoSaveSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onAutoSaveSpy).toHaveBeenCalledTimes(1);
    const savedJson =
      onAutoSaveSpy.mock.calls[onAutoSaveSpy.mock.calls.length - 1][0];
    const parsed = JSON.parse(savedJson);
    expect(Array.isArray(parsed.phases)).toBe(true);
    expect(parsed.phases[0].boundaryBox).toBeDefined();
    expect(parsed.phases[0].boundaryBox.enabled).toBe(true);
    expect(parsed.phases[0].boundaryBox.width).toBeLessThan(100);
    expect(parsed.phases[0].aspectRatio).toBe('4:5');

    // translateScreenshotToProject で再復元できること
    const restored = screenshotTranslator.translateScreenshotToProject({
      screenshotId: mockScreenshot.id,
      backgroundImageUrl: mockScreenshot.imageDataUrl,
      canvasAnnotationsJson: savedJson,
    });
    expect(restored.project.phases[0]?.aspectRatio).toBe('4:5');
    expect(restored.project.phases[0]?.boundaryBox?.enabled).toBe(true);

    act(() => {
      canvasRef.current?.applyRatio?.('full');
      vi.advanceTimersByTime(300);
    });
    const savedFullJson =
      onAutoSaveSpy.mock.calls[onAutoSaveSpy.mock.calls.length - 1][0];
    const parsedFull = JSON.parse(savedFullJson);
    expect(parsedFull.phases[0].boundaryBox.width).toBe(100);
    expect(parsedFull.phases[0].boundaryBox.height).toBe(100);
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

  it('旧形式 canvasAnnotations JSON を持つ screenshot を渡してマウントし、ACL変換・新TacticalStoreProvider・Undo/Redo が動作すること', async () => {
    const translateSpy = vi.spyOn(
      screenshotTranslator,
      'translateScreenshotToProject',
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
    expect(canvasRef.current).toBeDefined();
    expect(typeof canvasRef.current?.undo).toBe('function');
    expect(typeof canvasRef.current?.redo).toBe('function');

    act(() => {
      canvasRef.current?.undo();
      canvasRef.current?.redo();
    });
  });

  it('RatioPresetSelector クリックで TacticalStoreProvider 配下の documentStore の aspectRatio / boundaryBox が更新されること', () => {
    const initialBundle = screenshotTranslator.translateScreenshotToProject({
      screenshotId: mockScreenshot.id,
      backgroundImageUrl: mockScreenshot.imageDataUrl,
      canvasAnnotationsJson: mockScreenshot.canvasAnnotations,
    });

    const storeRef: {
      current:
        | ReturnType<typeof useTacticalStoresContext>['documentStore']
        | null;
    } = { current: null };

    function StoreReader() {
      const { documentStore } = useTacticalStoresContext();
      storeRef.current = documentStore;
      return null;
    }

    const { getByLabelText } = render(
      <TacticalStoreProvider
        initialProject={initialBundle.project}
        initialSession={{
          activePhaseId: initialBundle.activePhaseId,
          activeSlideId: initialBundle.activeSlideId,
        }}
      >
        <StoreReader />
        <RatioPresetSelector />
      </TacticalStoreProvider>,
    );

    act(() => {
      fireEvent.click(getByLabelText('境界線比率 4:5'));
    });

    const phase = storeRef.current?.getState().project.phases[0];
    expect(phase?.aspectRatio).toBe('4:5');
    expect(phase?.boundaryBox?.enabled).toBe(true);
    expect(phase?.boundaryBox?.width).toBeLessThan(100);
  });
});
