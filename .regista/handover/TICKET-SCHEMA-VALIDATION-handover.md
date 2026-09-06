# 引継ぎサマリー: TICKET-SCHEMA-VALIDATION (タスクチケット新スキーマ策定と自動バリデータ基盤実装)

## 1. タスク概要
- **チケットID**: `TICKET-SCHEMA-VALIDATION`
- **タスク名**: タスクチケット新スキーマ策定と超軽量自動バリデータ基盤の実装（GM実装権限剥奪＋Write-back最適化）
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `.regista/templates/task-ticket.md` (新スキーマテンプレート)
  - `.agents/scripts/validate-tickets.js` (新規作成した軽量バリデータ)
  - `package.json` (`pnpm tickets:validate` 登録先)
  - `AGENTS.md` (GM行動指針・チケット発行後バリデーション義務化ルール)
  - `.agents/skills/regista-gm/SKILL.md` (GMシステムプロンプト改修)

---

## 2. 背景と設計方針 (Background & Core Objectives)
GMのFast-Trackを完全廃止し、コード読み書き権限を剥奪して「チケット発行・オーケストレーション専用」へ特化させる前提において、以下のボトルネック解消と防衛機構を実装する。

### 解決すべきボトルネック & 必須要件
1. **Worker起動時の「沈黙の爆死」防止**:
   - `model`, `effort`, `target_files` (1〜3ファイルの極小AAWU), `reference_files` (参照専用) の厳格スキーマ化。
2. **DAGの整合性破綻防止**:
   - 存在しないチケットIDへの依存（Broken DAG）、自己参照、循環参照（Circular Dependency）のDFS検知。
3. **Write-back（作業ログ・検証結果）の抜け漏れ検知**:
   - チケット末尾に `## 📝 Implementation & Write-back Log` 欄を常設。`status: DONE` なのにログが未記入（テンプレート放置）の警告検知。
4. **自動実行トリガーの整備**:
   - チケット発行直後（GM）、Worker着手前、コミット/完了前などに `pnpm tickets:validate` を実行可能にする。

---

## 3. 現時点の実装状況 (Current Implementation Status)

### ① 作成・更新済みファイル
1. **`.regista/templates/task-ticket.md`**:
   - `status`, `target_files`, `reference_files` の追加。
   - `## 📝 Implementation & Write-back Log` 記入スロットの常設。
2. **`.agents/scripts/validate-tickets.js`**:
   - 超軽量（gray-matter + zod + DFS Cycle Detection）バリデータスクリプトを先行配置済み。

---

## 4. 次のチャット（Proモデル）でやるべきこと (Next Steps & Action Items)

1. **`package.json` へのスクリプト登録**:
   - `"tickets:validate": "node .agents/scripts/validate-tickets.js"` を追加。
   - `pnpm tickets` や `board:check` 等との連携確認。
2. **バリデータの稼働確認と既存チケットの警告/エラー精査**:
   - `rtk node .agents/scripts/validate-tickets.js` を実行し、過去のチケット形式との互換性を確認・調整。
3. **`AGENTS.md` および `regista-gm/SKILL.md` の改修**:
   - GMのFast-Track廃止（コード読み書きの禁止）。
   - GMがチケット発行した直後に必ず `rtk pnpm tickets:validate` を実行して合格を確認する規約を明文化。
4. **Worker向けWrite-backプロトコルの明文化**:
   - Workerが実装完了時にチケットの `status: DONE` と `## Implementation & Write-back Log` を書き戻す手順を確立。

---

## 5. 新規チャット起動用プロンプト (Prompt for New Pro Conversation)

```markdown
以下の引継ぎファイルを読み込み、タスクチケット新スキーマの本格適用と、チケット自動バリデータ（`validate-tickets.js`）の組織規約（AGENTS.md / regista-gm / package.json）への統合を完遂してください。

- 引継ぎファイル: .regista/handover/TICKET-SCHEMA-VALIDATION-handover.md
- 目的: 
  1. `package.json` への `tickets:validate` 追加
  2. バリデータスクリプト（`.agents/scripts/validate-tickets.js`）の検証と既存チケット互換性調整
  3. `AGENTS.md` / `regista-gm` からのコード実装権限剥奪と、チケット発行後 `tickets:validate` 実行義務化ルールの追加
```
