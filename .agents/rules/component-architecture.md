---
description: "Footics & Extension 共通コンポーネントアーキテクチャ規約（4層モデル, ホスト境界, プラグイン拡張性, 副作用ゼロ）"
globs:
  - "src/**"
  - "extension/**"
---
# コンポーネントアーキテクチャ規約 (Component Architecture Standards)

本規約は、Footics Web アプリケーションと Chrome Extension において、**コンポーネントの2重管理を完全に排除し、初期チラつき（Flicker）や黒マージン等の副作用を出さず、高い保守性・拡張性を担保するための絶対遵守ルール**です。
エージェントが `src/**` または `extension/**` のコードを作成・編集・リファクタリングする際は、必ず本規約に従ってください。

---

## 1. Footics 4層コンポーネントモデル (4-Tier Model)

すべてのコンポーネントは、以下の 4 つの階層（Level）のいずれかに属さなければなりません。

| 階層 | 名称 | 責務と配置ルール | 主な例 |
|:---|:---|:---|:---|
| **Level 4** | **Application Shell** | 画面全体のエントリーポイント、URLパラメータ解決、ルーティング、タブ/ウィンドウ制御。**ホスト（Web / Extension）固有のコードをここに限定する。** | `TacticalUnifiedPage.tsx`, `dashboard.html`, `overlay.content.tsx` |
| **Level 3** | **Feature View** | データソース（IndexedDB / API）のロードと永続化ライフサイクル管理。**`StoreProvider` による初期値（Props）確定注入** を行い、複数の Level 2 を組み立てる。 | `QuickAnnotationCanvas.tsx`, `FullTacticalCanvas.tsx`, `ScreenshotLibraryView.tsx` |
| **Level 2** | **Domain UI Block** | 単一の関心事を持つ自律的な UI パーツ。**ホスト非依存（Web / Extension 完全共用）**。ビジネスロジックはカスタムフックに逃がし、UIファイルは描画に集中。 | `CoreDrawingToolbar.tsx`, `AnnotationLayer.tsx`, `DashboardSearchBar.tsx`, `ScreenshotCard.tsx` |
| **Level 1** | **Pure Primitive / Headless** | ドメイン知識を持たない汎用部品、純粋幾何計算、汎用フック。完全純粋でテスト容易性が 100%。 | `calculateVirtualCanvasRect`, `Button`, `Modal`, `ColorPalettePicker`, `useDebounce` |

---

## 2. コンポーネント分割の4大判定基準 (Splitting Criteria)

コンポーネントの設計・リファクタリング時は、以下の基準を機械的に適用してください。

1. **【ホスト境界の原則 (Host Boundary Rule: CRITICAL)】**:
   - `chrome.*`（Extension API）、`window.location.search`、Dexie DB への直接アクセスは **Level 3 以上に隔離** すること。
   - **Level 2 以下のコンポーネントへのホスト依存の持ち込みは絶対禁止**。コールバック（`onSave`, `onDelete`）または Context / Props 経由でデータを渡すこと。
2. **【単一変更理由の原則 (Single Reason to Change)】**:
   - 「見た目（Tailwind CSS / JSX）を変えたい」理由と、「データ取得・保存仕様を変えたい」理由を同一ファイルに同居させてはならない。
   - データ操作は専用のカスタムフック（`useXxx`）に分離し、コンポーネント側は受け取ったデータを描画する構造にすること。
3. **【レンダリング境界の原則 (Render Lifecycle Boundary)】**:
   - 高頻度で更新される要素（ドラッグ、マウスプレビュー、文字入力、再生秒数等）と、低頻度の静的要素（カード一覧、ヘッダー等）を同一コンポーネントに同居させてはならない。
4. **【行数ハードリミット (Strict Limit)】**:
   - **1ファイル 200行以下を標準** とし、**250行を超えたら分割必須** とする（1ファイル 1コンポーネント）。400〜500行の God Component は即座にリファクタリング対象とする。

---

## 3. 保守性・拡張性の一般化（プラグイン / レジストリ原則）

ツール、アノテーションオブジェクト、ダッシュボードウィジェット、エクスポート形式、インスペクタなど、**将来バリエーションが増えるあらゆる要素は「プラグイン型（Registry Pattern）」で設計しなければならない**。

1. **開放閉鎖原則 (OCP) の徹底**:
   - 新規要素（新しい矢印、新しいマーカー、新しいグラフウィジェット等）を追加する際、既存のコアコンポーネント（Stage, Toolbar, DashboardView, InspectorPanel等）に `switch / if` を追加することを禁止する。
   - 1つのプラグイン定義ファイル（例: `curved-arrow-tool.tsx`）を新規作成し、レジストリ配列に追加するだけで機能拡張を完結させること。
2. **自己申告型オプション & スキーマ駆動 (Self-Declaring Options)**:
   - 各要素が持つ編集属性（色、太さ、先端形状、ラベル等）は、プラグイン自身が `OptionsComponent`（または Zod スキーマ）として定義・提供すること。
   - Web 本体の右パネル（Inspector）や Extension の浮動コンテキストバー（HUD）は、プラグインから `OptionsComponent` を取り出してスロットにマウントするだけで自動展開される構造にすること（UI の二重管理を根絶）。

---

## 4. 副作用ゼロ＆共用化のための3大実装ルール

1. **初期値 Props 注入による「チラつき（Flicker）ゼロ保証」**:
   - マウント後に非同期 `useEffect` でストアを初期化・上書きするアンチパターンを禁止する。
   - Level 3（Feature View）でデータを取得・待機し、Level 2 へ `initialData` を Props 確定注入した状態でマウントさせること。
2. **グローバルイベント（`window.dispatchEvent`）の完全全廃**:
   - `tactical:copy-png` などの `CustomEvent` によるコンポーネント間連携を禁止する。
   - 親から子への操作は `forwardRef` + `useImperativeHandle` による明示的な Ref 契約（`canvasRef.current.exportPng()`）、または Context アクションで行うこと。
3. **ゼロマージン描画 & 仮想キャンバス座標系 (Virtual Canvas Scaling)**:
   - 画像背景モードでは、外側余白を一切含めず（`x: 0, y: 0, 100%, 100%`）、BoundaryBox の初期値も 100%（マージン0%）とすること。
   - キャンバス内の永続化座標は 0〜100% の正規化座標で管理し、ウィンドウリサイズ時には `object-fit: contain` 相当の均等スケーリングを適用して比率崩れを防ぐこと。
