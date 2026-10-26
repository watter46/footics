# TASK-067: [Level 2-B] App Router page.tsx (4件) の Server Component 薄層化と useEffect アンチパターン解消

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/app/export/page.tsx` (MODIFY)
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/app/syntax-studio/page.tsx` (MODIFY)
  - `src/app/test/pitch-aspect/page.tsx` (MODIFY)
  - `src/features/tactical-unified/components/export-page-view.tsx` (NEW)
  - `src/features/tactical-unified/components/shared-export-view.tsx` (NEW)
  - `src/components/features/syntax-studio/syntax-studio-view.tsx` (NEW)
  - `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx` (MODIFY)
  - `src/components/features/tactical-unified/canvas/PilotCanvas.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-pitch-canvas.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. `src/app/export/page.tsx`, `src/app/export/share/[shareId]/page.tsx`（473行）, `src/app/syntax-studio/page.tsx`, `src/app/test/pitch-aspect/page.tsx` から `'use client'` とクライアント実装を Feature View コンポーネントへ抽出し、すべての `page.tsx` を 50行以下の Server Component にする（各抽出先ファイルも 300行以下に収めること）。
- [ ] 2. `PilotCanvas.tsx` と `syntax-pitch-canvas.tsx` の `setIsMounted(true)` ハックを解消し、同時に `syntax-pitch-canvas.tsx` の `React.FC` を通常の関数宣言に置換する。
- [ ] 3. `top-bar-title.tsx` で Props を State にコピーして `useEffect` で同期しているアンチパターンを、編集開始時の初期化または `key` リセット方式に修正する。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```tsx
import { SharedExportView } from '@/features/tactical-unified/components/shared-export-view';
```

### 3.2 Key Interfaces & Types
```tsx
interface SharePageProps {
  params: Promise<{ shareId: string }>;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```tsx
// Next.js 16 規約により page.tsx の params は Promise として await するかクライアント View へ渡す。
// 抽出した shared-export-view.tsx が 300行を超えないよう、サブパーツやカスタムフックに適切に分割すること。
// 並列実行時の競合防止のため、.agents/guardrails-baseline.json は編集しないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: App Router page.tsx 4件の Server Component 薄層化と View 抽出
- **Worker Model**: `flash`
- **対象ファイル**: `src/app/export/page.tsx`, `src/app/export/share/[shareId]/page.tsx`, `src/app/syntax-studio/page.tsx`, `src/app/test/pitch-aspect/page.tsx`, `src/features/tactical-unified/components/export-page-view.tsx`, `src/features/tactical-unified/components/shared-export-view.tsx`, `src/components/features/syntax-studio/syntax-studio-view.tsx`
- **契約 (Interface)**:
  ```tsx
  export default async function SharePage({ params }: SharePageProps)
  ```
- **Testing Strategy**: `bun run ai:check` で型検査・Lint・既存テストが PASS し、新規ファイルが 300行以下であること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:

### Phase 2: useEffect アンチパターン 3 件（setIsMounted / Props→State 同期）の解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/toolbar/top-bar-title.tsx`, `src/components/features/tactical-unified/canvas/PilotCanvas.tsx`, `src/components/features/syntax-studio/syntax-pitch-canvas.tsx`
- **契約 (Interface)**:
  ```tsx
  export function TopBarTitle(props: TopBarTitleProps)
  export function SyntaxPitchCanvas(props: SyntaxPitchCanvasProps)
  ```
- **Testing Strategy**: `bun run ai:check` で対象ファイルの検査と関連テストが PASS すること。
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
