# TASK-077: [Next.js 16] クライアント境界宣言の是正とサーバー画面依存関係の適正化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `.agents/rules/react-nextjs.md` (MODIFY)
  - `.agents/scripts/lib/code-guardrails.ts` (MODIFY)
  - `.agents/scripts/__tests__/code-guardrails.test.ts` (MODIFY)
  - `src/features/management/data-io/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/objects/**/hooks/*.ts` (MODIFY)
  - `src/features/tactical-unified/panels/**/use-*.ts` (MODIFY)
  - `src/features/match/hooks/*.ts` (MODIFY)
  - `src/features/dashboard/hooks/*.ts` (MODIFY)
  - `src/features/teams/hooks/*.ts` (MODIFY)
  - `src/features/analysis/hooks/use-events.ts` (MODIFY)
  - `src/features/national-dashboard/hooks/use-national-dashboard.ts` (MODIFY)
  - `src/hooks/use-data-sync.ts` (MODIFY)
  - `src/hooks/use-shortcut.ts` (MODIFY)
  - `src/app/test/pitch-aspect/hooks/*.ts` (MODIFY)
  - `src/features/management/index.ts` (MODIFY)
  - `src/features/management/data-io/index.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. エージェント検査ルール（R11）を是正し、React Hooks をインポート・使用するカスタムフック（`use-*.ts` や `hooks/*.ts`）に対する `'use client'` 宣言をクライアント境界として正式に許容する。
- [x] 2. コミット `bc52451` で誤って削除された 45件のカスタムフック先頭に `'use client'` 宣言を復元する（`use-data-sync.ts` の `console.log` 削除は維持）。
- [x] 3. サーバー画面（Server Component）から参照される機能まとめファイル（バレル）において、公開 UI コンポーネントと内部クライアントフックの公開境界を整理し、不要なモジュール巻き込みを防止する。
- [x] 4. `bun run build`（Next.js Turbopack ビルド）および `bun run ai:check`（Lint・型・テスト・ガードレール）がすべて exit code 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 R11 Guardrail Specification
```ts
// .agents/scripts/lib/code-guardrails.ts
// hooks や use-*.ts は Client Component Boundary として 'use client' を認める
const isHook =
  /^(?:.*\/)?use[A-Z0-9_-].*\.ts$/.test(normFile) ||
  normFile.includes('/hooks/');
const isPureTs =
  normFile.endsWith('.ts') && !normFile.endsWith('.d.ts') && !isHook;
```

### 3.2 Barrel Separation Pattern
```ts
// src/features/management/data-io/index.ts
// 公開UIコンポーネントを安全に提供し、hooksの不要な全体巻き込みを避ける構成とする
```

### 3.3 Gotchas & Rules
```ts
// 1. 純粋な計算関数・型定義・vanillaストアへの 'use client' 付与禁止は維持すること。
// 2. page.tsx や layout.tsx への 'use client' 付与禁止（Server Component 維持）は厳格に守ること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: エージェント検査ルール（R11）の是正と単体テスト
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/scripts/lib/code-guardrails.ts`, `.agents/scripts/__tests__/code-guardrails.test.ts`, `.agents/rules/react-nextjs.md`
- **契約 (Interface)**:
  ```ts
  // code-guardrails.ts: isHook 判定を追加し、カスタムフックへの 'use client' を R11 違反から除外
  // code-guardrails.test.ts: カスタムフックの 'use client' 許容テストを追加、純粋計算関数の遮断テストを維持
  ```
- **Testing Strategy**: `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun test ./.agents/scripts/__tests__/code-guardrails.test.ts` ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `code-guardrails.ts` に `isHook` の判定を追加し、カスタムフックへの `'use client'` を許容。
  - `code-guardrails.test.ts` にフックの許容と純粋tsの遮断テストを追加。
  - `.agents/rules/react-nextjs.md` の R11 規約を更新。単体テスト全 8 件 PASS。

### Phase 2: 45件のカスタムフックへの 'use client' 復元
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/management/data-io/hooks/*.ts`, `src/features/tactical-unified/core/hooks/*.ts`, `src/features/tactical-unified/hooks/*.ts`, `src/features/tactical-unified/objects/**/hooks/*.ts`, `src/features/tactical-unified/panels/**/use-*.ts`, `src/features/match/hooks/*.ts`, `src/features/dashboard/hooks/*.ts`, `src/features/teams/hooks/*.ts`, `src/features/analysis/hooks/use-events.ts`, `src/features/national-dashboard/hooks/use-national-dashboard.ts`, `src/hooks/use-data-sync.ts`, `src/hooks/use-shortcut.ts`, `src/app/test/pitch-aspect/hooks/*.ts`
- **契約 (Interface)**:
  ```ts
  // 各フックファイルの先頭に 'use client'; を復元（既存の関数シグネチャ・ロジックは一切変更しない）
  ```
- **Testing Strategy**: `bun run ai:check` でガードレール違反が出ず、関連テストが PASS すること。
- **Tasks**:
  - [x] 1. 復元実装: 各ファイル先頭に `'use client';\n\n` を付与 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 45件のカスタムフックへの `'use client';` 復元と `src/hooks/use-data-sync.ts` の `console.log` 削除状態を確認。

### Phase 3: バレル公開境界の整理と Next.js ビルド検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/management/index.ts`, `src/features/management/data-io/index.ts`
- **契約 (Interface)**:
  ```ts
  // サーバー画面（page.tsx等）から安全にインポートできるよう、バレル公開の整合性を確認・最適化
  ```
- **Testing Strategy**: `bun run build`（Next.js Turbopack）が exit code 0 で成功すること。
- **Tasks**:
  - [x] 1. 境界整理と全体ビルド検証: `bun run build` PASS
- **Worker Handoff Log**:
  - `src/features/management/data-io/index.ts` から hooks の export を除外してコンポーネントのみ公開する構成を確認。`bun run build` で全11ページ正常ビルド完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 16:47
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: ガードレール R11 のカスタムフック許容ロジックおよび単体テストが正確に実装され、45件のカスタムフックへの 'use client' 復元と barrel 公開境界の最適化により Next.js 16 の境界安全性が完全に確保されたことを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
