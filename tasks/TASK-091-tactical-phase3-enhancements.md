# TASK-091: Tactical 操作性・オブジェクト機能強化（Phase 3）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-27
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts` (MODIFY)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/core/store/canvas-store-actions.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/types.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **Zone 枠線改善 & スタイル維持**: `strokeWidth` デフォルトを 2px（実線）とし、描画中・通常表示・アニメーション補間・再生完了後も枠線属性（太さ・色）が一貫して維持されること
- [x] 2. **Zone HUD オプション追加**: `ZoneHud` に枠線の太さ（`Minus`/`Plus` で 0px〜8px）と枠線色（`MiniColorPicker`）の変更UIを追加し、即時反映されること
- [x] 3. **HUD 表示位置・退避改善**: `resolveArrowTarget` は曲げ制御点ではなく外接矩形を返し、`resolveZoneTarget` と共にオブジェクトの外側に十分なマージンを空けて自動配置・クランプされ、操作ハンドルと重ならないこと
- [x] 4. **複数マーカーの一括ドラッグ移動**: 複数選択されたマーカーの1人をドラッグした際、全員が相対位置を維持して同期移動し、1回のアトミックな一括更新で確定・履歴記録されること
- [x] 5. **複数マーカーのベンチ一括ドロップ**: 複数選択された状態でベンチエリアへドロップされた際、選択中の全マーカーがまとめてベンチへ移動すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs & Key Types
```ts
import type { Player, ZoneAnnotation } from '@/lib/types/tactical-unified';
import { MiniColorPicker } from './mini-color-picker';
import { Minus, Plus } from 'lucide-react';
export interface PlayerUpdateItem { id: string; patch: Partial<Player>; }
```

### 3.2 Implementation Notes & Gotchas
- **Zone 枠線消失の根本原因**: `ZoneAnnotationSchema.strokeWidth` の初期値 0 と `interpolateZone` の `zA.strokeWidth || 0` により、アニメーション再生時にノードが `strokeWidth(0)` に上書きされる不具合を修正する。
- **HUD 重なりの根本原因**: `resolveArrowTarget` が `arrow.controlPoint` をそのまま返しているため、曲げハンドルの真上に HUD が乗る。外接矩形の上端/下端を返すように統一する。
- **履歴（Undo）保護**: 複数マーカー移動時に個別 `updateMarker` を繰り返すと履歴が分割されるため、`updatePlayers` / `updateMarkers` で1回の一括保存を行う。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Zone 枠線改善 & HUD オプション
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `src/lib/tactical/interpolation-annotation.ts`
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx`
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`
- **詳細仕様**:
  - `src/lib/types/tactical-unified.ts`: `ZoneAnnotationSchema.strokeWidth` のデフォルト値を 2 に変更（`default(2)`）
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`: `getZoneStyle` で `strokeColor: zone.strokeColor || color`, `strokeWidth: zone.strokeWidth ?? 2` を返すように変更
  - `src/lib/tactical/interpolation-annotation.ts`: `interpolateZone` 内で `strokeWidth` のフォールバックを `?? 2` に統一し、両方定義時の `strokeWidth = lerp(zA.strokeWidth ?? 2, zB.strokeWidth ?? 2, ease)` および `strokeColor` の補間結果を Polygon/Rect/Ellipse の返却オブジェクトに含める
  - `src/features/tactical-unified/core/components/InteractionPreviewLayer.tsx`: `dp.tool === 'zone'` および `'zone_circle'` の描画プレビューから `dash` を削除し、実線・`strokeWidth={2}` で描画する
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx`:
    - 枠線の太さ調整UIを追加: `Minus`, `Plus` アイコン、`0px`〜`8px`（`updateZone(zone.id, { strokeWidth: ... })`）
    - 枠線色変更UIを追加: `MiniColorPicker`（`value={zone.strokeColor ?? zone.color ?? '#f59e0b'}`, `onChange={(strokeColor) => updateZone(zone.id, { strokeColor })}`, `title="枠線の色"`）
- **Testing Strategy**:
  - `src/features/tactical-unified/__tests__/zone-features.test.ts`
  - `src/lib/tactical/__tests__/unified-interpolation.test.ts`
  - 枠線太さ・枠線色が描画プレビュー・静止時・アニメーション後も保持され、HUDから変更できることをテスト
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/zone-features.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `ZoneAnnotationSchema.strokeWidth` default updated to 2; `getZoneStyle` and `interpolateZone` fallbacks aligned to `strokeWidth ?? 2` and `strokeColor`.
  - `InteractionPreviewLayer` zone & zone_circle previews changed to solid line with `strokeWidth={2}`. `ZoneHud` supports 0-8px width and strokeColor picker.

---

### Phase 2: オブジェクトHUD（フローティングメニュー）表示位置改善
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - `src/features/tactical-unified/core/components/ContextHud.tsx`
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts`
- **詳細仕様**:
  - `hud-targets.ts`:
    - `resolveArrowTarget`: `arrow.controlPoint` のみを返す実装を廃止。矢印の全構成点（points, controlPoint）から外接矩形（bounding box）を計算し、中心X `(minX + maxX) / 2`、中心Y `(minY + maxY) / 2`、全高 `Math.max(maxY - minY, 24)` を返す。Konva node からの取得時も `x: rect.x + rect.width / 2`, `y: rect.y + rect.height / 2`, `height: Math.max(rect.height, 24)` とし、オブジェクトの中心と全高を返す。
    - `resolveZoneTarget`: フォールバック時、中心Y `offset.y + (normY / 100) * offset.height + pxH / 2`、高さ `pxH`、中心X `offset.x + (normX / 100) * offset.width + pxW / 2` を返す。Konva node 取得時も `x: rect.x + rect.width / 2`, `y: rect.y + rect.height / 2`, `height: Math.max(rect.height, 30)` を返す。
    - `resolvePlayerTarget`: Konva node 取得時も `y: rect.y + rect.height / 2` を返し、一貫して中心Yをターゲットとする。
  - `use-hud-position.ts` & `ContextHud.tsx`:
    - オブジェクトの上端 `targetTop = targetY - targetHeight / 2`、下端 `targetBottom = targetY + targetHeight / 2` を基準に外周外側へオフセット配置し、画面端で適切にクランプする。
