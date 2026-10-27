# TASK-087: Tactical画面 500エラー解消 および キー操作ハンドラ遅延(200ms)の最適化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/features/tactical-unified/stores/store-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/history-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice-actions.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-batch-delete-helpers.ts` (CREATE)
  - `src/features/tactical-unified/adapters/adapter-selection-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/app/tactical/page.tsx` (MODIFY)
  - `src/app/tactical/error.tsx` (CREATE)
  - `src/features/tactical-unified/stores/__tests__/batch-delete-and-clone.test.ts` (CREATE)
  - `src/app/tactical/__tests__/tactical-page.test.tsx` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/features/tactical-unified/stores/store-helpers.ts` に `cloneSlideShallow` および `cloneSlidesShallow` を実装し、`recordHistory` の `structuredClone(s.project.slides)` を浅い高速スナップショット生成に置き換えること（実行速度 1ms 未満）。
- [x] 2. `src/features/tactical-unified/stores/history-slice.ts` の `undo` および `redo` 内で使われている `structuredClone(s.project.slides)` を `cloneSlidesShallow` に置き換えること。
- [x] 3. `src/features/tactical-unified/stores/project-slice-actions.ts` および `project-slice.ts` に `deleteSelectedObjects(slideId?: string)` を追加し、選択中オブジェクト群（選手、矢印、ゾーン、テキスト）を 1 回の `set()` かつ 1 回の `recordHistory()` でバッチ削除すること（ロック中オブジェクトは保護）。
- [x] 4. `src/features/tactical-unified/adapters/adapter-selection-helpers.ts` の `executeRemoveSelected` および `use-keyboard-shortcuts.ts` の Delete / Backspace キーハンドラを、個別ループ削除から `deleteSelectedObjects` の呼び出しに変更すること。
- [x] 5. `src/app/tactical/page.tsx` において、`export const dynamic = 'force-dynamic';` を付与し、`searchParams` の解決を `try-catch` で保護して不正値・rejection・非Promiseを安全にハンドリングすること。
- [x] 6. `src/app/tactical/page.tsx` において、ブラウザ専用コンポーネントである `TacticalUnifiedPage` を `next/dynamic` (`ssr: false`) で動的インポートし、SSR 時の 500 エラーを完全に防止すること。
- [x] 7. `src/app/tactical/error.tsx`（エラーバウンダリ）を配置し、不測の例外時にも 500 画面にならずリカバリUIを提供すること。
- [x] 8. 単体テスト `batch-delete-and-clone.test.ts`、`tactical-page.test.tsx`、既存の `use-keyboard-shortcuts.test.ts` が全て PASS し、`bun run ai:check` が exit code 0 であること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Store Helpers & Clone
```ts
import type { Slide, TacticalProject } from '@/lib/types/tactical-unified';

export function cloneSlideShallow(slide: Slide): Slide {
  return {
    ...slide,
    players: slide.players.map((p) => ({
      ...p,
      connectLines: [...p.connectLines],
      style: { ...p.style },
      badge: p.badge ? { ...p.badge } : undefined,
    })),
    arrows: slide.arrows.map((a) => ({
      ...a,
      points: [...a.points],
      controlPoints: a.controlPoints ? [...a.controlPoints] : undefined,
    })),
    zones: slide.zones.map((z) => ({
      ...z,
      points: [...z.points],
    })),
    texts: slide.texts.map((t) => ({ ...t })),
    pitchTransform: slide.pitchTransform ? { ...slide.pitchTransform } : undefined,
    boundaryBox: slide.boundaryBox ? { ...slide.boundaryBox } : undefined,
    ball: slide.ball ? { ...slide.ball } : undefined,
  };
}

export function cloneSlidesShallow(slides: Slide[]): Slide[] {
  return slides.map(cloneSlideShallow);
}

export function recordHistory(s: {
  project: { slides: Slide[] };
  past: Slide[][];
}): {
  past: Slide[][];
  future: Slide[][];
} {
  const snapshot = cloneSlidesShallow(s.project.slides);
  const nextPast = [...s.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return {
    past: nextPast,
    future: [],
  };
}
```

### 3.2 Batch Delete Action
```ts
deleteSelectedObjects: (slideId?: string) =>
  set((s) => {
    const targetSlideId = slideId ?? s.activeSlideId;
    const slide = getSlide(s.project, targetSlideId);
    if (!slide || s.selectedObjects.length === 0) return s;

    const selectedMap = new Map<string, SelectedObjectKind>();
    for (const obj of s.selectedObjects) {
      selectedMap.set(obj.id, obj.kind);
    }

    const removablePlayerIds = new Set<string>();
    for (const p of slide.players) {
      if (selectedMap.get(p.id) === 'player' && !p.locked) {
        removablePlayerIds.add(p.id);
      }
    }

    const removableArrowIds = new Set<string>();
    for (const a of slide.arrows) {
      if (selectedMap.get(a.id) === 'arrow' && !a.locked) {
        removableArrowIds.add(a.id);
      }
    }

    const removableZoneIds = new Set<string>();
    for (const z of slide.zones) {
      if (selectedMap.get(z.id) === 'zone' && !z.locked) {
        removableZoneIds.add(z.id);
      }
    }

    const removableTextIds = new Set<string>();
    for (const t of slide.texts) {
      if (selectedMap.get(t.id) === 'text' && !t.locked) {
        removableTextIds.add(t.id);
      }
    }

    if (
      removablePlayerIds.size === 0 &&
      removableArrowIds.size === 0 &&
      removableZoneIds.size === 0 &&
      removableTextIds.size === 0
    ) {
      return s;
    }

    return {
      ...recordHistory(s),
      project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
        ...sl,
        players: sl.players
          .filter((p) => !removablePlayerIds.has(p.id))
          .map((p) => ({
            ...p,
            connectLines: p.connectLines.filter(
              (cl) => !removablePlayerIds.has(cl.toPlayerId),
            ),
          })),
        arrows: sl.arrows.filter(
          (a) =>
            !removableArrowIds.has(a.id) &&
            !(a.sourcePlayerId && removablePlayerIds.has(a.sourcePlayerId)) &&
            !(a.targetPlayerId && removablePlayerIds.has(a.targetPlayerId)),
        ),
        zones: sl.zones.filter((z) => !removableZoneIds.has(z.id)),
        texts: sl.texts.filter((t) => !removableTextIds.has(t.id)),
      })),
      selectedObjects: s.selectedObjects.filter((obj) => {
        if (obj.kind === 'player') return !removablePlayerIds.has(obj.id);
        if (obj.kind === 'arrow') return !removableArrowIds.has(obj.id);
        if (obj.kind === 'zone') return !removableZoneIds.has(obj.id);
        if (obj.kind === 'text') return !removableTextIds.has(obj.id);
        return true;
      }),
      isDirty: true,
    };
  }),
