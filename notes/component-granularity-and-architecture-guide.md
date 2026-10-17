# Footics コンポーネント粒度設計 & クロスプラットフォーム設計ガイドライン
## (4-Tier Component Architecture for Web & Extension)

- **作成日時**: 2026-10-17
- **対象**: `src/features/**`, `extension/features/**`
- **目的**: 戦術ボード（Canvas）で確立した「3層分離・副作用ゼロ」のアーキテクチャを、Extension の全機能（Dashboard, Memo Overlay, Capture 等）および Web 本体との共通化に横断適用するための**決定論的コンポーネント粒度基準**を定義する。
- **制約**: 本ドキュメント作成コンテキストでは設計のみを行い、コードの変更・削除は行わない。

---

## 1. なぜコンポーネントの粒度が崩壊するのか？（3大アンチパターン）

これまで Extension や Web アプリの実装で発生していたバグ・副作用の根本原因は、**コンポーネントの「責務の混同」と「粒度の不適切さ」** に集約される。

### ① God Component（全乗せ肥大化）
- **現象**: 1つのファイルに 400〜500行にわたって「IndexedDB取得」「検索フィルタ状態」「複数のモーダル」「カード描画」「ボタン操作」が詰め込まれる（例: `DashboardView.tsx: 498行`, 旧 `UnifiedCanvas.tsx: 397行`）。
- **弊害**: 一部を変更するだけで全体が再レンダリングされ、テストが書けず、Web と Extension で部品を再利用することが不可能になる。

### ② ホスト依存の無意識な漏出（Leaky Host Abstraction）
- **現象**: 共通化したい UI コンポーネントの中に、`chrome.tabs` や `window.location`、Web専用の右パネルストア（`useTacticalUnifiedStore` の `setRightPanelTab`）がハードコードされる。
- **弊害**: Extension で呼び出すと Web 専用コードがクラッシュし、Web で呼び出すと `chrome is not defined` で爆発する。

### ③ 非同期上書きによる初期チラつき（Race Condition by Mount Overwrite）
- **現象**: グローバルストアのデフォルト値（サッカー盤など）でマウントし、その直後の `useEffect` で非同期にスクショやメモデータを流し込んで上書きする。
- **弊害**: 数フレームの間、初期状態が画面にフラッシュ（チラつき）し、ユーザー体験を著しく損なう。

---

## 2. Footics 4層コンポーネントモデル (4-Tier Component Model)

コンポーネントを以下の **4つの階層（Level）** に明確に分類し、どの階層がどの責務を持つかを厳密に規定する。

