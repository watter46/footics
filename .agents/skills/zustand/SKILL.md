---
name: zustand
description: Zustand v5 を使用した複数スライス構成のグローバル状態管理の扱い方
---

# Zustand v5 スキルガイド

Footics における Zustand v5 状態管理のガイドラインです。
（戦術ボード固有のドメインモデル・6コンテキスト仕様については `.agents/rules/tactical-domain-architecture.md` を唯一の正本として参照してください。）

---

## 1. Thin Store Shell 原則（Store 内のビジネスロジック排除と高頻度状態分離）

Zustand の `set((s) => ...)` コールバック内に複雑なドメインロジック（座標変換、ロック判定、カスケード削除など）を直接記述することを禁止します。
ドメインロジックは外部の純粋関数（Reducer / Normalizer）に委譲し、Zustand ストアは状態を保持・通知する「薄いリアクティブ・シェル（Thin Store Shell）」として構成してください。

1. **確定状態（Cold State）**: 操作確定時（`onDragEnd`, `onPointerUp`, ボタン操作）にのみ純粋 Reducer 関数を通して更新し、Undo/Redo 履歴を記録します。
2. **操作中一時状態（Hot State）**: ドラッグ移動中（`onDragMove` 60〜120Hz）のデルタやプレビュー座標は一時状態スライスのみを更新し、確定状態や Undo 履歴を汚染させません。
3. **再生クロック（Stream State）**: アニメーション再生時刻 `timeMs` は独立して管理し、確定状態を書き換えません。

```typescript
import { createStore } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';
import { applyTacticalCommand, type TacticalCommand } from '@/lib/tactical/domain/commands';
import type { TacticalProject, EphemeralSessionState } from '@/lib/types/tactical';

export interface TacticalStoreState {
  readonly document: TacticalProject;
  readonly history: {
    readonly past: readonly TacticalProject[];
    readonly future: readonly TacticalProject[];
  };
  readonly session: EphemeralSessionState;
  dispatch: (command: TacticalCommand) => void;
  updateSession: (patch: Partial<EphemeralSessionState>) => void;
  undo: () => void;
  redo: () => void;
}

export const createTacticalStore = (initialDocument: TacticalProject) =>
  createStore<TacticalStoreState>()(
    subscribeWithSelector((set, get) => ({
      document: initialDocument,
      history: { past: [], future: [] },
      session: createInitialSession(initialDocument),

      // 確定操作の唯一の入り口：純粋 Reducer + Invariants Normalizer に完全委譲
      dispatch: (command) =>
        set((state) => {
          const result = applyTacticalCommand(state.document, command);
          if (!result.changed) return state;
          return {
            document: result.nextState,
            history: {
              past: [...state.history.past.slice(-49), state.document],
              future: [],
            },
          };
        }),

      // 60〜120Hz の一時操作状態更新（Document や History には一切触れない）
      updateSession: (patch) =>
        set((state) => ({
          session: { ...state.session, ...patch },
        })),

      undo: () => set((state) => applyUndo(state)),
      redo: () => set((state) => applyRedo(state)),
    }))
  );
```

---

## 2. 二重ストア・双方向 Adapter の禁止（Single Schema & Store Contract）

- Web 版（フル戦術ボード）と Chrome Extension 版（スクショクイック編集）で別々のストアスキーマ（例：`Slide.players` vs `AnnotationsData.markers`）を定義し、`tactical-canvas-store-adapter` のような双方向同期アダプターでブリッジする設計は **禁止** です。
- Extension 版も「`backgroundType: 'image'` を持つ 1 Phase・1 Slide のデータ」として同一の `Slide` ドメインモデルと純粋 `TacticalCommand` Reducer を使用してください。

---

## 3. `subscribeWithSelector` と純粋セレクタ・構造共有の活用

- Zustand の `subscribeWithSelector` ミドルウェアを適用し、コンポーネントからの購読は必ず細粒度の純粋セレクタ（または複数プロパティ選択時は `zustand/react/shallow` の `useShallow`）を使用してください。
- 純粋 Command Reducer（`applyTacticalCommand`）が構造共有（Structural Sharing：変更のないエンティティや配列要素の参照を100%維持）を行うため、セレクタの浅い参照比較（`prev === next`）だけで不要な再レンダーが完全に遮断されます。

---

## 4. グローバルシングルトン禁止と Store Provider パターン

**共用キャンバスおよび戦術ボード機能では、単一グローバルストアの直接参照を固く禁じます**。

- **Store Provider パターンの徹底**: `zustand/vanilla` の `createStore` ファクトリと React Context Provider を組み合わせ、**マウント時に初期状態（Props）を確定注入** してください。これによりマウント後の `useEffect` 非同期上書きによる初期チラつき（Flicker）を根絶し、Web / Extension 共用および複数プレビューインスタンスの独立動作を保証します（詳細は `.agents/skills/cross-platform-component-design/SKILL.md` 参照）。


