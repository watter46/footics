import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resizeAndCropImageToBlob } from '../image-utils';

describe('resizeAndCropImageToBlob', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resizes and square crops an image via createImageBitmap', async () => {
    const mockOutputBlob = new Blob(['resized-png'], { type: 'image/png' });
    const mockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        callback(mockOutputBlob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement;
        return document.createElement(tagName);
      },
    );

    const mockBitmap = {
      width: 800,
      height: 600,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const inputBlob = new Blob(['input-data'], { type: 'image/jpeg' });
    const result = await resizeAndCropImageToBlob(inputBlob, 256, 'image/png');

    expect(result).toBe(mockOutputBlob);
    expect(mockCanvas.width).toBe(256);
    expect(mockCanvas.height).toBe(256);

    // Landscape image (800x600): minDim=600, sx=(800-600)/2=100, sy=0
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      mockBitmap,
      100, // sx
      0, // sy
      600, // sWidth
      600, // sHeight
      0, // dx
      0, // dy
      256, // dWidth
      256, // dHeight
    );
    expect(mockBitmap.close).toHaveBeenCalled();
  });

  it('crops portrait images correctly', async () => {
    const mockOutputBlob = new Blob(['resized-png'], { type: 'image/png' });
    const mockContext = {
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low',
      drawImage: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        callback(mockOutputBlob);
      }),
    };

    vi.spyOn(document, 'createElement').mockImplementation(
      (tagName: string) => {
        if (tagName === 'canvas')
          return mockCanvas as unknown as HTMLCanvasElement;
        return document.createElement(tagName);
      },
    );

    const mockBitmap = {
      width: 400,
      height: 600,
      close: vi.fn(),
    } as unknown as ImageBitmap;

    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue(mockBitmap));

    const inputBlob = new Blob(['portrait-data'], { type: 'image/jpeg' });
    await resizeAndCropImageToBlob(inputBlob, 256, 'image/png');

    // Portrait image (400x600): minDim=400, sx=0, sy=(600-400)/2=100
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      mockBitmap,
      0, // sx
      100, // sy
      400, // sWidth
      400, // sHeight
      0, // dx
      0, // dy
      256, // dWidth
      256, // dHeight
    );
  });
});
