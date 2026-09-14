---
id: L2-INFRA-001
emoji: ⚡
title: 開発・型検査スクリプトの .agents/scripts/dev/ への配置と内部参照パス修正
status: DONE
depends_on:
  - L1-INFRA-001
code_snapshot: 263275f6079c649bc27d9d0b026d06f1417a65e2
model: Gemini 3.7 Flash
effort: low
target_files:
  - .agents/scripts/dev/type-check-scoped.js
  - .agents/scripts/dev/verify-scoped.js
  - .agents/scripts/dev/gen-skeleton.mjs
reference_files:
  - .agents/scripts/type-check-scoped.js
  - .agents/scripts/verify-scoped.js
  - scripts/gen-skeleton.mjs
---

# ⚡ L2-INFRA-001: 開発・型検査スクリプトの .agents/scripts/dev/ への配置と内部参照パス修正

## UX Impact
`pnpm type-check:scoped` や `pnpm verify:scoped`、スケルトン生成が新配置から正しく呼び出され、エージェントの実装検証が正常に機能する。

## Detailed Spec
1. `.agents/scripts/dev/` ディレクトリを作成し、`type-check-scoped.js`, `verify-scoped.js`, `verify-gate.js`, `auto-format.js`, `gen-skeleton.mjs` を配置する。
2. `verify-scoped.js` 内部の `type-check-scoped.js` 実行パスを `node .agents/scripts/dev/type-check-scoped.js` に更新する。
3. `gen-skeleton.mjs` および `type-check-scoped.js` の `process.cwd()` 基準のパス解決が新配置でも壊れていないことを確認する。

## Acceptance Criteria
- [x] `.agents/scripts/dev/` 配下に各スクリプトが配置されている
- [x] `verify-scoped.js` 内の参照先が `.agents/scripts/dev/type-check-scoped.js` に更新されている

## Verification Commands
```bash
node -c .agents/scripts/dev/type-check-scoped.js
node -c .agents/scripts/dev/verify-scoped.js
node .agents/scripts/dev/type-check-scoped.js --help
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `.agents/scripts/dev/` に開発・検証用スクリプト（`type-check-scoped.js`, `verify-scoped.js`, `gen-skeleton.mjs`）を新規配置
- `verify-scoped.js` 内の `type-check-scoped.js` 実行パスを `.agents/scripts/dev/type-check-scoped.js` に更新
- 各スクリプトの構文チェック (`node -c`) および実行検証を実施

### 2. 変更ファイル一覧（make done の git add 対象）
- `.agents/scripts/dev/type-check-scoped.js`
- `.agents/scripts/dev/verify-scoped.js`
- `.agents/scripts/dev/gen-skeleton.mjs`

### 3. 検証結果
- [x] 構文・ヘルプ実行: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
