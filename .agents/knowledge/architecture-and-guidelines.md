# Footics Architecture & Guidelines

このドキュメントは、Footicsプロジェクトにおけるアーキテクチャ、設計指針、コーディング規約、パフォーマンス要件をまとめたものです。
タスク着手時に必要に応じて参照し、実装の判断基準としてください。

## 1. プロジェクト構造とコード共有ルール (Architecture)
本プロジェクトは `pnpm workspaces` を用いたモノレポ構成を採用しています。各パッケージの詳細ルールはそれぞれの `AGENTS.md` を参照してください。
- **パッケージ構成:**
    - `src/`: メインの Web アプリケーション (Next.js)
    - `extension/`: 統合ブラウザ拡張機能 (WXT: ショートカットメモ + DRM動画キャプチャ)
- **コード共有ルール:** パッケージ間での型定義やユーティリティの共通化を推奨する。パッケージ間の循環参照、および `src/` への無許可の直接インポートを禁止する。

## 2. 言語戦略 (Language Strategies)
- **内部推論 (Internal Reasoning):** 英語を許可。
- **コード (Code):** 標準的な英語を使用（変数名、コメント等）。
- **ユーザー向け出力 (User-Facing):** **日本語**を必須とする。

## 3. Core Tech Stack (コア技術スタック)
- **原則:** Web本体および拡張機能を含む全プロジェクトで一貫したモダンな技術スタックを維持する。
- **標準技術:** React 19 / TypeScript (Strict Mode) / Tailwind CSS v4 / Zustand / Zod / Dexie.js / Lucide React

## 4. Design & Architecture (設計とアーキテクチャ)
- **原則:** 関心事の分離、単一責任、継承より合成（Composition over Inheritance）を重視する。
- **行動指針:**
    - ロジック（Custom Hooks）、状態解決（Zustand）、UI描画（React/Tailwind）を明確に分ける。
    - コンポーネントは一つの役割のみを持つように極力小さく保つ。
    - **ファイル配置のコロケーション原則**: ドメイン固有（Tactical, Match, Syntax-Studio等）のコードは、共通ディレクトリ（`src/components/`, `src/hooks/`）ではなく、対象ドメインの配下にまとめる。
      - 例: `src/features/tactical/{components, hooks, stores, types}/` に閉じる。
      - `src/components/ui/` は shadcn などの純粋なドメイン非依存コンポーネントのみ配置する。

## 5. Naming Conventions & Code Style (命名規則とコードスタイル)
- **原則:** 一貫した命名とスタイルで予測可能なコード構造を保つ。
- **行動指針:**
    - ファイル名は原則ケバブケース (`user-profile.tsx`) を使用。Reactコンポーネントは `.tsx`、それ以外は `.ts`。
    - エクスポートは名前付きエクスポート (Named exports) を優先。
    - インデントは2スペース、シングルクォートを使用する。
    - ディレクトリのサブディレクトリ化: フォルダ内にファイルが 5〜7 個以上並び始めたら適切に分割する。

## 6. TypeScript, Zod & Testing (型安全と品質)
- **原則:** 厳格な型定義と自動テストで信頼性を担保する。
- **行動指針:**
    - `strict: true` を前提とし `any` 型を禁止。外部データは Zod スキーマで検証し `z.infer` で型を導出する。
    - 複雑なロジックを伴う Custom Hooks や Utility 関数には Vitest によるユニットテストを作成する。
    - **テスト・検証のスコープ限定**: テスト実行時は `rtk vitest run <影響対象パス>`、型チェック時は `rtk pnpm type-check:scoped <変更ファイル>`（全体 `rtk tsc --noEmit` は禁止）を用い、変更影響のある範囲のみを迅速に検証する。

## 7. Responsibility Segregation (責務の分離) と循環参照の防止
- **原則:** 単一ファイルへの知識集中を防ぐ (Single Responsibility Principle)。
- **行動指針:**
    - UI表示と副作用（Manager/Listener）を分離する。
    - **状態と純粋関数の強制分離:** Zustand Storeや複雑なCustom Hooksを実装する際、ロジックが肥大化する場合は「状態（State/Store）」と「データ変換・計算を行う純粋関数（Helper）」を物理ファイルとして完全に分離すること。
    - **依存の方向（DAG）の維持:** Helper関数はStoreから値をインポートしてはならない（循環参照の絶対禁止）。引数として必要なデータを受け取る純粋関数として実装することで、テスト容易性を最大化する。
    - **マイクロ検証の徹底:** 複数ファイルを変更する際は、1ファイル（または1サブモジュール）変更するごとに `rtk biome`, `rtk pnpm type-check:scoped`, `rtk vitest` を実行し、局所的な安全を確保してから次へ進むこと。一括変更による巨大なエラーログの発生を防ぐ。
    - **コンポーネントおよびフックのファイル制約**:
      - **コンポーネント (`.tsx`)**: 原則 150 行以内、最大 200 行上限。JSX 内の 3 階層以上のネストや、Canvas 描画要素（Konva ノード群）はサブコンポーネントへ強制分割する。
      - **カスタムフック (`.ts`)**: 最大 150 行上限。コンポーネント肥大化の回避先として「巨大な何でもフック」を作ってはならない。「データ購読・取得（Dexie/Query）」「Canvas操作・インタラクション計算」「ローカルUI状態」でフックを分離する。
      - **1 ファイル 1 エクスポート**: 複数のコンポーネントや大型ヘルパー関数を同一ファイル内に同居させない。
    - 定数・ID は `constants.ts` 等に切り出しマジックストリングを排除する。

