---
id: L2-CANVAS-002
emoji: 🟡
title: BoundaryBox表示制御とエクスポート時の動的AutoFitクロップ適用
status: DONE
depends_on: ["L1-STATE-002"]

code_snapshot: 9eb891c421c769d09e6114b732d3533bf49903b9

model: Gemini 3.7 Flash
effort: medium

target_files:
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts
  - src/features/tactical-unified/hooks/konva-export-helpers.ts

reference_files: []
---

# 🟡 L2-CANVAS-002: BoundaryBox表示制御とエクスポート時の動的AutoFitクロップ適用

## UX Impact
境界線が非表示状態であっても、エクスポート実行時は常に「現在のピッチ位置・サイズ」でピッチ領域のみが正しく書き出されるようになります。

## Detailed Spec
1. `BoundaryBox` コンポーネントは `visible: false` の場合、画面上に一切枠線やハンドルを描画しないように修正する。
2. `konva-export-helpers.ts` において、エクスポート時のクロップ領域（`calculateExportCropRect`等）を算出する際、BoundaryBoxが非表示状態でも常に現在のピッチ位置とサイズ（`pitchBounds` / `pitchTransform`）に基づき、AutoFitPitch矩形を動的に算出・適用するようにパイプラインを修正する。
3. 明示的にBoundaryBoxが表示され、ユーザーが手動でリサイズしている場合は、そのカスタム境界線を優先するロジックを保持する。

## Acceptance Criteria
- [ ] `visible: false` 時に境界線UIが非表示となること。
- [ ] エクスポートヘルパー関数が、境界線非表示状態でも現在のピッチ矩形を正しくクロップ領域として返すこと。

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts src/features/tactical-unified/hooks/konva-export-helpers.ts
rtk biome check src/features/tactical-unified/objects/canvas/components/boundary-box.tsx src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts src/features/tactical-unified/hooks/konva-export-helpers.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `boundary-box.tsx`: `box.visible` が false の場合に境界線UI（枠線・ハンドル等）を非表示 (`return null`) にするよう制御を追加。`BoundaryBoxOutline` コンポーネントを分割して関数行数を削減。
- `canvas-pitch-transform-helper.ts`: `ExportCropRectOptions` に `pitchBounds` および `pitchTransform` を追加。`calculateExportCropRect` において `boundaryBox.visible` が true の場合のみカスタム境界線を適用し、非表示または無効時は動的ピッチ矩形（`pitchBounds` / `pitchTransform`）をクロップ領域として返すよう更新。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/components/boundary-box.tsx`
- `src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
