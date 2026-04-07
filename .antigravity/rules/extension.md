# Browser Extension (WXT) Guidelines

## Architecture Overview
- WXTフレームワークを使用して拡張機能（`extension/`）を構築・保守する。
- 既存のコンポーネント・ブリッジ層（例：`MemoOverlayBridge.tsx`）の責務を尊重し、不要な密結合を避ける。
- Content Script でUIを挿入する場合は Shadow DOM を利用し、ホストページとのCSS干渉を防ぐ。

## Action Bridge & Messaging
- UIコンポーネント実装時はマウス操作だけでなく `useShortcut` を用いたキーボード操作を必ず検討し、セットで実装する。
- Mainアプリへの影響を与える全てのアクションは `window.dispatchEvent` を介した `footics-action` イベントでトリガーできるように設計する。
- Content Script と Background Script 間の通信プロトコルは、型安全性を確保した上で実装されなければならない。
