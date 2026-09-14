---
id: L1-Tactical-046
emoji: 🟢
title: 1:1 アスペクト比ピッチの縦向き(vertical)表示化
status: DONE
depends_on: []
code_snapshot: "01e9f0d396703b0d1a144d2af921c5742b711a71"
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/lib/tactical/pitch-geometry.ts
reference_files:
  - src/lib/tactical/pitch-svg.ts
  - src/app/test/pitch-aspect/pitch-constants.ts
---

# 🟢 L1-Tactical-046: 1:1 アスペクト比ピッチの縦向き(vertical)表示化

## UX Impact
1:1（正方形）のアスペクト比を選択した際、ピッチが横向きではなく縦向きで表示されるようになり、モバイルやSNS向け縦型戦術解説のレイアウトに最適化される。

## Detailed Spec
1. src/lib/tactical/pitch-geometry.ts 内の PITCH_BOUNDARY_CONFIGS['1:1'] の orientation を 'horizontal' から 'vertical' に変更する。
2. calculatePitchGeometry 内の orientation === 'vertical' の計算分岐において、1:1正方形境界線でもピッチ比率やペナルティエリア、センターサークルが正しく縦向きに算出されることを確認・調整する。
3. センターサークルの等方スケーリング（真円性）が保たれていることを担保する。

## Acceptance Criteria
- [x] PITCH_BOUNDARY_CONFIGS['1:1'].orientation が 'vertical' になっていること
- [x] 1:1アスペクト比選択時にピッチの向き（ゴール・ペナルティエリアの位置）が縦向きとして正しく算出されること
- [x] センターサークルの真円性が維持されていること

## Verification Commands
```bash
pnpm type-check:scoped src/lib/tactical/pitch-geometry.ts
rtk biome check src/lib/tactical/pitch-geometry.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `src/lib/tactical/pitch-geometry.ts`: `PITCH_BOUNDARY_CONFIGS['1:1'].orientation` を `'horizontal'` から `'vertical'` に更新。JSDocコメントも整合性を担保。
- `src/lib/tactical/pitch-svg.ts`: JSDoc内の対応アスペクト比記述を整合化。
- `src/lib/tactical/__tests__/pitch-geometry.test.ts`: 1:1の orientation 検証を `'vertical'` に更新。

### 2. 検証結果
- [x] `pnpm type-check:scoped src/lib/tactical/pitch-geometry.ts` パス
- [x] `rtk biome check` パス
- [x] テスト実行（`pitch-geometry.test.ts`, `pitch-svg.test.ts` 全13件）: PASS

### 3. レビュー・引継ぎ特記事項（あれば）
- なし
