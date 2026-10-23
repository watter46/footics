# TASK-040: メインキャンバス不変化とカメラ対応5層Konvaレイヤー・オーバーレイ構造への再編

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-24
- **Target Files**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (NEW)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (NEW)
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (NEW)
  - `src/features/tactical-unified/core/components/ViewportCropOverlay.tsx` (NEW)
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx` (NEW)
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PlayerLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasOverlays.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` (NEW)
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `CanvasStageContainer.tsx` のメイン `<Stage>` およびラッパー `<div>` がコンテナ全体サイズ（`containerSize.width` × `containerSize.height`）に常時固定（不変）され、選択アスペクト比に応じた中央の `pitchRect`（`vRect`）にピッチ枠が配置され、ピッチ外側の余白領域でも選手・ボールの配置およびドラッグ移動（`PlayerLayer` 等で `[0, 100]` への強制クランプを行わず余白座標を許容）が可能であること。
- [x] 2. Konva レイヤーおよびオーバーレイが仕様の5層構造（① `PitchGroundLayer`: 背景・ピッチ枠・ゾーン・矢印・選手間コネクタ・ゴースト軌道、② `BillboardObjectLayer`: 選手マーカー・ボール・テキスト＋スクリーンY座標による深さソート関数 `sortBillboardItemsByDepth`、③ `InteractionPreviewLayer`: 作図プレビュー・範囲選択枠・接続ガイド、④ `ViewportCropOverlay`: 画面基準の境界線枠、⑤ `HtmlHudOverlay`: オブジェクトオプション・境界線オプション・テキストエディタ）として実装・配置され、`core/index.ts` から export されていること。
- [x] 3. 純粋描画フラグ（`cleanRender?: boolean`）を `InteractionPreviewLayer`, `ViewportCropOverlay`, `HtmlHudOverlay`, `PitchGroundLayer`（ゴースト軌道非表示）が受け取り、`cleanRender === true` の際に編集補助表示・境界線枠・HUD・ゴースト軌道がすべて非表示になること。また既存の単体レイヤーコンポーネント（`BackgroundImageLayer`, `AnnotationLayer`, `BallLayer`, `PlayerLayer`, `DrawingPreviewLayer`, `CanvasOverlays`）の公開インターフェースと既存テストが破壊されないこと。

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { Group, Layer, Rect, Stage } from 'react-konva';
import type { PitchRectBounds } from '../utils/canvas-coordinates';
import {
  type CameraState,
  DEFAULT_CAMERA_STATE,
  worldToScreen,
} from '../utils/matrix-coordinates';
```

### 3.2 Key Interfaces & Types
```ts
export interface PitchGroundLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  nodesRegistryRef?: React.MutableRefObject<any>;
  cleanRender?: boolean;
}

export interface BillboardObjectLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  editingTextId?: string | null;
  onStartEditText?: (textId: string) => void;
  nodesRegistryRef?: React.MutableRefObject<any>;
  cleanRender?: boolean;
}

export interface InteractionPreviewLayerProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  camera?: Partial<CameraState>;
  selectionBox?: SelectionBox | null;
  activePolygonId?: string | null;
  mousePreviewPos?: { x: number; y: number } | null;
  cleanRender?: boolean;
}

export interface ViewportCropOverlayProps {
  stageSize: { width: number; height: number };
  pitchRect?: PitchRectBounds;
  visible?: boolean;
  cleanRender?: boolean;
}

