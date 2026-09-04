---
id: L1-Extension-206
emoji: 📌
title: メモオーバーレイ フローティングミニモード (PIP風省スペース表示)
status: DONE
depends_on: ["L1-Extension-204", "L1-Extension-205"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - extension/features/memo-overlay/components/overlay-app.tsx
  - extension/features/memo-overlay/stores/use-overlay-store.ts
  - extension/features/memo-overlay/memo-overlay-bridge.tsx
  - extension/entrypoints/overlay.content.tsx
---

# 📌 L1-Extension-206: メモオーバーレイ フローティングミニモード (PIP風省スペース表示)

## UX Impact
画面中央のモーダルを閉じずに右下に小さく固定でき、動画視聴を邪魔しない省スペース状態でメモ入力を継続できる。モード切替ボタン1クリックで通常モードに戻せる。

## Detailed Spec
1. `useOverlayStore` に `displayMode: 'full' | 'mini'` ステートと `toggleDisplayMode()` アクションを追加。
2. `overlay-app.tsx` の `footics-overlay-root` div に `displayMode` を参照したスタイル分岐を追加：
   - `full`: 現状のフルオーバーレイ（画面中央、半透明背景）
   - `mini`: `position: fixed; bottom: 16px; right: 16px; width: 320px; z-index: 2147483646;` の小型フローティングパネル。ドラッグ移動はスコープ外（将来対応）。
3. `MemoOverlayBridge`（フルモード）と `MiniMemoPanel`（ミニモード）の2つの描画分岐をコンポーネントで実装。`MiniMemoPanel.tsx` は `extension/features/memo-overlay/components/` に新規作成し、入力テキストエリアと保存ボタンのみの最小UIを提供。
4. キーボードショートカット `Alt+M`（`wxt.config.ts` の `commands` へ追加）でフル⇔ミニのトグルを実現。

## Acceptance Criteria & Verification Commands
- [x] `Alt+M` でフルモードとミニモードが切り替わること
- [x] ミニモード時に動画コンテンツが遮られないこと（右下固定）
- [x] ミニモードで入力した内容がフルモードに戻しても保持されること
- [x] `wxt.config.ts` に `toggle-mini-mode` コマンドが追加されていること

### Verification
```
rtk biome check extension/features/memo-overlay/
rtk pnpm --filter footics-extension type-check
rtk pnpm --filter footics-extension build
```
