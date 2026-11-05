import type Konva from 'konva';
import { describe, expect, it, vi } from 'vitest';
import {
  downloadBlob,
  exportPngBlob,
  stageToBlob,
} from '../canvas-export-primitives';

describe('canvas-export-primitives', () => {
  describe('stageToBlob', () => {
    it('stage.toBlob をラップして Promise<Blob | null> を返す', async () => {
      const dummyBlob = new Blob(['test'], { type: 'image/png' });
      const mockStage = {
        toBlob: vi.fn((config: { callback: (blob: Blob | null) => void }) => {
          config.callback(dummyBlob);
        }),
      } as unknown as Konva.Stage;

      const result = await stageToBlob(mockStage, { mimeType: 'image/png' });
      expect(result).toBe(dummyBlob);
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({ mimeType: 'image/png' }),
      );
    });

    it('stage.toBlob が null を返した場合は null を解決する', async () => {
      const mockStage = {
        toBlob: vi.fn((config: { callback: (blob: Blob | null) => void }) => {
          config.callback(null);
        }),
      } as unknown as Konva.Stage;

      const result = await stageToBlob(mockStage);
      expect(result).toBeNull();
    });
  });

  describe('exportPngBlob', () => {
    it('デフォルト設定で stage.toBlob を呼び出して Blob を返す', async () => {
      const dummyBlob = new Blob(['png'], { type: 'image/png' });
      const mockStage = {
        width: () => 1000,
        height: () => 600,
        toBlob: vi.fn((config: { callback: (blob: Blob | null) => void }) => {
          config.callback(dummyBlob);
        }),
      } as unknown as Konva.Stage;

      const blob = await exportPngBlob(mockStage);
      expect(blob).toBe(dummyBlob);
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'image/png',
          pixelRatio: 2,
        }),
      );
    });

    it('boundaryBox が指定された場合、切り出し領域が計算されて渡される', async () => {
      const dummyBlob = new Blob(['crop'], { type: 'image/png' });
      const mockStage = {
        width: () => 1000,
        height: () => 600,
        toBlob: vi.fn(
          (config: {
            x?: number;
            y?: number;
            width?: number;
            height?: number;
            callback: (blob: Blob | null) => void;
          }) => {
            config.callback(dummyBlob);
          },
        ),
      } as unknown as Konva.Stage;

      const boundaryBox = {
        enabled: true,
        x: 10,
        y: 10,
        width: 80,
        height: 80,
      };

      const blob = await exportPngBlob(mockStage, {
        crop: true,
        boundaryBox,
      });

      expect(blob).toBe(dummyBlob);
      expect(mockStage.toBlob).toHaveBeenCalledWith(
        expect.objectContaining({
          mimeType: 'image/png',
          pixelRatio: 2,
          x: 100,
          y: 60,
          width: 800,
          height: 480,
        }),
      );
    });

    it('stage.toBlob が null を返した場合は例外を投げる', async () => {
      const mockStage = {
        width: () => 1000,
        height: () => 600,
        toBlob: vi.fn((config: { callback: (blob: Blob | null) => void }) => {
          config.callback(null);
        }),
      } as unknown as Konva.Stage;

      await expect(exportPngBlob(mockStage)).rejects.toThrow(
        'Failed to create PNG blob from canvas stage',
      );
    });
  });

  describe('downloadBlob', () => {
    it('リンク要素を生成してダウンロードを発火し、URL を revoke する', () => {
      const dummyBlob = new Blob(['hello'], { type: 'text/plain' });
      const fakeUrl = 'blob:http://localhost/dummy-uuid';
      const createObjectURLMock = vi.fn().mockReturnValue(fakeUrl);
      const revokeObjectURLMock = vi.fn();

      vi.stubGlobal('URL', {
        createObjectURL: createObjectURLMock,
        revokeObjectURL: revokeObjectURLMock,
      });

      const clickMock = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation(
        (tagName: string) => {
          if (tagName === 'a') {
            return {
              set href(val: string) {
                (this as Record<string, unknown>)._href = val;
              },
              get href(): string {
                return (
                  ((this as Record<string, unknown>)._href as string) ?? ''
                );
              },
              set download(val: string) {
                (this as Record<string, unknown>)._download = val;
              },
              get download(): string {
                return (
                  ((this as Record<string, unknown>)._download as string) ?? ''
                );
              },
              click: clickMock,
            } as unknown as HTMLElement;
          }
          return originalCreateElement(tagName);
        },
      );

      downloadBlob(dummyBlob, 'test-download.png');

      expect(createObjectURLMock).toHaveBeenCalledWith(dummyBlob);
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith(fakeUrl);

      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });
  });
});
