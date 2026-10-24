# TASK-043: 軽微修正（Extensionボール非表示・確認用枠線削除）とトップバーUI・コピートースト・ツールバーの統一

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/types.ts` (MODIFY)
  - `src/features/tactical-unified/core/store/canvas-store.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasToast.tsx` (NEW)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `extension/features/canvas/hooks/use-quick-canvas-actions.ts` (MODIFY)
  - `extension/features/canvas/components/QuickTacticalCanvas.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/canvas/components/RatioPresetSelector.tsx` (MODIFY)
  - `extension/features/canvas/components/VideoMetaInfo.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` (MODIFY)
  - `extension/features/canvas/hooks/__tests__/use-quick-canvas-actions.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `PitchGroundLayer.tsx` から確認用の水色枠線 `<Rect stroke="#38bdf8" />` を削除すること。
- [x] 2. `src/features/tactical-unified/core/components/CanvasToast.tsx` の先頭に `'use client';` を宣言した上で、共通トーストフック `useCanvasToast`（アンマウント時の `clearTimeout` クリーンアップ RAII 付き）と `<CanvasToast message={toastMessage} />` を実装し、Web版の `top-bar.tsx` および Extension版の `use-quick-canvas-actions.ts` / `QuickTacticalCanvas.tsx` の双方で使用すること。
- [x] 3. Extension版の `QuickCanvasTopBar.tsx`, `RatioPresetSelector.tsx`, `VideoMetaInfo.tsx` の全UI要素の配色・角丸・余白・タイポグラフィを Web版トップバーのデザイントークンに完全統一すること（既存の `aria-label` は維持）。
- [x] 4. Level 2 コンポーネント（`BillboardObjectLayer.tsx`, `CoreDrawingToolbar.tsx`, `CanvasStageContainer.tsx`）における `mode === 'screenshot-edit'` や `markerMode === '3d-only'` の直接比較および `useTacticalUnifiedStore`（Level 4 シングルトン）の直接参照を全廃し、`CanvasCapabilities`（`hasBall`, `hasPitchLock`, `hasBench`, `paddingRatio`）および `CanvasState`（`ball`, `teamVisibility`, `moveMarkerToBench`）を `useCanvasStore` 経由で参照する設計に統一すること。また `QuickAnnotationCanvas.tsx` のインラインツールバー重複を廃止し `<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} />` に統合すること。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// types.ts
import type {
  ArrowAnnotation,
  AspectRatio,
  BallAnnotation,
  BoundaryBox,
  DrawingTool,
  PitchTransform,
  Player,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/core/types.ts
export interface CanvasCapabilities {
  hasBall: boolean;
  hasPitchLock: boolean;
  hasBench: boolean;
  paddingRatio: number;
}

export interface CanvasConfig {
  mode: 'screenshot-edit' | 'tactical-board' | 'full-tactical';
  backgroundImageUrl?: string;
  initialAnnotations?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
  defaultBoundaryBox?: BoundaryBox;
  aspectRatio?: AspectRatio;
  defaultPitchTransform?: PitchTransform;
  capabilities?: Partial<CanvasCapabilities>;
}

// CanvasState に追加するフィールド:
// capabilities: CanvasCapabilities;
// ball: BallAnnotation | null;
// teamVisibility: 'both' | 'home' | 'away';
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// 1. canvas-store.ts: createCanvasStore 内の capabilities 導出と初期値
const isPitchBoard =
  config.mode === 'full-tactical' || config.mode === 'tactical-board';
const capabilities: CanvasCapabilities = {
  hasBall: config.capabilities?.hasBall ?? isPitchBoard,
  hasPitchLock: config.capabilities?.hasPitchLock ?? isPitchBoard,
  hasBench: config.capabilities?.hasBench ?? isPitchBoard,
  paddingRatio:
    config.capabilities?.paddingRatio ??
    (config.mode === 'full-tactical' ? 0.06 : 0),
};
// return 内に追加:
// capabilities,
// ball: capabilities.hasBall ? { x: 50, y: 50, visible: true } : null,
// teamVisibility: 'both',

// 2. tactical-canvas-store-adapter.ts: buildState() 内に追加
capabilities: {
  hasBall: true,
  hasPitchLock: true,
  hasBench: true,
  paddingRatio: 0,
},
ball: activeSlide?.ball ?? { x: 50, y: 50, visible: true },
teamVisibility: s.teamVisibility,

// 3. BillboardObjectLayer.tsx: useTacticalUnifiedStore の import を完全削除し useCanvasStore に一本化
const capabilities = useCanvasStore((s) => s.capabilities);
const ball = useCanvasStore((s) => s.ball);
const teamVisibility = useCanvasStore((s) => s.teamVisibility ?? 'both');
const moveMarkerToBench = useCanvasStore((s) => s.moveMarkerToBench);
const showBall =
  (capabilities?.hasBall ?? false) &&
  ball != null &&
  ball.visible !== false;
// handleDragEnd 内:
if (isOverBenchPanel && capabilities?.hasBench && moveMarkerToBench) {
  moveMarkerToBench(marker.id);
  return;
}

// 4. CoreDrawingToolbar.tsx: markerMode === '3d-only' を廃止し capabilities.hasPitchLock で制御
export interface CoreDrawingToolbarProps {
  className?: string;
  markerMode?: '2d-only' | '3d-only' | 'all';
  tools?: DrawingToolPlugin[];
  showPitchLock?: boolean;
}
export function CoreDrawingToolbar({
  className = '',
  markerMode = '2d-only',
  tools,
  showPitchLock,
}: CoreDrawingToolbarProps): ReactNode {
  const hasPitchLock = useCanvasStore(
    (s) => s.capabilities?.hasPitchLock ?? true,
  );
  const resolvedTools = tools ?? getDrawingTools(markerMode);
  const shouldShowPitchLock = showPitchLock ?? hasPitchLock;
  return (
    <DraggableToolbar className={`right-3 ${className}`.trim()}>
      <ToolbarToolsGroup tools={resolvedTools} />
      <ToolbarDivider />
      <ToolbarContinuousLock />
      <ToolbarEraser />
      {shouldShowPitchLock && <ToolbarPitchLock />}
      <ToolbarBoundaryBoxToggle />
      <ToolbarDivider />
      <ToolbarResetButton />
    </DraggableToolbar>
  );
}

// 5. CanvasStageContainer.tsx: s.config.mode ではなく s.capabilities.paddingRatio を参照
const paddingRatio = useCanvasStore((s) => s.capabilities?.paddingRatio ?? 0);

// 6. QuickAnnotationCanvas.tsx: インラインの <DraggableToolbar> を <CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} /> に置換
toolbar={<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} />}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Extensionボール非表示・確認用枠線削除・ツールバー仕様統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx`
- **Tasks**:
  - [x] 1. TDD実装完了
- **Worker Handoff Log**:
  - `PitchGroundLayer`: `stroke="#38bdf8"` の外枠 Rect を完全除去。

### Phase 2: 共通トースト機構（CanvasToast）とWeb/ExtensionトップバーUIの完全統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/CanvasToast.tsx`, `src/features/tactical-unified/core/index.ts`, `src/features/tactical-unified/panels/toolbar/top-bar.tsx`, `extension/features/canvas/hooks/use-quick-canvas-actions.ts`, `extension/features/canvas/components/QuickTacticalCanvas.tsx`, `extension/features/canvas/components/QuickCanvasTopBar.tsx`, `extension/features/canvas/components/RatioPresetSelector.tsx`, `extension/features/canvas/components/VideoMetaInfo.tsx`
- **Tasks**:
  - [x] 1. TDD実装完了
