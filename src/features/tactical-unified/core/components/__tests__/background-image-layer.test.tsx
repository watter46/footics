import { act, render } from '@testing-library/react';
import type Konva from 'konva';
import { createRef } from 'react';
import { Stage } from 'react-konva';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pitchSvg from '@/lib/tactical/pitch-svg';
import { createCanvasStore } from '../../store/canvas-store';
import { CanvasStoreContext } from '../../store/canvas-store-provider';
import { BackgroundImageLayer } from '../BackgroundImageLayer';

beforeEach(() => {
  const mockCtx = new Proxy(
    {
      getImageData: () => ({ data: new Array(4) }),
      createImageData: () => [],
      getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
      measureText: () => ({ width: 0 }),
      getLineDash: () => [],
      isPointInPath: () => true,
      createLinearGradient: () => ({ addColorStop: vi.fn() }),
      createRadialGradient: () => ({ addColorStop: vi.fn() }),
    } as Record<string, unknown>,
    {
      get: (target, prop: string) => (prop in target ? target[prop] : vi.fn()),
    },
  );
  HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue(mockCtx);
});

describe('BackgroundImageLayer', () => {
  it('マウント時に preloadAllPitchSvgImages を呼び出すこと', () => {
    const preloadSpy = vi.spyOn(pitchSvg, 'preloadAllPitchSvgImages');
    const store = createCanvasStore({ mode: 'tactical-board' });
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreContext.Provider value={store}>
        <Stage ref={stageRef} width={800} height={450}>
          <BackgroundImageLayer width={800} height={450} />
        </Stage>
      </CanvasStoreContext.Provider>,
    );
    expect(preloadSpy).toHaveBeenCalledTimes(1);
  });

  it('backgroundImageUrl が未指定時にピッチSVG画像を Konva.Image として描画すること', () => {
    const dummyPitchImg = {
      src: 'pitch-svg-mock',
      complete: true,
    } as unknown as HTMLImageElement;
    vi.spyOn(pitchSvg, 'getCachedPitchSvgImage').mockReturnValue(dummyPitchImg);

    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '16:9',
    });
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreContext.Provider value={store}>
        <Stage ref={stageRef} width={800} height={450}>
          <BackgroundImageLayer width={800} height={450} />
        </Stage>
      </CanvasStoreContext.Provider>,
    );

    const stage = stageRef.current;
    expect(stage).not.toBeNull();
    const images = stage?.find('Image') ?? [];
    expect(images).toHaveLength(1);
    expect((images[0] as Konva.Image).image()).toBe(dummyPitchImg);

    const rects = stage?.find('Rect') ?? [];
    expect(rects.length).toBeGreaterThan(0);
    expect((rects[0] as Konva.Rect).attrs.fill).toBe('#000000');
  });

  it('キャッシュが未ヒットの場合は loadPitchSvgImage を呼び出して描画すること', async () => {
    const dummyPitchImg = {
      src: 'pitch-svg-async',
      complete: true,
    } as unknown as HTMLImageElement;
    vi.spyOn(pitchSvg, 'getCachedPitchSvgImage').mockReturnValue(null);
    const loadSpy = vi
      .spyOn(pitchSvg, 'loadPitchSvgImage')
      .mockResolvedValue(dummyPitchImg);

    const store = createCanvasStore({
      mode: 'tactical-board',
      aspectRatio: '4:5',
    });
    const stageRef = createRef<Konva.Stage>();
    render(
      <CanvasStoreContext.Provider value={store}>
        <Stage ref={stageRef} width={400} height={500}>
          <BackgroundImageLayer width={400} height={500} />
        </Stage>
      </CanvasStoreContext.Provider>,
    );

    expect(loadSpy).toHaveBeenCalledWith('4:5', expect.anything());

    await act(async () => {
      await Promise.resolve();
    });

    const stage = stageRef.current;
    const images = stage?.find('Image') ?? [];
    expect(images).toHaveLength(1);
    expect((images[0] as Konva.Image).image()).toBe(dummyPitchImg);
  });

  it('backgroundImageUrl が指定されている場合はその画像を優先して描画すること', async () => {
    const dummyCustomImg = {
      src: 'https://example.com/field.png',
      complete: true,
    } as unknown as HTMLImageElement;
    const originalImage = window.Image;
    class MockImage {
      src = '';
      crossOrigin = '';
      onload: (() => void) | null = null;
      constructor() {
        setTimeout(() => {
          Object.assign(this, dummyCustomImg);
          this.onload?.();
        }, 10);
      }
    }
    // @ts-expect-error mock
    window.Image = MockImage;

    try {
      const store = createCanvasStore({
        mode: 'screenshot-edit',
        backgroundImageUrl: 'https://example.com/field.png',
      });
      const stageRef = createRef<Konva.Stage>();
      render(
        <CanvasStoreContext.Provider value={store}>
          <Stage ref={stageRef} width={800} height={450}>
            <BackgroundImageLayer width={800} height={450} />
          </Stage>
        </CanvasStoreContext.Provider>,
      );

      await act(async () => {
        await new Promise((r) => setTimeout(r, 20));
      });

      const stage = stageRef.current;
      const images = stage?.find('Image') ?? [];
      expect(images).toHaveLength(1);
      const img = (images[0] as Konva.Image).image() as
        | HTMLImageElement
        | undefined;
      expect(img?.src).toBe('https://example.com/field.png');
    } finally {
      window.Image = originalImage;
    }
  });
});
