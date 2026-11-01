# TASK-138: キャンバスの「表示部分」と「編集操作部分」の分離（表示専用ステージの新設）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-02
- **Depends On**: なし（TASK-137 と並列実行可）
- **Goal**: 編集画面の動作を一切変えずに、`CanvasStageContainer`（Level 2）から「表示」を切り出す。後続タスクで、プレビュー画面が編集と同じ Konva 部品を表示専用で再利用できるようにする。
- **Target Files**:
  - `src/features/tactical-unified/core/hooks/use-canvas-viewport.ts` (NEW)
  - `src/features/tactical-unified/core/components/canvas-stage.tsx` (NEW)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` (NEW)
  - `src/features/tactical-unified/core/components/canvas-display-stage.tsx` (NEW)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/canvas-display-stage.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **編集画面の動作不変**: `CanvasStageContainer` の props・`ref`（`CanvasCoreHandle`）・DOM 構造・ポインター/ホイール/ドラッグ/ショートカット/ドロップの挙動が変わらず、`core/components/__tests__/` と `core/__tests__/` の既存テストが無修正で全件 PASS すること。
- [x] 2. **責務の分離**: `CanvasStage`（表示のみ）は、ショートカット登録・`useDroppable`・ツールバー・HUD 編集 UI・Undo/Redo 配線を一切持たない。`CanvasStageContainer` は「`use-canvas-viewport` ＋ 操作フック群 ＋ `CanvasStage`」を組み立てるだけの構成になること（SRP）。
- [x] 3. **表示専用ステージ**: `CanvasDisplayStage` は `CanvasStoreProvider` 配下で、`interaction` なし・`cleanRender=true` 固定の `CanvasStage` を描画できること。ショートカット・`useDroppable`・ポインター操作・選択・ドラッグがすべて無効であること。
- [x] 4. **パフォーマンス（ヒット判定の排除）**: 表示専用ステージでは、Stage のポインターハンドラを登録せず、全 `Layer` が `listening={false}`（Konva のヒット用キャンバス描画を省略）であること。編集画面側の `Layer` の `listening` は現状のまま変えない。
- [x] 5. **パフォーマンス（余計な購読・リスナーの排除）**: 表示専用ステージは `window` の `keydown` リスナーを追加しないこと。`ResizeObserver` はステージごとに1つだけ（`useCanvasViewport` 内）、サイズ確定前（0×0）は `Stage` を生成しないこと。`Stage` に渡す `size` / `pitchRect` はメモ化し、サイズ不変なら参照を維持して無駄な再描画を起こさないこと。
- [x] 6. **層規約**: `core/` から `useTacticalUnifiedStore`・`@/lib/db/*`・`extension/` を import しないこと（`bun run ai:check` の依存検査 PASS）。
- [x] 7. `bun run ai:check <対象ファイル>` が exit code 0 で PASS すること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type Konva from 'konva';
import { Stage } from 'react-konva';
import type { CanvasNodesRegistry } from '../utils/canvas-registry';
import { calculateVirtualCanvasRect } from '../utils/virtual-canvas-rect';
```

### 3.2 Key Interfaces & Types
```ts
// core/hooks/use-canvas-viewport.ts（既存 CanvasStageContainer 内の useContainerResize + vRect 算出をそのまま移設）
export function useCanvasViewport(params: {
  imageAspect?: number;
  onStageSizeChange?: (size: { width: number; height: number }) => void;
}): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  containerSize: { width: number; height: number };
  vRect: PitchRectBounds; // calculateVirtualCanvasRect(...) の戻り値
};

// core/components/CanvasStage.tsx（表示のみ。Konva Stage + 3 Layer + ViewportCropOverlay）
export interface CanvasStageInteraction {
  stageHandlers: Pick<
    React.ComponentProps<typeof Stage>,
    'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onWheel' | 'onDragStart' | 'onDragEnd'
  >;
  activePolygonId: string | null;
  mousePreviewPos: { x: number; y: number } | null;
  selectionBox: SelectionBox | null;
  editingTextId: string | null;
  onStartEditText: (textId: string) => void;
}
export interface CanvasStageProps {
  stageRef?: React.Ref<Konva.Stage>;
  size: { width: number; height: number };
  vRect: PitchRectBounds;
  nodesRegistryRef: React.MutableRefObject<CanvasNodesRegistry>;
  cleanRender?: boolean;
  interaction?: CanvasStageInteraction; // 未指定 = 表示専用（listening=false）
}

// core/components/CanvasDisplayStage.tsx（Level 2: viewport + CanvasStage を束ねた表示専用）
export interface CanvasDisplayStageProps {
  className?: string;
  imageAspect?: number;
  nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
  onStageSizeChange?: (size: { width: number; height: number }) => void;
}
```
※ `core/types.ts` に既存の `CanvasStageProps`（Container 用）があるため、衝突する場合は `CanvasStageViewProps` に改名し、`core/index.ts` では両方を区別して export すること。

### 3.3 Implementation Notes & Gotchas
- **既存 `CanvasStageContainer` の残す責務**: `useCanvasShortcuts()`、`useCanvasPointerInteraction`、`useDroppable`（`isOver` のリング表示）、`useCanvasExport` と `useImperativeHandle`、`HtmlHudOverlay`、`toolbar` 配置（`--toolbar-right` 計算）、`editingTextId` の state。これらは移設しない。
- **移設するもの**: `useContainerResize` と `vRect` 算出 → `use-canvas-viewport.ts`。`<Stage>` と3 Layer と `ViewportCropOverlay` の JSX → `CanvasStage.tsx`。
- **`listening`**: `PitchGroundLayer` / `BillboardObjectLayer` に任意 prop `listening?: boolean`（既定 `true`）を追加し、内部の `<Layer>` に渡す。`CanvasStage` は `interaction` 未指定のときだけ `false` を渡す。既存の `InteractionPreviewLayer` は元から `listening={false}`。
- **`CanvasStage` の編集専用 props**: `PitchGroundLayer` の `activePolygonId` / `mousePreviewPos`、`BillboardObjectLayer` の `editingTextId` / `onStartEditText`、`InteractionPreviewLayer` の `selectionBox` は `interaction` 未指定時に `null` / no-op を渡す（レイヤー側の型は変更しない）。
- **`cleanRender`**: `CanvasStageContainer` は従来どおり props の値を `CanvasStage` に渡す。`CanvasDisplayStage` は常に `true`。
- **`CanvasStoreProvider` は親（Level 3）が供給する**。`CanvasDisplayStage` 自身は store を生成しない。
- **RAII**: `nodesRegistryRef.current.stage` / `pitchRect` の更新 `useEffect` は従来どおり Container（編集）側に残し、`CanvasDisplayStage` でも同じ更新を行うこと（レジストリ未注入時は内部生成）。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 表示部分の抽出（振る舞い不変のリファクタ）
- **Worker Model**: `flash`
- **対象ファイル**: `core/hooks/use-canvas-viewport.ts`, `core/components/canvas-stage.tsx`, `core/components/CanvasStageContainer.tsx`, `core/components/__tests__/canvas-stage.test.tsx`
- **契約 (Interface)**: 3.2 の `useCanvasViewport` / `CanvasStage` / `CanvasStageInteraction`
- **Testing Strategy**:
  - 先に既存 `canvas-stage-container.test.tsx` / `clean-render.test.tsx` / `five-layer-architecture.test.tsx` を実行して GREEN を確認（基準）。リファクタ後も無修正で GREEN。
  - `canvas-stage.test.tsx`（NEW）: `interaction` を渡すと Stage にポインターハンドラが付く。`size` が 0×0 のとき `Stage` を描画しない。`vRect` / `size` 不変の再レンダーで `Layer` が再生成されない。
- **Tasks**:
  - [x] 1. 基準確認: `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx`（変更前に GREEN）
  - [x] 2. TDD RED: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx`
  - [x] 3. 実装 ➔ `bun run ai:check src/features/tactical-unified/core/hooks/use-canvas-viewport.ts src/features/tactical-unified/core/components/canvas-stage.tsx src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage.test.tsx` PASS
- **Worker Handoff Log**:
  - `use-canvas-viewport.ts`: `useCanvasViewport`（`containerRef`, `containerSize`, `vRect` のメモ化・参照維持）を export。
  - `canvas-stage.tsx`: `CanvasStage`, `CanvasStageViewProps`, `CanvasStageProps`, `CanvasStageInteraction` を export（R8命名規約により kebab-case ファイル名）。
  - `CanvasStageContainer.tsx`: 組み立て構造へ移行し、既存32テスト全件パスを確認。

---

### Phase 2: 表示専用ステージとヒット判定の排除（Phase 1 完了後に実施）
- **Worker Model**: `flash`
- **対象ファイル**: `core/components/CanvasDisplayStage.tsx`, `core/components/PitchGroundLayer.tsx`, `core/components/BillboardObjectLayer.tsx`, `core/index.ts`, `core/components/__tests__/canvas-display-stage.test.tsx`
- **契約 (Interface)**: 3.2 の `CanvasDisplayStage` ＋ 各 Layer の任意 prop `listening?: boolean`
- **Testing Strategy**:
  - `canvas-display-stage.test.tsx`（NEW、`CanvasStoreProvider` に最小 store を注入）: ① 全 `Layer` の `listening()` が `false`。② `window.addEventListener` に `'keydown'` が登録されない（spy）。③ 選手マーカーの `draggable()` が `false`。④ 寸法確定前は Stage 未生成。
  - 既存 `clean-render.test.tsx` / `player-layer.test.tsx` が無修正で GREEN（`listening` 既定値 `true` の維持確認）。
- **Tasks**:
  - [x] 1. TDD RED: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/canvas-display-stage.test.tsx`
  - [x] 2. 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/canvas-display-stage.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/components/__tests__/canvas-display-stage.test.tsx` PASS
- **Worker Handoff Log**:
  - `canvas-display-stage.tsx`: `CanvasDisplayStage`, `CanvasDisplayStageProps` を export（R8規約準拠、0x0未生成ガード・RAIIクリーンアップ実装）。
  - `PitchGroundLayer.tsx` / `BillboardObjectLayer.tsx`: `listening?: boolean`（既定 `true`）を追加し、表示専用ステージ配下でヒット判定・ドラッグを完全無効化。既存テスト含め全29件PASS。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-02 01:52
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  編集画面の挙動・DOM・ref・既存テストとの互換性を完全に保ったまま、表示（`CanvasStage`）、ビューポート（`useCanvasViewport`）、表示専用コンポーネント（`CanvasDisplayStage`）へのSRP分離を達成。表示専用ステージ配下の Konva ヒット判定（`listening={false}`）および余計なリスナーの排除、Store Provider / ホスト境界規約、RAIIクリーンアップもすべて完璧に適合しています。全ファイル200行以下に収まり高品質です。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
