# TASK-102: Zone 枠線・塗りの表示不整合解消 & 枠線専用ポップオーバーUI

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/lib/tactical/interpolation-annotation.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/__tests__/zone-features.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **枠線透明度 (strokeOpacity) の独立プロパティ化**:
  - `ZoneAnnotation` に `strokeOpacity`（0〜1, デフォルト 1）を追加し、塗りの透明度と完全分離。
  - `strokeWidth` のデフォルト値を `3px` に設定。
- [x] 2. **編集時と再生時の表示整合**:
  - Konva Node の `opacity` を `1` にし、`fill` に fillRGBA（`opacity` 反映）、`stroke` に strokeColorRGBA（`strokeOpacity` 反映）を適用。
- [x] 3. **枠線専用ポップオーバーUI**:
  - `zone-hud.tsx` に枠線専用ボタンを配置し、ポップオーバーで色・太さ・透明度を調整可能にする。
- [x] 4. **単体テストと検証**:
  - `zone-features.test.ts` および関連テストが PASS すること。

## 3. Context Snippets (型定義・既存コード・設計原則)
```typescript
// ZoneAnnotationSchema
strokeOpacity: z.number().min(0).max(1).default(1).optional(),
strokeWidth: z.number().min(0).max(8).default(3),
```

## 4. Implementation Phases

### Phase 1: Zone 枠線・塗りの表示不整合解消 & 枠線専用ポップオーバーUI
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/lib/tactical/interpolation-annotation.ts`
  - `src/features/tactical-unified/core/components/zones/zone-geometry.ts`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `src/features/tactical-unified/hooks/animation-node-updater.ts`
  - `src/features/tactical-unified/core/components/hud/zone-hud.tsx`
  - `src/features/tactical-unified/__tests__/zone-features.test.ts`
- **Tasks**:
  - [x] 1. 単体テスト作成（RED確認）
  - [x] 2. 型定義・描画コンポーネント・補間ロジック修正（GREEN）
  - [x] 3. HUD ポップオーバーUI改修
  - [x] 4. 検証実行（`bun run ai:check` PASS）

- **Worker Handoff Log**:
  - `getZoneStyle`: `fillRGBA`（塗りのアルファ反映）と `strokeColorRGBA`（`strokeOpacity` 反映）を返し、Konva ノードの `opacity: 1` 描画と整合。
  - `ZoneStrokePopover`: 枠線太さ・色・不透明度（スライダー＋切替）を浮動ポップオーバーに集約。`interpolation-annotation.ts` の行数制限（<=300）を単一ゾーン補間マージで遵守。

---

## 5. Reviewer Assessment (コード差分監査基準)
- **Reviewer Model**: `pro`
- **Decision**: `LGTM`
- **Reviewed At**: 2026-10-29 01:29
- **Summary**: Zone の strokeOpacity 独立、デフォルト 3px/100%、編集時・再生時のアルファ整合、枠線専用ポップオーバーUI を完全確認。
- **Audit Checklist**:
  - [x] 1. **要件合致**: 枠線透明度が独立し、編集時と再生時で表示が一致するか。
  - [x] 2. **既存機能無欠陥**: Zone の移動・変形・モーフィングアニメーションが正常に動作するか。
