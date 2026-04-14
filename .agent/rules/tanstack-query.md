---
trigger: always_on
description: TanStack Query v5 の運用規約と DuckDB との統合パターン
globs: ["src/**/*.{ts,tsx}"]
---

---
trigger: always_on
globs: ["src/**/*.{ts,tsx}"]
---

# TanStack Query v5 Implementation Guide (データ取得・キャッシュ戦略)

**Activation:** This rule is **ALWAYS ON** for files matching `src/**/*.{ts,tsx}`.

Next.js 15 (App Router) 環境において、DuckDB や API からのデータを効率的かつ型安全に管理するためのガイドラインです。

## 1. Query Key 管理 (Query Key Factory)

- **原則:** Query Key は文字列の直書きを避け、必ずファクトリ関数またはオブジェクトで管理してください。
- **行動指針:**
    - 機能単位で `keys.ts` を作成し、一元管理する。
    - キーは階層構造にし、リセットや無効化を容易にする。

```typescript
// GOOD: Query Key Factory
export const matchKeys = {
  all: ['matches'] as const,
  lists: () => [...matchKeys.all, 'list'] as const,
  detail: (id: string) => [...matchKeys.all, 'detail', id] as const,
};
```

## 2. DuckDB / IDB との統合

- **原則:** `queryFn` 内で DuckDB インスタンスを解決し、データの整合性を保つ。
- **行動指針:**
    - DuckDB へのクエリは `queryFn` 内で完結させる。
    - 重い集計処理などは、DuckDB 独自のキャッシュ機能を活かしつつ、React Query の `staleTime` を適切に設定（デフォルト 0 は避ける）してください。

```typescript
// 例: DuckDB を使ったクエリ
const { data } = useSuspenseQuery({
  queryKey: matchKeys.detail(id),
  queryFn: async () => {
    const db = await getDuckDB(); // Singleton インスタンスの取得
    const result = await db.query(`SELECT * FROM matches WHERE id = '${id}'`);
    return result.toArray();
  },
  staleTime: 1000 * 60 * 5, // 5分間はフレッシュとみなす
});
```

## 3. React 19 & Next.js 15 適合

- **原則:** `useSuspenseQuery` を積極的に活用し、宣言的なローディング状態（Suspense）を実現する。
- **行動指針:**
    - データ取得待ちの間は、上位の `loading.tsx` または `Suspense` コンポーネントに任せる。
    - クライアントサイドでのみ実行されるクエリには、必要に応じて `enabled` フラグでマウント待ちを処理する。

## 4. Mutation & Invalidation (データ更新)

- **原則:** 更新後は必ず関連するキーを無効化し、UI を最新の状態に保つ。
- **行動指針:**
    - `onSuccess` ブロックで `queryClient.invalidateQueries` を呼び出す。
    - 楽観的更新 (Optimistic Updates) は、特に反応速度が求められる UI（チェックボックス、簡単なフラグ等）で積極的に導入する。

```typescript
const mutation = useMutation({
  mutationFn: updateMatch,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: matchKeys.all });
  },
});
```

## 5. エラーハンドリング

- **原則:** エラーは `ErrorBoundary` でキャッチするか、UI 上で適切に通知する。
- **行動指針:**
    - `sonner` 等のトーストライブラリを使い、失敗理由をユーザーに明示する。
    - `meta` プロパティを活用して、グローバルなエラー通知ロジックを共通化することを推奨。