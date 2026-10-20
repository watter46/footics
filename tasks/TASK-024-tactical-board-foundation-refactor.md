# TASK-024: 戦術ボード基盤の最適化と新ライブラリ導入

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-20
- **Target Files**:
  - `src/lib/id.ts` (NEW)
  - `src/features/tactical-unified/stores/store-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-store.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-shortcuts.ts` (NEW)
  - `src/features/tactical-unified/hooks/use-slide-timeline.ts` (NEW)
  - `src/features/tactical-unified/components/tactical-unified-board.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `nanoid` を用いたユニークID生成ヘルパー `generateId()` が提供され、プレフィックス付きIDが生成できること。
- [x] 2. `immer` (`produce`) による不変更新ヘルパーが導入され、深いスプレッド構文なしで `Slide` およびアノテーションが安全に更新できること。
- [x] 3. `zundo`（`temporal`）による履歴管理基盤が導入され、既存の `selectCanUndo`/`selectCanRedo` および `undo`/`redo` が正常に機能すること。
- [x] 4. `react-hotkeys-hook` (`useHotkeys`) による宣言的ショートカットフック `useTacticalShortcuts` が提供され、入力フォームフォーカス時は安全に抑止されること。
- [x] 5. `gsap` / `@gsap/react` によるアニメーション・シーク制御フック `useSlideTimeline` が提供され、メモリリークなしにクリーンアップされること。
- [x] 6. 3Dチルト・透視投影関連（`pitchTransform`）コードには一切手を加えないこと。
- [x] 7. 全件の型チェック、Lint、Vitest テストが PASS すること（`bun run ai:check`）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { nanoid } from 'nanoid';
import { produce } from 'immer';
import { temporal } from 'zundo';
import { useHotkeys } from 'react-hotkeys-hook';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Slide, TacticalProject, ArrowAnnotation } from '@/lib/types/tactical-unified';
import { isInputFocused } from '@/lib/shortcuts';
```

### 3.2 Key Interfaces & Types
```ts
export type IdGenerator = (prefix?: string) => string;

export interface TacticalShortcutsOptions {
  undo?: () => void;
  redo?: () => void;
  deleteSelected?: () => void;
  clearSelection?: () => void;
  enabled?: boolean;
}

export interface SlideTimelineOptions {
  durationMs: number;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
}
```

### 3.3 Reference Pattern
```ts
// 不変更新ヘルパー (Immer)
export const updateSlideWithImmer = (
  project: TacticalProject,
  slideId: string,
  recipe: (draft: Slide) => void,
): TacticalProject =>
  produce(project, (draft) => {
    const slide = draft.slides.find((s) => s.id === slideId);
    if (slide) recipe(slide);
  });
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: nanoid ID生成 & Immer 不変更新ヘルパー
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/id.ts`, `src/lib/__tests__/id.test.ts`, `src/features/tactical-unified/stores/store-helpers.ts`, `src/features/tactical-unified/stores/__tests__/store-helpers.test.ts`
- **契約 (Interface)**:
  `export function generateId(prefix?: string): string;`
  `export function updateSlideImmer(project: TacticalProject, slideId: string, recipe: (draft: Slide) => void): TacticalProject;`
- **Testing Strategy**:
  `src/lib/__tests__/id.test.ts` で一意性とプレフィックス生成を検証。
  `src/features/tactical-unified/stores/__tests__/store-helpers.test.ts` でイミュータブルなスライド更新を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `generateId(prefix?)` (`src/lib/id.ts`) と `updateSlideImmer(project, slideId, recipe)` (`src/features/tactical-unified/stores/store-helpers.ts`) を実装しテスト完了。

---

### Phase 2: Zundo 統合と Undo / Redo 履歴基盤
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/tactical-unified-store.ts`, `src/features/tactical-unified/stores/tactical-unified-selectors.ts`, `src/features/tactical-unified/stores/__tests__/history.test.ts`
- **契約 (Interface)**:
  Zustand ストアに `temporal` ミドルウェアを適用（または互換ラッパー）。
  `selectCanUndo(state)`, `selectCanRedo(state)` およびストアの `undo`, `redo` の後方互換性維持。
- **Testing Strategy**:
  `src/features/tactical-unified/stores/__tests__/history.test.ts` で undo / redo / canUndo / canRedo の振る舞いを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `temporal`（zundo）ミドルウェアを `useTacticalUnifiedStore` に適用し、後方互換セレクタ・アクションを維持したまま `useTacticalUnifiedStore.temporal` を公開。


---

### Phase 3: react-hotkeys-hook 宣言的ショートカット
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-tactical-shortcuts.ts`, `src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx`
- **契約 (Interface)**:
  `export function useTacticalShortcuts(options: TacticalShortcutsOptions): void;`
  入力欄フォーカス（`isInputFocused()`）時はショートカットを自動スキップ。
- **Testing Strategy**:
  `src/features/tactical-unified/hooks/__tests__/use-tactical-shortcuts.test.tsx` で各キー（mod+z, delete等）の発火と入力時抑止を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `useTacticalShortcuts` フックを `react-hotkeys-hook` で実装。mod+z, mod+shift+z, delete/backspace, escape の宣言的ハンドリングおよび入力フォーカス抑止を検証。


---

### Phase 4: GSAP タイムライン・アニメーション制御基盤
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/use-slide-timeline.ts`, `src/features/tactical-unified/hooks/__tests__/use-slide-timeline.test.ts`
- **契約 (Interface)**:
  `export function useSlideTimeline(options: SlideTimelineOptions): { play: () => void; pause: () => void; seek: (progress: number) => void; kill: () => void; };`
- **Testing Strategy**:
  `src/features/tactical-unified/hooks/__tests__/use-slide-timeline.test.ts` で play/pause/seek およびクリーンアップ（kill）を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `useSlideTimeline` フックを GSAP timeline を用いて実装。play/pause/seek/progress 管理とアンマウント時のキル処理をテスト検証。


---

### Phase 5: コンポーネント統合と回帰検証
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/components/tactical-unified-board.tsx`, `src/features/tactical-unified/stores/annotation-slice.ts`
- **契約 (Interface)**:
  各 Phase の新基盤（nanoid, Immer, Zundo, Shortcuts, GSAP）をボードおよび関連スライスに結合。
- **Testing Strategy**:
  `bun run ai:check` で戦術ボード関連および全体のテスト・型・リントを検証。
- **Tasks**:
  - [x] 1. 結合実装と全検証通過: `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `slide-helpers.ts` に `generateId` を統合し、`annotation-slice.ts` に `updateSlideImmer` を適用。全12対象ファイルの Biome/TypeScript/Vitest (`ai:check`) 全件合格を確認。


---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: 1ファイル250行以内に収まり、OCPが守られているか
  - [x] サイレント破壊防止: 3Dチルトに触れていないか、既存セレクタの後方互換性が維持されているか
- **Summary**:
  - 4大定性監査すべて合格。nanoid, Immer, Zundo, react-hotkeys-hook, GSAP タイムライン基盤が健全に導入され、3Dチルト非接触および既存後方互換性が維持されていることを確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