```

### 3.3 Page SSR Boundary & Error Boundary
```tsx
import type { Metadata } from 'next';
import nextDynamic from 'next/dynamic';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Tactical Canvas — Footics',
  description: '統合タクティカルキャンバス',
};

export const dynamic = 'force-dynamic';

const DynamicTacticalUnifiedPage = nextDynamic(
  () =>
    import('@/features/tactical-unified').then((m) => m.TacticalUnifiedPage),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-screen bg-[#0a0a0a] items-center justify-center text-zinc-500 text-sm select-none">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin mb-2" />
        <span>読み込み中...</span>
      </div>
    ),
  },
);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 履歴クローン最適化と一括バッチ削除の実装
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/store-helpers.ts`
  - `src/features/tactical-unified/stores/history-slice.ts`
  - `src/features/tactical-unified/stores/project-slice-actions.ts`
  - `src/features/tactical-unified/stores/project-slice.ts`
  - `src/features/tactical-unified/adapters/adapter-selection-helpers.ts`
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`
  - `src/features/tactical-unified/stores/__tests__/batch-delete-and-clone.test.ts`
- **Testing Strategy**:
  - `rtk vitest run src/features/tactical-unified/stores/__tests__/batch-delete-and-clone.test.ts src/features/tactical-unified/hooks/__tests__/use-keyboard-shortcuts.test.ts` が PASS すること。
- **Tasks**:
  - [x] 1. `batch-delete-and-clone.test.ts` を作成（RED確認）
  - [x] 2. `store-helpers.ts` に `cloneSlideShallow`, `cloneSlidesShallow` を実装し、`recordHistory` から `structuredClone` を排除
  - [x] 3. `history-slice.ts` の `undo`/`redo` から `structuredClone` を排除
  - [x] 4. `project-slice-actions.ts` および `project-slice.ts` に `deleteSelectedObjects` を実装
  - [x] 5. `adapter-selection-helpers.ts` と `use-keyboard-shortcuts.ts` を `deleteSelectedObjects` 呼び出しに更新
  - [x] 6. テストが GREEN になることを確認
- **Worker Handoff Log**:
  - Export: `cloneSlideShallow`, `cloneSlidesShallow`, `deleteSelectedObjects`, `executeBatchDeleteOnSlide`
  - Gotcha: `project-slice-actions.ts` のファイル行数制限（<=300行）を遵守するため、スライドに対する一括バッチ削除純粋関数 `executeBatchDeleteOnSlide` を `slide-batch-delete-helpers.ts` に切り出して責務を分離した。

### Phase 2: Tactical Page SSR境界分離とエラーハンドリング堅牢化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/app/tactical/page.tsx`
  - `src/app/tactical/error.tsx`
  - `src/app/tactical/__tests__/tactical-page.test.tsx`
- **Testing Strategy**:
  - `rtk vitest run src/app/tactical/__tests__/tactical-page.test.tsx` が PASS すること。
  - `bun run ai:check src/app/tactical/page.tsx src/app/tactical/error.tsx` が PASS すること。
- **Tasks**:
  - [x] 1. `tactical-page.test.tsx` を作成（Promise解決、不正値、エラーハンドリング検証）
  - [x] 2. `src/app/tactical/page.tsx` を `force-dynamic`, `ssr: false`, `try-catch` に更新
  - [x] 3. `src/app/tactical/error.tsx` を新規作成
  - [x] 4. テストが GREEN になることを確認
- **Worker Handoff Log**:
  - `TacticalPage` は `force-dynamic` かつ `TacticalUnifiedPage` を `next/dynamic` (`ssr: false`) で動的インポートし、`searchParams` の Promise rejection / 不正値を `try-catch` で安全にフォールバック。`TacticalError` は `'use client';` エラーバウンダリとして再試行 (`reset`) とホーム遷移を提供。テスト 6 件すべて PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 10:25
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: `structuredClone` 排除による履歴スナップショット高速化（シャロー複製）、連動要素を含む一括バッチ削除（`deleteSelectedObjects`）への集約、SSR境界分離（`dynamic(ssr: false)`）とエラーバウンダリ配置が完璧に実装され、4大定性監査の全項目をクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
