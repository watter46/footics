---
name: zustand
description: Zustand v5 を使用した複数スライス構成のグローバル状態管理の扱い方
---

# Zustand v5 スキルガイド

Footics の状態管理（特に戦術ボードの `tactical-unified-store.ts`）を扱う際のガイドラインです。
実際の実装（`src/features/tactical-unified/stores`）に基づき、Zustand v5 の「スライスパターン (Slice Pattern)」を活用しています。

## 1. 11スライス構成の理解と結合

戦術ボードのストアは巨大なため、`src/features/tactical-unified/stores` 内で **11個のスライス** に分割され、最終的に1つのメインストアとして結合されています。
状態やアクションを追加する場合は、`create` ブロックに直接書くのではなく、責務に応じた適切なスライスファイル（例：`project-slice.ts`, `slide-slice.ts`, `tool-slice.ts` 等）を編集してください。

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// すべてのスライスの型を結合
export type TacticalUnifiedState = HistorySlice & ClipboardSlice & SlideSlice /* ... 計11スライス */;

export const useTacticalUnifiedStore = create<TacticalUnifiedState>()(
  subscribeWithSelector((set, get, store) => ({
    ...createHistorySlice(set, get, store),
    ...createClipboardSlice(set, get, store),
    ...createSlideSlice(set, get, store),
    // ... その他スライス
  }))
);
```

## 2. スライスの定義と `StateCreator` の型付け

各スライスは Zustand の `StateCreator` を使用して定義します。この際、型の安全性と**他スライスへのアクセス**を担保するために、ジェネリクスには「結合後の全体ストアの型」を渡すのがベストプラクティスです。

```typescript
import { StateCreator } from 'zustand';

export interface ToolSlice {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  // 他スライスのアクションを呼ぶなど
}

// StateCreator<全体の型, ミドルウェア, ...>
export const createToolSlice: StateCreator<
  TacticalUnifiedState,
  [["zustand/subscribeWithSelector", never]],
  [],
  ToolSlice
> = (set, get) => ({
  activeTool: 'select',
  setActiveTool: (tool) => {
    // スライス間アクセス: get() を使えば他スライスの状態も読める
    const currentSlide = get().activeSlideId; 
    set({ activeTool: tool });
  },
});
```

## 3. `subscribeWithSelector` の活用

Zustand の `subscribeWithSelector` ミドルウェアが全体の `create` レベルで適用されています（スライス単位ではなく、結合ストアに適用します）。
コンポーネント外から状態の変更を監視したい場合や、パフォーマンス最適化のためにセレクタを利用してください。
頻繁に利用されるセレクタは `tactical-unified-selectors.ts` などで別途定義するパターンを採用しています。

## 4. イミュータブルな更新と History 管理

スライス内での状態更新（`set`）はスプレッド構文などを用いてイミュータブルに行います。
また、Undo/Redo に対応するアクションは、更新前に `store-helpers.ts` の `recordHistory(get(), set())` を呼び出してスナップショットを保存する実装が Footics の標準です。

## 5. グローバルシングルトン vs Store Provider パターン

Zustand はデフォルトでグローバル単一インスタンス（`create(...)`）として動作しますが、**以下のユースケースでは単一グローバルストアの直接参照を固く禁じます**。

- **Web と Chrome Extension で共用する機能**: ホストアプリごとにライフサイクルや初期データ（スクショ画像 vs 試合ピッチ）が異なるため。
- **初期チラつき（Flicker）を根絶すべきコンポーネント**: マウント後に `useEffect` で非同期上書きすると、数フレーム前の状態が画面にフラッシュするため。
- **複数インスタンスが存在しうる機能**: モーダル、独立したタブ、プレビューキャンバス等。

### 推奨パターン: Vanilla Store Factory + React Context
共用・独立した機能では、`zustand/vanilla` の `createStore` ファクトリと React Context を組み合わせ、**マウント時に初期状態（Props）を確定注入** してください（詳細は `.agents/skills/cross-platform-component-design/SKILL.md` 参照）。

