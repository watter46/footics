# TASK-043: 軽微修正（Extensionボール非表示・確認用枠線削除）とトップバーUI・コピートースト・ツールバーの統一

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasToast.tsx` (NEW)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar.tsx` (MODIFY)
  - `extension/features/canvas/hooks/use-quick-canvas-actions.ts` (MODIFY)
  - `extension/features/canvas/components/QuickTacticalCanvas.tsx` (MODIFY)
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` (MODIFY)
  - `extension/features/canvas/components/RatioPresetSelector.tsx` (MODIFY)
  - `extension/features/canvas/components/VideoMetaInfo.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` (MODIFY)
  - `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx` (MODIFY)
  - `extension/features/canvas/hooks/__tests__/use-quick-canvas-actions.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `BillboardObjectLayer.tsx` において、`mode === 'screenshot-edit'` または `markerMode === '3d-only'` の場合はボール（`BallObject`）を描画せず非表示とし、`PitchGroundLayer.tsx` から確認用の水色枠線 `<Rect stroke="#38bdf8" />` を削除すること。また `CoreDrawingToolbar.tsx` では `markerMode === '3d-only'`（Extension版）のときに `<ToolbarPitchLock />` を描画しないこと。
- [x] 2. `src/features/tactical-unified/core/components/CanvasToast.tsx`（および `core/index.ts` からの再エクスポート）に共通トーストフック `useCanvasToast`（アンマウント時の `clearTimeout` クリーンアップ RAII 付き）と `<CanvasToast message={toastMessage} />` コンポーネントを実装し、Web版の `top-bar.tsx`（`Copy PNG` 押下時）および Extension版の `use-quick-canvas-actions.ts` / `QuickTacticalCanvas.tsx` の双方で同一のトースト通知機構を使用すること。
- [x] 3. Extension版の `QuickCanvasTopBar.tsx`, `RatioPresetSelector.tsx`, `VideoMetaInfo.tsx` の全UI要素（動画情報、Undo/Redo、比率セレクター、お気に入り、コピー、保存、X共有、一覧ボタン）の配色・角丸・余白・タイポグラフィを Web版トップバー（`top-bar.tsx`, `top-bar-history.tsx`, `top-bar-center.tsx`）のデザイントークン（アクティブ色 `bg-blue-600`、セカンダリボタン `bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs rounded px-2.5 py-1`、プライマリボタン `bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded px-3 py-1`、アイコンボタン `p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10` 等）に完全統一すること（既存の `aria-label` は維持）。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
// CanvasToast.tsx / top-bar.tsx / QuickTacticalCanvas.tsx
import { CanvasToast, useCanvasToast } from '@/features/tactical-unified/core';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/core/components/CanvasToast.tsx (Level 2 Domain UI Block)
export interface UseCanvasToastReturn {
  toastMessage: string | null;
  showToast: (msg: string, durationMs?: number) => void;
  clearToast: () => void;
}
export interface CanvasToastProps {
  message: string | null;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// 1. BillboardObjectLayer.tsx: mode === 'screenshot-edit' または markerMode === '3d-only' 時はボール非表示
const mode = useCanvasStore((s) => s.config.mode);
const activeSlide = useTacticalUnifiedStore(selectActiveSlide);
const ball = activeSlide?.ball ?? { x: 50, y: 50, visible: false };
const showBall =
  mode !== 'screenshot-edit' &&
  markerMode !== '3d-only' &&
  ball.visible !== false;

const sortedItems = sortBillboardItemsByDepth<BillboardItem>(
  [
    ...visibleMarkers.map((p) => ({
      kind: 'player' as const,
      data: p,
      x: p.x,
      y: p.y,
    })),
    ...(showBall
      ? [{ kind: 'ball' as const, data: ball, x: ball.x, y: ball.y }]
      : []),
    ...texts.map((t) => ({
      kind: 'text' as const,
      data: t,
      x: t.x,
      y: t.y,
    })),
  ],
  pitchRect,
  camera,
);

// 2. CoreDrawingToolbar.tsx: markerMode === '3d-only' 時は ToolbarPitchLock 非表示
export function CoreDrawingToolbar({
  className = '',
  markerMode = '2d-only',
  tools,
}: CoreDrawingToolbarProps): ReactNode {
  const resolvedTools = tools ?? getDrawingTools(markerMode);
  const isExtension = markerMode === '3d-only';

  return (
    <DraggableToolbar className={`right-3 ${className}`.trim()}>
      <ToolbarToolsGroup tools={resolvedTools} />
      <ToolbarDivider />
      <ToolbarContinuousLock />
      <ToolbarEraser />
      {!isExtension && <ToolbarPitchLock />}
      <ToolbarBoundaryBoxToggle />
      <ToolbarDivider />
      <ToolbarResetButton />
    </DraggableToolbar>
  );
}

// 3. CanvasToast.tsx: RAII タイマークリーンアップ付き共通トースト
export function useCanvasToast(defaultDurationMs = 3000): UseCanvasToastReturn {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToast = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToastMessage(null);
  }, []);

  const showToast = useCallback(
    (msg: string, durationMs = defaultDurationMs) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setToastMessage(msg);
      timerRef.current = setTimeout(() => {
        setToastMessage((prev) => (prev === msg ? null : prev));
        timerRef.current = null;
      }, durationMs);
    },
    [defaultDurationMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { toastMessage, showToast, clearToast };
}

