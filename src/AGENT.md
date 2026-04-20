# src: Main Web Application

このディレクトリは、Footics のメインウェブアプリケーション（Next.js）を管理します。

## 1. 開発コンテキスト
- **Domain:** サッカー解析データの可視化、ダッシュボード、ユーザー管理。
- **Core Stack:** Next.js 15 (App Router), React 19.
- **Styling:** Tailwind CSS v4, shadcn/ui.
- **Local Data:** DuckDB (WASM) および Dexie.js を利用したクライアントサイドでの重いデータ処理。
- **Deployment:** Cloudflare Pages (OpenNext) 向けに最適化。

## 2. 開発ルール
- **Next.js Patterns:** `nextjs-patterns.md` に必ず従うこと。
- **Data Management:** クライアントサイドでの永続化やクエリ実行、API Fetching (`@tanstack/react-query`) には `data-management-patterns.md` のプラクティスを必ず適用すること。

## 3. UI コンポーネント
- `shadcn/ui` をベースとし、`components/ui` 内のプリミティブなコンポーネントを再利用すること。
- ドメイン知識を含むコンポーネントは `components/` 以下の機能別ディレクトリに配置すること。

## 参照すべきルール
- [nextjs-patterns.md](file:///home/watter46/src/footics/.agent/rules/nextjs-patterns.md)
- [data-management-patterns.md](file:///home/watter46/src/footics/.agent/rules/data-management-patterns.md)
