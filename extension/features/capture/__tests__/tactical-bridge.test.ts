import { beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants';
import {
  createCapturePayload,
  sendCaptureToTactical,
} from '../tactical-bridge';

// webext-bridge のモック
const mockSendMessage = vi.fn();
vi.mock('webext-bridge/content-script', () => ({
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

describe('tactical-bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // browser.storage.local のモック
    (globalThis as any).browser = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
    };

    // BroadcastChannel のモック
    (globalThis as any).BroadcastChannel = vi.fn().mockImplementation(() => ({
      postMessage: vi.fn(),
      close: vi.fn(),
    }));
  });

  it('createCapturePayload generates a valid payload with unique id and timestamp', () => {
    const payload = createCapturePayload('data:image/png;base64,test', {
      sourceUrl: 'https://youtube.com/watch?v=123',
      title: 'Match Video',
    });

    expect(payload.id).toMatch(/^capture_\d+_[a-z0-9]+$/);
    expect(payload.dataUrl).toBe('data:image/png;base64,test');
    expect(payload.sourceUrl).toBe('https://youtube.com/watch?v=123');
    expect(payload.title).toBe('Match Video');
    expect(typeof payload.timestamp).toBe('number');
  });

  it('sendCaptureToTactical saves to storage and sends background message', async () => {
    mockSendMessage.mockResolvedValue({
      success: true,
      tabId: 42,
      created: false,
    });

    const result = await sendCaptureToTactical('data:image/png;base64,test', {
      sourceUrl: 'https://footics.com',
      title: 'Analysis',
    });

    expect(result.success).toBe(true);
    expect(result.tabId).toBe(42);
    expect(result.created).toBe(false);
    expect(result.payload.dataUrl).toBe('data:image/png;base64,test');

    // browser.storage.local.set が呼ばれたか検証
    expect((globalThis as any).browser.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        [STORAGE_KEYS.TACTICAL_PENDING_CAPTURE]: expect.objectContaining({
          dataUrl: 'data:image/png;base64,test',
        }),
      }),
    );

    // sendMessage が正しく呼ばれたか検証
    expect(mockSendMessage).toHaveBeenCalledWith(
      'SEND_CAPTURE_TO_TACTICAL',
      expect.objectContaining({
        payload: expect.objectContaining({
          dataUrl: 'data:image/png;base64,test',
        }),
      }),
      'background',
    );
  });
});