```
┌────────────────────────────────────────────────────────────────────────┐
│ Level 4: Application Shell (画面全体・エントリーポイント)              │
│  - 画面全体のレイアウト枠、URLパラメータ解決、ブラウザタブ/ウィンドウ制御  │
│  - Web / Extension それぞれのホスト固有の境界                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 3: Feature View (機能コンテナ / ユースケース合成)                │
│  - データソース（IndexedDB / API）のロードと永続化ライフサイクル管理   │
│  - 状態管理プロバイダ（Provider）の生成と、初期状態（Initial Props）注入 │
│  - 複数の Domain UI Block（Level 2）を組み立てる                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 2: Domain UI Block (ドメインUIブロック / 自律的な関心事)          │
│  - 「単一の明確な目的」を持つ再利用可能な UI パーツ                    │
│  - ホスト非依存（純粋な React コンポーネント）。Web / Extension 完全共用 │
│  - ビジネスロジックは専用カスタムフックに分離し、UIファイルは描画に集中 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Level 1: Pure Headless / Primitive (基盤部品 / プリミティブ)           │
│  - ドメイン知識を持たない汎用部品（Button, Card, Modal, Tooltip 等）    │
│  - 純粋な計算ユーティリティ、汎用カスタムフック（useDebounce, useRect 等）│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. コンポーネント分割の4大判定基準 (Splitting Criteria)

「どこでコンポーネントを切り出すべきか？」に迷った際は、以下の客観的基準で機械的に判定する。

### 基準 1: 【ホスト境界の原則 (Host Boundary Rule)】
- **判定**: `chrome.*`（Extension API）、`window.location.search`、URL ルーティング、Dexie DB への直接アクセスを行っているか？
- **適用**:
  - 行っているコードは **Level 3 (Feature View) または Level 4 (Shell) に隔離**する。
  - **Level 2 以下のコンポーネントへの持ち込みは絶対禁止**。
  - Level 2 にはコールバック（`onSave={...}`, `onDelete={...}`）または Context 経由でデータを渡す。

### 基準 2: 【単一変更理由の原則 (Single Reason to Change)】
- **判定**: 「見た目（Tailwind CSS・レイアウト）を変えたい」理由と、「データ取得・保存仕様を変えたい」理由が、同一のファイルに同居していないか？
- **適用**:
  - 同居している場合は、データ取得・状態管理を **カスタムフック（`useXxx`）** に逃がし、コンポーネント側は受け取ったデータを描画する構造に分離する。

### 基準 3: 【レンダリング・ライフサイクル境界の原則 (Render Lifecycle Boundary)】
- **判定**: 「高頻度で更新される要素」と「低頻度で更新される静的要素」が同一コンポーネント内にないか？
- **適用**:
  - 高頻度（ドラッグ操作、マウスプレビュー、入力中のテキスト、動画再生秒数タイマー等）の要素は、独立した小さなコンポーネントに切り出す。
  - これにより、親コンポーネントや兄弟コンポーネントの不要な再レンダリングを完全に防止する。

### 基準 4: 【行数と認知負荷のハードリミット (Strict Line Limits)】
- **1ファイル 200行以下を標準** とし、**250行を超えたら分割必須**（Biome / プロジェクト規約準拠）。
- 1つのファイルに複数のコンポーネントを記述してはならない（1ファイル 1コンポーネント）。

---

## 4. 全機能への横断適用マトリクス (Cross-Feature Matrix)

戦術ボードで実証した設計モデルを、Extension および Web 本体の全機能に適用した具体的な構成マトリクス。

| 機能領域 | Level 4: Application Shell | Level 3: Feature View | Level 2: Domain UI Block (共用部品) | Level 1: Primitives |
|:---|:---|:---|:---|:---|
| **戦術ボード<br>(Tactical / Canvas)** | - Web: `TacticalUnifiedPage`<br>- Ext: `QuickCanvasPage` | - Web: `FullTacticalCanvas`<br>- Ext: `QuickAnnotationCanvas` | - `CanvasStageContainer`<br>- `BackgroundImageLayer`<br>- `AnnotationLayer`<br>- `FootRingLayer`<br>- `BoundaryBoxOverlay`<br>- `CoreDrawingToolbar`<br>- `InlineTextEditor` | - `calculateVirtualCanvasRect`<br>- `useCanvasExport`<br>- `normToPx` / `pxToNorm` |
| **ダッシュボード<br>(Dashboard)** | - Web: `/dashboard/page.tsx`<br>- Ext: `dashboard.html` (`main.tsx`) | - `ScreenshotLibraryView`<br>(IndexedDB から取得、検索・ソート管理、Provider 注入) | - `DashboardSearchBar`<br>- `VideoGroupSection`<br>- `ScreenshotCard`<br>- `ScreenshotDetailModal`<br>- `TagFilterBar` | - `Card`, `Badge`<br>- `DropdownMenu`<br>- `Dialog` / `Modal`<br>- `formatVideoTime` |
| **メモオーバーレイ<br>(Memo Overlay)** | - Web: `MemoOverlayModal`<br>- Ext: `overlay.content.tsx` | - `VideoMemoSessionContainer`<br>(動画再生監視、自動保存キュー、Provider 注入) | - `MiniMemoInputForm`<br>- `QuickTagSelector`<br>- `TimestampBadge`<br>- `MemoHistoryList` | - `useHotkey`<br>- `TextareaAutoResize`<br>- `ToastNotification` |
| **キャプチャ<br>(Capture)** | - Ext: `background.ts`<br>- Ext: `overlay.content.tsx` | - `VideoFrameCaptureController`<br>(動画タグ検出、IndexedDB 格納) | - `CaptureSuccessToast`<br>- `CapturePreviewThumbnail` | - `captureVideoFrameToDataUrl`<br>- `generateCaptureId` |

---

## 5. Web と Extension で部品を 100% 共有するための「3大実装ルール」

### ルール 1: 初期値の Props 注入による「チラつき（Flicker）ゼロ保証」
コンポーネントがマウントされた最初の 1 フレーム目から正しい状態で描画するために、**コンポーネントは常に「初期値（`initialState`）」を Props として受け取れる設計** にする。

```tsx
// ❌ 悪い例: マウント後に useEffect で上書き（初期値のサッカー盤や空データがチラつく）
function BadComponent() {
  const reset = useStore(s => s.reset);
  useEffect(() => {
    fetchData().then(data => reset(data));
  }, []);
  return <Canvas />;
}

