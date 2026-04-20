---
trigger: always_on
globs: ["extension/**/*.{ts,tsx}", "video-canvas/**/*.{ts,tsx}", "**/wxt.config.ts"]
---

# WXT & Chrome Extension Guidelines (WXT/拡張機能実装規約)

**Activation:** This rule is **ALWAYS ON** for files matching `extension/**/*` and `video-canvas/**/*`.

> **Positioning:** `/tep/exception-template.md` をベースに、WXT フレームワーク特有の機能（Manifest V3 自動生成, Storage等）を加味した実装指針です。

## 1. WXT Framework Architecture (WXT の構造利用)
- **原則:** WXT の提供する規約（Entrypoints, Messaging, Storage）に従い、ボイラープレートを最小限に抑える。
- **行動指針:**
    - 各エントリポイント（Background, Content Script, Popup, Options）は `entrypoints/` 配下に配置する。
    - WXT の自動インポート機能を活用し、`browser` (WXT Polyfill) を標準的に利用する。

## 2. Manifest V3 & Background Scripts
- **原則:** Manifest V3 の仕様を遵守し、Background は Service Worker として実装する。
- **行動指針:**
    - Background 処理での DOM 依存は禁止。必要な場合は Content Scripts と連携する。
    - 生存期間が限られる Service Worker の特性を考慮し、ステートの永続化には `storage` を利用する。

## 3. Storage & State Management
- **原則:** 型安全なストレージアクセスを行い、複数のエントリポイント間で同期をとる。
- **行動指針:**
    - WXT の `storage` API を利用する。
    - ストレージキーは一元管理し、Zod 等でスキーマ定義を行うことを推奨。
    - クライアントサイド（Popup/Overlay）の UI ステート管理には Zustand を併用し、ストレージとの同期レイヤーを作成する。

## 4. Communication (Messaging)
- **原則:** エントリポイント間の通信は透過的かつ型安全に行う。
- **行動指針:**
    - `sendMessage` / `onMessage` の通信時には、メッセージの種類に応じた型定義を共通化して利用する。
    - Content Scripts とウェブページ間の干渉を避けるため、CSS のカプセル化（Shadow DOM等）を検討する。

## 5. Security & Permissions
- **原則:** 最小権限の原則 (Principle of Least Privilege) に従う。
- **行動指針:**
    - `manifest.json` (wxt.config.ts) で要求する権限は最小限にする。
    - ユーザーデータの取り扱いは暗号化やセキュアな通信を徹底する。
    - 外部スクリプトの直接実行を避け、CSP (Content Security Policy) を遵守する。

## 6. UI & UX (Shadow DOM / Overlay)
- **原則:** ウェブページの既存のデザインを壊さず、スムーズなオーバーレイを提供する。
- **行動指針:**
    - Overlay UI は Shadow DOM を利用してスタイルを分離する。`wxt` の `createShadowRootUi` などを活用し、Tailwind CSS を Shadow DOM 内に適用してカプセル化を徹底すること。
    - プレミアムな外観（トースト通知、アニメーション）を維持し、拡張機能であることを意識させないシームレスな体験を目指す。