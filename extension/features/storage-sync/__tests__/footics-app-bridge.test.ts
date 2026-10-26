import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { STORAGE_KEYS } from '../../../constants';
import {
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  type TacticalCapturePayload,
} from '../../../types/schemas';
import { syncMatchMemoCacheToStorage } from '../cache-sync';
import {
  dispatchCaptureToApp,
  isFooticsAppHost,
  setupFooticsAppBridge,
  setupMatchSync,
  setupTacticalCaptureBridge,
} from '../footics-app-bridge';

// webext-bridge のモック
vi.mock('webext-bridge/content-script', () => ({
  allowWindowMessaging: vi.fn(),
  onMessage: vi.fn(),
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../cache-sync', () => ({
  syncMatchMemoCacheToStorage: vi.fn().mockResolvedValue(undefined),
  gcExpiredMatchMemoCaches: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../offline-queue', () => ({
  replayOfflineQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../save-queue', () => ({
  addToSaveQueue: vi.fn().mockResolvedValue(undefined),
  processSaveQueue: vi.fn().mockResolvedValue(undefined),
}));

describe('footics-app-bridge', () => {
  let storageMap: Record<string, unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    storageMap = {};

    (globalThis as any).browser = {
      runtime: {
        id: 'test-extension-id',
      },
      storage: {
        local: {
          get: vi.fn().mockImplementation(async (key: string | null) => {
            if (key === null) return storageMap;
            return { [key]: storageMap[key] };
          }),
          set: vi
            .fn()
            .mockImplementation(async (obj: Record<string, unknown>) => {
              Object.assign(storageMap, obj);
            }),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFooticsAppHost', () => {
    it('許可されたホスト名で true を返すこと', () => {
      expect(isFooticsAppHost('localhost')).toBe(true);
      expect(isFooticsAppHost('127.0.0.1')).toBe(true);
      expect(isFooticsAppHost('footics.app')).toBe(true);
      expect(isFooticsAppHost('dev.footics.app')).toBe(true);
      expect(isFooticsAppHost('footics.com')).toBe(true);
      expect(isFooticsAppHost('preview.pages.dev')).toBe(true);
      expect(isFooticsAppHost('api.watool.workers.dev')).toBe(true);
    });

    it('不許可のホスト名で false を返すこと', () => {
      expect(isFooticsAppHost('evil.com')).toBe(false);
      expect(isFooticsAppHost('example.org')).toBe(false);
      expect(isFooticsAppHost('notfootics.app.attacker.com')).toBe(false);
    });
  });

  describe('dispatchCaptureToApp (単一プロトコル化)', () => {
    it('window.postMessage のみ送信し、CustomEvent は dispatch しないこと', () => {
      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      const payload: TacticalCapturePayload = {
        id: 'capture-123',
        dataUrl: 'data:image/jpeg;base64,sample',
        timestamp: Date.now(),
      };

      dispatchCaptureToApp(payload);

      // postMessage が正しく呼ばれる
      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: TACTICAL_CAPTURE_WINDOW_MESSAGE,
          payload,
        },
        '*',
      );

      // CustomEvent は dispatch されない
      expect(dispatchEventSpy).not.toHaveBeenCalled();
    });

    it('payload.dataUrl が存在しない場合は送信しないこと', () => {
      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      const payload = {
        dataUrl: '',
        timestamp: Date.now(),
      } as TacticalCapturePayload;

      dispatchCaptureToApp(payload);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('setupTacticalCaptureBridge (PULL 要求受信)', () => {
    it('postMessage による PULL 要求で pending capture が app へ送信されること', async () => {
      const pendingCapture: TacticalCapturePayload = {
        id: 'test-capture-id',
        dataUrl: 'data:image/jpeg;base64,pending-img',
        timestamp: Date.now(),
      };
      storageMap[STORAGE_KEYS.TACTICAL_PENDING_CAPTURE] = pendingCapture;

      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      const cleanup = setupTacticalCaptureBridge();

      // 初回即時実行が完了するのを待機
      await vi.waitFor(() => {
        expect(postMessageSpy).toHaveBeenCalledTimes(1);
      });
      postMessageSpy.mockClear();

      // postMessage で PULL 要求送信
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE },
        }),
      );

      // 非同期ストレージ取得を待機
      await vi.waitFor(() => {
        expect(postMessageSpy).toHaveBeenCalledWith(
          {
            type: TACTICAL_CAPTURE_WINDOW_MESSAGE,
            payload: pendingCapture,
          },
          '*',
        );
      });

      cleanup();
    });

    it('CustomEvent の PULL 要求には反応しないこと (CustomEvent 撤去の検証)', async () => {
      const pendingCapture: TacticalCapturePayload = {
        id: 'test-capture-id',
        dataUrl: 'data:image/jpeg;base64,pending-img',
        timestamp: Date.now(),
      };
      storageMap[STORAGE_KEYS.TACTICAL_PENDING_CAPTURE] = pendingCapture;

      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      const cleanup = setupTacticalCaptureBridge();

      // 初回即時実行が完了するのを待機
      await vi.waitFor(() => {
        expect(postMessageSpy).toHaveBeenCalledTimes(1);
      });
      postMessageSpy.mockClear();

      // CustomEvent で PULL 要求送信（旧仕様）
      window.dispatchEvent(new CustomEvent(TACTICAL_CAPTURE_PULL_CUSTOM_EVENT));

      // 50ms 待機しても postMessage は呼ばれない
      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(postMessageSpy).not.toHaveBeenCalled();

      cleanup();
    });

    it('クリーンアップ実行時にリスナーが解除されること', async () => {
      const pendingCapture: TacticalCapturePayload = {
        id: 'test-capture-id',
        dataUrl: 'data:image/jpeg;base64,pending-img',
        timestamp: Date.now(),
      };
      storageMap[STORAGE_KEYS.TACTICAL_PENDING_CAPTURE] = pendingCapture;

      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});

      const cleanup = setupTacticalCaptureBridge();

      // 初回即時実行が完了するのを待機
      await vi.waitFor(() => {
        expect(postMessageSpy).toHaveBeenCalledTimes(1);
      });
      postMessageSpy.mockClear();

      cleanup();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE },
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('setupMatchSync', () => {
    it('postMessage で FOOTICS_ACTION REFRESH_DATA を受信したときに syncMatchMemoCacheToStorage が呼ばれること', async () => {
      const cleanup = setupMatchSync();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'FOOTICS_ACTION',
            action: 'REFRESH_DATA',
            payload: { matchId: 'match-999' },
          },
        }),
      );

      await vi.waitFor(() => {
        expect(syncMatchMemoCacheToStorage).toHaveBeenCalledWith('match-999');
      });

      cleanup();
    });

    it('不正な形式の postMessage の場合は syncMatchMemoCacheToStorage が呼ばれないこと', async () => {
      vi.mocked(syncMatchMemoCacheToStorage).mockClear();
      const cleanup = setupMatchSync();

      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            type: 'UNKNOWN_TYPE',
          },
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(syncMatchMemoCacheToStorage).not.toHaveBeenCalled();

      cleanup();
    });
  });

  describe('setupFooticsAppBridge keydown interceptor', () => {
    it('Escape キー押下時に postMessage で CLOSE_OVERLAY が発火し CustomEvent は dispatch されないこと', () => {
      const postMessageSpy = vi
        .spyOn(window, 'postMessage')
        .mockImplementation(() => {});
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

      const cleanup = setupFooticsAppBridge();

      window.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );

      expect(postMessageSpy).toHaveBeenCalledWith(
        {
          type: 'FOOTICS_ACTION',
          action: 'CLOSE_OVERLAY',
        },
        expect.any(String),
      );
      // footics-action CustomEvent は dispatch されない (テスト自身の keydown のみ)
      const customEvents = dispatchSpy.mock.calls.filter(
        ([e]) => (e as Event).type === 'footics-action',
      );
      expect(customEvents).toHaveLength(0);

      cleanup();
      postMessageSpy.mockRestore();
      dispatchSpy.mockRestore();
    });
  });
});
