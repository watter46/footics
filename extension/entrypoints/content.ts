import {
  allowWindowMessaging,
  onMessage,
  sendMessage,
} from 'webext-bridge/content-script';
import { STORAGE_KEYS } from '../constants';
import {
  gcExpiredMatchMemoCaches,
  syncMatchMemoCacheToStorage,
} from '../features/storage-sync/cache-sync';
import { replayOfflineQueue } from '../features/storage-sync/offline-queue';
import {
  addToSaveQueue,
  processSaveQueue,
} from '../features/storage-sync/save-queue';
import {
  SaveQueueSchema,
  TACTICAL_CAPTURE_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
  TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE,
  TACTICAL_CAPTURE_WINDOW_MESSAGE,
  type TacticalCapturePayload,
  TacticalCapturePayloadSchema,
} from '../types/schemas';
import { detectMatchId } from '../utils/match';

export default defineContentScript({
  matches: [
    '*://localhost/*',
    '*://footics.com/*',
    '*://10.255.255.254/*',
    '*://127.0.0.1/*',
    '*://footics.watool.workers.dev/*',
  ],
  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: Main content script entrypoint sets up multiple event listeners
  async main() {
    console.log('💎 [Footics Isolated Bridge] Content Script loaded');

    // Main World (bridge) との通信を許可
    allowWindowMessaging('footics-app');

    // ── Match ID の同期 ──
    const syncMatchIdToStorage = async () => {
      const matchId = detectMatchId();
      if (matchId) {
        await browser.storage.local.set({
          [STORAGE_KEYS.LAST_ACTIVE_MATCH_ID]: matchId,
        });
        console.log('[ContentScript] Syncing matchId to storage:', matchId);

        // キャッシュ同期とGCクリーンアップの実行
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

    // ── footics-action イベントの監視 ──
    window.addEventListener('footics-action', async (e) => {
      const customEvent = e as CustomEvent;
      const { action, matchId } = customEvent.detail ?? {};
      if (action === 'REFRESH_DATA' && matchId) {
        console.log(
          '[ContentScript] Catching REFRESH_DATA action, syncing cache for:',
          matchId,
        );
        await syncMatchMemoCacheToStorage(matchId);
      }
    });

    // ── メッセージハンドラ ──

    onMessage('GET_ACTIVE_MATCH_INFO', async () => {
      const matchId = detectMatchId();
      console.log('[ContentScript] Detected matchId:', matchId);
      return { matchId };
    });

    // アプリからの保存リクエスト（Main Bridge 経由）をキューへ登録
    onMessage('SAVE_MEMO_RELAY', async ({ data: payload }) => {
      if (!payload) return;
      console.log('[ContentScript] Received relayed save request:', payload);
      await addToSaveQueue(payload as Parameters<typeof addToSaveQueue>[0]);
    });

    // オフラインキューのリカバリー同期要求
    onMessage('REPLAY_OFFLINE_QUEUE', async () => {
      console.log('[ContentScript] Triggered REPLAY_OFFLINE_QUEUE message');
      return await replayOfflineQueue(dispatchCaptureToApp);
    });

    // ── Tactical キャプチャデータの中継パイプライン (Push & Pull) ──

    const dispatchCaptureToApp = (payload: TacticalCapturePayload) => {
      if (!payload?.dataUrl) return;
      console.log(
        '🎯 [ContentScript] Dispatching capture payload to Web App:',
        payload.id,
      );
      // 1. window.postMessage による Main World への安全なシリアライズ転送
      window.postMessage(
        {
          type: TACTICAL_CAPTURE_WINDOW_MESSAGE,
          payload,
        },
        '*',
      );
      // 2. CustomEvent による二重通知
      window.dispatchEvent(
        new CustomEvent(TACTICAL_CAPTURE_CUSTOM_EVENT, {
          detail: payload,
        }),
      );
    };

    // Background からの Tactical キャプチャデータ受信 (Push)
    onMessage('TACTICAL_CAPTURE_RECEIVED', async ({ data: payload }) => {
      if (!payload) return;
      console.log(
        '🎯 [ContentScript] Received TACTICAL_CAPTURE_RECEIVED via onMessage:',
        payload.id,
      );
      dispatchCaptureToApp(payload);
    });

    // Web アプリ側からの「最新キャプチャデータちょうだい」リクエスト (Pull)
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
            console.log(
              '🎯 [ContentScript] Replying to app pull request with pending capture:',
              pending.id,
            );
            dispatchCaptureToApp(pending);
          }
        }
      } catch (err) {
        console.warn('[ContentScript] handleCapturePullRequest failed:', err);
      }
    };

    window.addEventListener(
      TACTICAL_CAPTURE_PULL_CUSTOM_EVENT,
      handleCapturePullRequest,
    );
    window.addEventListener('message', (e) => {
      const msgEvent = e as MessageEvent;
      if (msgEvent.data?.type === TACTICAL_CAPTURE_PULL_WINDOW_MESSAGE) {
        handleCapturePullRequest();
      }
    });

    // 初期ロード時にも即時・遅延で pending capture をチェックしてディスパッチ
    handleCapturePullRequest();
    setTimeout(handleCapturePullRequest, 500);
    setTimeout(handleCapturePullRequest, 1500);

    // ── Storage Queue の監視 ──
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
      if (areaName !== 'local') return;
      if (!(STORAGE_KEYS.SAVE_QUEUE in changes)) return;

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

    // 初期ロード時にも未処理キューおよびオフラインデータをリカバリー
    processSaveQueue();
    replayOfflineQueue(dispatchCaptureToApp);

    // タブが可視状態になった際にもリプレイ同期を試行
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        replayOfflineQueue(dispatchCaptureToApp);
      }
    });

    // ── グローバルショートカット監視（Capture Phase） ──
    // アプリ側の stopPropagation を越えてキーを拾い、コマンドとして再配送する
    window.addEventListener(
      'keydown',
      (e) => {
        // Alt+E (Toggle) は browser.commands で処理されるため、ここでは Escape (閉じる) のみを扱う
        const isEscape = e.key === 'Escape';
        if (!isEscape) return;

        // アプリ側へ通知 (useDataSync / useMemoOverlayEventBridge が受信)
        window.dispatchEvent(
          new CustomEvent('footics-action', {
            detail: { action: 'CLOSE_OVERLAY' },
          }),
        );

        // サイドパネルを閉じる
        sendMessage('CLOSE_SIDEPANEL', {}, 'background').catch(() => {});
      },
      true,
    );
  },
});
