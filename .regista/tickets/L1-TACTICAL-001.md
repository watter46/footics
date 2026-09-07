---
id: L1-TACTICAL-001
emoji: 🔧
title: 座標変換ヘルパーの純粋関数化と単体テスト
status: DONE
depends_on: []

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: 1938680aa6835a87f2301a183d53d18ba3d08117

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash [high]
effort: medium

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-pitch-transform-helper.ts

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/types/index.ts
---


# 🔧 L1-TACTICAL-001: 座標変換ヘルパーの純粋関数化と単体テスト

## UX Impact
なし（内部ロジックのリファクタリング）

## Detailed Spec
1. 0.0〜100.0% のピッチ正規化座標とCanvas実座標の相互変換を完全に純粋関数化する。
2. KonvaのZoom/Pan状態（scaleX, scaleY, x, y）に依存せず、絶対的な0-100%からCanvasの実幅(Stage width/height)に対する比率計算へ整理する。
3. Vitestを用いた単体テストを実装する。※引継ぎでは `src/lib/tactical/` と言及があるが、既存の `helpers/` ディレクトリ内でまずは責務を純粋関数に分離することを優先する。

## Acceptance Criteria
- [x] 座標変換ヘルパーが外部状態に依存しない純粋関数になっていること
- [x] 対象の単体テストがパスすること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
rtk biome check src/features/tactical-unified/objects/canvas/helpers/
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- 座標変換関数（`normToPx`, `pxToNorm`, `normToPitch`, `pitchToNorm`, `screenToPitch`, `pitchToScreen`, `getPitchAndNormPos`, `normToScreen`, `clampNorm`, `clampNormPoint`）を外部状態に依存しない純粋関数として整理・定義。
- Vitest による網羅的な単体テスト（`canvas-coordinates.test.ts`, 15テストケース）を新規作成し、正規化変換、境界値clamp、Zoom/Pan/Tilt時の相互変換の数学的正確性を検証。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts`
- `src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.test.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (15 passed)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
