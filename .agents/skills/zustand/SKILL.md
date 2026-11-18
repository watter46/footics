---
name: zustand
description: Zustand v5 を使用した複数スライス構成のグローバル状態管理の扱い方
---

# Zustand v5 スキルガイド

Footics 全体（Web アプリケーションおよび Chrome Extension）における Zustand v5 状態管理の共通実装ガイドラインです。
（※戦術ボード領域固有の関数型DDD・6コンテキスト仕様については `.agents/rules/tactical-domain-architecture.md` を参照してください。）

---

## 1. グローバルシングルトン禁止と Store Provider パターン

Web と Extension で共用する機能、または初期表示時のチラつき（Flicker）防止・複数インスタンスの独立動作が必要な画面では、モジュールスコープの単一グローバルストアを直接参照することを禁止します。

- **Store Provider による初期状態注入**: `zustand/vanilla` の `createStore` ファクトリと React Context Provider を組み合わせ、**マウント時に Props から初期状態を確定注入**してください。マウント後に `useEffect` で初期データをセットする実装は禁止です。
- **Store API と Selector Hook の両方を提供**: 通常の UI 購読用の `useXxxStore(selector)` に加え、`useEffect` での `.subscribe()` やイベントハンドラでの `.getState()` 用に Raw Store インスタンスを取得する `useXxxStoreApi()` を公開してください。

```tsx
import { createContext, useContext, useRef, type ReactNode } from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { subscribeWithSelector } from 'zustand/middleware';

export interface EditorStoreState {
  readonly activeTab: string;
  readonly selectedIds: readonly string[];
  readonly streamOffset: number;
  setActiveTab: (tab: string) => void;
  setSelectedIds: (ids: readonly string[]) => void;
  setStreamOffset: (offset: number) => void;
}

export const createEditorStore = (initialTab = 'overview') =>
  createStore<EditorStoreState>()(
    subscribeWithSelector((set) => ({
      activeTab: initialTab,
      selectedIds: [],
      streamOffset: 0,
      setActiveTab: (activeTab) => set({ activeTab }),
      setSelectedIds: (selectedIds) => set({ selectedIds }),
      setStreamOffset: (streamOffset) => set({ streamOffset }),
    })),
  );

const EditorStoreContext = createContext<StoreApi<EditorStoreState> | null>(null);

export function EditorStoreProvider({
  initialTab,
  children,
}: {
  initialTab?: string;
  children: ReactNode;
}) {
  const storeRef = useRef<StoreApi<EditorStoreState> | null>(null);
  if (!storeRef.current) {
    storeRef.current = createEditorStore(initialTab);
  }
  return (
    <EditorStoreContext.Provider value={storeRef.current}>
      {children}
    </EditorStoreContext.Provider>
  );
}

export function useEditorStoreApi(): StoreApi<EditorStoreState> {
  const store = useContext(EditorStoreContext);
  if (!store) throw new Error('Missing EditorStoreProvider');
  return store;
}

export function useEditorStore<T>(selector: (state: EditorStoreState) => T): T {
  const store = useEditorStoreApi();
  return useStore(store, selector);
}
```

---

## 2. セレクタ粒度と `useShallow`（再レンダー遮断・無限ループ防止）

Zustand v5 は内部で React の `useSyncExternalStore` を使用しているため、セレクタ関数が返す値の参照比較（`Object.is`）に厳格です。以下の3つのルールを厳守してください。

1. **ストア全体・上位巨大オブジェクトの丸ごと購読禁止**:
   - `useXxxStore((s) => s)` や `useXxxStore((s) => s.rootData)` のように大きなオブジェクト全体を購読し、コンポーネント本体内で子プロパティを取り出すことを禁止します。必ずセレクタ関数内で必要な最小スコープ（プリミティブ値または対象アイテム）まで絞り込んでください。
2. **複数プロパティをオブジェクトで返す場合は `useShallow` 必須**:
   - セレクタで `{ a: s.a, b: s.b }` のように新しいオブジェクトリテラルを返す場合、`useShallow` を使わないと毎レンダーで新しい参照とみなされ無限再レンダリングループ（`Maximum update depth exceeded`）が発生します。必ず `zustand/react/shallow` の `useShallow` でラップしてください。
