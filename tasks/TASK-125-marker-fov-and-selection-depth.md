# TASK-125: マーカー視野色変更・最前面表示・操作メニュー表示復旧

## 1. Metadata
- **Status**: `TODO`
- **Created**: 2026-11-01
- **Target Files**:
  - `src/lib/types/tactical/player.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-vision-cone.tsx` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/player-quick-actions.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx` (NEW)
  - `src/features/tactical-unified/core/components/billboard-depth-sort.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [ ] 1. 視野コーンのデフォルト初期色がライトブルー（`#38bdf8`）となり、描画時に控えめな発光（シャドウ）が付与されること。
- [x] 2. 視野コーンが有効な時、マーカー操作メニュー（HUD）に視野カラー選択用の `MiniColorPicker` が表示され、パレットから色を変更して `player.visionCone.color` に即座に反映できること。
- [ ] 3. 視野調整ハンドルのドラッグ操作時、およびマーカー移動ドラッグ完了時に `isDragging: false` と `isHudOpen: true` が正しく処理され、操作後にマーカーをクリックまたは再選択した際に確実に操作メニューが表示されること。
- [x] 4. 選択中のマーカーが非選択マーカーよりも手前（最前面）に動的ソートされて描画され、選択解除で通常の奥行き順（Y座標順）に戻ること。
- [x] 5. 選択中のゾーンおよび矢印が、それぞれの描画配列内で非選択要素よりも手前（配列末尾）に動的に並び替えられて描画されること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { MiniColorPicker } from './mini-color-picker';
import { useCanvasStore } from '@/features/tactical-unified/core/hooks/use-canvas-store';
import type { Player, ZoneAnnotation, ArrowAnnotation } from '@/lib/types/tactical-unified';
import { sortBillboardItemsByDepth, type BillboardItem } from './billboard-depth-sort';
```

### 3.2 Key Interfaces & Types
```ts
// 視野コーンスキーマの初期色: #38bdf8
export const VisionConeSchema = z.object({
  id: z.string(),
  angleRad: z.number().min(0).max(Math.PI * 2 + 0.1),
  spreadRad: z.number().min(0.1).max(Math.PI),
  radius: NormalizedCoordSchema.default(13),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#38bdf8'),
  opacity: z.number().min(0).max(1).default(0.3),
  visible: z.boolean().default(true),
});

// ソート関数シグネチャの拡張
export function sortBillboardItemsByDepth<T extends { x?: number; y: number }>(
  items: readonly T[],
  pitchRect: PitchRectBounds,
  camera?: Partial<CameraState>,
  selectedIds?: readonly string[],
): T[];
```

### 3.3 Implementation Notes & Gotchas
```ts
// Gotcha 1: PlayerVisionConeHandles のハンドルドラッグ終了時に e.cancelBubble = true されているため
// 親 Stage の onDragEnd が発火せず isDragging: true がスタックする。
// ハンドル側で useCanvasStore の setIsDragging(false) / setIsHudOpen(true) を明示的に呼ぶこと。
// Gotcha 2: useMarkerDragHandlers の handleDragEnd で setIsHudOpen(true) を呼び出してメニューを再表示すること。
// Gotcha 3: 最前面表示はデータストアの配列を変更せず、JSX レンダリング時の配列ソート/並び替えで行うこと。
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1a: 視野初期色・発光 & ドラッグライフサイクル復旧
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/player.ts`
  - `src/features/tactical-unified/objects/player/components/player-vision-cone.tsx`
  - `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx`
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
- **契約 (Interface)**:
  - `VisionConeSchema.shape.color` の default は `#38bdf8`。
  - `PlayerVisionCone`: 常時 `shadowColor={isSelected ? '#38bdf8' : cone.color}`、`shadowBlur={8}`、`shadowOpacity={isSelected ? 0.8 : 0.4}`。
  - `PlayerVisionConeHandles`: ハンドルの `onDragStart` で `setIsDragging(true)` / `setIsHudOpen(false)`、`onDragEnd` で `setIsDragging(false)` / `setIsHudOpen(true)`（`e.cancelBubble = true` を維持）。
  - `useMarkerDragHandlers.handleDragEnd`: 終了時に `setIsHudOpen(true)` を呼び出し、依存配列に `setIsHudOpen` を追加。
