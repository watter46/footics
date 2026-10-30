# TASK-115: 画面枠（Level 4）の純粋化と表示チラつき（Flicker）の完全根絶

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/app/tactical/tactical-client-page.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts` (MODIFY)
  - `src/app/tactical/__tests__/tactical-page.test.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/dnd-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `use-tactical-match-init.ts` に純粋解決関数 `resolveMatchInitialState(matchId, minute)` と `UseTacticalMatchInitOptions.injectToStore?: boolean`・`UseTacticalMatchInitResult.initialState?: Partial<TacticalUnifiedState>` を実装し、グローバルストアを汚染せず `TacticalUnifiedStoreProvider` 注入用の初期状態を生成できること。
- [x] 2. `tactical-client-page.tsx`（Level 4 最上位枠）で `TacticalUnifiedPage` マウント前に `useTacticalMatchInit({ initialMatchId, initialMinute, injectToStore: false })` を実行し、解決完了までダーク背景シェル（`data-testid="tactical-init-loading"`）を表示した上で、確定した `initialState` を `TacticalUnifiedPage` に一発注入すること（Zero-Flicker）。
- [x] 3. `tactical-unified-page.tsx` からマウント後の `useTacticalMatchInit` 呼び出しを撤去し、`initialState?.project` 注入時は `useTacticalAutoSave` に `skipRestore: true` を渡して二重復元によるチラつきを防止すること。
- [x] 4. `tactical-unified-page.tsx` に直書きされていた `\` キーによる集中モード切替（`window.addEventListener('keydown', ...)`）を `use-tactical-shortcuts.ts` の `toggleFocusMode?: () => void` へ移管し、また低レベルな DnD ドロップ座標・選手ID解決処理を `dnd-coordinates.ts` の `handleTacticalDndEnd` へ分離して、画面枠（Level 4）をデータ受け渡しと配置のみの純粋な枠組みにすること（SLAP / Shell Purity）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// Phase 1: src/features/tactical-unified/hooks/use-tactical-match-init.ts
import { updateSlideInProject } from '@/features/tactical-unified/stores/store-helpers';
import type {
  TacticalUnifiedState,
  TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreApi } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { db } from '@/lib/db';
import { buildMatchTacticalPlayers } from '@/lib/tactical/match-to-tactical-bridge';
import { loadActiveProjectFromDb } from '@/lib/tactical/tactical-storage';
import {
  createDefaultProject,
  ensureTacticalProject,
} from '@/lib/types/tactical-unified';

// Phase 2: src/features/tactical-unified/tactical-unified-page.tsx
import { handleTacticalDndEnd } from '@/features/tactical-unified/core/utils/dnd-coordinates';
import { useTacticalShortcuts } from '@/features/tactical-unified/hooks/use-tactical-shortcuts';
```

