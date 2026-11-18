---
trigger: glob
description: "React 19 および Next.js 16 (App Router) のレンダリング・useEffect・Server/Client境界規約"
globs: "**/src/**/*.tsx, **/src/**/*.ts, **/extension/**/*.tsx"
---
# React 19 & Next.js 16 規約 (React & Next.js Standards)

本規約は、React 19（React Compiler 有効環境）および Next.js 16 App Router における、副作用の最小化・クライアント境界の適正化・レンダリング品質を担保するための全ドメイン共通基準です。

---

## 1. `useEffect` の厳格な使用基準 (R3: You Might Not Need an Effect)

`useEffect` は **「React 外部のシステム（DOM イベント購読、タイマー、Web Locks、IndexedDB 購読、Canvas 命令、Store 購読）との同期」のみ** に使用してください。以下の4つのアンチパターンを禁止します。

### 判定基準
1. **派生状態の `useState` + `useEffect` 同期禁止**: Props や既存の State から計算できる値を `useState` に持ち、`useEffect` で更新することを禁止します。レンダリング中に直接計算してください。
2. **Props 変更時の State リセットに `useEffect` を使うことの禁止**: 親から渡される ID や対象が変わったときに内部 State をリセットしたい場合は、`useEffect` ではなく親側で `<ChildComponent key={targetId} />` の `key` 属性を渡して再マウントさせてください。
3. **マウント判定ハック（`setIsMounted(true)`）の禁止**: SSR ハイドレーション回避のために `useEffect(() => setIsMounted(true), [])` を書くことを禁止します。クライアント専用コンポーネントは `next/dynamic`（`{ ssr: false }`）で読み込んでください。
4. **依存配列のない `useEffect`（毎レンダー実行）の禁止**: 第二引数（依存配列）を省略した `useEffect(() => { ... })` は、State/Props 変更のたびに実行されるため禁止です。必要な依存値を配列で明示的に指定してください。

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
export function CanvasWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  if (!isMounted) return null;
  return <InteractiveStage />;
}

// ✅ 必須1: 親で key={targetId} を与えて初期値をリセットする
// 親: <TitleInput key={targetId} initialTitle={projectTitle} />
export function TitleInput({ initialTitle }: { initialTitle: string }) {
  const [tempTitle, setTempTitle] = useState(initialTitle);
  return <input value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />;
}

// ✅ 必須2: next/dynamic (ssr: false) でブラウザ専用コンポーネントを読み込む
import dynamic from 'next/dynamic';
const InteractiveStage = dynamic(() => import('./interactive-stage'), { ssr: false });
```

---

## 2. React 19 & React Compiler 規約

1. **React Compiler (`babel-plugin-react-compiler`) 前提のコード記述**:
   - 純粋なレンダリング計算やイベントハンドラに対して、防御的なボイラープレートとしての `useMemo` / `useCallback` の乱用は不要です。
   - ただし、`useEffect` の依存配列に渡す関数、Zustand セレクタから派生する配列・オブジェクト変換、または `React.memo` 化された重い子レイヤーへ渡す参照安定性が必要な箇所では明示的に使用してください。
   - React Compiler が正しく最適化できるよう、**レンダリング中の Props・State・Ref の書き換え（ミューテーション）を絶対に行わないでください**。
2. **`forwardRef` の禁止**:
   - `ref` は通常の Props（`ref?: React.Ref<HTMLElement>`）として受け取ってください（Biome `noReactForwardRef: "error"`）。
3. **リストの `key` 属性**:
   - 配列のインデックスを `key={index}` として使用することを禁止します（Biome `noArrayIndexKey: "error"`）。必ず安定した一意の ID を指定してください。
4. **条件付きレンダリングのリーク防止**:
   - `{count && <Badge />}` のように数値 `0` や `NaN` が画面に出力される論理積レンダリングを禁止します（Biome `noLeakedRender` 準拠）。必ず `{count > 0 && <Badge />}` のように Boolean に評価してください。

---

## 3. Next.js 16 App Router 境界と遅延読込規約 (R11)

### 判定基準
1. **`src/app/**/page.tsx` および `layout.tsx` の Server Component 維持**:
   - `page.tsx` と `layout.tsx` には原則として `'use client'` を付与せず、**50行以下** の薄い Server Component（URL パラメータ `params` / `searchParams` の解決と Feature View のマウントのみ）に保ってください（`ai:check` で新規違反を遮断）。
2. **`'use client'` はクライアント境界（Entry）にのみ配置**:
   - `'use client'` は、Server Component から直接 import されるクライアント側の入口コンポーネント（Level 3 Feature View や Client Wrapper）、直接 React Hooks を呼び出す UI コンポーネント（`.tsx`）、または React Hooks をインポート・使用するカスタムフック（`use-*.ts` や `hooks/*.ts`）にクライアント境界として配置します。
   - **純粋な `.ts` ファイル（ユーティリティ、型定義、Zustand ストア、計算ヘルパー等の非フックモジュール）への `'use client'` の付与を禁止**します（`ai:check` Check D で機械遮断）。
3. **初期非表示の重量級モーダル・別モード専用パネルの `next/dynamic` 遅延読込**:
   - 動画エンコーダや大量のフォーム・Canvas を内包する初期非表示のモーダルダイアログ、および特定の表示モードに切り替えた時のみ表示される重厚なパネルを、画面トップレベルで静的 `import` して初期バンドルを肥大化させることを禁止します。
   - 必ず `next/dynamic` でコード分割し、開閉フラグ（`isOpen`）や表示モード条件が成立した時のみマウントしてください。
4. **Route Handler (`src/app/api/**/route.ts`) の入出力検証**:
   - `request.json()` やクエリパラメータは必ず Zod スキーマ（`.safeParse()`）で検証し、不正入力時はステータス `400` を返してください。
5. **本番ルートへの検証用ページ放置の禁止**:
   - `src/app/test/**` のような開発検証専用ルートの新規追加を禁止します。コンポーネントや描画ロジックの検証は Vitest または Playwright テストとして `src/**/__tests__/`・`tests/` に記述してください。

```tsx
// ❌ 禁止1: page.tsx 自体に 'use client' を付けて数百行のロジックを書く
'use client';
export default function SharePage() {
  const params = useParams();
  const [data, setData] = useState(null);
  // ...数百行のデータ取得・展開・描画処理
}

