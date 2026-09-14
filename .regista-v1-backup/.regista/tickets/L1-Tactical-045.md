---
id: L1-Tactical-045
emoji: 🟢
title: Player・リングマーカー複製時のオプション一括解除と基本スタイル維持
status: DONE
depends_on: []
code_snapshot: "01e9f0d396703b0d1a144d2af921c5742b711a71"
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/stores/clipboard-helpers.ts
reference_files:
  - src/features/tactical-unified/stores/clipboard-slice.ts
  - src/lib/types/tactical-unified.ts
---

# 🟢 L1-Tactical-045: Player・リングマーカー複製時のオプション一括解除と基本スタイル維持

## UX Impact
選手やリングマーカーをコピー＆ペースト（複製）した際、付加されたマーカーオプション（視野コーン・コネクト線・バッジ・フォーカス枠・軌跡線等）が自動で初期化され、純粋なデフォルト状態のマーカーとして配置される。色やサイズ、チーム、背番号等は維持される。

## Detailed Spec
1. src/features/tactical-unified/stores/clipboard-helpers.ts 内の cloneAndOffsetPlayers 等で複製後のオブジェクト生成時にマーカーオプションをリセットする。
2. 解除対象オプション: visionCone: undefined, connectLines: [], badges: [], focus: undefined, trajectory: undefined。
3. コピー元から引き継ぐ属性: team, position, name, shirtNo, area, style (style.color, style.size 等のスタイル設定)。
4. リングマーカーの複製処理も同様にオプション解除と基本スタイル維持を徹底する。

## Acceptance Criteria
- [x] 選手マーカーをコピー/ペーストした際、visionCone, connectLines, badges, focus, trajectory が空またはundefinedに初期化されること
- [x] コピー元の色、サイズ、背番号、チームなどの基本属性はそのまま維持されること
- [x] リングマーカーの複製時も同様にオプションがクリアされ基本スタイルが維持されること

## Verification Commands
```bash
pnpm type-check:scoped src/features/tactical-unified/stores/clipboard-helpers.ts
rtk biome check src/features/tactical-unified/stores/clipboard-helpers.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `src/features/tactical-unified/stores/clipboard-helpers.ts`: `cloneAndOffsetPlayers` において、オブジェクト複製時に `visionCone: undefined`, `connectLines: []`, `badges: []`, `focus: undefined`, `trajectory: undefined` を明示的にリセットしつつ、元の `style`（`markerType`, `sizeScale`, `color`等）および `team`, `name`, `shirtNo`, `position`, `area` などの基本属性を維持するよう実装。
- `src/features/tactical-unified/stores/__tests__/slide-slices.test.ts`: Playerおよびリングマーカー複製時のオプション一括解除と基本スタイル維持の検証テストを追加。

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (5/5 tests passed)

### 3. レビュー・引継ぎ特記事項（あれば）
- なし
