---
trigger: always_on
globs: ["src/**/*.{ts,tsx}", "next.config.ts", "open-next.config.ts"]
---

---
trigger: always_on
globs: ["src/**/*.{ts,tsx}", "next.config.ts", "open-next.config.ts"]
---

# Next.js 15 Implementation Patterns (Next.js 15 実装規約)

**Activation:** This rule is **ALWAYS ON** for files matching `src/**/*.{ts,tsx}` and configuration files.

> **Positioning:** Next.js 15 環境に最適化した実装パターンを定義します。

## 1. Next.js 15 Async APIs (非同期 API の扱い)
- **原則:** Next.js 15 では、これまで同期的に取得できていた一部のプロパティが非同期化（Promise 化）されています。
- **行動指針:**
    - `page.tsx` および `layout.tsx` の `params` と `searchParams` は **必ず `await` してから利用する**。
    - コンポーネント自体を `async` 関数として定義する。
    ```tsx
    // GOOD (Next.js 15)
    export default async function Page({ params }: { params: Promise<{ id: string }> }) {
      const { id } = await params;
      return <div>ID: {id}</div>;
    }
    ```

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

## 4. Performance & UX
- **原則:** Loading/Error UI を用意し、ユーザー体験を損なわない。
- **行動指針:**
    - 重い処理には `Suspense` を使用し、`loading.tsx` またはスケルトンを表示する。
    - 画像には `next/image` を使用し、`width`, `height`, `priority` (LCP対象時) を適切に設定する。
    - フォントは `next/font` を使用して最適化する。

## 5. Deployment (OpenNext / Cloudflare)
- **原則:** Cloudflare Pages の Edge ランタイム環境の制約を意識する。
- **行動指針:**
    - Node.js 固有の API (fs等) への依存を避け、Edge Runtime で動作する代替手段を検討する。
    - `open-next.config.ts` の設定を遵守する。