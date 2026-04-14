# src: Main Web Application

このディレクトリは、Footics のメインウェブアプリケーション（Next.js）を管理します。

## 1. 開発コンテキスト
- **Domain:** サッカー解析データの可視化、ダッシュボード、ユーザー管理。
- **Core Stack:** Next.js 15 (App Router), React 19.
- **Styling:** Tailwind CSS v4, shadcn/ui.
- **Local Data:** DuckDB (WASM) および IDB / idb-keyval を利用したクライアントサイドでの重いデータ処理。
- **Deployment:** Cloudflare Pages (OpenNext) 向けに最適化。

## 2. 開発ルール
- **Next.js Patterns:** `next-patterns.md` に必ず従うこと。
- **Data Management:** クライアントサイドでの永続化やクエリ実行には `duckdb-idb.md` のプラクティスを必ず適用すること。
- **API Fetching:** `@tanstack/react-query` を使用し、`tanstack-query.md` のルールに必ず従うこと。

## 3. UI コンポーネント
- `shadcn/ui` をベースとし、`components/ui` 内のプリミティブなコンポーネントを再利用すること。
- ドメイン知識を含むコンポーネントは `components/` 以下の機能別ディレクトリに配置すること。

## 参照すべきルール
- [nextjs-patterns.md](file:///home/watter46/src/footics/.agent/rules/nextjs-patterns.md)
- [duckdb-idb.md](file:///home/watter46/src/footics/.agent/rules/duckdb-idb.md)
- [component-architecture.md](file:///home/watter46/src/footics/.agent/rules/component-architecture.md)
