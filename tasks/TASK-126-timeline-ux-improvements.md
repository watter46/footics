# TASK-126: timeline-ux-improvements

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/use-timeline-scroll.ts` (NEW)
  - `src/features/tactical-unified/panels/timeline/__tests__/use-timeline-scroll.test.ts` (NEW)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `Mod + M`（`Ctrl + M` / `Cmd + M`）キー入力で現在のアクティブシーンを完全複製（`duplicateSlide`）し、新規追加シーンへアクティブが切り替わること。
- [x] 2. タイムライン領域で垂直マウスホイールを回した際、水平横スクロール（左右移動）に自動変換されること（Shiftキー不要）。
- [x] 3. タイムラインの背景余白またはカード隙間をマウスクリック＆ドラッグした際、タイムラインがスムーズに横スクロール（Grab & Drag）できること。カード自体の並べ替えドラッグ（DndKit）を阻害しないこと。
- [x] 4. シーン追加時（`Ctrl + M` または `Add Scene` ボタン等）およびアクティブシーン変更時に、最新・対象シーンが視野内に収まるよう自動スクロール（auto-scroll into view）されること。
- [x] 5. スクロールバースタイルが掴みやすい視認性とヒットエリアを持つこと。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { useTacticalUnifiedStoreApi, useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import { selectActivePhaseSlides } from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

### 3.2 Key Interfaces & Types
```ts
export interface UseTimelineScrollOptions {
  activeSlideId: string;
  slideCount: number;
}

export interface UseTimelineScrollReturn {
  containerRef: React.RefObject<HTMLDivElement | null>;
  isDragging: boolean;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. Mod+M は input/textarea フォーカス中（isInputFocused）は発火しないようにガードすること。
// 2. ドラッグスクロールは e.target が button/card 内部の場合には開始せず、コンテナ直接または余白（隙間）クリック時のみ開始すること。
// 3. pointer capture (setPointerCapture) を利用し、ドラッグ中にマウスが領域外に出ても追従・解除できるようにすること。
// 4. 自動スクロールは slides.length 増加時または activeSlideId 変更時に requestAnimationFrame / setTimeout(0) を用いて DOM 描画後に実行すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Keyboard Shortcut Ctrl+M & Timeline Scroll Hook & Integration
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
  - `src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts`
  - `src/features/tactical-unified/panels/timeline/use-timeline-scroll.ts`
  - `src/features/tactical-unified/panels/timeline/__tests__/use-timeline-scroll.test.ts`
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/__tests__/timeline-bar.test.tsx`
- **契約 (Interface)**:
  ```ts
  export function useTimelineScroll(options: UseTimelineScrollOptions): UseTimelineScrollReturn;
  ```
- **Testing Strategy**:
  - `use-keyboard-shortcuts.test.ts`: `Mod+M` 発火時に `duplicateSlide(activeSlideId)` が呼ばれること。
  - `use-timeline-scroll.test.ts`: ホイール変換（deltaY -> scrollLeft）、ドラッグによる scrollLeft 移動、activeSlideId 変更時の scrollIntoView 呼び出し。
  - `timeline-bar.test.tsx`: 既存テスト通過およびコンテナ属性の確認。
- **Tasks**:
  - [x] 1. TDD: `use-keyboard-shortcuts.test.ts` に `Mod+M` テストを追加して実装。
  - [x] 2. TDD: `use-timeline-scroll.ts` およびテストを作成し、ホイール・ドラッグ・自動追従ロジックを実装。
  - [x] 3. `timeline-bar.tsx` に `useTimelineScroll` を接続し、コンテナにイベント・ref を付与。
  - [x] 4. 検証: `bun run ai:check src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/panels/timeline/timeline-bar.tsx src/features/tactical-unified/panels/timeline/use-timeline-scroll.ts`
- **Worker Handoff Log**:
  確定シンボル: `useTimelineScroll` (`UseTimelineScrollOptions`, `UseTimelineScrollReturn`)。Mod+M複製ショートカット、垂直ホイール水平変換、Grab&Dragドラッグスクロール、auto-scroll into view を完全実装。全31テスト合格。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-01 15:05
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Mod+M複製ショートカット、垂直ホイール水平変換、Grab&Dragドラッグスクロール、auto-scroll into view、カスタムスクロールバーの受入要件をすべて網羅。ポインター/ホイールイベントリスナーのRAII解除、Store Provider準拠、SLAP分離が徹底された極めて高品質な実装。

## 6. Rejections / Additional Tasks (不可逆修正欄)
