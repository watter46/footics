import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CaptureService, executeCapturePipeline } from '../capture-service';

// Mock dependencies
const mockSendMessage = vi.fn();
vi.mock('webext-bridge/content-script', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

const mockCleanup = vi.fn();
const mockFindVideoElement = vi.fn();
const mockPrepareDRMHardenedUI = vi.fn();
const mockWaitForNextFrames = vi.fn();

vi.mock('../../drm-capture-engine', () => ({
  findVideoElement: (...args: unknown[]) => mockFindVideoElement(...args),
  prepareDRMHardenedUI: (...args: unknown[]) =>
    mockPrepareDRMHardenedUI(...args),
  waitForNextFrames: (...args: unknown[]) => mockWaitForNextFrames(...args),
}));

const mockCalculateContainVideoCrop = vi.fn();
const mockCropCapturedImage = vi.fn();

vi.mock('../../video-cropper', () => ({
  calculateContainVideoCrop: (...args: unknown[]) =>
    mockCalculateContainVideoCrop(...args),
  cropCapturedImage: (...args: unknown[]) => mockCropCapturedImage(...args),
}));

const mockSetToast = vi.fn();
vi.mock('../../../memo-overlay', () => ({
  useOverlayStore: {
    getState: () => ({
      setToast: mockSetToast,
    }),
  },
}));

describe('CaptureService', () => {
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    vi.clearAllMocks();

    mockCleanup.mockClear();
    mockPrepareDRMHardenedUI.mockReturnValue({ cleanup: mockCleanup });
    mockWaitForNextFrames.mockResolvedValue(undefined);

    mockVideo = {
      videoWidth: 1920,
      videoHeight: 1080,
      currentTime: 42.6,
    } as unknown as HTMLVideoElement;

    mockFindVideoElement.mockReturnValue(mockVideo);

    mockCalculateContainVideoCrop.mockReturnValue({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });

    mockCropCapturedImage.mockResolvedValue(
      'data:image/webp;base64,cropped-image',
    );

    mockSendMessage.mockImplementation(async (type: string) => {
      if (type === 'REQUEST_TAB_CAPTURE') {
        return {
          success: true,
          dataUrl: 'data:image/jpeg;base64,raw-tab-capture',
        };
      }
      if (type === 'SAVE_AND_OPEN_CANVAS') {
        return { success: true, id: 'shot_123', tabId: 10 };
      }
      return { success: false };
    });
  });

  describe('executeCapturePipeline', () => {
    it('正常系: ビデオ検出・DRM保護適用・タブキャプチャ・クロップ・保存・Toast表示が完遂し true を返す', async () => {
      const result = await executeCapturePipeline();

      expect(result).toBe(true);

      // 1. DRM UI準備と待機
      expect(mockFindVideoElement).toHaveBeenCalledTimes(1);
      expect(mockPrepareDRMHardenedUI).toHaveBeenCalledWith(mockVideo);
      expect(mockWaitForNextFrames).toHaveBeenCalledWith(3);

      // 2. タブキャプチャ要求
      expect(mockSendMessage).toHaveBeenCalledWith(
        'REQUEST_TAB_CAPTURE',
        {},
        'background',
      );

      // 3. レターボックス計算とクロップ
      expect(mockCalculateContainVideoCrop).toHaveBeenCalledWith({
        videoWidth: 1920,
        videoHeight: 1080,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      });
      expect(mockCropCapturedImage).toHaveBeenCalledWith(
        'data:image/jpeg;base64,raw-tab-capture',
        { x: 0, y: 0, width: 1920, height: 1080 },
        'image/webp',
      );

      // 4. Quick Canvas パイプライン要求
      expect(mockSendMessage).toHaveBeenCalledWith(
        'SAVE_AND_OPEN_CANVAS',
        {
          imageDataUrl: 'data:image/webp;base64,cropped-image',
          videoUrl: window.location.href,
          videoTitle: document.title,
          videoTime: 42,
        },
        'background',
      );

      // 5. Toast 表示
      expect(mockSetToast).toHaveBeenCalledWith('🎨 Quick Canvasを開きました');

      // 6. cleanup が呼ばれたこと
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('CaptureService.executeCapturePipeline でも同一の実行が可能であること', async () => {
      const result = await CaptureService.executeCapturePipeline();
      expect(result).toBe(true);
      expect(mockSetToast).toHaveBeenCalledTimes(1);
    });

    it('クロップ処理が失敗した場合は元の dataUrl を使用してフォールバックすること', async () => {
      mockCropCapturedImage.mockRejectedValueOnce(
        new Error('Crop failed in worker'),
      );

      const result = await executeCapturePipeline();

      expect(result).toBe(true);
      expect(mockSendMessage).toHaveBeenCalledWith(
        'SAVE_AND_OPEN_CANVAS',
        expect.objectContaining({
          imageDataUrl: 'data:image/jpeg;base64,raw-tab-capture',
        }),
        'background',
      );
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('動画が見つからない場合はクロップ・DRM待機をスキップし、元の dataUrl・videoTime 0 で保存すること', async () => {
      mockFindVideoElement.mockReturnValue(null);

      const result = await executeCapturePipeline();

      expect(result).toBe(true);
      expect(mockPrepareDRMHardenedUI).not.toHaveBeenCalled();
      expect(mockWaitForNextFrames).not.toHaveBeenCalled();
      expect(mockCalculateContainVideoCrop).not.toHaveBeenCalled();
      expect(mockCropCapturedImage).not.toHaveBeenCalled();

      expect(mockSendMessage).toHaveBeenCalledWith(
        'SAVE_AND_OPEN_CANVAS',
        expect.objectContaining({
          imageDataUrl: 'data:image/jpeg;base64,raw-tab-capture',
          videoTime: 0,
        }),
        'background',
      );
      expect(mockSetToast).toHaveBeenCalledTimes(1);
    });

    it('動画の寸法が 0 の場合はクロップ処理をスキップすること', async () => {
      const zeroDimensionVideo = {
        videoWidth: 0,
        videoHeight: 0,
        currentTime: 42.6,
      } as unknown as HTMLVideoElement;
      mockFindVideoElement.mockReturnValue(zeroDimensionVideo);

      const result = await executeCapturePipeline();

      expect(result).toBe(true);
      expect(mockCalculateContainVideoCrop).not.toHaveBeenCalled();
      expect(mockCropCapturedImage).not.toHaveBeenCalled();
      expect(mockSendMessage).toHaveBeenCalledWith(
        'SAVE_AND_OPEN_CANVAS',
        expect.objectContaining({
          imageDataUrl: 'data:image/jpeg;base64,raw-tab-capture',
        }),
        'background',
      );
    });

    it('REQUEST_TAB_CAPTURE が失敗した場合は false を返し、保存をスキップすること', async () => {
      mockSendMessage.mockImplementation(async (type: string) => {
        if (type === 'REQUEST_TAB_CAPTURE') {
          return { success: false, error: 'User cancelled capture' };
        }
        return { success: false };
      });

      const result = await executeCapturePipeline();

      expect(result).toBe(false);
      expect(mockSendMessage).not.toHaveBeenCalledWith(
        'SAVE_AND_OPEN_CANVAS',
        expect.anything(),
        expect.anything(),
      );
      expect(mockSetToast).not.toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('REQUEST_TAB_CAPTURE が dataUrl を返さなかった場合は false を返すこと', async () => {
      mockSendMessage.mockImplementation(async (type: string) => {
        if (type === 'REQUEST_TAB_CAPTURE') {
          return { success: true };
        }
        return { success: false };
      });

      const result = await executeCapturePipeline();

      expect(result).toBe(false);
      expect(mockSetToast).not.toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('SAVE_AND_OPEN_CANVAS が失敗した場合は false を返し、Toast を表示しないこと', async () => {
      mockSendMessage.mockImplementation(async (type: string) => {
        if (type === 'REQUEST_TAB_CAPTURE') {
          return {
            success: true,
            dataUrl: 'data:image/jpeg;base64,raw-tab-capture',
          };
        }
        if (type === 'SAVE_AND_OPEN_CANVAS') {
          return { success: false, error: 'Failed to open canvas' };
        }
        return { success: false };
      });

      const result = await executeCapturePipeline();

      expect(result).toBe(false);
      expect(mockSetToast).not.toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('パイプライン実行中に予期せぬ例外が発生した場合は false を返し、cleanup を実行すること', async () => {
      mockSendMessage.mockRejectedValueOnce(
        new Error('Fatal IPC bridge disconnect'),
      );

      const result = await executeCapturePipeline();

      expect(result).toBe(false);
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });

    it('オプション指定（videoElement, waitFrames, cropFormat, disableToast）が反映されること', async () => {
      const customVideo = {
        videoWidth: 1280,
        videoHeight: 720,
        currentTime: 10,
      } as unknown as HTMLVideoElement;

      const result = await executeCapturePipeline({
        videoElement: customVideo,
        waitFrames: 5,
        cropFormat: 'image/png',
        disableToast: true,
      });

      expect(result).toBe(true);
      expect(mockFindVideoElement).not.toHaveBeenCalled();
      expect(mockPrepareDRMHardenedUI).toHaveBeenCalledWith(customVideo);
      expect(mockWaitForNextFrames).toHaveBeenCalledWith(5);
      expect(mockCropCapturedImage).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        'image/png',
      );
      expect(mockSetToast).not.toHaveBeenCalled();
      expect(mockCleanup).toHaveBeenCalledTimes(1);
    });
  });
});
