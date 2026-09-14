---
id: L1-Tactical-052
emoji: 🐛
title: ピッチ移動・ズーム後のAutoFitPitch境界線フィット計算の修正
status: DONE
depends_on: []
code_snapshot: 75ed3d88a4734dbfb343c8c91beb3ad238fb42de
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/stores/pitch-slice.ts
  - src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
  - src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts
reference_files:
  - src/features/tactical-unified/stores/boundary-box-helpers.ts
---

# 🐛 L1-Tactical-052: ピッチ移動・ズーム後のAutoFitPitch境界線フィット計算の修正

## UX Impact
ピッチをパン移動したりズームした後に「AutoFitPitch」を実行しても境界線がずれたり意図しない位置に飛ばず、表示中のピッチ外枠に正確にフィットするようになる。

## Detailed Spec
1. 現状の問題点: `boundary-box-helpers.ts` の `computePitchFitBoundaryBox` には正規化％変換の正しい計算式が実装されている。しかし、呼び出し元の `pitch-slice.ts` の `autoFitBoundaryBox` において、第5引数に必要な `pitchRect` が渡されていない。その結果、デフォルトの静的定数（16:9 なら 800px 等）がフォールバックとして使われてしまい、実際のブラウザ Stage サイズ（可変 px）と食い違って境界線の位置・サイズがずれる。
2. `pitch-slice.ts` の修正: `autoFitBoundaryBox: (slideId?: string, pitchRect?: { width: number; height: number }) => void` のようにシグネチャを拡張。内部で `computePitchFitBoundaryBox` を呼び出す際、この `pitchRect` を引き渡すようにする。
3. `boundary-box-hud.tsx` の修正: `<BoundaryBoxHud>` では既にコンポーネントの props で `pitchRect` を受け取っている（現在は `_pitchRect` などとして未使用）。これを活用し、`onPitchFit={() => autoFitBoundaryBox(activeSlideId, pitchRect)}` として渡すように修正する。
4. `tactical-unified-store.test.ts` の更新: `autoFitBoundaryBox` に `pitchRect` を渡した場合（および未指定時のフォールバック）に、`panX, panY, zoom` を反映した正規化%が正確に算出されることを検証するテストを整備・更新する。

## Acceptance Criteria
- [ ] ピッチを任意の位置にパン移動・ズームした後に「AutoFitPitch」を実行した際、境界線が表示中のピッチ外枠に正確にフィットすること
- [ ] `tactical-unified-store.test.ts` のテストがすべてPASSすること

## Verification Commands
```bash
rtk vitest run src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts
rtk pnpm type-check:scoped src/features/tactical-unified/stores/pitch-slice.ts src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
rtk biome check src/features/tactical-unified/stores/pitch-slice.ts src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `PitchSlice` の `autoFitBoundaryBox` に `pitchRect` 引数を追加し、`computePitchFitBoundaryBox` に Stage 描画サイズを引き渡すよう拡張
- `BoundaryBoxHud` で受け取った `pitchRect` を `onPitchFit` 経由で `autoFitBoundaryBox` に引き渡すように修正
- `tactical-unified-store.test.ts` に可変 Stage サイズの `pitchRect` を渡した場合の `autoFitBoundaryBox` 正常計算テストを追加

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- src/features/tactical-unified/stores/pitch-slice.ts
- src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
- src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (62 passed)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