- **Testing Strategy**:
  - `src/features/tactical-unified/__tests__/context-hud.test.tsx`
  - 矢印曲げ制御点やゾーン領域にHUDが被らず、外周外側（上部/下部）にオフセットされてクランプ配置されることを検証
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/context-hud.test.tsx` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `resolveArrowTarget` calculates bounding box from points and controlPoint (returning center X/Y and height); `resolveZoneTarget` and `resolvePlayerTarget` aligned to object center Y.
  - Floating UI in `ContextHud` updated with `offset(16)` and clamped margins ensuring safe distance outside control handles.

---

### Phase 3: 複数マーカーの一括ドラッグ移動 & ベンチ連動
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/slide-player-crud-slice.ts`
  - `src/features/tactical-unified/core/store/canvas-store-actions.ts`
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`
  - `src/features/tactical-unified/core/components/BillboardObjectLayer.tsx`
  - `src/features/tactical-unified/core/types.ts`
- **詳細仕様**:
  - `slide-player-crud-slice.ts`: `updatePlayers: (slideId: string, updates: { id: string; patch: Partial<Player> }[]) => void` を追加。1回の `recordHistory` で複数プレイヤーの座標・属性を一括アトミック更新する。
  - `canvas-store-actions.ts` & `tactical-canvas-store-adapter.ts` & `core/types.ts`: `updateMarkers: (updates: { id: string; patch: Partial<Player> }[]) => void` を追加し、Store/Adapter に配線する。
  - `BillboardObjectLayer.tsx`:
    - ドラッグ開始時（`handleDragStart`）：選択マーカーが複数（`selectedIds.length > 1 && selectedIds.includes(markerId)`）の場合、選択中の全マーカーの初期座標（pxまたは正規化）を ref に保持する。
    - ドラッグ中（`handleMarkerDragMove`）：掴んでいるマーカーの移動差分（deltaX, deltaY）を計算し、`nodesRegistryRef.current.playerNodes` から他の選択マーカーの Konva Group を追従移動させる。関連するコネクトライン・矢印も追従再計算して `layer.batchDraw()` を呼ぶ。
    - ドラッグ終了時（`handleDragEnd`）：
      - ベンチドロップ（`isOverBench`）：選択中の全マーカーをまとめてベンチへ移動させる（`moveMarkerToBench`）。
      - キャンバス内移動：掴んだマーカーの移動量（deltaNormX, deltaNormY）を選択中の全マーカーに加算し、`updateMarkers` で1回のアトミック一括保存を行う（Undo履歴が1件に集約される）。単一マーカー時は既存挙動を維持。
- **Testing Strategy**:
  - `src/features/tactical-unified/__tests__/multi-marker-drag.test.ts`
  - 複数マーカー選択時に1体をドラッグした際、全員が相対移動し、ベンチドロップ時に全員がベンチへ送られることを検証
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/__tests__/multi-marker-drag.test.ts` ➔ 実装 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - `updatePlayers` / `updateMarkers` added to store and adapter for atomic bulk patch with single history record.
  - Multi-drag and bulk bench drop extracted to `useMarkerDragHandlers` preserving single-drag behavior and R8 file size limits.

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-27 19:25
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: ゾーン枠線維持・HUD退避・複数マーカードラッグ移動・ベンチ一括ドロップの完全網羅
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: 一括更新の履歴1回集約、OCP遵守、SLAP/Shell Purity遵守（useMarkerDragHandlers抽出によるBillboardObjectLayer肥大化防止）
  - [x] 4. サイレント破壊 & 既存保護: 単一マーカードラッグの既存挙動保護、既存Zone/Arrowデータとの後方互換性
- **Summary**: Phase 1〜3 の要件を漏れなく充足。ゾーン枠線の一貫性担保、矢印・ゾーン外接矩形基準によるHUD重なり解消、複数マーカードラッグの一括アトミック更新（単一履歴・Undo 1回）・ベンチ一括ドロップを美しく実装。BillboardObjectLayer もカスタムフック分離により責務・行数ともに健全に保たれている。

## 6. Rejections / Additional Tasks (不可逆修正欄)
