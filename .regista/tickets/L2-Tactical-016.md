---
id: L2-Tactical-016
title: Xメディア比率プリセット適用のStore実装
status: DONE
depends_on:
  - L1-Tactical-014
model: Gemini 3.8 Flash
effort: low
context_files:
  - src/stores/tactical-unified-store.ts
  - src/stores/__tests__/tactical-unified-store.test.ts
---

# L2-Tactical-016: Xメディア比率プリセット適用のStore実装

## UX Impact
ユーザーが用途（①画像1枚 4:5、②画像2枚 9:16、③縦動画 9:16、④ピッチ全体横 16:9）を選ぶだけで、キャンバスの境界線（トリミング枠）がピッチ中央・最大サイズへ一瞬で最適化されます。

## Detailed Spec
1. `src/stores/tactical-unified-store.ts` に以下のActionを追加:
   - `applyXMediaPreset: (presetKey: 'single_image_4_5' | 'carousel_image_9_16' | 'feed_video_9_16' | 'pitch_overview_16_9' | 'pitch_fit', slideId?: string) => void;`
2. `applyXMediaPreset` では、現在のキャンバス方向（横16:9 または 縦9:16）に応じて、指定されたアスペクト比でキャンバス中央に最大化配置される `boundaryBox`（X, Y, Width, Height）を算出しスライドへ反映。
3. `tactical-unified-store.test.ts` にプリセット適用関数のユニットテストを追加。

## Acceptance Criteria & Verification Commands
- [ ] 各Xプリセット（4:5, 9:16, 16:9）を指定して `applyXMediaPreset` を呼んだ際に、正しいアスペクト比の BoundaryBox が設定されること。
- [ ] 既存の `autoFitBoundaryBox` と共存し、スライド間で正しく保持されること。

### Verification
`rtk biome check src/stores/tactical-unified-store.ts`
`pnpm type-check:scoped src/stores/tactical-unified-store.ts`
`rtk vitest run src/stores/__tests__/tactical-unified-store.test.ts`