// ⭕ 良い例: Level 3 でデータを待機し、Level 2 へ初期値として確定注入（チラつきゼロ）
function GoodFeatureView() {
  const { data, isLoading } = useDataQuery();
  if (isLoading || !data) return <SkeletonLoader />;

  return (
    <FeatureStoreProvider initialData={data}>
      <DomainUIBlock />
    </FeatureStoreProvider>
  );
}
```

### ルール 2: イベント駆動（`window.dispatchEvent`）の完全全廃
グローバルイベント（例: `tactical:copy-png`）は、何がどこで呼び出されたかを追跡できず、同一ページ内に複数インスタンスが存在すると混線する。
**親から子への操作は `ref`（Imperative Handle）または Context メソッドで明示的に行う。**

```tsx
// ⭕ 良い例: 明示的な Ref 契約
export interface CanvasCoreHandle {
  exportPng: () => Promise<string>;
  copyToClipboard: () => Promise<void>;
  undo: () => void;
  redo: () => void;
}

export const CanvasStageContainer = forwardRef<CanvasCoreHandle, Props>((props, ref) => {
  useImperativeHandle(ref, () => ({
    exportPng: async () => { ... },
    copyToClipboard: async () => { ... },
    undo: () => { ... },
    redo: () => { ... },
  }));
  return <Stage ... />;
});
```

### ルール 3: Presentational（見た目）と Container（状態）の完全分離
Level 2 のコンポーネントは、状態管理（Context / Custom Hook）と JSX レンダリングを分離する。
テスト時には、カスタムフックをモックするか、純粋に Props を渡すだけでコンポーネントのテストが 100% 完結する状態を維持する。

---

## 6. リファクタリング判定フローチャート (Decision Tree)

新しい機能を追加するとき、または既存のコードをリファクタリングするときは、以下のフローチャートに従って粒度を決定する。

```
Q1. このコードはブラウザ拡張固有（chrome.*）や URL ルーティングに依存するか？
    ├─ YES ──► Level 4 (Application Shell) に配置
    └─ NO  ──► Q2 へ

Q2. このコードはデータのロード・永続化ライフサイクル（IndexedDB / API）を管理するか？
    ├─ YES ──► Level 3 (Feature View) に配置（StoreProvider で状態を囲む）
    └─ NO  ──► Q3 へ

Q3. このコードはフットボールや動画分析の特定の概念（選手, スクショ, タグ, 描画ツール）を扱うか？
    ├─ YES ──► Level 2 (Domain UI Block) に配置（Props または Context で動作）
    └─ NO  ──► Level 1 (Pure Primitive / Headless) に配置（src/components/ui/ 等）
```

---

## 7. まとめ

- **戦術ボードが複雑だからこそ、その設計（3層分離・Store Provider・ゼロマージン）は全機能の模範となる。**
- **ダッシュボードもメモオーバーレイも、全く同じ「Level 4〜Level 1」の粒度で構築する。**
- **このルールに従う限り、Web と Extension でコードの 2 重管理は完全に消滅し、副作用やチラつきも一切発生しない。**
