---
description: "React 19 および Next.js 16 (App Router) のレンダリング・useEffect・Server/Client境界規約"
globs:
  - "src/**/*.tsx"
  - "src/**/*.ts"
  - "extension/**/*.tsx"
---
# React 19 & Next.js 16 規約 (React & Next.js Standards)

本規約は、React 19（React Compiler 有効環境）および Next.js 16 App Router における、副作用の最小化・クライアント境界の適正化・レンダリング品質を担保するための基準です。

---

## 1. `useEffect` の厳格な使用基準 (R3: You Might Not Need an Effect)

`useEffect` は **「React 外部のシステム（DOM イベント購読、タイマー、Web Locks、IndexedDB 購読、Canvas 命令）との同期」のみ** に使用してください。以下の3つのアンチパターンを禁止します。

### 判定基準
1. **派生状態の `useState` + `useEffect` 同期禁止**: Props や既存の State から計算できる値を `useState` に持ち、`useEffect` で更新することを禁止します。レンダリング中に直接計算してください。
2. **Props 変更時の State リセットに `useEffect` を使うことの禁止**: 親から渡される ID や対象が変わったときに内部 State をリセットしたい場合は、`useEffect` ではなく親側で `<ChildComponent key={targetId} />` の `key` 属性を渡して再マウントさせてください。
3. **マウント判定ハック（`setIsMounted(true)`）の禁止**: SSR ハイドレーション回避のために `useEffect(() => setIsMounted(true), [])` を書くことを禁止します。クライアント専用コンポーネント（Konva Stage 等）は `next/dynamic`（`{ ssr: false }`）で読み込んでください。
4. **依存配列のない `useEffect`（毎レンダー実行）の禁止**: 第二引数（依存配列）を省略した `useEffect(() => { ... })` は、State/Props 変更のたびに実行されるため原則禁止です。必要な Ref や Rect などの依存配列を明示的に指定してください。

```tsx
// ❌ 禁止1: Props を State にコピーして useEffect で同期する
export function TitleInput({ projectTitle }: { projectTitle: string }) {
  const [tempTitle, setTempTitle] = useState(projectTitle);
  useEffect(() => {
    setTempTitle(projectTitle);
  }, [projectTitle]);
  return <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />;
}

// ❌ 禁止2: SSR 回避のための setIsMounted(true)
export function PitchWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;
  return <Stage />;
}

// ✅ 推奨1: 親で key={projectId} を与えて初期値をリセットする
// 親: <TitleInput key={projectId} initialTitle={projectTitle} />
export function TitleInput({ initialTitle }: { initialTitle: string }) {
  const [tempTitle, setTempTitle] = useState(initialTitle);
  return <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />;
}

// ✅ 推奨2: next/dynamic (ssr: false) でクライアント専用キャンバスを読み込む
import dynamic from 'next/dynamic';
const PitchStage = dynamic(() => import('./pitch-stage'), { ssr: false });
```

---

## 2. React 19 & React Compiler 規約

1. **React Compiler (`babel-plugin-react-compiler`) 前提のコード記述**:
   - 純粋なレンダリング計算やイベントハンドラに対して、防御的なボイラープレートとしての `useMemo` / `useCallback` の乱用は不要です。
   - ただし、`useEffect` の依存配列に渡す関数や、高負荷な Konva ノード群の参照安定性が明示的に必要な箇所では引き続き使用して構いません。
   - React Compiler が正しく最適化できるよう、**レンダリング中の Props・State・Ref の書き換え（ミューテーション）を絶対に行わないでください**。
2. **`forwardRef` の禁止**:
   - `ref` は通常の Props（`ref?: React.Ref<HTMLElement>`）として受け取ってください（Biome `noReactForwardRef: "error"`）。
3. **リストの `key` 属性**:
   - 配列のインデックスを `key={index}` として使用することを禁止します（Biome `noArrayIndexKey: "error"`）。必ず安定した一意の ID を指定してください。
