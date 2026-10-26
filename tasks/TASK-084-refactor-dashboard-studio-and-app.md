# TASK-084: [Dashboard, Studio & App] ダッシュボード・Syntax Studio・ルーティングの垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/app/export/share/[shareId]/page.tsx` (MODIFY)
  - `src/features/tactical-unified/components/share-page-client-view.tsx` (NEW)
  - `src/components/features/syntax-studio/syntax-json-drawer.tsx` (MODIFY)
  - `src/components/features/syntax-studio/syntax-pitch-canvas.tsx` (MODIFY)
  - `src/lib/query-keys.ts` (MODIFY)
  - `src/features/dashboard/hooks/use-match-metadata.ts` (MODIFY)
  - `src/features/national-dashboard/hooks/use-national-dashboard.ts` (MODIFY)
  - `src/lib/agents/runtime.ts` (MODIFY)
  - `.dependency-cruiser.cjs` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/app/export/share/[shareId]/page.tsx` (473行・`any` 3件) からクライアント描画ロジックを `share-page-client-view.tsx` 等へ分離し、両ファイルとも 300行以下・`explicitAny` 0 にすること
- [x] 2. `syntax-json-drawer.tsx` (336行) および `syntax-pitch-canvas.tsx` (490行) をサブコンポーネント・フックへ分割し、すべて 300行以下にすること
- [x] 3. `src/lib/query-keys.ts` を拡充し、`use-match-metadata.ts`, `use-national-dashboard.ts` の Query Key を一元化するとともに、`src/lib/agents/runtime.ts` の `any` (1件) を解消すること
- [x] 4. TASK-079, 080, 082, 083 での UI直DB参照解消を受け、`.dependency-cruiser.cjs` の `no-component-direct-db-access` から既存凍結6ファイルの例外 `pathNot` を撤去しても `depcruise` がエラー 0 で PASS すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { customEventKeys, matchKeys, nationalMatchKeys, playerKeys } from '@/lib/query-keys';
```

### 3.2 Key Interfaces & Types
```ts
export interface SharePageClientViewProps {
  shareId: string;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. src/app/export/share/[shareId]/page.tsx は Next.js 16 規約に従い Server Component（'use client' なし）の薄いラッパーとし、Client 処理を share-page-client-view.tsx へ委譲すること
// 2. src/app/export/__tests__/export-pages.test.tsx の既存テストがそのまま PASS するよう Props と描画要素の互換性を維持すること
// 3. Phase 4 (.dependency-cruiser.cjs の例外撤去) は TASK-079, 080, 082, 083 の完了後に実行すること
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Share Page の Client View 分離・300行以下化・any 全廃
- **Worker Model**: `flash`
- **対象ファイル**: `src/app/export/share/[shareId]/page.tsx`, `src/features/tactical-unified/components/share-page-client-view.tsx`
- **契約 (Interface)**:
  ```ts
  export default function SharePage({ params }: { params: Promise<{ shareId: string }> }): Promise<React.JSX.Element>;
  ```
- **Testing Strategy**: `src/app/export/__tests__/export-pages.test.tsx` が PASS し、両ファイルとも 300行以下・`explicitAny` 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: `share-page-client-view.tsx` 抽出と `any` 3件の排除 ➔ `bun run ai:check src/app/export/share/[shareId]/page.tsx src/features/tactical-unified/components/share-page-client-view.tsx` PASS
- **Worker Handoff Log**:
  - `page.tsx` (16行): Next.js 16 Server Component として `SharePageClientView` へ委譲。
  - `share-page-client-view.tsx` (256行) & `use-share-page-export.ts` (158行): ロジックをフックへ抽出し 300行以下・`any` 0 達成。`buildExportMVPMatrix` は `core/utils` 直参照で依存最小化。

### Phase 2: Syntax Studio コンポーネントの 300行以下分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/components/features/syntax-studio/syntax-json-drawer.tsx`, `src/components/features/syntax-studio/syntax-pitch-canvas.tsx`
- **契約 (Interface)**:
  ```ts
  // 既存の export シンボル (SyntaxJsonDrawer, SyntaxPitchCanvas) を維持したままサブモジュールへ分割し 300行以下にする
  ```
