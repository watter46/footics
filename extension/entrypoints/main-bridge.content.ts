import { onMessage, setNamespace } from 'webext-bridge/window';

export default defineContentScript({
  matches: [
    '*://localhost/*',
    '*://footics.com/*',
    '*://10.255.255.254/*',
    '*://127.0.0.1/*',
    '*://footics.watool.workers.dev/*',
  ],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    console.log('💎 [Footics Main Bridge] Loaded in Main World');

    // webext-bridge の名前空間を登録
    setNamespace('footics-app');

    // Isolated World からの更新通知を待機
    onMessage('REFRESH_APP', ({ data }) => {
      console.log(
        '[MainBridge] Received REFRESH_APP, dispatching event:',
        data.matchId,
      );

      // アプリが期待している CustomEvent を発火
      window.dispatchEvent(
        new CustomEvent('footics-action', {
          detail: {
            action: 'REFRESH_DATA',
            matchId: data.matchId,
          },
        }),
      );
    });
  },
});
