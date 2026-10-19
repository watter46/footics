---
description: "Footics & Extension 共通コンポーネントアーキテクチャ規約（4層モデル, 6大設計品質原則, ホスト境界, プラグイン拡張性, 副作用ゼロ）"
globs:
  - "src/**"
  - "extension/**"
---
# コンポーネントアーキテクチャ規約 (Component Architecture Standards)

本規約は、Footics Web アプリケーションと Chrome Extension において、**コンポーネントの2重管理を完全に排除し、初期チラつき（Flicker）や黒マージン等の副作用を出さず、高い保守性・拡張性・テスタビリティを担保するための絶対遵守ルール**です。
エージェントが `src/**` または `extension/**` のコードを作成・編集・リファクタリングする際は、必ず本規約に従ってください。

---

## 1. Footics 4層コンポーネントモデル (4-Tier Model)

すべてのコンポーネントは、以下の 4 つの階層（Level）のいずれかに属さなければなりません。

| 階層 | 名称 | 責務と配置ルール | 主な例 |
|:---|:---|:---|:---|
| **Level 4** | **Application Shell** | 画面全体のエントリーポイント、URLパラメータ解決、ルーティング、タブ/ウィンドウ制御。**純粋マウンターに徹し、低レベルなパイプライン処理のインライン記述を禁止する。ホスト（Web / Extension）固有のコードをここに限定する。** | `TacticalUnifiedPage.tsx`, `dashboard.html`, `overlay.content.tsx`, `background.ts` |
| **Level 3** | **Feature View** | データソース（IndexedDB / API）のロードと永続化ライフサイクル管理。**`StoreProvider` による初期値（Props）確定注入** を行い、複数の Level 2 を組み立てる。 | `QuickAnnotationCanvas.tsx`, `FullTacticalCanvas.tsx`, `MemoOverlayBridge.tsx` |
| **Level 2** | **Domain UI Block** | 単一の関心事を持つ自律的な UI パーツ。**ホスト非依存（Web / Extension 完全共用）**。ビジネスロジックはカスタムフックに逃がし、UIファイルは描画に集中。状態は Context Hook 経由で取得。 | `CoreDrawingToolbar.tsx`, `AnnotationLayer.tsx`, `DashboardSearchBar.tsx`, `MemoOverlayView.tsx` |
| **Level 1** | **Pure Primitive / Headless** | ドメイン知識を持たない汎用部品、純粋幾何計算、汎用フック。完全純粋でテスト容易性が 100%。 | `calculateContainVideoCrop`, `Button`, `Modal`, `ColorPalettePicker`, `useDebounce` |

---

## 2. 6大設計品質原則 (Six Design Pillars) と判定基準

コンポーネントおよびモジュールの設計・追加・リファクタリング時は、以下の基準を機械的に適用してください。

### ①【単一責任・責務の分離 (SRP / SoC)】
- 「見た目（Tailwind CSS / JSX）を変えたい」「データ取得・保存仕様を変えたい」「通信・メッセージング仕様を変えたい」理由を同一ファイルに同居させてはならない。
- **純粋マウンター原則 (Shell Purity)**:
  Level 4 のエントリポイント（Content Script や HTML main）は、UI コンポーネントのマウントとイベントリスナーの配線のみを担当し、DOM探索・待機ループ・画像変換などの複合処理をインライン記述してはならない（Service 層へカプセル化する）。

### ②【凝集度と結合度 (Cohesion & Coupling)】
- **Web ↔ Extension の一方向依存の厳守**:
  依存の向きは必ず `extension/ -> src/` の一方向とする。`src/` から `extension/` のコードを import することを固く禁ずる（循環依存ゼロ）。
- **Store Provider 内部でのシングルトン直接参照の絶対禁止 (CRITICAL)**:
  `StoreProvider`（Vanilla Store Factory + React Context）を採用した機能ドメイン（`memo-overlay`, `tactical-unified` 等）において、ドメイン内部のコンポーネント（Level 2）やカスタムフックからグローバルシングルトン（`useXxxStore` の直接呼び出し）を禁止する。必ず Context 購読フック（`useXxxStoreContext`）経由で取得すること。
