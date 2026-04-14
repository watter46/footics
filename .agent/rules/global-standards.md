---
trigger: always_on
globs: ["**/*.{ts,tsx,css,json}"]
---

---
trigger: always_on
globs: ["**/*.{ts,tsx,css,json}"]
---

# Global Standards (グローバル標準ルール)

**Activation:** This rule is **ALWAYS ON** for files matching `**/*.{ts,tsx,css,json}`.

> **Positioning:** このドキュメントは、プロジェクト全体の共通技術スタック (`extension`, `video-canvas`, `src`) における実装の「グローバルな共通品質」を担保するための設計指針および標準ルールです。特定プロジェクト（Next.js等）に依存しない、フロントエンド全般の共通規約を定義します。

## 1. Core Tech Stack (コア技術スタック)
- **原則:** 全プロジェクトで一貫したモダンな技術スタックを維持し、将来的なコード共有を容易にする。
- **行動指針:**
    - 以下の主要技術を標準として採用する：
        - React 19 / TypeScript (Strict Mode)
        - Tailwind CSS v4 (CSS-First approach)
        - Zustand (Client State Management)
        - Zod (Runtime Validation / SSoT)
        - Lucide React (Icons)
        - ユーティリティ: `clsx`, `tailwind-merge`

## 2. Design & Architecture (設計とアーキテクチャ)
- **原則:** 関心事の分離、単一責任、継承より合成（Composition over Inheritance）を重視する。
- **行動指針:**
    - ロジック（Custom Hooks）、状態解決（Zustand）、UI描画（React/Tailwind）を明確に分ける。
    - コンポーネントは一つの役割のみを持つように極力小さく保つ。
    - 複雑なUI操作（ドラッグ＆ドロップ、キャンバス操作等）は、Hooks または外部ライブラリの抽象化レイヤーにカプセル化する。

## 3. Naming Conventions (ディレクトリ・ファイル命名規則)
- **原則:** 一貫した命名によりファイル検索性と可読性を向上させる。
- **行動指針:**
    - ファイル名は原則ケバブケース (`user-profile.tsx`) を使用する。
    - 拡張子を使い分ける： React コンポーネントは `.tsx`、それ以外は `.ts`。
    - エクスポートは名前付きエクスポート (Named exports) を優先する。
    - コンポーネントフォルダ構造：`components/ui/` (共通部品) と `components/features/` (機能部品) を区別する。

## 4. Code Style (コードスタイル)
- **原則:** 予測可能なコード構造を保ち、レビューコストを下げる。
- **行動指針:**
    - インデントは2スペース、シングルクォートを使用する。
    - インポート順序： (1) React, (2) サードパーティ, (3) 共有エイリアス/共通部品, (4) 相対パス。
    - 副作用（useEffect）は最小限にし、可能な限りイベントハンドラや派生ステートで処理する。

## 5. React 19 & Tailwind v4 Guideline
- **原則:** 最新のフレームワーク機能を活用し、パフォーマンスと保守性を両立させる。
- **行動指針:**
    - React 19 のパターン（Action, Transition等）を活用する。
    - Tailwind v4 の CSS-First アプローチに従い、デザイントークンは CSS 変数（メインCSS内の `@theme`）で管理する。
    - `tailwind.config.js` への依存を排除し、静的なクラス指定を行う。

## 6. TypeScript & Zod (型安全とバリデーション)
- **原則:** 厳格な型定義とランタイムチェックにより、信頼できるデータフローを保証する。
- **行動指針:**
    - `strict: true` 設定を前提とし、`any` 型を禁止する。
    - 外部データ（API、Storage、ユーザー入力）には必ず Zod スキーマを通す。
    - スキーマから `z.infer<typeof Schema>` で型を導出し、定義の重複を防ぐ。

## 7. State Management (Zustand)
- **原則:** ドメインごとにストアを分割し、再レンダリングを最適化する。
- **行動指針:**
    - ストアは機能単位（Slice）で作成し、巨大なモノリスストアを避ける。
    - コンポーネントからは必要なステートのみを Selector 形式 (`useStore(state => state.foo)`) で取り出す。

## 8. UI Component Model (shadcn/ui & Base UI)
- **原則:** アクセシビリティとカスタマイズ性を両立したコンポーネント設計を行う。
- **行動指針:**
    - 基本的には `shadcn/ui` のレジストリモデル（プロジェクトにソースコードをコピーして管理）を採用する。
    - ロジックを持たない「骨組み」には `Base UI` または `Radix UI` プリミティブを活用する。
    - スタイルはすべて Tailwind CSS で定義し、独自のCSSクラス作成は最小限にする。

## 9. Testing & Quality
- **原則:** ロジックの正当性を自動テストで担保する。
- **行動指針:**
    - 複雑なロジックを伴う Custom Hooks や Utility 関数には Vitest によるユニットテストを作成する。
    - テストファイルは実装ファイルと同階層の `__tests__` フォルダに配置する。

## 10. UI/UX Design Standards (プレミアムな外観と設計)
- **原則:** ユーザーを一目で「感動」させる、高品質で洗練されたデザインを維持する。
- **行動指針:**
    - **モダンな配色とトーン:** 単純な原色を避け、HSLを調整した深みのある色味や、洗練されたダークモードを採用する。
    - **タイポグラフィ:** ブラウザ標準フォントは避け、`Inter` や `Roboto` 等のモダンなフォントを利用し、情報の階層構造（Hierarchy）をフォントサイズとウェイトで明確にする。
    - **インタラクション:** ホバー効果、スムーズなトランジション、マイクロアニメーション（`framer-motion` や Tailwind v4 のユーティリティ）を適切に配置し、アプリに「生命感」を与える。
    - **shadcn/ui の拡張:** 提供されるコンポーネントをそのまま使うのではなく、プロジェクトのデザインシステムに合わせてスタイルを調整し、必要に応じてアクセシビリティを保ちながら拡張する。
    - **グラスモーフィズム:** 適宜、背景透過（`backdrop-blur`）などを活用し、奥行きのあるモダンな質感を表現する。