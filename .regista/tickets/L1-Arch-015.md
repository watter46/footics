---
id: L1-Arch-015
emoji: 🔧
title: "[LINT] biome.json パフォーマンス・品質ルールの強化"
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - biome.json
  - .agents/knowledge/architecture-and-guidelines.md
---

# 🔧 L1-Arch-015: [LINT] biome.json パフォーマンス・品質ルールの強化

## UX Impact
Lint設定強化により、`any`型の混入・非推奨パターン（array index key等）をCIの早期で検出できるようになる。開発者のフィードバックループが短縮され、実行時バグが未然に防止される。

## 背景・問題の詳細

現在の `biome.json` は `architecture-and-guidelines.md §6`「`any`型禁止」と矛盾する設定になっている。

| 項目 | 現状 | 問題 |
|---|---|---|
| `suspicious.noExplicitAny` | `"off"` | guidelines「any禁止」と完全に矛盾 |
| `suspicious.noArrayIndexKey` | `"warn"` | リスト描画バグの原因。`error` に引き上げるべき |
| `correctness.useExhaustiveDependencies` | 未設定 | React Hooksの依存配列漏れを検出できない |

## Detailed Spec

### ファイル構成案（変更ファイルと責務）
- **`biome.json`** のみ変更: 3つのルール設定を修正・追加する

### 実装内容

1. **`noExplicitAny` を `"off"` → `"warn"` に変更**:
   ```json
   "suspicious": {
     "noExplicitAny": "warn",   // "off" → "warn"
     "noArrayIndexKey": "warn"
   }
   ```
   > **注意**: 既存コードに `any` が多数存在する可能性があるため、いきなり `"error"` にせず段階的に `"warn"` から始める。既存違反をゼロにしてから `"error"` へ昇格させる。

2. **`noArrayIndexKey` を `"warn"` → `"error"` に変更**:
   ```json
   "suspicious": {
     "noExplicitAny": "warn",
     "noArrayIndexKey": "error"  // "warn" → "error"
   }
   ```
   > **注意**: 変更前に `rtk biome check src/` を実行し、既存違反がゼロであることを確認してから変更すること。既存違反がある場合は `"warn"` のままとし、その旨をコメントに記載する。

3. **`correctness.useExhaustiveDependencies` を追加**:
   ```json
   "correctness": {
     "noUnusedVariables": "warn",
     "useExhaustiveDependencies": "warn"   // 追加
   }
   ```

### 変更後の `rules` セクション全体イメージ
```json
"rules": {
  "recommended": true,
  "style": {
    "useTemplate": "error",
    "noNonNullAssertion": "warn",
    "noExcessiveLinesPerFile": {
      "level": "warn",
      "options": { "maxLines": 300 }
    }
  },
  "complexity": {
    "noExcessiveCognitiveComplexity": {
      "level": "warn",
      "options": { "maxAllowedComplexity": 15 }
    },
    "noExcessiveLinesPerFunction": {
      "level": "warn",
      "options": { "maxLines": 100 }
    }
  },
  "correctness": {
    "noUnusedVariables": "warn",
    "useExhaustiveDependencies": "warn"
  },
  "a11y": {
    "noSvgWithoutTitle": "off",
    "useSemanticElements": "off",
    "noStaticElementInteractions": "warn",
    "useKeyWithClickEvents": "warn",
    "useButtonType": "warn",
    "noLabelWithoutControl": "warn"
  },
  "suspicious": {
    "noExplicitAny": "warn",
    "noArrayIndexKey": "warn"
  }
}
```
> ※ `noArrayIndexKey` を `"error"` に上げる場合は事前に既存違反をゼロにしてから行うこと。

## Acceptance Criteria & Verification Commands
- [ ] `noExplicitAny` が `"warn"` 以上（`"off"` でない）であること
- [ ] `useExhaustiveDependencies` が `"warn"` 以上で追加されていること
- [ ] `rtk biome check src/` がエラー増加なしで完了すること（警告増加は許容）
- [ ] `noArrayIndexKey` の設定レベルを確認し、既存違反数をコメントに記録すること

### Verification
```
rtk biome check biome.json
rtk biome check src/ --reporter=summary
```