- **Worker Handoff Log**:
  - `CanvasToast` & `useCanvasToast` 実装、ExtensionトップバーUIトークン統一完了。

### Phase 3: `'use client'` 境界修正と `CanvasCapabilities` + `CanvasStore` 統合によるモード分岐の排除
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/CanvasToast.tsx`, `src/features/tactical-unified/core/types.ts`, `src/features/tactical-unified/core/store/canvas-store.ts`, `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`, `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`, `extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx`
- **契約 (Interface)**:
  - `CanvasToast.tsx`: ファイル先頭に `'use client';` を追加し、Next.js Server Component からのバレルインポートエラーを解消する。
  - `types.ts`, `canvas-store.ts`, `tactical-canvas-store-adapter.ts`: `CanvasCapabilities` (`hasBall`, `hasPitchLock`, `hasBench`, `paddingRatio`) と `ball`, `teamVisibility` を `CanvasState` に統合。また `core/index.ts` から `type CanvasCapabilities` をエクスポートする。
  - `BillboardObjectLayer.tsx`: `useTacticalUnifiedStore` の import と `mode === 'screenshot-edit'` / `markerMode === '3d-only'` の条件式を完全削除し、`useCanvasStore` の `capabilities.hasBall`, `ball`, `teamVisibility`, `moveMarkerToBench` のみで動作させる。
  - `CoreDrawingToolbar.tsx` & `CanvasStageContainer.tsx` & `QuickAnnotationCanvas.tsx`: `CoreDrawingToolbar` で `markerMode === '3d-only'` 判定を廃止し `useCanvasStore((s) => s.capabilities?.hasPitchLock ?? true)`（および `showPitchLock` prop）で `<ToolbarPitchLock />` の表示を制御する。`CanvasStageContainer` は `s.capabilities?.paddingRatio ?? 0` を使用する。`QuickAnnotationCanvas` はインラインの `DraggableToolbar` を廃止し `<CoreDrawingToolbar tools={EXTENSION_DRAWING_TOOLS} />` を使用する。
- **Testing Strategy**: `five-layer-architecture.test.tsx` で `capabilities.hasBall` に基づくボール描画制御（`mode: 'screenshot-edit'` や `capabilities: { hasBall: false }` で非表示、`mode: 'tactical-board'` で表示）を検証。`toolbar.test.tsx` で `capabilities.hasPitchLock`（`mode: 'screenshot-edit'` 時非表示、`mode: 'tactical-board'` 時表示）を検証。`quick-annotation-canvas.test.tsx` で `QuickAnnotationCanvas` のツールバーに 3D Foot Ring と Boundary Box が含まれ 2D Player Marker と Pitch Lock が含まれないことを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/CanvasToast.tsx src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/store/canvas-store.ts src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx src/features/tactical-unified/core/components/CanvasStageContainer.tsx extension/features/canvas/components/QuickAnnotationCanvas.tsx src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx extension/features/canvas/components/__tests__/quick-annotation-canvas.test.tsx` PASS
- **Worker Handoff Log**:
  - `CanvasCapabilities` 定義 & `core/index.ts` export、`BillboardObjectLayer` の Level 4 シングルトン直参照全廃と `useCanvasStore` 統合完了。
  - `CoreDrawingToolbar` は `capabilities.hasPitchLock` と `showPitchLock` prop で制御し、`QuickAnnotationCanvas` のインライン重複を解消。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 10:01
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: `PitchGroundLayer` の確認枠線削除、`'use client'` 付き `CanvasToast` / `useCanvasToast`（RAII `clearTimeout` 完備）によるWeb/Extensionトースト共通化、トップバーのデザイントークン完全統一、および `CanvasCapabilities` と `useCanvasStore` への統合による Level 2 からの Level 4 シングルトン直参照・モード直接分岐の全廃と `CoreDrawingToolbar` への統合が6大設計品質原則に完全準拠して実装・検証されていることを確認しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
