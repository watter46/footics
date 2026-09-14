---
id: L1-INFRA-001
emoji: 🛡️
title: ガード層スクリプトの .agents/guards/ への配置と hooks.json 更新
status: DONE
depends_on: []
code_snapshot: 263275f6079c649bc27d9d0b026d06f1417a65e2
model: Gemini 3.7 Flash
effort: low
target_files:
  - .agents/guards/oracle-guard.js
  - .agents/guards/safety-guard.js
  - .agents/hooks.json
reference_files:
  - .agents/scripts/oracle-guard.js
  - .agents/scripts/safety-guard.js
---

# 🛡️ L1-INFRA-001: ガード層スクリプトの .agents/guards/ への配置と hooks.json 更新

## UX Impact
Antigravityのエージェント安全ガードフックが新ディレクトリ `.agents/guards/` から正しく呼び出され、エージェントの安全な実行が維持される。

## Detailed Spec
1. ディレクトリ `.agents/guards/` を作成し、`.agents/scripts/oracle-guard.js`, `.agents/scripts/safety-guard.js`, `.agents/scripts/auto-format.js`, `.agents/scripts/verify-gate.js` を `.agents/guards/` に配置する。
2. `.agents/hooks.json` 内の各スクリプトパスを `./.agents/guards/...` に更新する。
3. `oracle-guard.js` 内部の相対パスが `.agents/guards/`（階層深さ2）から正しくルートおよび `.regista/` を参照できることを確認する。

## Acceptance Criteria
- [x] `.agents/guards/oracle-guard.js` および `.agents/guards/safety-guard.js` が配置されている
- [x] `.agents/hooks.json` のパスが新パスに更新されている

## Verification Commands
```bash
node -c .agents/guards/oracle-guard.js
node -c .agents/guards/safety-guard.js
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `.agents/guards/` ディレクトリにガードスクリプト群（`oracle-guard.js`, `safety-guard.js`, `auto-format.js`, `verify-gate.js`）を新規配置
- `.agents/hooks.json` 内の各スクリプトパスを `./.agents/guards/...` へ更新
- スクリプト内の相対パスおよび構文（`node -c`）を検証し、正常動作を確認

### 2. 変更ファイル一覧（make done の git add 対象）
- `.agents/guards/oracle-guard.js`
- `.agents/guards/safety-guard.js`
- `.agents/guards/auto-format.js`
- `.agents/guards/verify-gate.js`
- `.agents/hooks.json`

### 3. 検証結果
- [x] 構文チェック: PASS (`node -c .agents/guards/*.js`)
- [x] フック実行テスト: PASS (`safety-guard`, `oracle-guard` 実行確認済み)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