export function CanvasToast({ message }: CanvasToastProps): React.ReactElement | null {
  if (!message) return null;
  return (
    <output
      aria-live="polite"
      data-testid="canvas-toast"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#18181b]/95 text-white border border-white/15 px-4 py-2 rounded-xl shadow-2xl backdrop-blur text-xs font-medium flex items-center gap-2 pointer-events-none select-none"
    >
      <span>{message}</span>
    </output>
  );
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Extensionボール非表示・確認用枠線削除・ツールバー仕様統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx`, `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`, `src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx`
- **契約 (Interface)**:
  - Level 2 Domain UI Block: `BillboardObjectLayer` は `mode === 'screenshot-edit'` または `markerMode === '3d-only'` のとき `BallObject` を描画しない。
  - `PitchGroundLayer` から確認用の `stroke="#38bdf8"` の `<Rect>` を完全除去する。
  - `CoreDrawingToolbar` は `markerMode === '3d-only'` のとき `<ToolbarPitchLock />` を描画しない。
- **Testing Strategy**: `five-layer-architecture.test.tsx` に `mode: 'screenshot-edit'` 時に `BillboardObjectLayer` でボールが描画されないテスト、および `PitchGroundLayer` に `#38bdf8` の外枠 Rect が存在しないテストを追加。`toolbar.test.tsx` に `markerMode="3d-only"` 時に `Pitch Lock` が非表示で `markerMode="2d-only"` 時に表示されるテストを追加。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx src/features/tactical-unified/core/components/toolbar/__tests__/toolbar.test.tsx` PASS
- **Worker Handoff Log**:
  - `BillboardObjectLayer`: `mode === 'screenshot-edit'` または `markerMode === '3d-only'` 時に `showBall = false` とし `BallObject` を非描画。
  - `PitchGroundLayer`: `stroke="#38bdf8"` の外枠 Rect を完全除去。
  - `CoreDrawingToolbar`: `markerMode === '3d-only'` 時に `ToolbarPitchLock` を非描画。

### Phase 2: 共通トースト機構（CanvasToast）とWeb/ExtensionトップバーUIの完全統一
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/CanvasToast.tsx`, `src/features/tactical-unified/core/index.ts`, `src/features/tactical-unified/panels/toolbar/top-bar.tsx`, `extension/features/canvas/hooks/use-quick-canvas-actions.ts`, `extension/features/canvas/components/QuickTacticalCanvas.tsx`, `extension/features/canvas/components/QuickCanvasTopBar.tsx`, `extension/features/canvas/components/RatioPresetSelector.tsx`, `extension/features/canvas/components/VideoMetaInfo.tsx`, `extension/features/canvas/components/__tests__/quick-top-bar.test.tsx`, `extension/features/canvas/hooks/__tests__/use-quick-canvas-actions.test.ts`
- **契約 (Interface)**:
  - Level 2 Domain UI Block: `CanvasToast.tsx` に `useCanvasToast` と `CanvasToast` を実装し `core/index.ts` からエクスポートする。
  - `top-bar.tsx`: `handleCopy` を `async` 化し、`await canvasRef?.current?.copyToClipboard()` 完了後に `showToast('📋 画像をクリップボードにコピーしました！')` を呼び出し、ヘッダー内に `<CanvasToast message={toastMessage} />` を配置する。
  - `use-quick-canvas-actions.ts` & `QuickTacticalCanvas.tsx`: 自前の `useState` / `setTimeout` と下部 `div` を `useCanvasToast` と `<CanvasToast message={toastMessage} />` に置換する。
  - `QuickCanvasTopBar.tsx`, `RatioPresetSelector.tsx`, `VideoMetaInfo.tsx`: Web版トップバーのUIデザイントークン（Undo/Redo `p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10`, 比率セレクターのアクティブ色 `bg-blue-600 text-white font-semibold shadow-xs` / アイコン `text-blue-400`, 右側アクションボタン群の `gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-white/80 hover:text-white text-xs` およびプライマリボタン `px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs`）に統一する（既存の `aria-label` は維持）。
- **Testing Strategy**: `use-quick-canvas-actions.test.ts` で `useCanvasToast` 経由の `toastMessage` 更新とアンマウント時のタイマークリーンアップを検証し、`quick-top-bar.test.tsx` で Web 統一スタイル（`bg-blue-600` アクティブ比率等）とコールバック動作を検証する。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red extension/features/canvas/components/__tests__/quick-top-bar.test.tsx extension/features/canvas/hooks/__tests__/use-quick-canvas-actions.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/CanvasToast.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/panels/toolbar/top-bar.tsx extension/features/canvas/hooks/use-quick-canvas-actions.ts extension/features/canvas/components/QuickTacticalCanvas.tsx extension/features/canvas/components/QuickCanvasTopBar.tsx extension/features/canvas/components/RatioPresetSelector.tsx extension/features/canvas/components/VideoMetaInfo.tsx extension/features/canvas/components/__tests__/quick-top-bar.test.tsx extension/features/canvas/hooks/__tests__/use-quick-canvas-actions.test.ts` PASS
- **Worker Handoff Log**:
  - `CanvasToast` & `useCanvasToast`: `core/index.ts` からエクスポート。Web版 `top-bar.tsx` と Extension版 `useQuickCanvasActions` / `QuickTacticalCanvas` で同一のトースト機構（RAIIタイマークリーンアップ付き）を利用。
  - Extension トップバー (`QuickCanvasTopBar`, `RatioPresetSelector`, `VideoMetaInfo`): Web版デザイントークン（アクティブ比率 `bg-blue-600` / `text-blue-400`、プライマリX共有 `bg-blue-600`、Undo/Redo `p-1.5` 等）へ完全統一。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 09:09
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  Level 2 共通の `CanvasToast` / `useCanvasToast`（アンマウント時の `clearTimeout` RAII クリーンアップ付き）により Web/Extension 両環境のトースト機構がクリーンに統合され、ボール非表示・確認用枠線除去・Pitch Lock 条件分岐・トップバーのデザイントークン統一がすべてホスト境界と Store Provider 原則を厳守して実装・検証されていることを確認しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
