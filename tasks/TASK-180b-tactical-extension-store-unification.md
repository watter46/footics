# TASK-180b: Extensionスクショ編集の3頻度ストア一本化とCanvasStoreハリボテ配線解消

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-12
- **Target Files**:
  - `extension/features/canvas/components/RatioPresetSelector.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [ ] 1. `RatioPresetSelector.tsx` から `createCanvasStore({ mode: 'screenshot-edit' })` のハリボテ生成（規約 4.3-1 違反）が完全に除去され、`TacticalStoresContext` が存在する場合は `documentStore` のアクティブ Phase の `boundaryBox` を購読し、プリセット選択時は `documentStore.getState().dispatch({ type: 'UPDATE_PHASE', phaseId, patch: { boundaryBox } })` を発行すること。
- [ ] 2. `QuickAnnotationCanvas.tsx` の `applyRatio` ハンドル実行時に、`TacticalStoresContext` の `documentStore` に対しても `dispatch({ type: 'UPDATE_PHASE', phaseId: sessionStore.getState().activePhaseId, patch: { boundaryBox } })` が発行され、かつ `documentStore` の状態変化（`UPDATE_PHASE` 等）から `serializeProjectToScreenshotJson(documentStore.getState().project)` 経由で `onAutoSave` が呼ばれること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **規約 4.3-1 (空ストアハリボテ配線の禁止)**: `.agents/rules/tactical-domain-architecture.md` Section 4.3-1 に基づき、`RatioPresetSelector.tsx` 内で `createCanvasStore` をインスタンス化するフォールバックを禁止する。Provider 外でマウントされた単体テスト時は `currentRatio` prop または `null`（未選択状態）として純粋に動作させること。
  2. **規約 2.2 (Web / Extension 単一スキーマ統一)**: Extension のスクショ編集も `DomainTacticalProject`（1 Phase・1 Slide、`backgroundType: 'image'`）の `UPDATE_PHASE` コマンドで `boundaryBox` を管理する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` — `RatioPresetSelector` の親コンポーネント（Props 互換性維持）。
  - `extension/features/canvas/components/QuickTacticalCanvas.tsx` — `QuickAnnotationCanvas` の親コンポーネント（`QuickAnnotationCanvasHandle.applyRatio` シグネチャ維持）。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { useContext } from 'react';
import { useStore } from 'zustand';
import { TacticalStoresContext } from '@/features/tactical-unified/stores/tactical-store-provider';
import { serializeProjectToScreenshotJson } from '@/lib/tactical/acl/screenshot-translator';
import { toScreenNorm } from '@/lib/types/tactical/branded';
import type { DomainBoundaryBox } from '@/lib/types/tactical/domain-hierarchy';
```

### 3.2 Key Interfaces & Types
```ts
// === src/lib/tactical/domain/commands.ts ===
export type TacticalCommand =
  | {
      readonly type: 'UPDATE_PHASE';
      readonly phaseId: string;
      readonly patch: Partial<Omit<DomainTacticalPhase, 'id' | 'slides'>>;
    }
  // ...

