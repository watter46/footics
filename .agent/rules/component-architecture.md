---
trigger: always_on
description: tldraw (TLD Kit) を含むプロジェクトにおける高級コンポーネント設計規約
globs: ["video-canvas/**/*.{ts,tsx}"]
---

---
trigger: always_on
globs: ["video-canvas/**/*.{ts,tsx}"]
---

# High-Level Component Architecture (TLD Kit / tldraw 準拠)

**Activation:** This rule is **ALWAYS ON** for projects utilizing `tldraw` (TLD Kit), specifically matching `video-canvas/**/*.{ts,tsx}`.

tldraw を基盤とした編集ツールにおいて、高いパフォーマンスと洗練された UI/UX を両立させるための設計指針です。

## 1. Component Composition (コンポーネント構成)

- **原則:** tldraw エディタ、カスタム UI (Overlay)、およびツール設定を明確に分離する。
- **行動指針:**
    - `Canvas`: `tldraw` エディタ本体をラップし、イベントや初期化を管理する。
    - `Overlay`: エディタの上に重なる UI（ツールバー、インスペクタ）。`pointer-events: none` と `pointer-events: auto` を適切に使い分ける。
    - `Panel`: 各種設定項目（色、太さなど）。shadcn/ui のコンポーネントをベースにカスタマイズする。

## 2. Advanced Styling with Tailwind v4 & CVA

- **原則:** 複雑な UI 状態は `class-variance-authority` (CVA) を用いて宣言的に記述する。
- **行動指針:**
    - ツールが選択されているか、アクティブか、無効かなどの状態を `variants` として定義する。
    - `tailwind-merge` を使い、動的なプロップスによるスタイル上書きを安全に行う。

```typescript
const toolbarButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      active: {
        true: "bg-primary text-primary-foreground shadow-sm",
        false: "hover:bg-muted hover:text-muted-foreground",
      },
    },
    defaultVariants: {
      active: false,
    },
  }
);
```

## 3. Interactive UX & Micro-interactions

- **原則:** 操作感に「重さ」を感じさせないよう、適切なフィードバックを返す。
- **行動指針:**
    - ホバー時、クリック時のスケール感や色変化を全てのインタラクティブ要素に。
    - アイコンは `lucide-react` を基本とし、ストローク幅は `1.5` または `2` で統一する。
    - ダイアログやポップオーバーの表示には `framer-motion` または Tailwind v4 のアニメーションユーティリティを使用する。

## 4. tldraw State Management

- **原則:** React の `useState` と `editor` のステートを混在させず、適切に同期する。
- **行動指針:**
    - エディタのプロパティ（色やスタイル）は、`editor.user.updateUserPreferences` や `editor.setStyleForSelectedShapes` を通じて操作する。
    - UI 側で保持すべきステート（パネルの開閉、ドラッグ中フラグなど）は Zustand または `useState` で管理する。

## 5. Shadow DOM & Style Isolation

- **原則:** (拡張機能の場合) ホストページのスタイル干渉を防ぐため、UI は Shadow DOM 内にカプセル化することを検討する。
- **行動指針:**
    - `wxt` の `createShadowRootUi` などを活用し、Tailwind CSS を Shadow DOM 内に適用する。