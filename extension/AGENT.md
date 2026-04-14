# extension: Common Browser Extension Base

このディレクトリは、WXT (Web Extension Toolbox) をベースとしたブラウザ拡張機能の共通機能を管理します。

## 1. 開発コンテキスト
- **Domain:** 各種動画プラットフォーム上でのデータ収集・連携用拡張機能。
- **Core Stack:** WXT, React 19.
- **Styling:** Tailwind CSS v4 (@tailwindcss/vite).

## 2. 開発ルール
- **WXT Core:** `chrome-extension-wxt.md` に従い、Background Scripts, Content Scripts, Popup の責務を明確に分離すること。
- **Shared Logic:** `/utils` や `/hooks` は、可能な限り `video-canvas` との共有を意識すること（必要に応じてルートの共有パッケージ化を検討）。

## 3. 構造
- `entrypoints/`: 各機能のエントリポイント。
- `features/`: ドメイン別の論理カプセル。
- `hooks/`: 拡張機能特有の React Hooks。

## 参照すべきルール
- [chrome-extension-wxt.md](file:///home/watter46/src/footics/.agent/rules/chrome-extension-wxt.md)
