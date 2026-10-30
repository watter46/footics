# TASK-118: 2D編集キャンバスの作業用ズーム・パン分離と完全平面化（3Dカメラ演出との混線解消）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts` (MODIFY)
  - `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. **2D作業用ビューポートと3D演出用カメラの完全分離**: `createTacticalCanvasStoreAdapter` 内で2D編集キャンバス専用のローカルな作業ビューポート状態（`editorViewport: PitchTransform`、初期値 `{ panX: 0, panY: 0, zoom: 1, tilt: 0, isLocked: false }`）を保持し、`CanvasStore` の `pitchTransform` / `setPitchTransform` / `resetPitchTransform` / `setPitchLocked` はこの `editorViewport` のみを更新し、マスターストアの `slide.pitchTransform`（3Dカメラワーク演出用）を一切書き換えないこと。
- [x] 2. **Konva 3レイヤーへの2D拡大・移動（Zoom/Pan）の接続**: `PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer` の各ピッチ `<Group>` に対して、`calculatePitchTransform(pitchRect, pitchTransform.panX, pitchTransform.panY, pitchTransform.zoom, 0)` で算出した `x, y, scaleX, scaleY` を適用し、左画面でのホイール拡大・スペースドラッグ移動が実際に画面描画へ反映されること。
- [x] 3. **2D拡大・移動時のポインタ座標逆変換**: `getPointerCoordinates(e, vRect, pitchTransform)` および `useCanvasPointerInteraction` / `dispatchPointerMove` で `stageToPitch` を用いた2Dズーム・パン逆変換を行い、拡大・移動した状態でも矢印・ゾーン描画やクリック座標がズレないこと。
- [x] 4. **左画面（2D編集キャンバス）からの3Dチルト操作UIの非表示化**: `BoundaryBoxHud` の `showTiltControls` のデフォルト値を `false` に変更し、平面編集専用の左画面に不要な3Dチルト設定が表示されないようにすること（明示的に `showTiltControls={true}` を渡した場合のみ表示）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { calculatePitchTransform } from '@/features/tactical-unified/core/utils/canvas-pitch-transform-helper';
import { stageToPitch, pitchToNorm, type PitchTransformState } from '@/features/tactical-unified/core/utils/canvas-coordinates';
import type { PitchTransform } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
// src/features/tactical-unified/core/utils/geometry.ts
export function getPointerCoordinates(
  e: KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>,
  vRect: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    allowOverflow?: boolean;
  },
  transform?: PitchTransformState,
): { pixelPos: { x: number; y: number }; normPos: { x: number; y: number } };
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// - tactical-canvas-store-adapter.ts:
//   let editorViewport: PitchTransform = { ...DEFAULT_PITCH_TRANSFORM, isLocked: false };
//   setPitchTransform: (patch) => {
//     const next = typeof patch === 'function' ? patch(editorViewport) : { ...editorViewport, ...patch };
//     editorViewport = { ...next, tilt: 0 };
//     updateAndNotify();
//   }
//   resetPitchTransform: () => {
//     editorViewport = { ...DEFAULT_PITCH_TRANSFORM, isLocked: editorViewport.isLocked };
//     updateAndNotify();
//   }
//   setPitchLocked: (locked) => {
//     if (editorViewport.isLocked !== locked) {
//       editorViewport = { ...editorViewport, isLocked: locked };
//       updateAndNotify();
//     }
//   }
// - getPointerCoordinates: transform が渡され (zoom !== 1 || panX !== 0 || panY !== 0) の場合、stageToPitch({ x, y }, { x: vRect.x ?? 0, y: vRect.y ?? 0, width: vRect.width, height: vRect.height }, transform.panX ?? 0, transform.panY ?? 0, transform.zoom ?? 1) で relX, relY を算出すること。pixelPos は Stage 座標 { x, y } のまま維持すること。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: アダプターでの2D作業用ビューポート (`editorViewport`) 分離と3Dカメラ保護
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts`
- **契約 (Interface)**:
  - `createTacticalCanvasStoreAdapter`: `editorViewport` をローカル保持し、`setPitchTransform`, `resetPitchTransform`, `setPitchLocked` がマスターストアの `activeSlide.pitchTransform` を変更せず `editorViewport`（常に `tilt: 0`）のみを更新してリスナーに通知する。
