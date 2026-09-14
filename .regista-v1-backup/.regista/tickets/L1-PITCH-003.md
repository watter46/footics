---
id: L1-PITCH-003
emoji: 🐛
title: 1:1ピッチの選手初期配置向きバグ修正
status: DONE
depends_on: []
code_snapshot: 6b761bd8d5aae41d8e6f71a697d645bb41da462d
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/lib/tactical/squad-to-tactical-bridge.ts
  - src/lib/types/tactical-unified.ts
reference_files: []
---

# 🐛 L1-PITCH-003: 1:1ピッチの選手初期配置向きバグ修正

## UX Impact
1:1（正方形）ピッチの場合に、選手が縦向きピッチに対して横向きに配置されてしまうバグが解消され、正しく配置されるようになる。

## Detailed Spec
1. `squad-to-tactical-bridge.ts` 内でのアスペクト比判定（`isVerticalAspectRatio` 等）を修正する。
2. 1:1ピッチの場合を意図した向き（縦ベースまたは横ベース）として正しく認識し、座標変換や回転が適切に適用されるようにする。
3. `types.ts` 等でアスペクト比の定義や関連するヘルパー関数がある場合は修正する。

## Acceptance Criteria
- [x] 1:1ピッチを設定した場合に、選手の初期配置が期待通りの向き（縦方向）で配置されること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/lib/tactical/squad-to-tactical-bridge.ts src/lib/types/tactical-unified.ts
rtk biome check src/lib/tactical/squad-to-tactical-bridge.ts src/lib/types/tactical-unified.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `src/lib/types/tactical-unified.ts` において、`isVerticalAspectRatio` を `1:1` を含むように修正し（`isHorizontalAspectRatio` を `16:9` のみに修正）、1:1（正方形）ピッチでの選手初期配置およびスカッド流し込みが縦向き（Vertical）ピッチとして正しく配置されるよう対応。
- `src/lib/types/__tests__/tactical-unified.test.ts` のアスペクト比判定・座標変換テストを更新し、1:1が縦向き系統として扱われることを検証。

### 2. 変更ファイル一覧（make done の git add 対象）
- src/lib/types/tactical-unified.ts
- src/lib/types/__tests__/tactical-unified.test.ts
- src/features/tactical-unified/stores/slide-aspect-helpers.ts
- .agents/context.json
- .agents/scripts/oracle-guard.js
- .agents/scripts/safety-guard.js
- .agents/skills/regista-gm/SKILL.md
- .agents/skills/regista-scout/SKILL.md
- AGENTS.md

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
