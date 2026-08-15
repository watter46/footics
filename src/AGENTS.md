---
trigger: always_on
---

# Next.js 15 & Web App Implementation Patterns (Webアプリケーション実装規約)

> **Positioning:** Next.js 15 環境および Web アプリケーション (src配下) に最適化した実装パターン、UI、データ管理規約を定義します。

## 1. Next.js 15 Async APIs (非同期 API の扱い)
- **原則:** Next.js 15 では、これまで同期的に取得できていた一部のプロパティが非同期化（Promise 化）されています。
- **行動指針:**
    - `page.tsx` および `layout.tsx` の `params` と `searchParams` は **必ず `await` してから利用する**。
    - コンポーネント自体を `async` 関数として定義する。

## 2. Server & Client Components (コンポーネントの境界設計)
- **原則:** 「Server Component をデフォルト」とし、インタラクティブ性が必要な箇所のみを Client Component 化する。
- **行動指針:**
    - データフェッチ、DBアクセス、環境変数の参照を伴う処理は Server Component で行う。
    - `useState`, `useEffect`, ブラウザ API (`window`, `localStorage`), イベントハンドラが必要な場合のみ `"use client"` を付与する。
    - 巨大なライブラリ（Canvas操作等）は、動的インポート (`next/dynamic`) を活用してクライアントサイドのバンドルサイズを最適化する。

## 3. Data Fetching & Caching (データ取得とキャッシュ)
- **原則:** Next.js 15 では `fetch` のデフォルトキャッシュが `no-store` に変更されています。
- **行動指針:**
    - 静的に生成可能なページ（SSG）では、必要に応じて `force-cache` を明示する。
    - 書き換え処理（Mutations）には必ず **Server Actions** を使用する。
    - Server Actions 内でデータ更新後は `revalidatePath` または `revalidateTag` でキャッシュを適切に破棄する。

## 4. React 19 & Tailwind v4 Guideline
- **原則:** 最新のフレームワーク機能を活用し、パフォーマンスと保守性を両立させる。
- **行動指針:**
    - React 19 のパターン（Action, Transition等）を活用する。
    - Tailwind v4 の CSS-First アプローチに従い、デザイントークンは CSS 変数（メインCSS内の `@theme`）で管理する。
    - `tailwind.config.js` への依存を排除し、静的なクラス指定を行う。
    - **CVA による宣言的スタイリング**: 複雑な UI 状態は `class-variance-authority` (CVA) を用いて記述し、`tailwind-merge` で動的なスタイル上書きを安全に行う。

## 5. UI Component Model & State Management
- **UI コンポーネント:** 基本的には `shadcn/ui` のレジストリモデルを採用する。ロジックを持たない「骨組み」には `Base UI` または `Radix UI` プリミティブを活用し、スタイルはすべて Tailwind CSS で定義する。
- **状態管理 (Zustand):** ストアは機能単位（Slice）で作成し、巨大なモノリスストアを避ける。コンポーネントからは必要なステートのみを Selector 形式 (`useStore(state => state.foo)`) で取り出す。

## 6. Data Management Patterns (データ管理)
- **DuckDB & Persistence:** `AsyncDuckDB` は `globalThis` を用いた Singleton で管理。VFS リソースは登録後直ちに解放 (`db.dropFile()`) する。データの永続化には Parquet 形式を使用し IndexedDB に保存・復旧する。
- **IndexedDB (Dexie.js):** IndexedDB の操作には `Dexie.js` を統一して使用する（`idb-keyval` は撤廃）。直接操作を避け `src/lib/db.ts` 等の統一レイヤーを介す。トランザクションを使用しアトミック性を保証。
- **TanStack Query v5:** Query Key は `src/lib/query-keys.ts` 等で一元管理（階層構造推奨）。`queryFn` 内で DuckDB インスタンスを解決。`useSuspenseQuery` を積極的に活用し、更新後は `invalidateQueries` を呼び出す。
- **Hooks & Data Flow:** データ取得ロジックはコンポーネントに直接書かず、カスタムフック化する。アンマウント時のキャンセル処理（AbortController等）を適切に行う。

## 7. Performance, UX & Deployment
- **パフォーマンスとUX:** 重い処理には `Suspense` を使用し Loading UI を表示。画像には `next/image`、フォントには `next/font` を使用して最適化する。
- **デプロイメント:** Cloudflare Pages の Edge ランタイム環境の制約を意識し、Node.js 固有の API への依存を避ける。`open-next.config.ts` の設定を遵守する。