- **Tasks**:
  - [x] 1. `player.ts`, `player-vision-cone.tsx`, `player-vision-cone-handles.tsx`, `use-marker-drag-handlers.ts` を実装
  - [x] 2. `bun run ai:check src/features/tactical-unified/objects/player/components/player-vision-cone.tsx` PASS 確認
  - [x] 3. `bun run ai:commit -m "fix(tactical): update vision cone default color, shadow, and restore hud drag state" src/lib/types/tactical/player.ts src/features/tactical-unified/objects/player/components/player-vision-cone.tsx src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
- **Worker Handoff Log**:
  - `VisionConeSchema` default color: `#38bdf8`。ハンドルドラッグ開始/終了時およびマーカー移動ドラッグ終了時の `setIsDragging` / `setIsHudOpen` ライフサイクルを同期復旧。

---

### Phase 1b: 視野カラー変更 MiniColorPicker & TDD
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/player-quick-actions.tsx`
  - `src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx`
- **契約 (Interface)**:
  - `VisionConeAction`: 視野有効時、隣に `MiniColorPicker` を表示し色変更を `updateMarker(player.id, { visionCone: { ...player.visionCone, color } })` で保存。初期トグル時の default color も `#38bdf8`。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx`:
    - 視野コーンがOFFの時は視野カラーピッカーが表示されないこと。
    - 視野コーンがONの時に視野カラーピッカーが表示され、色変更時に `updateMarker` が呼ばれること。
- **Tasks**:
  - [x] 1. TDD実装: `player-quick-actions.test.tsx` を作成 ➔ RED確認
  - [x] 2. `player-quick-actions.tsx` を実装 ➔ GREEN確認
  - [x] 3. `bun run ai:check src/features/tactical-unified/core/components/hud/player-quick-actions.tsx` PASS 確認
  - [x] 4. `bun run ai:commit -m "feat(tactical): add vision cone color picker to marker quick hud" src/features/tactical-unified/core/components/hud/player-quick-actions.tsx src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx`
- **Worker Handoff Log**:
  - `VisionConeAction`: 視野有効時に `MiniColorPicker`（title="視野カラー変更"）をレンダリングし、カラーパレット選択で `updateMarker(player.id, { visionCone: { ...player.visionCone, color } })` が即時反映される。初期トグル色も `#38bdf8` に同期済み。

---

### Phase 2: 選択中オブジェクト・マーカーの動的最前面表示
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/billboard-depth-sort.ts`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/components/PitchGroundLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts`
- **契約 (Interface)**:
  - `sortBillboardItemsByDepth`: `selectedIds` に含まれるアイテム（`item.data.id` が一致するもの）を非選択アイテムよりも配列の末尾（最前面）に配置する。
  - `BillboardObjectLayer`: `sortBillboardItemsByDepth` の第4引数に `selectedIds` を渡す。
  - `PitchGroundLayer`: `zones` と `arrows` をレンダリングする際、選択中の要素を配列末尾にソートして描画する。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts`:
    - Y座標が大きい（手前）アイテムAと、Y座標が小さい（奥）アイテムBがある場合、非選択時はB ➔ Aの順でソートされること。
    - Bが `selectedIds` に含まれる場合、Bが配列末尾（最前面）に移動し、A ➔ Bの順になること。
- **Tasks**:
  - [x] 1. TDD実装: `billboard-depth-sort.test.ts` を作成 ➔ RED確認
  - [x] 2. `billboard-depth-sort.ts`, `BillboardObjectLayer.tsx`, `PitchGroundLayer.tsx` を実装
  - [x] 3. `bun run ai:check src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` PASS 確認
  - [x] 4. `bun run ai:commit -m "feat(tactical): render selected markers, zones, and arrows on top" src/features/tactical-unified/core/components/billboard-depth-sort.ts src/features/tactical-unified/core/components/BillboardObjectLayer.tsx src/features/tactical-unified/core/components/PitchGroundLayer.tsx src/features/tactical-unified/core/components/__tests__/billboard-depth-sort.test.ts`
- **Worker Handoff Log**:
  - `sortBillboardItemsByDepth`: `selectedIds` 指定時に選択中アイテムを末尾（最前面）に配置。`PitchGroundLayer` にて `sortedZones`, `sortedArrows` を描画時に末尾ソートし、データストア配列を破壊せず描画優先度を更新。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 
- **Decision**: `TODO`
- **Audit Checklist**:
  - [ ] 1. 要件網羅性 & テスタビリティ: 視野色変更・最前面表示・メニュー表示復旧がすべて満たされているか
  - [ ] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: ドラッグ完了時の状態整合性と副作用クリーンアップ
  - [ ] 3. 設計負債 & 拡張性: データストア配列を直接書き換えず、描画レイヤーでの純粋なソートになっているか
  - [ ] 4. サイレント破壊 & 既存保護: 既存のマーカー描画・コネクトライン・矢印描画に副作用がないか
- **Summary**:

## 6. Rejections / Additional Tasks (不可逆修正欄)
