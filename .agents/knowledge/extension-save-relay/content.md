# Extension Save Relay Architecture (拡張機能の保存中継アーキテクチャ)

## 概要
Web アプリ側から拡張機能の Isolated World を経由して安全に IndexedDB に保存し、複数タブ間の競合を防ぐための「保存キュー」と「中継ブリッジ」のアーキテクチャ制約です。

## 厳守すべき制約 (Constraints)

1. **保存リクエストの中継経路 (MAIN -> ISOLATED)**
   - Web App 側（Main World）から拡張機能の保存機能を利用する場合、直接 IndexedDB を触るのではなく、DOMイベント `footics-save-request` を発火させます。
   - `extension/entrypoints/main-bridge.content.ts` (MAIN world) がこれをキャッチし、`webext-bridge` を用いて `SAVE_MEMO_RELAY` メッセージとして Isolated World へ転送します。
   - **禁止事項:** 拡張機能側から Web App 側へ保存結果をコールバックで返さないでください（同期は `footics-action` に依存します）。

2. **Save Queue と排他制御 (navigator.locks)**
   - 受信した保存リクエストは、直ちに IndexedDB に書き込まず、一度 `browser.storage.local` のキュー (`SAVE_QUEUE`) に追加します (`addToSaveQueue`)。
   - 実際の書き込み (`processSaveQueue`) は、必ず `navigator.locks.request('footics_save_queue', ...)` でラップし、複数タブや複数プロセスの同時実行によるデータベース競合を防ぎます。
   - **アンチパターン:** `navigator.locks` を使わずに `putMatchMemo` や `saveCustomEvent` を直接非同期ループで呼び出すと、Dexieのトランザクションが衝突するリスクがあります。

3. **保存後の同期責務の移譲**
   - キュー処理 (`processSaveQueue`) で DB 操作関数 (`saveCustomEvent` 等) を呼び出した後、UIの更新に必要な `dispatchRefreshEvent` は、**DB 操作関数自身の内部**で発火することが保証されているため、キュー処理側で独自の同期イベントを追加発行してはいけません。

> [!WARNING]
> Webアプリ側からの保存が機能しない場合、`main-bridge.content.ts` がロードされているか（MAIN World）、および `SAVE_MEMO_RELAY` のハンドラ (`extension/entrypoints/content.ts` 内) が正しくキューに流しているかを確認してください。
