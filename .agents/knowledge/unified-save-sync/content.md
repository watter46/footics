# Unified Save & Sync Architecture (統合保存・同期アーキテクチャ)

## 概要
Web本体とブラウザ拡張機能間でのデータの一貫性を保つため、**保存レイヤーの共通化 (`src/lib/db/`)** と **DOMイベント (`footics-action`) による同期の自動化** を行うアーキテクチャ制約です。

## 厳守すべき制約 (Constraints)

1. **保存の共通窓口 (`src/lib/db/`)**
   - アプリケーションや拡張機能から直接 IndexedDB や `Dexie` テーブルを無秩序に操作しないでください。
   - すべてのデータ書き込み操作は、必ず `src/lib/db/queries.ts` 内に定義された関数（例: `saveCustomEvent`, `putMatchMemo`, `putEventMemo`）を介して行ってください。

2. **自動通知の義務 (`footics-action`)**
   - `src/lib/db/queries.ts` 内でデータを保存・更新した**直後**には、必ず `dispatchRefreshEvent(matchId)` ヘルパーを呼び出して同期イベント (`footics-action` / `REFRESH_DATA`) を発火させてください。
   - **禁止事項:** 同期のために、拡張機能専用メッセージング（例: `REFRESH_APP`）を乱立させないでください（DOMイベントで Main World / Isolated World 間の透過的な通信が可能です）。

3. **無限ループの防止 (UI側)**
   - 同期イベントを受け取った UI（フック・ストア）は、データの再取得（TanStack Query の `invalidateQueries` や Dexie 読み込み）**のみ**を行ってください。
   - イベント受信をトリガーにして、さらにデータの保存や上書きを自動的に連鎖させる処理は厳禁です。

> [!WARNING]
> データが同期されない（保存したのに別の画面に反映されない）バグが発生した場合、真っ先に `src/lib/db/queries.ts` の該当保存関数内で `dispatchRefreshEvent` が呼び出されているかを確認してください。