### 3.2 Key Interfaces & Types
```ts
// Phase 1: src/features/tactical-unified/hooks/use-tactical-match-init.ts
export interface UseTacticalMatchInitOptions {
  initialMatchId?: string;
  initialMinute?: number;
  injectToStore?: boolean;
}

export interface UseTacticalMatchInitResult {
  isLoading: boolean;
  hasMatchQuery: boolean;
  matchId: string | null;
  initialState?: Partial<TacticalUnifiedState>;
  error: Error | null;
}

export async function resolveMatchInitialState(
  matchId: string,
  minute: number,
): Promise<Partial<TacticalUnifiedState> | undefined>;

// Phase 2: src/features/tactical-unified/hooks/use-tactical-shortcuts.ts
export interface TacticalShortcutsOptions {
  undo?: () => void;
  redo?: () => void;
  deleteSelected?: () => void;
  clearSelection?: () => void;
  toggleFocusMode?: () => void;
  enabled?: boolean;
}

// Phase 2: src/features/tactical-unified/core/utils/dnd-coordinates.ts
import type { DragEndEvent } from '@dnd-kit/core';

export interface TacticalDndEndHandlers {
  activeSlideId: string;
  movePlayerToPitch: (
    slideId: string,
    playerId: string,
    x: number,
    y: number,
  ) => void;
  movePlayerToBench: (slideId: string, playerId: string) => void;
}

export function handleTacticalDndEnd(
  event: DragEndEvent,
  handlers: TacticalDndEndHandlers,
): void;
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. resolveMatchInitialState(matchId, minute) の仕様:
//    - db.matches.get(matchId) が存在しない場合は undefined を返す。
//    - loadActiveProjectFromDb(String(match.id)) が存在する場合は ensureTacticalProject(saved) を用いて
//      { project: normalized, activePhaseId: normalized.activePhaseId, activeSlideId: normalized.activeSlideId, pitchFitPending: false } を返す。
//    - 保存済みがない場合は createDefaultProject(crypto.randomUUID()) をベースに buildMatchTacticalPlayers で22選手とフォーメーションを生成し、
//      activeSlideId の players と matchId / matchFormations / title を設定した updatedProject を ensureTacticalProject で正規化して同形式の initialState を返す。
// 2. useTacticalMatchInit の後方互換性:
//    - injectToStore のデフォルトは true とし、injectToStore !== false かつ resolvedState?.project が存在する場合は storeApi.getState().loadProject(resolvedState.project) も呼ぶこと。
//    - injectToStore: false の場合（TacticalClientPage から呼ぶ場合）は storeApi を一切変更せず initialState のみ返却すること。
// 3. useTacticalShortcuts の '\' キー対応と RAII:
//    - useEffect で window.addEventListener('keydown', handleKeyDown) を登録し、cleanup で必ず removeEventListener すること。
//    - enabled === false、または isInputFocused() / HTMLInputElement / HTMLTextAreaElement / isContentEditable フォーカス中は発火させないこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 試合データの事前解決（`use-tactical-match-init.ts`）と `tactical-client-page.tsx` での初期状態一発注入
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts`
  - `src/app/tactical/tactical-client-page.tsx`
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`
  - `src/app/tactical/__tests__/tactical-page.test.tsx`
- **契約 (Interface)**:
  - `use-tactical-match-init.ts` に `resolveMatchInitialState` を export し、`useTacticalMatchInit` が `initialState` を返却するように拡張する（`injectToStore: false` 指定時はストアへの直接注入を行わない）。
  - `tactical-client-page.tsx` で `useTacticalMatchInit({ initialMatchId, initialMinute, injectToStore: false })` を呼び出し、`isLoading` 中は `<div data-testid="tactical-init-loading" className="h-[100dvh] w-screen bg-[#0D0D0E]" />` を返し、完了後に `<TacticalUnifiedPage initialMatchId={matchId ?? initialMatchId} initialMinute={initialMinute} initialState={initialState} />` を描画する。
- **Testing Strategy**:
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts`: `injectToStore: false` 指定時にグローバルストアを変更せず `result.current.initialState?.project?.matchId` に `'999'` と22選手が解決されることを検証する。
  - `src/app/tactical/__tests__/tactical-page.test.tsx`: `matchId` 指定時の非同期解決待ち（`await screen.findByTestId('tactical-page-mock')`）に対応させ、`TacticalClientPage` が `db.matches.get` から解決した `initialState` を `TacticalUnifiedPage` に渡すテストを追加する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-tactical-match-init.ts src/app/tactical/tactical-client-page.tsx src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts src/app/tactical/__tests__/tactical-page.test.tsx` PASS
- **Worker Handoff Log**:
  - export `resolveMatchInitialState(matchId, minute)`: Dexie より試合または既存プロジェクトを解決し `Partial<TacticalUnifiedState>` を生成。
  - `useTacticalMatchInit` に `injectToStore?: boolean` と `initialState` を追加し、`TacticalClientPage` 側で事前解決（`injectToStore: false`）＆ダーク背景ローディングシェル経由で確定注入（Zero-Flicker）を実現。

### Phase 2: 画面枠（`tactical-unified-page.tsx`）の純粋化とショートカット・DnD低レベル処理の分離
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-tactical-shortcuts.ts`
  - `src/features/tactical-unified/core/utils/dnd-coordinates.ts`
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
- **契約 (Interface)**:
  - `use-tactical-shortcuts.ts` の `TacticalShortcutsOptions` に `toggleFocusMode?: () => void` を追加し、`\` キー押下時に発火させる（RAII クリーンアップ・入力欄フォーカス除外付き）。
  - `dnd-coordinates.ts` に `handleTacticalDndEnd(event, handlers)` を export し、ポインタ/タッチ座標抽出・ピッチ正規化座標計算・ベンチドロップ時の `playerId` 解決をカプセル化する。
  - `tactical-unified-page.tsx` から `useTacticalMatchInit` 呼び出し、直書きの `useEffect`（`\` キー監視）、およびインラインの `handleDndEnd` 座標計算ロジックを撤去し、`useTacticalShortcuts` と `handleTacticalDndEnd` の呼び出しに置き換える。また `useTacticalAutoSave` に `skipRestore: Boolean(initialState?.project)` を渡す。
- **Testing Strategy**:
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx`: `\` キー押下で `toggleFocusMode` が呼ばれること、および input フォーカス中や `enabled: false` 時は呼ばれないことを検証する。
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`: `TacticalUnifiedPage` 上で `\` キー押下により集中モードが切り替わること、および `initialState` で注入したプロジェクトが初期描画から即座に反映されることを検証する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/hooks/use-tactical-shortcuts.ts src/features/tactical-unified/core/utils/dnd-coordinates.ts src/features/tactical-unified/tactical-unified-page.tsx src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` PASS
- **Worker Handoff Log**:
  - `useTacticalShortcuts` に `toggleFocusMode` オプション（RAII event listener）を追加し、`dnd-coordinates.ts` に `handleTacticalDndEnd` をカプセル化。
  - `TacticalUnifiedPage` から `useTacticalMatchInit` を完全撤去し、`initialState?.project` に基づく `skipRestore` と純粋な枠組み（Shell Purity）を実現。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 12:28
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Level 4 枠の純粋化（Shell Purity）、事前解決による Zero-Flicker、二重復元防止（skipRestore）、RAII ショートカット移管、低レベル DnD 処理の SLAP 分離を完全達成。200行制限もクリアし、4大定性監査の受入要件を満たしていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
