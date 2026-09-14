---
id: L1-Tactical-019
title: AspectRatio型の4種拡張とピッチ幾何計算ロジック・3%余白基盤の導入
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/lib/types/tactical-unified.ts
  - src/lib/data/formations.ts
  - src/app/test/pitch-aspect/pitch-constants.ts
---

# L1-Tactical-019: AspectRatio型の4種拡張とピッチ幾何計算ロジック・3%余白基盤の導入

## UX Impact
アスペクト比として `16:9`, `9:16`, `4:5`, `1:1` の4種が扱えるようになり、各比率に応じた歪みのない真円センターサークル描画と3%余白の幾何計算基盤が整備される。

## Detailed Spec
1. **AspectRatio 型の拡張 (`src/lib/types/tactical-unified.ts`)**:
   - `AspectRatioSchema = z.enum(['16:9', '9:16', '4:5', '1:1'])` に拡張。
   - `transformCoord` 等の座標変換ロジックを更新（`16:9` ⇄ `9:16` に加え、`4:5` (縦系) や `1:1` (正方形系) へのマッピングを安全に定義）。
2. **ピッチ幾何計算ユーティリティの共通化 (`src/lib/data/pitch-geometry.ts` または `src/lib/data/formations.ts`)**:
   - `/test/pitch-aspect/pitch-constants.ts` で検証された `calculatePitchGeometry` ロジックを `src/lib/tactical/pitch-geometry.ts` 等へ切り出し・共通化。
   - デフォルト余白を 3% (`marginPercent = 3.0`) に設定。
   - 各比率（横向き: 16:9, 1:1 / 縦向き: 9:16, 4:5）におけるピッチバウンズと真円半径計算を定義。

## Acceptance Criteria & Verification Commands
- [ ] `AspectRatio` 型が `'16:9' | '9:16' | '4:5' | '1:1'` を受け入れ可能であること。
- [ ] 3%余白で計算されたピッチ外枠および真円スケールが正しく導出されるユニットテストが存在すること。

### Verification
`rtk biome check src/lib/types/tactical-unified.ts`
`pnpm type-check:scoped src/lib/types/tactical-unified.ts`