## 8. Don't Reinvent the Wheel (車輪の再発明の禁止)
- **原則:** 標準ライブラリ（Zustand, Zod, Dexie.js, tailwind-merge 等）を活用し自前実装を避ける。
- **行動指針:**
    - ネイティブAPIの独自ラッパーや過剰な自己管理を禁じる。常に既存エコシステムで解決できないか検討する。

## 9. Immutable Refactoring Principles (不変のリファクタリング原則)
- **原則:** 振る舞いを変えずにコードの品質を安全に向上させる。
- **行動指針:**
    - テスト必須: テストがない状態でのリファクタリングは禁止。
    - インクリメンタル: 一度に一つの変更のみ行い、機能追加と同時に行わない。
    - 理解優先: 意図と副作用を完全に理解してから着手し、不明解な場合は "/ask" で相談する。

## 10. UI/UX Design Standards (UI/UXデザイン標準)
- **原則:** ユーザーを一目で「感動」させる、高品質で洗練されたデザインを維持する。
- **行動指針:**
    - 深みのあるモダンな配色、洗練されたダークモード、明確なタイポグラフィを採用する。
    - スムーズなトランジション、マイクロアニメーション、グラスモーフィズム等を活用しプレミアムな外観を表現する。

## 11. Performance-First Guardrails (パフォーマンスファースト原則とアンチパターン禁止)
- **原則:** 「ただ動く」だけのナイーブな実装を禁止し、常に 60fps〜120fps の滑らかな操作性と低メモリ負荷を保証する。
- **禁止アンチパターン (即座に REJECT 対象):**
    - **過渡状態の React State 更新禁止:** ドラッグ中・マウス追従中・描画インタラクション中（`onDragMove`, `onMouseMove` 等）に `setState` や Zustand ストア更新を呼んではならない。過渡状態は Ref や Canvas/Konva ノード直接操作で処理し、完了時（`onDragEnd`, `onMouseUp`）にのみストアへ同期する。
    - **Zustand 丸ごと購読禁止:** `useStore()` や `useTacticalStore()` のような全プロパティ購読を禁止する。必ず細粒度セレクター (`useStore(s => s.foo)`) を使用する。
    - **Konva 肥大化防止とアーキテクチャ制約:** Konvaは状態と描画が混在して巨大化しやすいため、以下の構造ルールを厳守する。
      1. **親・子ノードの同居禁止**: `Stage` / `Layer` を定義するファイル内に、個別の `PlayerMarker` や `TacticalArrow` などのカスタム描画コンポーネントを定義してはならない。
      2. **描画要素の完全ファイル分離**: `PitchBoard.tsx` (Stage管理), `PlayerNode.tsx` (個別マーカー), `DrawingLayer.tsx` (描画レイヤー) のように完全にファイルを分離すること。
      3. **描画コンポーネントの状態排除**: 描画を担当するコンポーネント (Konva Node) には複雑な Zustand ストアの購読やローカル状態 (`useState`) を持たせない。
      4. **イベントハンドリングの分離**: ドラッグやクリックなどのイベントロジックは必ず Custom Hook (`useDraggableNode` 等) に抽出し、描画コンポーネント側は View に徹する。
      5. **行数制限の適用**: Konva関連のコンポーネントファイルであっても「最大200行」の制限を厳格に適用する。超える場合は Node 単位でファイルを分割する。
    - **ドラッグ要素への CSS Transition / Blur 付与禁止:** ドラッグ中の要素（`DragOverlay` やマーカー）に `transition-all` や `filter: blur()` を付与してはならない。必ず `willChange: 'transform'` および `transition: none` を適用する。
    - **ホットパス・ループ内でのオブジェクト再生成禁止:** アニメーションループ、描画ハンドラ、検索サジェスト関数内で `new Fuse()`, `new OffscreenCanvas()`, 大量オブジェクト生成を行ってはならない（キャッシュまたは事前生成する）。
    - **頻出子コンポーネントの memo 化省略禁止:** ピッチ上マーカーやリストアイテムなど、大量または頻繁に再描画トリガーがかかるコンポーネントには `React.memo` を適用する。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