3. **セレクタ関数内での `.map()` / `.filter()` による新規配列生成禁止**:
   - セレクタ内で `s.items.map((x) => x.id)` や `s.items.filter(...)` を直接実行すると、呼び出しのたびに新しい配列参照が生成され無限ループの原因となります。ストア内の生配列参照を購読し、派生配列への変換はコンポーネント内の `useMemo` で行ってください。

```tsx
import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

// ❌ 禁止1: ストア全体やルートオブジェクトを丸ごと購読する
const state = useEditorStore((s) => s);
const allData = useDataStore((s) => s.rootCollection);

// ❌ 禁止2: useShallow なしでオブジェクトリテラルを返す（Zustand v5 で無限ループ）
const { activeTab, setActiveTab } = useEditorStore((s) => ({
  activeTab: s.activeTab,
  setActiveTab: s.setActiveTab,
}));

// ❌ 禁止3: セレクタ関数内で .map() / .filter() を呼び出して毎回新規配列を返す
const activeIds = useDataStore((s) => s.items.filter((i) => i.active).map((i) => i.id));

// ✅ 必須1: 単一プリミティブまたはセレクタ関数内で絞り込んだ対象のみを返す
const activeTab = useEditorStore((s) => s.activeTab);
const activeItem = useDataStore((s) => s.items.find((i) => i.id === targetId));

// ✅ 必須2: 複数プロパティをまとめて取得する場合は useShallow でラップする
const { activeTab, setActiveTab } = useEditorStore(
  useShallow((s) => ({
    activeTab: s.activeTab,
    setActiveTab: s.setActiveTab,
  })),
);

// ✅ 必須3: 生配列を購読し、.map() / .filter() は useMemo で派生させる
const items = useDataStore((s) => s.items);
const activeIds = useMemo(
  () => items.filter((i) => i.active).map((i) => i.id),
  [items],
);
```

---

## 3. 高頻度ストリーム状態の非リアクティブ購読 (`storeApi.subscribe` / `getState`)

60fps で連続変化する状態（再生時刻、アニメーション進捗、ドラッグ・スクロール座標ストリーム等）を `useStore` フックで React State として購読することを禁止します。

1. **連続的な Canvas / DOM 更新（`storeApi.subscribe` + `ref`）**:
   - Store API（`useXxxStoreApi()`）を取得し、`useEffect` 内で `storeApi.subscribe((state, prevState) => ...)` を登録して、`ref` 経由で DOM ノードや Canvas を直接更新してください。
2. **イベントハンドラ・非同期処理での単発参照（`storeApi.getState()`）**:
   - `onClick`, `onPointerUp`, `onWheel` などのイベント発火時や非同期コールバック内で最新の Store 値を参照するだけでよい場合は、React の再レンダー購読を増やさず、ハンドラ内で `storeApi.getState()` を呼び出してください。
   - ※コンポーネント関数のレンダリング本体（トップレベル）で `.getState()` を呼ぶことは禁止です。

```tsx
// ❌ 禁止: 60fps で変化するストリーム値を React フックで購読する
const streamOffset = useEditorStore((s) => s.streamOffset);

// ✅ 必須1: useEffect 内の storeApi.subscribe() で DOM / Canvas を直接駆動する
const storeApi = useEditorStoreApi();
const meterRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  return storeApi.subscribe((state, prevState) => {
    if (state.streamOffset === prevState.streamOffset) return;
    if (meterRef.current) {
      meterRef.current.style.transform = `translateX(${state.streamOffset}px)`;
    }
  });
}, [storeApi]);

// ✅ 必須2: イベント確定時のみ現在値が必要な場合はハンドラ内で getState() を使う
const handleCommit = () => {
  const currentOffset = storeApi.getState().streamOffset;
  saveSnapshot(currentOffset);
};
```

---

## 4. 薄く純粋な Store アクションと不変更新 (Thin Store Actions)

1. **`set()` 内のミューテーション禁止と構造共有**:
   - `set((state) => ...)` 内で既存のオブジェクトや配列を直接書き換える（`state.items.push(...)` 等）ことを禁止します。変更がない階層・要素の参照を維持する不変更新（Structural Sharing）を行ってください。
2. **ビジネスロジックと副作用の分離**:
   - `set()` コールバック内に複雑なデータ変換ロジック、バリデーション、DB アクセス（`db.*`）、ネットワーク通信を直書きすることを禁止します。状態遷移の計算は外部の純粋関数に切り出し、非同期処理はカスタムフックやサービス層で行った上で結果のみを Store に反映してください。