// ✅ 必須1: page.tsx は薄い Server Component とし、Feature View に委譲する
import { SharedExportView } from '@/features/export/components/shared-export-view';

interface SharePageProps {
  params: Promise<{ shareId: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  return <SharedExportView shareId={shareId} />;
}

// ❌ 禁止2: 初期状態で閉じている重量級モーダルや別モードパネルを静的 import する
import { VideoExportModal } from './modals/video-export-modal';
import { SplitLayoutPreviewPanel } from './panels/split-layout-preview-panel';

// ✅ 必須2: next/dynamic で遅延読込し、開かれた時・対象モード時のみマウントする
import dynamic from 'next/dynamic';

const VideoExportModal = dynamic(() =>
  import('./modals/video-export-modal').then((m) => m.VideoExportModal),
);
const SplitLayoutPreviewPanel = dynamic(() =>
  import('./panels/split-layout-preview-panel').then((m) => m.SplitLayoutPreviewPanel),
);

export function WorkspaceView({ isExportOpen, mode }: WorkspaceViewProps) {
  return (
    <>
      {mode === 'layout' && <SplitLayoutPreviewPanel />}
      {isExportOpen && <VideoExportModal />}
    </>
  );
}
```

---

## 4. 高頻度イベント（60fps）再描画の局所化と Ref 直接駆動

ドラッグ操作、ポインタ追従、アニメーション再生（60fps）などの高頻度イベント時に、React コンポーネントツリー全体の再レンダリングを引き起こさないための規約です。

### 判定基準
1. **60fps で変化する DOM 要素の React State バインディング禁止（Ref 直接更新の強制）**:
   - 再生タイマー表示（`0.0s`）、シークバー（`<input type="range">`）、高頻度ポインタ座標表示など、毎フレーム（16ms 周期）変化する値を `useState` や Zustand の React フック（`useStore`）で購読して JSX の `value` やテキストにバインドすることを禁止します。
   - 必ず `useRef` で対象 DOM ノードを参照し、`requestAnimationFrame` または Store の `.subscribe()` コールバック内で `inputRef.current.value` や `labelRef.current.textContent` を直接書き換えてください。
2. **静的・無関係レイヤーの `React.memo` 化による巻き添え再描画の遮断**:
   - ドラッグ操作や選択枠の更新で親コンポーネントが再レンダリングされる際、静的な背景や無関係な子レイヤーが巻き添えで再描画されないよう、`React.memo` でラップして分離してください。
   - `React.memo` 化したコンポーネントの内部で、頻繁に変わる上位 Store オブジェクト全体を直接購読して `memo` を貫通させることを禁止します。
3. **計算コストの高い派生処理の `useMemo` 保護**:
   - アイテムの描画順ソートやフィルタリング、幾何変換などは、依存値が変わらない限り `useMemo` でキャッシュし、毎レンダーでの再計算を遮断してください。

```tsx
// ❌ 禁止: 60fps で変化する再生時刻を React State として購読し、毎フレーム JSX 全体を再レンダーする
export function ScrubberBar() {
  const timeMs = usePlaybackStore((s) => s.timeMs); // ❌ 毎フレーム再レンダー発火
  return (
    <div>
      <span>{(timeMs / 1000).toFixed(1)}s</span>
      <input type="range" value={Math.round(timeMs)} onChange={...} />
    </div>
  );
}

// ✅ 必須: Ref + Store.subscribe() で DOM ノードを直接更新し、React 再レンダーをゼロにする
export function ScrubberBar() {
  const playbackStore = usePlaybackStoreApi();
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const sliderRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return playbackStore.subscribe((state, prevState) => {
      if (state.timeMs === prevState.timeMs) return;
      const ms = Number(state.timeMs);
      if (labelRef.current) labelRef.current.textContent = `${(ms / 1000).toFixed(1)}s`;
      if (sliderRef.current) sliderRef.current.value = String(Math.round(ms));
    });
  }, [playbackStore]);

  return (
    <div>
      <span ref={labelRef}>0.0s</span>
      <input
        ref={sliderRef}
        type="range"
        defaultValue={0}
        onChange={(e) => playbackStore.getState().seekTo(Number(e.target.value))}
      />
    </div>
  );
}
```