- **Testing Strategy**:
  - `tactical-canvas-store-adapter.test.ts`: アダプターの `setPitchTransform({ zoom: 2, panX: 50, panY: 30 })` を呼ぶと `adapter.getState().pitchTransform` は更新されるが、`useTacticalUnifiedStore.getState()` のスライド `pitchTransform`（3Dカメラ用）は初期値のまま保護されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` PASS
- **Worker Handoff Log**:
  - `editorViewport`（常に `tilt: 0`）をアダプター内クロージャでローカル保持し、マスターストアのスライドカメラ状態を変更せずリスナーに通知するよう分離。

---

### Phase 2: ポインタ座標逆変換の統合と BoundaryBoxHud の3Dチルト非表示化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/utils/geometry.ts`
  - `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts`
  - `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`
  - `src/features/tactical-unified/core/components/BoundaryBoxHud.tsx`
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **契約 (Interface)**:
  - `geometry.ts`: `getPointerCoordinates(e, vRect, transform)` に第3引数 `transform?: PitchTransformState` を追加し、`stageToPitch` による2Dズーム・パン逆変換を適用。
  - `use-canvas-pointer-interaction.ts` & `canvas-pointer-dispatcher.ts`: `useCanvasStore((s) => s.pitchTransform)` を取得して `getPointerCoordinates` に渡す。
  - `BoundaryBoxHud.tsx`: `showTiltControls = false` をデフォルトに変更。
- **Testing Strategy**:
  - `hud-and-editor.test.tsx`: `BoundaryBoxHud` のデフォルト表示で 3D Tilt コントロールが非表示であり、`showTiltControls={true}` 指定時のみ表示されること、および `getPointerCoordinates` にズーム・パン変換（`transform`）を渡した際に `stageToPitch` 逆変換された `normPos` が返り `pixelPos` は Stage 座標のまま維持されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/utils/geometry.ts src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts src/features/tactical-unified/core/components/BoundaryBoxHud.tsx src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` PASS
- **Worker Handoff Log**:
  - `getPointerCoordinates(e, vRect, transform)` に `transform` による `stageToPitch` 逆変換を追加、`BoundaryBoxHud` の `showTiltControls` デフォルトを `false` に変更。

---

### Phase 3: Konva 3レイヤーへの2Dズーム・パン描画接続
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **契約 (Interface)**:
  - `PitchGroundLayer.tsx`, `BillboardObjectLayer.tsx`, `InteractionPreviewLayer.tsx`: `const pitchTransform = useCanvasStore((s) => s.pitchTransform);` と `const groupTransform = calculatePitchTransform(pitchRect, pitchTransform.panX, pitchTransform.panY, pitchTransform.zoom, 0);` を計算し、ピッチ `<Group x={groupTransform.x} y={groupTransform.y} scaleX={groupTransform.scaleX} scaleY={groupTransform.scaleY}>` に適用。
- **Testing Strategy**:
  - `hud-and-editor.test.tsx`: 2Dズーム・パン状態（`pitchTransform: { zoom: 2, panX: 40, panY: -20, tilt: 0, isLocked: false }`）での各レイヤー描画およびエディタ統合動作が正常に機能することを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` ➔ 実装 ➔ `bun run ai:check src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx` PASS
- **Worker Handoff Log**:
  - `PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer` の各ピッチ `<Group>` に `calculatePitchTransform(pitchRect, pitchTransform.panX, pitchTransform.panY, pitchTransform.zoom, 0)` を接続し、2Dズーム・パン描画を完全連動。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 19:47
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**:
  2D作業用ビューポート（editorViewport）と3D演出用カメラ（slide.pitchTransform）の完全分離、Konva 3レイヤーへのズーム・パン描画接続、getPointerCoordinatesでのstageToPitch逆変換統合、およびBoundaryBoxHudの3D Tiltデフォルト非表示化を高品質に確認。Store Provider経由のアクセス規約も厳守されている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
