# TASK-067: React 19 & Next.js 16 境界の是正（Server Component 化・不要 'use client' 除去・React.FC / forwardRef 撤去）

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/app/export/page.tsx` (MODIFY)
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/app/syntax-studio/page.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx` (MODIFY)
  - `src/components/features/tactical-unified/canvas/PilotCanvas.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-pitch-canvas.tsx` (MODIFY)
  - `.agents/guardrails-baseline.json` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/app/export/share/[shareId]/page.tsx`（472行・`'use client'`）等の App Router `page.tsx` からクライアント実装を `src/features/` 配下の Feature View へ抽出し、すべての `page.tsx` を 50行以下の Server Component（`'use client'` なし）にする。
- [ ] 2. 純粋な `.ts` ファイル（45件）に付与された不要な `'use client'` を除去し、`.agents/guardrails-baseline.json` の `useClientViolations` を 0 件にする。
- [ ] 3. `setIsMounted(true)` ハック（2件）および Props を State にコピーして `useEffect` で同期するアンチパターン（`top-bar-title.tsx`）を React 19 規約（`next/dynamic` / `key` リセット）に従って解消する。
- [ ] 4. 残存する `React.FC`（52ファイル）および `forwardRef`（3ファイル）を標準の関数宣言 + `interface XxxProps`（React 19 `ref` prop）に置き換え、`reactFc` ベースラインを 0 件にする。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```tsx
// Next.js 16 Server Component page.tsx
import { SharedExportView } from '@/features/tactical-unified/components/shared-export-view';
```

### 3.2 Key Interfaces & Types
```tsx
interface SharePageProps {
  params: Promise<{ shareId: string }>;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
export default async function SharePage({ params }: SharePageProps) {
  const { shareId } = await params;
  return <SharedExportView shareId={shareId} />;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: App Router page.tsx 3件の Server Component 薄層化と useEffect アンチパターン3件の解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/app/export/page.tsx`, `src/app/export/share/[shareId]/page.tsx`, `src/app/syntax-studio/page.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx`, `src/components/features/tactical-unified/canvas/PilotCanvas.tsx`, `src/components/features/syntax-studio/syntax-pitch-canvas.tsx`
- **契約 (Interface)**:
  ```tsx
  // page.tsx は 50 行以下の Server Component とし、Feature View へ分割
  ```
- **Testing Strategy**: `bun run ai:check` が PASS すること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: 純粋 .ts ファイル 45件からの不要な 'use client' 除去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `src/features/**/hooks/*.ts`, `extension/**/*.ts`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```ts
  // guardrails-baseline.json の useClientViolations を空配列にする
  ```
- **Testing Strategy**: `bun .agents/scripts/lib/code-guardrails.ts --write-baseline` で `useClientViolations` が 0 件になること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 3: React.FC (52件) と forwardRef (3件) の関数宣言・React 19 ref prop への統一
- **Worker Model**: `flash`
- **対象ファイル**: `extension/features/**/*.tsx`, `src/components/**/*.tsx`, `src/features/**/*.tsx`, `.agents/guardrails-baseline.json`
- **契約 (Interface)**:
  ```tsx
  // guardrails-baseline.json の reactFc を空配列にする
  ```
- **Testing Strategy**: `bun .agents/scripts/lib/code-guardrails.ts --write-baseline` で `reactFc` が 0 件になること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [ ] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:

## 6. Rejections / Additional Tasks (不可逆修正欄)
