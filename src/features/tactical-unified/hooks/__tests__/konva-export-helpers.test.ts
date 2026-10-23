import { strFromU8, unzipSync } from 'fflate';
import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import type { Slide } from '@/lib/types/tactical-unified';
import { exportZipSlides, stageToBlob } from '../konva-export-helpers';

describe('konva-export-helpers', () => {
  describe('stageToBlob', () => {
    it('calls stage.toBlob and resolves with the generated blob', async () => {
      const mockBlob = new Blob(['test-stage-content'], { type: 'image/png' });
      const mockStage = {
        toBlob: vi.fn(
          ({ callback }: { callback: (blob: Blob | null) => void }) => {
            callback(mockBlob);
          },
        ),
      } as unknown as Konva.Stage;

      const result = await stageToBlob(mockStage, { pixelRatio: 2 });
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({ pixelRatio: 2 }),
      );
      expect(result).toBe(mockBlob);
    });

    it('resolves null when stage.toBlob returns null', async () => {
      const mockStage = {
        toBlob: vi.fn(
          ({ callback }: { callback: (blob: Blob | null) => void }) => {
            callback(null);
          },
        ),
      } as unknown as Konva.Stage;

      const result = await stageToBlob(mockStage);
      expect(result).toBeNull();
    });
  });

  describe('exportZipSlides', () => {
    it('packages slides into a valid zip using fflate and triggers download', async () => {
      const mockDownload = vi.fn();
      // Mock document.createElement or URL.createObjectURL
      const originalCreateObjectURL = URL.createObjectURL;
      const originalRevokeObjectURL = URL.revokeObjectURL;
      let capturedBlob: Blob | null = null;
      let capturedFilename = '';

      URL.createObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-url';
      });
      URL.revokeObjectURL = vi.fn();

      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string) => {
          if (tagName === 'a') {
            const anchor = originalCreateElement('a');
            anchor.click = () => {
              capturedFilename = anchor.download;
              mockDownload();
            };
            return anchor;
          }
          return originalCreateElement(tagName);
        },
      );

      // 1x1 transparent png data url
      const sampleDataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

      const mockSlides: Slide[] = [
        {
          id: 'slide-1',
          index: 0,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 50, y: 50, visible: true },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'ease-in-out',
        },
        {
          id: 'slide-2',
          index: 1,
          players: [],
          arrows: [],
          zones: [],
          texts: [],
          ball: { x: 50, y: 50, visible: true },
          transitionDurationMs: 1000,
          pauseMs: 500,
          easing: 'ease-in-out',
        },
      ];

      try {
        await exportZipSlides({
          slides: mockSlides,
          captureSlide: vi.fn().mockReturnValue(sampleDataUrl),
          scale: 2,
        });

        expect(mockDownload).toHaveBeenCalled();
        expect(capturedFilename).toBe('tactical-slides.zip');
        expect(capturedBlob).not.toBeNull();

        // Verify valid zip content via fflate unzipSync
        const arrayBuffer = await capturedBlob!.arrayBuffer();
        const unzipped = unzipSync(new Uint8Array(arrayBuffer));

        expect(Object.keys(unzipped)).toContain('slide-01.png');
        expect(Object.keys(unzipped)).toContain('slide-02.png');
        expect(unzipped['slide-01.png']?.length).toBeGreaterThan(0);
      } finally {
        URL.createObjectURL = originalCreateObjectURL;
        URL.revokeObjectURL = originalRevokeObjectURL;
        vi.restoreAllMocks();
      }
    });
  });
});
