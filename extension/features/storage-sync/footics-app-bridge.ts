import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { STORAGE_KEYS } from '../../constants';
import {
  SaveQueueSchema,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
} from '../../types/schemas';
import { detectMatchId } from '../../utils/match';
import {
  gcExpiredMatchMemoCaches,
  syncMatchMemoCacheToStorage,
} from './cache-sync';
import { replayOfflineQueue } from './offline-queue';
import { addToSaveQueue, processSaveQueue } from './save-queue';

function dispatchCaptureToApp(payload: TacticalCapturePayload) {
  if (!payload?.dataUrl) return;
  window.postMessage(
    {
      type: TACTICAL_CAPTURE_WINDOW_MESSAGE,
      payload,
    },
    '*',
  );
  window.dispatchEvent(
    new CustomEvent(TACTICAL_CAPTURE_CUSTOM_EVENT, {
      detail: payload,
    }),
  );
}

function setupMatchSync() {
  const syncMatchIdToStorage = async () => {
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
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-match-id'],
  });
  syncMatchIdToStorage();

  window.addEventListener('footics-action', async (e) => {
    const customEvent = e as CustomEvent<{ action?: string; matchId?: string }>;
    const { action, matchId } = customEvent.detail ?? {};
    if (action === 'REFRESH_DATA' && matchId) {
      await syncMatchMemoCacheToStorage(matchId);
    }
  });

  onMessage('GET_ACTIVE_MATCH_INFO', async () => {
    const matchId = detectMatchId();
    return { matchId };
  });
}

function setupTacticalCaptureBridge() {
  onMessage('TACTICAL_CAPTURE_RECEIVED', async ({ data: payload }) => {
    if (!payload) return;
    dispatchCaptureToApp(payload);
  });

  const handleCapturePullRequest = async () => {
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

  window.addEventListener(
    TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
    handleCapturePullRequest,
  );
  window.addEventListener('message', (e) => {
    const msgEvent = e as MessageEvent<{ type?: string }>;
    if (msgEvent.data?.type === TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE) {
      handleCapturePullRequest();
    }
  });

  handleCapturePullRequest();
  setTimeout(handleCapturePullRequest, 500);
}

function setupSaveQueueSync() {
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

  browser.storage.onChanged.addListener(async (changes, areaName) => {
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
  });

  processSaveQueue();
  replayOfflineQueue(dispatchCaptureToApp);

  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      processSaveQueue();
      replayOfflineQueue(dispatchCaptureToApp);
    }
  });
}

/**
 * Footics Web App 向けの通信・同期ブリッジを初期化する
 */
export function setupFooticsAppBridge() {
  try {
    allowWindowMessaging('footics-app');
  } catch (e) {
    console.debug('[FooticsBridge] allowWindowMessaging info:', e);
  }

  setupMatchSync();
  setupTacticalCaptureBridge();
  setupSaveQueueSync();

  window.addEventListener(
    'keydown',
    (e) => {
      if (e.key !== 'Escape') return;
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: { action: 'CLOSE_OVERLAY' },
        }),
      );
      sendMessage('CLOSE_SIDEPANEL', {}, 'background').catch(() => {});
    },
    true,
  );
}
