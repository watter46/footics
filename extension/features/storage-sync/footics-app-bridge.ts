import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { STORAGE_KEYS } from '~/constants';
import {
  SaveQueueSchema,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
} from '~/types/schemas';
import { isExtensionContextValid } from '~/utils/context';
import { detectMatchId } from '~/utils/match';
import {
  gcExpiredMatchMemoCaches,
  syncMatchMemoCacheToStorage,
} from './cache-sync';
import { replayOfflineQueue } from './offline-queue';
import { addToSaveQueue, processSaveQueue } from './save-queue';

/**
 * Footics Web App のホスト名であるかを判定する。
 * localhost, 127.0.0.1, footics.app, footics.com, pages.dev, watool.workers.dev 等を許可。
 */
export function isFooticsAppHost(hostname?: string): boolean {
  if (!hostname) {
    if (typeof window === 'undefined') return false;
    hostname = window.location.hostname;
  }
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '10.255.255.254' ||
    hostname === 'footics.app' ||
    hostname.endsWith('.footics.app') ||
    hostname === 'footics.com' ||
    hostname.endsWith('.footics.com') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.watool.workers.dev')
  );
}

export function dispatchCaptureToApp(payload: TacticalCapturePayload) {
  if (!payload?.dataUrl) return;
  window.postMessage(
    {
      type: TACTICAL_CAPTURE_WINDOW_MESSAGE,
      payload,
    },
    '*',
  );
}

function setupMatchSync(): () => void {
  const syncMatchIdToStorage = async () => {
    if (!isExtensionContextValid()) return;
    const matchId = detectMatchId();
    if (matchId) {
      await browser.storage.local.set({
        [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: matchId,
      });
      await syncMatchMemoCacheToStorage(matchId);
      await gcExpiredMatchMemoCaches(matchId);
    }
  };

  const observer = new MutationObserver(() => syncMatchIdToStorage());
  const observeDocumentElement = () => {
    if (document.documentElement) {
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-match-id'],
      });
    }
  };

  if (document.documentElement) {
    observeDocumentElement();
  } else {
    document.addEventListener('DOMContentLoaded', observeDocumentElement, {
      once: true,
    });
  }

  syncMatchIdToStorage();

  const handleFooticsAction = async (e: Event) => {
    const customEvent = e as CustomEvent<{ action?: string; matchId?: string }>;
    const { action, matchId } = customEvent.detail ?? {};
    if (action === 'REFRESH_DATA' && matchId) {
      await syncMatchMemoCacheToStorage(matchId);
    }
  };
  window.addEventListener('footics-action', handleFooticsAction);

  onMessage('GET_ACTIVE_MATCH_INFO', async () => {
    const matchId = detectMatchId();
    return { matchId };
  });

  return () => {
    observer.disconnect();
    document.removeEventListener('DOMContentLoaded', observeDocumentElement);
    window.removeEventListener('footics-action', handleFooticsAction);
  };
}

export function setupTacticalCaptureBridge(): () => void {
  onMessage('TACTICAL_CAPTURE_RECEIVED', async ({ data: payload }) => {
    if (!payload) return;
    dispatchCaptureToApp(payload);
  });

  const handleCapturePullRequest = async () => {
    if (!isExtensionContextValid()) return;
    try {
      const stored = (await browser.storage.local.get(
        STORAGE_KEYS.TACTICAL_PENDING_CAPTURE,
      )) as Record<string, unknown>;
      const rawPending = stored[STORAGE_KEYS.TACTICAL_PENDING_CAPTURE];
      const parsed = TacticalCapturePayloadSchema.safeParse(rawPending);
      if (parsed.success) {
        const pending = parsed.data;
        if (Date.now() - pending.timestamp < 60000) {
          dispatchCaptureToApp(pending);
        }
      }
    } catch (err) {
      console.warn('[FooticsBridge] handleCapturePullRequest failed:', err);
    }
  };

  const handleMessage = (e: MessageEvent) => {
    const msgEvent = e as MessageEvent<{ type?: string }>;
    if (msgEvent.data?.type === TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE) {
      handleCapturePullRequest();
    }
  };

  window.addEventListener('message', handleMessage);

  handleCapturePullRequest();
  const timer = setTimeout(handleCapturePullRequest, 500);

  return () => {
    clearTimeout(timer);
    window.removeEventListener('message', handleMessage);
  };
}

function setupSaveQueueSync(): () => void {
  onMessage('SAVE_MEMO_RELAY', async ({ data: payload }) => {
    if (!payload) return;
    await addToSaveQueue(payload as Parameters<typeof addToSaveQueue>[0]);
  });

  onMessage('REPLAY_OFFLINE_QUEUE', async () => {
    return await replayOfflineQueue(dispatchCaptureToApp);
  });

  let saveQueueDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  const debouncedProcessSaveQueue = (delay = 300) => {
    if (saveQueueDebounceTimer) {
      clearTimeout(saveQueueDebounceTimer);
    }
    saveQueueDebounceTimer = setTimeout(() => {
      saveQueueDebounceTimer = null;
      processSaveQueue();
    }, delay);
  };

  const handleStorageChange = async (
    changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
    areaName: string,
  ) => {
    if (!isExtensionContextValid()) return;
    if (areaName !== 'local' || !(STORAGE_KEYS.SAVE_QUEUE in changes)) return;
    const newValue = changes[STORAGE_KEYS.SAVE_QUEUE]?.newValue;
    const parsed = SaveQueueSchema.safeParse(newValue);
    if (!parsed.success) return;

    const hasPending = parsed.data.some(
      (item) =>
        item.status === 'pending' ||
        (item.status === 'error' && (item.retryCount ?? 0) < 3),
    );
    if (hasPending) {
      debouncedProcessSaveQueue();
    }
  };

  browser.storage.onChanged.addListener(handleStorageChange);

  processSaveQueue();
  replayOfflineQueue(dispatchCaptureToApp);

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      processSaveQueue();
      replayOfflineQueue(dispatchCaptureToApp);
    }
  };
  window.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (saveQueueDebounceTimer) {
      clearTimeout(saveQueueDebounceTimer);
      saveQueueDebounceTimer = null;
    }
    browser.storage.onChanged.removeListener(handleStorageChange);
    window.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Footics Web App 向けの通信・同期ブリッジを初期化する
 * クリーンアップ関数を返し、拡張機能リロード時やアンマウント時に全リスナーを確実に解除する。
 */
export function setupFooticsAppBridge(): () => void {
  if (!isFooticsAppHost()) {
    return () => {};
  }

  try {
    allowWindowMessaging('footics-app');
  } catch (e) {
    console.debug('[FooticsBridge] allowWindowMessaging info:', e);
  }

  const cleanupMatch = setupMatchSync();
  const cleanupCapture = setupTacticalCaptureBridge();
  const cleanupSave = setupSaveQueueSync();

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    window.dispatchEvent(
      new CustomEvent('footics-action', {
        detail: { action: 'CLOSE_OVERLAY' },
      }),
    );
    sendMessage('CLOSE_SIDEPANEL', {}, 'background').catch(() => {});
  };

  window.addEventListener('keydown', handleKeydown, true);

  return () => {
    cleanupMatch();
    cleanupCapture();
    cleanupSave();
    window.removeEventListener('keydown', handleKeydown, true);
  };
}
