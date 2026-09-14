---
id: L1-INFRA-002
emoji: 📊
title: メトリクススクリプトの .agents/scripts/metrics/ への配置と Makefile 更新
status: TODO
depends_on: []
code_snapshot: 263275f6079c649bc27d9d0b026d06f1417a65e2
model: Gemini 3.7 Flash
effort: low
target_files:
  - .agents/scripts/metrics/collect-tokens.js
  - .agents/scripts/metrics/summary-tokens.js
  - Makefile
reference_files:
  - scripts/metrics/summary-tokens.js
  - scripts/metrics/collect-tokens.js
---

# 📊 L1-INFRA-002: メトリクススクリプトの .agents/scripts/metrics/ への配置と Makefile 更新

## UX Impact
開発者およびエージェントが `make metrics` や `make metrics-summary` を実行した際に、新しい配置からトークン集計スクリプトが正常に実行される。

## Detailed Spec
1. `.agents/scripts/metrics/` ディレクトリを作成し、`scripts/metrics/collect-tokens.js` と `scripts/metrics/summary-tokens.js` を配置する。
2. `Makefile` 内の `metrics-summary`, `metrics-tail`, `metrics-raw`, `metrics-clean` ターゲットのスクリプト実行パスを `.agents/scripts/metrics/summary-tokens.js` に更新する。
3. `summary-tokens.js` 内部のコメントおよびヘルプ表示メッセージのパス表記を更新する。

## Acceptance Criteria
- [ ] `.agents/scripts/metrics/summary-tokens.js` が配置されている
- [ ] `Makefile` の metrics ターゲットが新パスを参照している
- [ ] `make metrics-summary` が正常に実行できる

## Verification Commands
```bash
node -c .agents/scripts/metrics/summary-tokens.js
make metrics-summary
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- 

### 2. 変更ファイル一覧（make done の git add 対象）
- `.agents/scripts/metrics/collect-tokens.js`
- `.agents/scripts/metrics/summary-tokens.js`
- `Makefile`

### 3. 検証結果
- [ ] `make metrics-summary` 実行: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