- **マウント後手動同期 `useEffect` の全廃**:
  コンポーネントマウント後に `useEffect` 内でシングルトンストアを手動更新・同期するハックコードを禁止する。必ず Level 3 で `initialState` を Props 確定注入して初期化すること。

### ③【開放閉鎖原則 (OCP: Open-Closed Principle)】
- **コマンド / メッセージ / ツールのレジストリ化 (Registry Pattern)**:
  将来バリエーションが増えるあらゆる要素（ショートカットコマンド、IPC メッセージハンドラ、描画ツール、ダッシュボードウィジェット等）に `switch / if` をコアコードへベタ書きすることを禁止する。
- 1つのハンドラーまたはプラグイン定義ファイルを新規作成し、レジストリ配列に登録するだけで機能追加を完結させること。

### ④【抽象度の一貫性 (SLAP: Single Level of Abstraction Principle)】
- 単一の関数やコンポーネント内で、高レベルなドメイン意図（「キャプチャして開く」「メモを保存する」）と、低レベルな実装詳細（rAF待機、CSSスタイル直操作、ピクセル幾何計算、生IPC通信）を混在させてはならない。
- 低レベルな複合処理は `features/<domain>/services/` 配下のサービスクラス / ファサード（例: `CaptureService.execute()`）にカプセル化し、呼び出し側は 1 行の意図表現に統一すること。

### ⑤【変更の局所性と直交性 (Locality & Orthogonality)】
- **副作用の RAII 型隔離**:
  DOM やグローバルスタイル、GPU コンポジタを一時的に変更する処理は、必ず原状回復を行う `cleanup()` 関数を返却し、呼び出し側の `finally` 句で確実に実行すること。
- **マルチタブ排他制御 (Web Locks)**:
  IndexedDB やストレージへの非同期書き込み・キュー処理は、`navigator.locks` 等を用いた排他制御を行い、複数タブ・ウィンドウ間での競合・重複実行を直交に隔離すること。
- **ホスト間境界通信の単一プロトコル原則**:
  Extension Content Script と Web アプリ（Host）間のウィンドウ間通信は、`window.postMessage`（型定義された `CaptureProtocolMessage`）に一本化する。`CustomEvent`（`window.dispatchEvent`）との二重発行・併用を固く禁ずる。

### ⑥【テスタビリティと認知負荷 (Testability & Cognitive Load)】
- **エントリポイントの DI（依存性注入）設計**:
  `defineBackground` や `defineContentScript` 内に全処理を無名クロージャで閉じ込めることを禁止する。タブ制御や IPC リレー等の実ロジックは独立した関数・クラスとして export し、Chrome API をモック注入可能にして単体テスト作成を必須とすること。
- **多段同期パスの明示化**:
  Origin 境界を跨ぐ多重ホップ処理（Extension → Storage → Locks → Bridge → Web DB）は、暗黙の前提を排し、シーケンス図や契約型定義を明記して認知負荷を最小化すること。

---

## 3. 保守性・拡張性の一般化（プラグイン / レジストリ原則）

ツール、アノテーションオブジェクト、ダッシュボードウィジェット、エクスポート形式、インスペクタなど、将来バリエーションが増えるあらゆる要素はプラグイン型で設計しなければなりません。

1. **自己申告型オプション & スキーマ駆動 (Self-Declaring Options)**:
   - 各要素が持つ編集属性（色、太さ、先端形状、ラベル等）は、プラグイン自身が `OptionsComponent`（または Zod スキーマ）として定義・提供すること。
   - Web 本体の右パネル（Inspector）や Extension の浮動コンテキストバー（HUD）は、プラグインから `OptionsComponent` を取り出してスロットにマウントするだけで自動展開される構造にすること（UI の二重管理を根絶）。
2. **ホスト境界の原則 (Host Boundary Rule)**:
   - `chrome.*`（Extension API）、`window.location.search`、Dexie DB への直接アクセスは **Level 3 以上に隔離** すること。
   - **Level 2 以下のコンポーネントへのホスト依存の持ち込みは絶対禁止**。コールバック（`onSave`, `onDelete`）または Context / Props 経由でデータを渡すこと。

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
