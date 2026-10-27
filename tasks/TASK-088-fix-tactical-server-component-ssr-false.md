# TASK-088: Tactical画面におけるNext.js Server Componentでの `ssr: false` ビルドエラー解消

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/app/tactical/tactical-client-page.tsx` (CREATE)
  - `src/app/tactical/page.tsx` (MODIFY)
  - `src/app/tactical/__tests__/tactical-page.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/app/tactical/tactical-client-page.tsx` を新規作成し、`'use client';` 境界コンポーネントとして `TacticalUnifiedPage` をインポート・描画すること。
- [x] 2. `src/app/tactical/page.tsx`（Server Component）から `nextDynamic(..., { ssr: false })` を削除し、`TacticalClientPage` を直接描画すること（Next.js 16 / Turbopack の Server Component 内での `ssr: false` 禁止ルールに準拠）。
- [x] 3. `src/app/tactical/__tests__/tactical-page.test.tsx` のモック設定を更新し、Next.js ページテストがすべて PASS すること。
- [x] 4. `bun run build` を実行し、ビルドエラー（`ssr: false is not allowed with next/dynamic in Server Components`）が解消され、ビルドが成功すること。
- [x] 5. `bun run ai:check src/app/tactical/page.tsx src/app/tactical/tactical-client-page.tsx src/app/tactical/__tests__/tactical-page.test.tsx` が exit code 0 でパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Client Boundary (`tactical-client-page.tsx`)
```tsx
'use client';

import { TacticalUnifiedPage } from '@/features/tactical-unified';

export interface TacticalClientPageProps {
  initialMatchId?: string;
  initialMinute?: number;
}

export function TacticalClientPage({
  initialMatchId,
  initialMinute,
}: TacticalClientPageProps) {
  return (
    <TacticalUnifiedPage
      initialMatchId={initialMatchId}
      initialMinute={initialMinute}
    />
  );
}
```

### 3.2 Server Component (`page.tsx`)
```tsx
import { Suspense } from 'react';
import { TacticalClientPage } from './tactical-client-page';

export default async function TacticalPage({
  searchParams,
}: TacticalPageProps) {
  // ...
  return (
    <Suspense fallback={null}>
      <TacticalClientPage
        initialMatchId={matchId}
        initialMinute={minute}
      />
    </Suspense>
  );
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Client Component 境界分離とテスト更新
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/tactical/tactical-client-page.tsx`
  - `src/app/tactical/page.tsx`
  - `src/app/tactical/__tests__/tactical-page.test.tsx`
- **Testing Strategy**:
  - `bun run ai:check src/app/tactical/page.tsx src/app/tactical/tactical-client-page.tsx src/app/tactical/__tests__/tactical-page.test.tsx` が PASS すること。
  - `bun run build` がエラーなく成功すること。
- **Tasks**:
  - [x] 1. `tactical-client-page.tsx` を作成
  - [x] 2. `page.tsx` から `nextDynamic(..., { ssr: false })` を削除し `TacticalClientPage` 呼び出しに移行
  - [x] 3. `tactical-page.test.tsx` を更新しテスト GREEN を確認
- **Worker Handoff Log**:
  - Export: `TacticalClientPage`
  - Server Component である `src/app/tactical/page.tsx` から `next/dynamic` の `ssr: false` 呼び出しを完全排除し、専用の Client Component `TacticalClientPage` を経由することで Turbopack / Next.js 16 の制約を満たした。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 10:42
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、Next.js 16 Server Component 規律準拠
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Client Component 分離による SSR 境界の適正化
  - [x] 3. 設計負債 & 拡張性: 不要な dynamic ラッパーの排除と直接のクライアント分離
  - [x] 4. サイレント破壊 & 既存保護: props 伝搬と Suspense 構造の維持
- **Summary**: Next.js 16 (Turbopack) の「Server Component 内での `next/dynamic({ ssr: false })` 禁止」仕様に適合させるため、`TacticalClientPage` を `'use client';` として抽出し、Server Component (`page.tsx`) からは直接 Client Component を呼ぶ標準的アーキテクチャへと適正化完了。全チェックおよび `next build` が成功していることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし
