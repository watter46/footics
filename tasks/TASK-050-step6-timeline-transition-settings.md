# TASK-050: step6-timeline-transition-settings

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/stores/slide-transition-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts` (NEW)
  - `src/lib/tactical/unified-interpolation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-video-morphing-config.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/slide-card.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-context-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx` (NEW)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 単一トランザクションの一括更新: `updateAllSlideTransitions(params)` を `SlideTransitionSlice` に追加し、1回の Undo で全シーンの設定が復元できること。`useVideoMorphingConfig` のループ更新をこれに置き換えること。
- [x] 2. 到着先シーン基準の補間・再生時間統一: `unified-interpolation.ts` の `getInterpolatedUnifiedSlideFrame` および `calculateUnifiedTotalDuration` を「到着先スライド（`slides[i+1]`）」基準に統一し、`playback-controls.tsx` の表示時間と実再生時間を100%一致させること（スライド1枚時は0.0s、2枚目以降はそのシーンへの移動時間＋静止時間を加算）。
- [x] 3. 個別シーン設定ポップオーバー (`SlideTransitionPopover`): シーンカードの時間表示クリック、ホバー時の設定アイコン、右クリックメニュー「トランジション設定...」から `@floating-ui/react` でポップオーバーを開閉でき、移動時間（0.1s〜10.0s）、静止時間（0.0s〜5.0s）、加減速（等速・滑らか・加速・減速）を変更できること（Scene 1は移動時間を無効表示）。
- [x] 4. 全シーン一括設定ポップオーバー (`BatchTransitionPopover`): タイムラインバー右側に「一括設定」ボタンを配置し、ポップオーバーからプロジェクト内全シーンの移動時間・静止時間・イージングを一括変更できること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { flip, offset, shift, useFloating } from '@floating-ui/react';
import type { Slide, Easing } from '@/lib/types/tactical-unified';
import { calculateUnifiedTotalDuration } from '@/lib/tactical/unified-interpolation';
```

### 3.2 Key Interfaces & Types
```ts
export interface SlideTransitionParams {
  transitionDurationMs?: number;
  pauseMs?: number;
  easing?: Easing;
}

export interface SlideTransitionSlice {
  updateSlideTransition: (slideId: string, params: SlideTransitionParams) => void;
  updateAllSlideTransitions: (params: SlideTransitionParams) => void;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. DndKit干渉防止: ポップオーバーやトリガーの onClick / onPointerDown には必ず e.stopPropagation() を付与
// 2. Scene 1(先頭スライド)の扱い: 到着基準のため移動時間は存在しない (disabled 表示)。静止時間 (pauseMs) のみ編集可能
// 3. 総時間単一真実源: playback-controls.tsx での個別 reduce を廃止し calculateUnifiedTotalDuration(slides) を参照
// 4. Easing 4種: 'linear' (等速), 'ease-in-out' (滑らか), 'ease-in' (加速), 'ease-out' (減速)
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ストア一括更新 ＆ 到着基準の補間・総再生時間統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/slide-transition-slice.ts`, `src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts`, `src/lib/tactical/unified-interpolation.ts`, `src/features/tactical-unified/panels/export/use-video-morphing-config.ts`, `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
- **契約 (Interface)**:
  ```ts
  // updateAllSlideTransitions: 単一 recordHistory で全スライドを一括更新
  updateAllSlideTransitions: (params: SlideTransitionParams) => void;
  // calculateUnifiedTotalDuration: slides.length <= 1 ? 0 : slides.slice(1).reduce(...)
  export function calculateUnifiedTotalDuration(slides: Slide[]): number;
  ```
- **Testing Strategy**: `slide-transition-slice.test.ts` で一括更新と1手Undo復元を検証。`playback-controls.tsx` で1スライド時0.0s、2スライド時に対象時間の正確な表示を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/stores/__tests__/slide-transition-slice.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/stores/slide-transition-slice.ts` PASS
- **Worker Handoff Log**:
  - Exported `SlideTransitionParams` & implemented `updateAllSlideTransitions` in single history step with full undo support.
  - Unified `calculateUnifiedTotalDuration` & `getInterpolatedUnifiedSlideFrame` to destination-based timing (1-slide total = 0.0s).

---

### Phase 2: 個別シーン設定ポップオーバー ＆ シーンカード連携
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/timeline/slide-transition-popover.tsx`, `src/features/tactical-unified/panels/timeline/slide-card.tsx`, `src/features/tactical-unified/panels/timeline/slide-context-menu.tsx`, `src/features/tactical-unified/panels/timeline/slide-card-actions.tsx`, `src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface SlideTransitionPopoverProps {
    slide: Slide;
    index: number;
    isOpen: boolean;
    onClose: () => void;
    referenceElement: HTMLElement | null;
  }
  ```
- **Testing Strategy**: `slide-transition-popover.test.tsx` でポップオーバーからの秒数・イージング変更、Scene 1での移動時間無効化、3つの導線（時間バッジ、ホバーアクション、右クリック）からの開閉を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/slide-transition-popover.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/slide-card.tsx` PASS
- **Worker Handoff Log**:
  - Exported `SlideTransitionPopover` (`SlideTransitionPopoverProps`) with `@floating-ui/react` positioning and stopPropagation guards.
  - Wired 3 trigger paths (time badge, hover actions, context menu); converted `SlideCard` container to role="button" div to avoid HTML button-in-button nesting.

---

### Phase 3: 全シーン一括設定ポップオーバー ＆ タイムラインバー連携
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/timeline/batch-transition-popover.tsx`, `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`, `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
- **契約 (Interface)**:
  ```ts
  export interface BatchTransitionPopoverProps {
    isOpen: boolean;
    onClose: () => void;
    referenceElement: HTMLElement | null;
  }
  ```
- **Testing Strategy**: `timeline-bar.test.tsx` で「一括設定」ボタン押下によるポップオーバー表示、全スライドへの一括適用、1回のUndoでの復元を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/panels/timeline/timeline-bar.tsx` PASS
- **Worker Handoff Log**:
  - Exported `BatchTransitionPopover` (`BatchTransitionPopoverProps`) with `@floating-ui/react` positioning and stopPropagation guards.
  - Added "一括設定" button to `TimelineBar` right section; batch transition updates apply in single undoable transaction.

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-25 14:35
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  単一トランザクション一括更新（updateAllSlideTransitions）、到着先シーン基準の補間・総再生時間統一（1スライド時0.0s）、個別および一括トランジション設定ポップオーバー（@floating-ui/react）、DndKit干渉防止（stopPropagation）、ボタンネスト回避（div role="button"）など、4大定性監査・6大設計品質原則を完全準拠して実装・検証されています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