4. **条件付きレンダリングのリーク防止**:
   - `{count && <Badge />}` のように数値 `0` や `NaN` が画面に出力される論理積レンダリングを禁止します（Biome `noLeakedRender` 準拠）。必ず `{count > 0 && <Badge />}` のように Boolean に評価してください。

---

## 3. Next.js 16 App Router 境界規約 (R11)

### 判定基準
1. **`src/app/**/page.tsx` および `layout.tsx` の Server Component 維持**:
   - `page.tsx` と `layout.tsx` には原則として `'use client'` を付与せず、**50行以下** の薄い Server Component（URL パラメータ `params` / `searchParams` の解決と Feature View のマウントのみ）に保ってください（`ai:check` で新規違反を遮断）。
2. **`'use client'` はクライアント境界（Entry）にのみ配置**:
   - `'use client'` は、Server Component から直接 import されるクライアント側の入口コンポーネント（Level 3 Feature View や Client Wrapper）、直接 React Hooks を呼び出す UI コンポーネント（`.tsx`）、または React Hooks をインポート・使用するカスタムフック（`use-*.ts` や `hooks/*.ts`）にクライアント境界として配置します。
   - **純粋な `.ts` ファイル（ユーティリティ、型定義、Zustand ストア、計算ヘルパー等の非フックモジュール）への `'use client'` の付与を禁止**します（`ai:check` Check D で機械遮断）。
3. **Route Handler (`src/app/api/**/route.ts`) の入出力検証**:
   - `request.json()` やクエリパラメータは必ず Zod スキーマ（`.safeParse()`）で検証し、不正入力時はステータス `400` を返してください。
4. **本番ルートへの検証用ページ放置の禁止**:
   - `src/app/test/**` のような開発検証専用ルートの新規追加を禁止します。コンポーネントや描画ロジックの検証は Vitest または Playwright テストとして `src/**/__tests__/`・`tests/` に記述してください。

```tsx
// ❌ 禁止: page.tsx 自体に 'use client' を付けて400行のロジックを書く
'use client';
export default function SharePage() {
  const params = useParams();
  const [data, setData] = useState(null);
  // ...数百行のデータ取得・展開・描画処理
}

// ✅ 推奨: page.tsx は薄い Server Component とし、Feature View に委譲する
// src/app/export/share/[shareId]/page.tsx
import { SharedExportView } from '@/features/tactical-unified/components/shared-export-view';

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  return <SharedExportView shareId={shareId} />;
}
```

---

## 4. 高頻度イベント再描画の局所化・メモ化 (High-Frequency Events & Memoization)

ドラッグ操作、マウス移動（ポインタ追従）、作図プレビューなど、**高頻度（60fps）で発生するインタラクションイベント** におけるパフォーマンス規約です。

### 判定基準
1. **静的・無関係レイヤーの `React.memo` 化による巻き添え再描画の遮断**:
   - ドラッグ操作や選択枠（Rubber Band）の更新、作図プレビューなど親コンポーネントが高頻度に再レンダリングされる際、静的な背景（ピッチ枠・ゾーン等）や無関係なレイヤー（配置済みマーカーレイヤー等）が巻き添えで再描画されないよう、レイヤーコンポーネントは `React.memo`（または `memo`）でラップして分離してください。
2. **依存配列のない `useEffect`（毎レンダー実行）の禁止**:
   - 依存配列を省略した `useEffect` は毎レンダーで副作用が走り、高頻度イベント時に著しいボトルネックとなるため禁止します。必ず適切な依存値（Ref, Rect 等）を配列で指定してください。
3. **計算コストの高い派生処理の `useMemo` 保護**:
   - オブジェクトの描画順ソート（Y座標ソート）や重い幾何計算などは、依存値（アイテム一覧やカメラ状態）が変わらない限り `useMemo` でキャッシュし、毎レンダーでの再計算を回避してください。