export interface HtmlHudOverlayProps {
  stageSize: { width: number; height: number };
  pitchRect: PitchRectBounds;
  editingText: TextAnnotation | null;
  nodesRegistryRef?: React.MutableRefObject<unknown>;
  cleanRender?: boolean;
  onSaveText: (id: string, content: string) => void;
  onRemoveText: (id: string) => void;
  onCloseText: () => void;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```tsx
// 1. ビルボード深さソート純粋関数 (BillboardObjectLayer.tsx)
export function sortBillboardItemsByDepth<T extends { x?: number; y: number }>(
  items: readonly T[],
  pitchRect: PitchRectBounds,
  camera: Partial<CameraState> = DEFAULT_CAMERA_STATE,
): T[] {
  return [...items].sort((a, b) => {
    const screenA = worldToScreen({ x: a.x ?? 50, y: a.y }, pitchRect, camera);
    const screenB = worldToScreen({ x: b.x ?? 50, y: b.y }, pitchRect, camera);
    return screenA.y - screenB.y;
  });
}

// 2. CanvasStageContainer.tsx の不変 Stage + 5層構造
{containerSize.width > 0 && containerSize.height > 0 && (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: containerSize.width,
      height: containerSize.height,
    }}
  >
    <Stage
      ref={stageRef}
      width={containerSize.width}
      height={containerSize.height}
      dragDistance={3}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onDragStart={() => {
        setIsDragging(true);
        setIsHudOpen(false);
      }}
      onDragEnd={() => {
        setIsDragging(false);
      }}
    >
      <PitchGroundLayer
        stageSize={containerSize}
        pitchRect={vRect}
        activePolygonId={activePolygonId}
        mousePreviewPos={mousePreviewPos}
        nodesRegistryRef={nodesRegistryRef}
      />
      <BillboardObjectLayer
        stageSize={containerSize}
        pitchRect={vRect}
        editingTextId={editingTextId}
        onStartEditText={setEditingTextId}
        nodesRegistryRef={nodesRegistryRef}
      />
      <InteractionPreviewLayer
        stageSize={containerSize}
        pitchRect={vRect}
        selectionBox={selectionBox}
        activePolygonId={activePolygonId}
        mousePreviewPos={mousePreviewPos}
      />
    </Stage>

    <ViewportCropOverlay stageSize={containerSize} pitchRect={vRect} />
    <HtmlHudOverlay
      stageSize={containerSize}
      pitchRect={vRect}
      editingText={editingText}
      nodesRegistryRef={nodesRegistryRef}
      onSaveText={(textId, content) => updateText(textId, { content })}
      onRemoveText={(textId) => {
        removeText(textId);
        clearSelection();
      }}
      onCloseText={() => setEditingTextId(null)}
    />
  </div>
)}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 5層Konvaレイヤー（`PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer`）とオーバーレイ2層（`ViewportCropOverlay`, `HtmlHudOverlay`）の作成
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`, `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`, `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`, `src/features/tactical-unified/core/components/ViewportCropOverlay.tsx`, `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`, `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`, `src/features/tactical-unified/core/components/PlayerLayer.tsx`, `src/features/tactical-unified/core/components/CanvasOverlays.tsx`, `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
- **契約 (Interface)**:
  - `PitchGroundLayer.tsx`: Stage 全面の背景 `<Rect width={stageSize.width} height={stageSize.height} fill="#020617" />` と、`<Group x={pitchRect.x} y={pitchRect.y}>` 内にピッチ背景画像、`ZoneObject`、`ArrowObject`、`PlayerConnectLines`、`!cleanRender` 時の `PlayerGhostTrajectory` を描画。
  - `BillboardObjectLayer.tsx`: `sortBillboardItemsByDepth` を export し、`<Group x={pitchRect.x} y={pitchRect.y}>` 内に深さソート済みの `PlayerMarkerItem`（ドラッグ終了時は `[0, 100]` への強制クランプを行わずピッチ外余白座標も保持）、`BallObject`、`TextObject` を描画。
  - `InteractionPreviewLayer.tsx`: `cleanRender === true` のときは `null` を返し、通常時は `<Group x={pitchRect.x} y={pitchRect.y}>` 内に作図プレビュー・`PlayerConnectingGuide`、および Stage 基準の `selectionBox` を描画。
  - `ViewportCropOverlay.tsx` & `HtmlHudOverlay.tsx`: `cleanRender === true` のときは `null` を返し、それぞれ `BoundaryBoxOverlay`（`pitchRect` 渡し）と HTML HUD 群（`ContextHud`, `BoundaryBoxHud`, `PitchInlineTextEditor`）を描画。
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` で、(1) `sortBillboardItemsByDepth` がスクリーンY座標順にソートすること、(2) 5層の各コンポーネントが `pitchRect` オフセット付きで正しく描画されること、(3) `cleanRender={true}` で `InteractionPreviewLayer`, `ViewportCropOverlay`, `HtmlHudOverlay` が非表示になることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/components/ViewportCropOverlay.tsx src/features/tactical-unified/core/components/HtmlHudOverlay.tsx src/features/tactical-unified/core/components/BackgroundImageLayer.tsx src/features/tactical-unified/core/components/PlayerLayer.tsx src/features/tactical-unified/core/components/CanvasOverlays.tsx src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx` PASS
- **Worker Handoff Log**:
  - 確定シンボル: `PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer`, `ViewportCropOverlay`, `HtmlHudOverlay`, `sortBillboardItemsByDepth`。`cleanRender` 連動による編集補助非表示と、余白ドラッグ時の非クランプ座標保持を確認。

### Phase 2: `CanvasStageContainer.tsx` のメインキャンバス不変化・5層統合とバレル export 更新
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/core/index.ts`, `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
- **契約 (Interface)**:
  - `CanvasStageContainer.tsx`: `<Stage>` の `width` / `height` を `containerSize.width` / `containerSize.height`（コンテナ全体サイズ・不変）に固定し、中央のピッチ枠矩形 `vRect = calculateVirtualCanvasRect(containerSize, effectiveAspect)` を `pitchRect` として `PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer`, `ViewportCropOverlay`, `HtmlHudOverlay`, `useCanvasExport` に渡す。
  - `core/index.ts`: 新設した5層コンポーネントと Props 型、`sortBillboardItemsByDepth` を export に追加（既存レイヤーの export も維持）。
- **Testing Strategy**: `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` で、アスペクト比を `'4:5'`, `'9:16'`, `'1:1'`, `'16:9'` に切り替えても `<Stage>` の外枠サイズがコンテナサイズ（800×450）のまま不変であり、中央の `pitchRect` のみが変化することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/index.ts src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` PASS
- **Worker Handoff Log**:
  - `CanvasStageContainer` で Stage 外枠をコンテナサイズに固定し、中央の `vRect` を `pitchRect` として5層（Konva 3層＋HTMLオーバーレイ 2層）へ供給。`core/index.ts` から5層と `sortBillboardItemsByDepth` を export 完了。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-24 01:27
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  メイン `<Stage>` 外枠サイズの不変化、中央 `pitchRect`（`vRect`）オフセットによる5層構造（Konva 3層＋オーバーレイ 2層）、`worldToScreen` パイプラインを用いた `sortBillboardItemsByDepth`、`cleanRender` による編集補助・ゴースト軌道の非表示、および余白領域での非クランプ座標保持がすべて要件通り実装・テストされていることを確認しました。（軽微な改善メモ: `BillboardObjectLayer.tsx` のドラッグハンドラ群は将来的にカスタムフックへ分離するとさらに見通しが良くなります）

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