// === src/lib/types/tactical/domain-hierarchy.ts ===
export interface DomainBoundaryBox {
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: AspectRatio;
  readonly enabled: boolean;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// BoundaryBox を DomainBoundaryBox に変換するヘルパー式:
function toDomainBoundaryBox(box: {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio?: AspectRatio;
  enabled: boolean;
}): DomainBoundaryBox {
  return {
    x: toScreenNorm(box.x),
    y: toScreenNorm(box.y),
    width: Math.max(1, Math.min(100, box.width)),
    height: Math.max(1, Math.min(100, box.height)),
    aspectRatio: box.aspectRatio ?? '16:9',
    enabled: box.enabled,
  };
}
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1 Phase あたりプロダクション 1 ファイル + テスト 1 ファイルに分割し、Worker 負荷を最小化 -->

### Phase 1: `RatioPresetSelector.tsx` の 3頻度ストア駆動化と空 `createCanvasStore` 撤去
- **Worker Model**: `flash`
- **対象ファイル**: `extension/features/canvas/components/RatioPresetSelector.tsx`, `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // extension/features/canvas/components/RatioPresetSelector.tsx
  // 1. createCanvasStore の import および fallbackStoreRef を完全に削除する（rtk grep "createCanvasStore" extension/features/canvas/components/RatioPresetSelector.tsx が 0 件になること）。
  // 2. TacticalStoresContext と CanvasStoreContext を useContext で取得する:
  const tacticalStores = useContext(TacticalStoresContext);
  const canvasStore = useContext(CanvasStoreContext);

  // 3. boundaryBox の取得:
  // tacticalStores が存在する場合は activePhaseId に対応する phase.boundaryBox を取得し、
  // 存在しない場合は canvasStore?.getState().boundaryBox（または subscribe）から取得、どちらもなければ undefined とする。
  // 4. handleSelect(preset: AspectRatio | 'full') 内:
  // newBox = preset === 'full'
  //   ? { ...DEFAULT_BOUNDARY_BOX_FULL, enabled: true }
  //   : { ...createXBoundaryBox(preset, stageAspect), enabled: true };
  // - tacticalStores が存在する場合:
  //   const phaseId = tacticalStores.sessionStore.getState().activePhaseId;
  //   tacticalStores.documentStore.getState().dispatch({
  //     type: 'UPDATE_PHASE',
  //     phaseId,
  //     patch: { boundaryBox: toDomainBoundaryBox(newBox) },
  //   });
  // - canvasStore が存在する場合も canvasStore.getState().setBoundaryBox(newBox) を呼ぶ。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` に以下を追加:
    1. `TacticalStoreProvider` でラップした `RatioPresetSelector` で `'9:16'` ボタンをクリックしたとき、`documentStore.getState().project.phases[0].boundaryBox` が `{ enabled: true, aspectRatio: '9:16', ... }` に更新されること。
    2. `'full'`（全体）ボタンをクリックしたとき、`documentStore.getState().project.phases[0].boundaryBox` が `{ x: 0, y: 0, width: 100, height: 100, aspectRatio: '16:9', enabled: true }` に更新されること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` ➔ 実装 ➔ `bun run ai:check extension/features/canvas/components/RatioPresetSelector.tsx extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` PASS
- **Worker Handoff Log**:
  <!-- 確定したexportシンボルや注意点のみを1〜2行で記録 -->

---

### Phase 2: `QuickAnnotationCanvas.tsx` の `applyRatio` 3頻度ストア `UPDATE_PHASE` 同期と ACL 自動保存直結
- **Worker Model**: `flash`
- **対象ファイル**: `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // extension/features/canvas/components/QuickAnnotationCanvas.tsx
  // 1. InnerCanvasBridge 内で useTacticalStoresContext() から { documentStore, sessionStore } を取得する。
  // 2. applyRatio(ratio: AspectRatio | 'full') 内で:
  //    newBox を計算した際、setBoundaryBox(newBox) に加えて:
  //    const phaseId = sessionStore.getState().activePhaseId;
  //    documentStore.getState().dispatch({
  //      type: 'UPDATE_PHASE',
  //      phaseId,
  //      patch: { boundaryBox: toDomainBoundaryBox(newBox) },
  //    });
  //    を実行し、かつ onAutoSave が渡されている場合は serializeProjectToScreenshotJson(documentStore.getState().project) を onAutoSave に通知する。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` に以下を追加:
    1. `ref.current.applyRatio('1:1')` を呼び出した際、`onAutoSave` が呼ばれ、渡された JSON を `JSON.parse` すると `boundaryBox.aspectRatio === '1:1'` かつ `boundaryBox.enabled === true` が含まれていること。
- **Tasks**:
  - [ ] 1. TDD実装: `bun run ai:check:red extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` ➔ 実装 ➔ `bun run ai:check extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` PASS
- **Worker Handoff Log**:
  <!-- 確定したexportシンボルや注意点のみを1〜2行で記録 -->

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [ ] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [ ] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [ ] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  <!-- 判定理由または改善指示を簡潔に記載 -->

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
