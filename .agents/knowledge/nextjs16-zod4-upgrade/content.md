# Next.js 16 & Zod 4 Implementation Patterns (Next.js 16 & Zod 4 実装規約)

## 概要
本プロジェクトでは最新の Next.js 16 および Zod 4 を採用しています。フレームワーク及びバリデーションライブラリのメジャーアップデートに伴う破壊的変更や設計ガイドラインを定義します。

---

## 1. Next.js 16 設計・実装規約

### 1.1 非同期 API (params / searchParams) の扱い
- `page.tsx`、`layout.tsx`、`route.ts` 等で受け取る `params` や `searchParams` は Promise として扱われます。
- 必ず `await params` または `await searchParams` を経由して取得してください。
- ページコンポーネントは `async` 関数として定義してください。

```tsx
// 推奨実装パターン
interface PageProps {
  params: Promise<{ matchId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function MatchPage({ params, searchParams }: PageProps) {
  const { matchId } = await params;
  const query = await searchParams;
  // ...
}
```

### 1.2 Server & Client Component 境界
- 原則として「Server Component をデフォルト」とし、状態管理（Zustand）、イベントリスナー、DOM API、Konva 描画等が必要な部分のみ `"use client"` を付与した Client Component に分離します。
- 重いライブラリ（`Konva`, `react-konva`, `html-to-image`, `jszip` 等）を含むコンポーネントは、必要に応じて動的インポート (`next/dynamic` with `ssr: false`) を使用してバンドルサイズを抑制します。

### 1.3 ビルド・デプロイ環境 (Cloudflare Pages)
- Cloudflare Pages / `@opennextjs/cloudflare` ビルド環境での制約を遵守します。
- Node.js 固有のモジュール（`fs`, `path`, `child_process` 等）への直接依存を避け、Edge / Web 標準 API（`fetch`, `Web Streams`, `Crypto` 等）を利用します。

---

## 2. Zod 4 バリデーション & 型安全性規約

### 2.1 バリデーションゲートウェイ設計
- 外部入力（WhoScored API 生データ、JSON インポート、URL クエリ、拡張機能からの受信データ）は、すべて `src/lib/schema.ts` で定義された Zod スキーマで検証します。
- アプリケーション内部の型は Zod スキーマから `z.infer<typeof Schema>` で導出し、型の二重定義・不整合を防ぎます。

### 2.2 Zod 4 スキーマ定義パターン
- デフォルト値の関数渡し (`.default(() => Date.now())`) や範囲制限 (`.min()`, `.max()`, `.int()`) を明示してデータの整合性を担保します。
- `extend` や `merge` によるスキーマの合成を活用し、関心事を分離します。

```ts
import { z } from 'zod';

export const EventMemoSchema = WhoScoredEventSchema.extend({
  memo: z.string().default(''),
  tags: z.array(z.string()).default([]),
  updatedAt: z.number().default(() => Date.now()),
});

export type EventMemo = z.infer<typeof EventMemoSchema>;
```

### 2.3 Strict Mode と any の排除
- `tsconfig.json` の `strict: true` を前提とし、`any` の使用は原則禁止です。
- 型が不確実な外部データは `unknown` として受け取り、Zod の `safeParse` または `parse` を経由して型付けを行います。
