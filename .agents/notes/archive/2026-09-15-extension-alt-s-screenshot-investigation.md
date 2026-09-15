# 📋 Extension Alt+S スクリーンショット不具合 調査引き継ぎ書

- **作成日**: 2026-09-15
- **対象領域**: `extension/**`, `src/features/tactical-unified/**`
- **事象**: ブラウザ拡張機能にて `Alt+S` で動画フレームのスクリーンショット（Tactical画面への転送）が実行できない。

---

## 1. 処理フローと関連ファイル

```text
[ ユーザーの Alt+S 押下 ]
       │
       ▼ (1. Commands API)
【wxt.config.ts】
  - commands: 'capture-to-tactical' (suggested_key: 'Alt+S')
       │
       ▼ (2. Background Command 受信)
【extension/entrypoints/background.ts】
  - browser.commands.onCommand.addListener
  - アクティブタブの特定 (browser.tabs.query)
  - sendMessage('TRIGGER_CAPTURE', {}, `content-script@${activeTab.id}`)
       │
       ▼ (3. 動画ページ Content Script 処理)
【extension/entrypoints/overlay.content.tsx】
  - onMessage('TRIGGER_CAPTURE')
  - findVideoElement() (drm-capture-engine.ts: video探索 & DRM回避CSS適用)
  - sendMessage('REQUEST_TAB_CAPTURE', {}, 'background')
  - calculateContainVideoCrop() & cropCapturedImage() (video-cropper.ts: 黒帯除去)
  - sendCaptureToTactical() (tactical-bridge.ts: ストレージ保存 & メッセージ送信)
       │
       ▼ (4. Tactical 画面への転送・適用)
【background.ts】 onMessage('SEND_CAPTURE_TO_TACTICAL')
  - /tactical タブの探索または新規タブ起動
  - sendMessage('TACTICAL_CAPTURE_RECEIVED')
【src/features/tactical-unified/hooks/use-tactical-capture-bridge.ts】
  - CustomEvent / BroadcastChannel / window.message 経由でキャプチャ画像を受信し、Canvas背景に設定
```

---

## 2. 現在の検証状況

- **単体テスト結果**: `rtk vitest run extension` 実行済み
  - **41件全件 PASS (41 passed, 0 failed)**
  - ロジック・ブリッジコード自体の単体テストは正常に動作している。

---

## 3. 推定される原因の仮説一覧

| 優先度 | 原因仮説 | 発生メカニズム・詳細 |
| :---: | :--- | :--- |
| **高** | **① Chrome側でショートカット未割り当て** | Chromeの仕様上、拡張機能の更新・リロード時やキー競合時に `suggested_key` が適用されず `chrome://extensions/shortcuts` で空白（未設定）になる。 |
| **高** | **② Content Script 未インジェクション** | 拡張機能をビルド・再読み込みした後に、対象の動画ページをF5リロードしていないため、古いContent Scriptが切断されてメッセージを受信できない。 |
| **中** | **③ 対象ページの制約・iframe動画** | `chrome://*` 等の保護ページ、または `<video>` 要素がクロスオリジンの `<iframe>` 内に埋め込まれており、トップフレームからアクセスできない。 |
| **中** | **④ Background側での activeTab 取得失敗** | DevToolsや別ウィンドウにフォーカスがある状態でショートカットが押され、`activeTab` が特定できない。 |
| **低** | **⑤ captureVisibleTab 実行失敗** | ウィンドウ非表示やAPI制限等によるエラー。 |

---

## 4. 次のチャットで実施する調査・切り分け手順

1. **ブラウザ設定の確認**:
   * `chrome://extensions/shortcuts` を開き、Footics Sidepanel の `Capture video frame and send to Footics Tactical` に `Alt+S` が正しく割り当てられているか確認（空欄の場合は再設定）。
2. **対象タブの再読み込み**:
   * 動画ページを F5 でリロードして Content Script を再接続。
3. **ログトレースによる特定**:
   * **Background（Service Worker）コンソール**:
     * `🚀 [Footics BG] Command received: capture-to-tactical` の出力有無
     * `📸 [Footics BG] Sending TRIGGER_CAPTURE to active tab: ...` の出力有無
   * **動画ページ（F12コンソール）**:
     * `💎 [Footics] Overlay Content Script Injected` の出力有無
     * `📸 [Footics Capture] Capture trigger received` の出力有無
     * クロップや転送に関するエラー（`❌ [Footics Capture] ...`）の有無
