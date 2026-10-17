---
name: cross-platform-component-design
description: Footics Web アプリケーションと Chrome Extension でコンポーネントを2重管理なしで安全に共用・拡張するための設計・実装スキル
---

# クロスプラットフォーム・コンポーネント設計スキルガイド

Footics Web アプリ（戦術分析ボード、Next.js）と Chrome Extension（動画オーバーレイ・クイックキャンバス、WXT）で、**同一の UI コンポーネントやドメイン機能を安全に共有し、初期チラつき（Flicker）や黒マージン等の副作用を排除するための実践スキル**です。

---

## 1. ディレクトリと配置のゴールデンルール

コンポーネントは、必ず以下の 4 階層に対応するディレクトリ構造に配置します。

```
src/features/<feature-name>/
├── components/          # Level 2: Domain UI Blocks (Web/Ext 100% 共用)
├── core/                # Level 1〜2: ヘッドレス描画コア、プラグイン定義
│   ├── tools/           # ツール・アノテーションプラグイン
│   └── store/           # Store Provider (Vanilla Store Factory + Context)
├── hooks/               # ヘッドレスなビジネスロジック・幾何計算
├── types/               # ドメイン型・プラグインインターフェース
└── views/               # Level 3: Feature Views (Provider で囲む合成層)
```

- **ホスト境界**: `chrome.*` API や `window.location.search`、Dexie DB への直接アクセスは、必ず **Level 4 (Shell)** または **Level 3 (Feature View)** に隔離し、`components/` 配下に持ち込んではなりません。

---

## 2. Store Provider パターン (Vanilla Store Factory + React Context)

単一のグローバル Zustand ストア（シングルトン）は、Extension や別タブ、モーダルでの状態衝突や初期チラつき（Flicker）を引き起こします。
共用コンポーネントでは、**Vanilla Store Factory + React Context** を使用してください。

```tsx
// 1. ストアファクトリ関数の定義 (Vanilla Store)
import { createStore } from 'zustand/vanilla';
import { createContext, useContext, useRef } from 'react';

export interface CanvasConfig {
  backgroundImageUrl?: string;
  initialAnnotations?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
}

export function createCanvasStore(config: CanvasConfig) {
  return createStore<CanvasState>((set, get) => ({
    backgroundImageUrl: config.backgroundImageUrl,
    activeTool: 'select',
    arrows: [],
    // マウント時の初期値として Props を確定注入（Flickerゼロ）
    ...parseInitialAnnotations(config.initialAnnotations),
    setActiveTool: (tool) => set({ activeTool: tool }),
  }));
}

// 2. React Context と Provider の定義
type CanvasStoreApi = ReturnType<typeof createCanvasStore>;
const CanvasStoreContext = createContext<CanvasStoreApi | null>(null);

export function CanvasStoreProvider({
  config,
  children,
}: {
  config: CanvasConfig;
  children: React.ReactNode;
}) {
  const storeRef = useRef<CanvasStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = createCanvasStore(config);
  }
  return (
    <CanvasStoreContext.Provider value={storeRef.current}>
      {children}
    </CanvasStoreContext.Provider>
  );
}

// 3. カスタム購読フック
export function useCanvasStore<T>(selector: (state: CanvasState) => T): T {
  const store = useContext(CanvasStoreContext);
  if (!store) {
    throw new Error('useCanvasStore must be used within CanvasStoreProvider');
  }
  return useStore(store, selector);
}
```

---

## 3. Imperative Ref API 契約 (グローバルイベントの全廃)

親（TopBar 等）から子（Canvas 等）へのアクション実行（エクスポート、画像コピー、Undo/Redo 等）に、`window.dispatchEvent(new CustomEvent(...))` を使ってはなりません。
`forwardRef` と `useImperativeHandle` による明示的な契約を定義してください。

```tsx
// 1. Ref インターフェースの定義
export interface CanvasCoreHandle {
  exportPng: () => Promise<string>;
  copyToClipboard: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

// 2. コンポーネント側での実装
export const CanvasStageContainer = React.forwardRef<CanvasCoreHandle, CanvasStageProps>(
  (props, ref) => {
    const stageRef = useRef<Konva.Stage>(null);
    const { undo, redo } = useCanvasActions();

    useImperativeHandle(ref, () => ({
      exportPng: async () => {
        const stage = stageRef.current;
        if (!stage) throw new Error('Stage not ready');
        return stage.toDataURL({ pixelRatio: 2 });
      },
      copyToClipboard: async () => {
        // クリップボードコピー処理
      },
      undo,
      redo,
    }));

    return <Stage ref={stageRef} ... />;
  }
);
```

---

## 4. 汎用プラグイン / レジストリ設計 (OCP の徹底)

ツール、アノテーションオブジェクト、ダッシュボードウィジェット、エクスポート形式など、将来バリエーションが増える機能は、すべてプラグイン型で設計します。

1. **プラグインインターフェースの定義**:
   - `id`, `label`, `icon`, `createObject`, `PreviewComponent`, `RenderComponent`, `OptionsComponent`
2. **コア側のレシーバー**:
   - コアコンポーネント（Stage, Toolbar, Inspector等）は、プラグイン配列を受け取って動的にループまたは描画するだけにし、`if-else` による分岐を持たないこと。
3. **自己申告型オプション**:
   - オブジェクトの属性変更 UI は、プラグイン自身が `OptionsComponent` として提供し、Web の Inspector でも Extension の HUD でも同じコンポーネントをスロット自動展開すること。
