---
name: zustand
description: Zustand v5 を使用した複数スライス構成のグローバル状態管理の扱い方
---

# Zustand v5 スキルガイド

Footics における Zustand v5 状態管理のガイドラインです。
特に **戦術ボード領域（`src/features/tactical-unified/**`）** では、状態の不整合・肥大化・パフォーマンス劣化を防ぐため、従来の「多数スライスへのビジネスロジック直書き」および「二重ストア＋Adapter同期」を廃止し、**関数型DDDに基づく「Thin Store Shell + Pure Command Reducer + 3頻度状態分離」** を強制します（詳細は `.agents/rules/tactical-domain-architecture.md` 参照）。

---

## 1. 戦術ボードにおける「3頻度状態分離」と Thin Store Shell 原則

戦術ボードでは、Zustand の `set((s) => ...)` コールバック内にドメインロジック（座標計算、ロック判定、ベンチ移動時のカスケード削除、追従矢印の端点更新など）を直接記述することを **固く禁じます**。
Zustand ストアは以下の3つの更新頻度の状態を保持し、ドメインロジックはすべて外部の純粋関数（Functional Core）に委譲する「薄いリアクティブ・シェル（Thin Store Shell）」として実装してください。

1. **Cold State (`document: TacticalProject` & `history: HistoryStack`)**:
   - 操作確定時（`onDragEnd`, `onPointerUp`, HUD操作、ショートカット）にのみ、`dispatch(command: TacticalCommand)` アクション経由で更新します。
   - `dispatch` の内部では純粋関数 `applyTacticalCommand(state.document, command)`（内部で `enforceSlideInvariants` を強制実行）を呼び出し、`changed === true` の場合のみ `history` スタックに旧状態を積んで `document` を差し替えます。
2. **Hot State (`session: EphemeralSessionState`)**:
   - `activePhaseId`, `activeSlideId`, `workspaceMode`, `activeTool`, `selectedIds`、および **60〜120Hz で変化する操作中状態（`activeDragDelta`, `drawingPreview`, `selectionBox`）**。
   - ドラッグ中（`onDragMove`）は `updateSession(patch)` のみを呼び出し、`document` のクローンや `history` 記録を一切発生させません。
3. **Stream State (`playbackClock`)**:
   - アニメーション再生中の時刻 `timeMs`（60fps）。`document` を書き換えず、純粋関数 `evaluateTimelineFrame` ➔ `compileSceneGraph` へ入力します。

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