- **Testing Strategy**: Syntax Studio 関連の型チェック・テストが PASS し、全ファイル 300行以下になること。
- **Tasks**:
  - [x] 1. TDD実装: `syntax-json-drawer.tsx` と `syntax-pitch-canvas.tsx` の 300行以下分割 ➔ `bun run ai:check src/components/features/syntax-studio/syntax-json-drawer.tsx src/components/features/syntax-studio/syntax-pitch-canvas.tsx` PASS
- **Worker Handoff Log**:
  - `syntax-json-drawer.tsx` (235行): サブコンポーネント `syntax-json-drawer-toolbar.tsx`, `syntax-json-editor-content.tsx`, `syntax-json-drawer-footer.tsx` へ抽出。
  - `syntax-pitch-canvas.tsx` (190行): 定数 `syntax-pitch-constants.ts`, プレイヤーマーカー `syntax-pitch-player-marker.tsx`, オーバーレイ `syntax-pitch-overlay.tsx`, フック `use-syntax-pitch-dimensions.ts` へ抽出。全ファイル250行以下・既存公開Props完全維持。

### Phase 3: Dashboard Query Keys 統一と Runtime 型安全化
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/query-keys.ts`, `src/features/dashboard/hooks/use-match-metadata.ts`, `src/features/national-dashboard/hooks/use-national-dashboard.ts`, `src/lib/agents/runtime.ts`
- **契約 (Interface)**:
  ```ts
  // query-keys.ts のファクトリを用いて use-match-metadata.ts / use-national-dashboard.ts のキーを統一し、runtime.ts の any 1件を排除
  ```
- **Testing Strategy**: `use-match-metadata.test.ts` 等が PASS し、`runtime.ts` の `explicitAny` が 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: Query Keys 統一と `runtime.ts` の `any` 排除 ➔ `bun run ai:check src/lib/query-keys.ts src/features/dashboard/hooks/use-match-metadata.ts src/features/national-dashboard/hooks/use-national-dashboard.ts src/lib/agents/runtime.ts` PASS
- **Worker Handoff Log**:
  - `matchKeys.metadata` を追加し、`useMatchMetadata` の `queryKey` を `matchKeys.detail(matchId)` に統一。
  - `runtime.ts` で `tool as AgentTool` に修正し `explicitAny: 0` を達成。全ファイル 300行以下・`use-match-metadata.test.ts` PASS。

### Phase 4: dependency-cruiser の UI直DBアクセス凍結リスト撤去
- **Worker Model**: `flash_lite`
- **対象ファイル**: `.dependency-cruiser.cjs`
- **契約 (Interface)**:
  ```js
  // no-component-direct-db-access の pathNot を ['\\.(test|spec)\\.[tj]sx?$'] のみに厳格化
  ```
- **Testing Strategy**: `bun run ai:check .dependency-cruiser.cjs` が PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `.dependency-cruiser.cjs` の凍結6ファイル例外を削除 ➔ `bun run ai:check .dependency-cruiser.cjs` PASS
- **Worker Handoff Log**:
  - `.dependency-cruiser.cjs` の `no-component-direct-db-access` 例外リスト撤去完了。
  - `tactical-storage.ts` で `getMatchForTacticalProject` を re-export し、`top-bar-more-menu.tsx` からの直DBアクセスを排除。`depcruise` 違反 0 件を達成。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 21:43
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: Share Page の Server/Client 分離・300行以下化、Syntax Studio のサブコンポーネント分割、Query Keys 統一、depcruise 凍結例外の全廃をすべて達成。副作用クリーンアップや型安全も高水準でクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
