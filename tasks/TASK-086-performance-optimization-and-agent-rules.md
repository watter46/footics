# TASK-086: performance-optimization-and-agent-rules

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/lib/query-keys.ts` (MODIFY)
  - `src/features/analysis/hooks/use-events.ts` (MODIFY)
  - `src/features/analysis/hooks/__tests__/use-events.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `.agents/rules/data-access.md` (MODIFY)
  - `.agents/rules/react-nextjs.md` (MODIFY)
  - `.agents/skills/react-konva/SKILL.md` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `eventKeys.byMatch(matchId)` が定義され、生イベント取得クエリキーとして使用されること
- [x] 2. `useEvents` が生データを `byMatch(matchId)` でキャッシュし、`filterEvents` はオンメモリ（`useMemo`）で実行されること（フィルター変更時に Dexie 再フェッチが発生しない）
- [x] 3. `PitchGroundLayer` および `BillboardObjectLayer` が `React.memo` 化され、プレビュー・選択枠操作時の巻き添え再描画が遮断されること
- [x] 4. `CanvasStageContainer` および `PitchGroundLayer` の無依存配列 `useEffect` が適切に修正されること
- [x] 5. `data-access.md`, `react-nextjs.md`, `SKILL.md` に生キャッシュ・オンメモリ派生および高頻度イベント再描画局所化の規約が明文化されること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { eventKeys } from '@/lib/query-keys';
import { filterEvents } from '@/services/event-filter';
import { memo } from 'react';
```

### 3.2 Key Interfaces & Types
```ts
// src/lib/query-keys.ts
export const eventKeys = {
  all: ['events'] as const,
  byMatch: (matchId: string) => [...eventKeys.all, 'by-match', matchId] as const,
  filtered: (filters: FilterState | Record<string, unknown>) => [...eventKeys.all, 'filtered', filters] as const,
};
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// useNationalDashboard におけるオンメモリ分離の成功パターン
const { data: rawEvents = [] } = useQuery({ queryKey: eventKeys.byMatch(matchId), queryFn: () => getEventsByMatch(matchId) });
const filteredEvents = useMemo(() => filterEvents(allEvents, filters), [allEvents, filters]);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合イベント取得の最適化とテスト更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/query-keys.ts`, `src/features/analysis/hooks/use-events.ts`, `src/features/analysis/hooks/__tests__/use-events.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function useEvents(matchId: string, filters: FilterState): UseEventsResult;
  ```
- **Testing Strategy**: `src/features/analysis/hooks/__tests__/use-events.test.tsx` で `eventKeys.byMatch(matchId)` の利用とフィルタ変更時の再取得ゼロを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/analysis/hooks/__tests__/use-events.test.tsx` ➔ `query-keys.ts` と `use-events.ts` を修正 ➔ `bun run ai:check src/features/analysis/hooks/use-events.ts` PASS
- **Worker Handoff Log**:
  - `eventKeys.byMatch(matchId)` を追加し、`useEvents` 内で生データキャッシュ化。`filterEvents` を `useMemo` によるオンメモリ実行へ切り替え、フィルタ変更時の Dexie 再フェッチを根絶。

---

### Phase 2: 戦術ボード描画の局所化・メモ化
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
- **契約 (Interface)**:
  ```ts
  export const PitchGroundLayer = memo(function PitchGroundLayer(...));
  export const BillboardObjectLayer = memo(function BillboardObjectLayer(...));
  ```
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. `PitchGroundLayer` と `BillboardObjectLayer` を `memo` 化し、`sortedItems` の `useMemo` 依存関係を整理。
  - [x] 2. `CanvasStageContainer.tsx:145` と `PitchGroundLayer.tsx:67` の無依存 `useEffect` に適切な依存配列を指定。
  - [x] 3. `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx` PASS
- **Worker Handoff Log**:
  - `PitchGroundLayer` と `BillboardObjectLayer` を `memo` 化し、`sortedItems` の `useMemo` 依存関係を整理。無依存 `useEffect` に `[nodesRegistryRef]` および `[nodesRegistryRef, vRect]` を設定。五層構造テスト18件PASS。

---

### Phase 3: エージェント層の性能規約追加
- **Worker Model**: `flash`
- **対象ファイル**: `.agents/rules/data-access.md`, `.agents/rules/react-nextjs.md`, `.agents/skills/react-konva/SKILL.md`
- **契約 (Interface)**:
  - `data-access.md`: 「生データキャッシュとオンメモリ導出の分離」項目追加
  - `react-nextjs.md`: 「高頻度イベント再描画の局所化・メモ化」項目追加
  - `react-konva/SKILL.md`: 「レイヤー単位の再描画遮断（memo化）」項目追加
- **Testing Strategy**: `bun test ./.agents` でフック・構文検証。
- **Tasks**:
  - [x] 1. 3つのルール・スキル文書に性能基準を追記。
  - [x] 2. `bun test ./.agents` PASS
- **Worker Handoff Log**:
  - `data-access.md` に生キャッシュ・オンメモリ派生規約、`react-nextjs.md` に高頻度再描画遮断と無依存useEffect禁止、`react-konva/SKILL.md` にレイヤーmemo化を追記。全161件のエージェントテストPASS。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 01:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  4大定性監査（6大設計品質原則）を完全クリア。試合イベントの生データキャッシュ・オンメモリ派生分離、Konva レイヤーの `React.memo` 化および無依存 `useEffect` の是正、エージェント性能規約の明文化が完璧に実装されています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
