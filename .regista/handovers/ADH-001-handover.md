# 引継ぎサマリー: ADH-001 (モデル判定ロジックとテンプレート遵守機構の設計・実装)

## 1. タスク概要
- **チケットID**: `ADH-001`
- **ステータス**: `IN_PROGRESS`
- **タスク名**: モデル判定ロジックとテンプレート遵守機構（3重ガードレール）の設計・実装
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `AGENTS.md`
  - `.agents/skills/regista-gm/SKILL.md`
  - `.agents/skills/regista-scout/SKILL.md`
  - `.agents/scripts/safety-guard.js`
  - `.agents/scripts/validate-tickets.js`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **手詰まりの原因**: エージェント体系の最適化・コミット完了後、次のフェーズ（具体的判定ロジックとテンプレート遵守の3重ガードレールの実装）へ進むにあたり、コンテキスト肥大化を防止するため新規チャットへ引き継ぎ。
- **試行して破棄したアプローチ**: エージェントの自発的な作文に頼るテンプレート適用（LLMの性質上フォーマット崩れが発生するため、機械的ガードレールへ移行決定）。

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)

### ① チケットモデル / Effort の自動推奨・具体的判定ロジック
GMがチケット発行時に難易度・影響範囲から決定論的に選定するルール：
- **Tier 1 (極小・定型)**: 純粋関数、型定義追加、UIスタイリング、単体テスト（1〜2ファイル、副作用なし）
  ➡️ `model: "Gemini 3.7 Flash"`, `effort: "low"`
- **Tier 2 (標準ロジック)**: 状態管理（Zustand）、フック実装、コンポーネント間連携（2〜3ファイル）
  ➡️ `model: "Gemini 3.7 Flash"`, `effort: "medium"`
- **Tier 3 (非同期・複雑)**: WebCodecs/Canvas描画、ServiceWorker/拡張メッセージング、競合制御
  ➡️ `model: "Gemini 3.7 Flash"`, `effort: "high"` または `model: "Gemini 3.8 Flash"`, `effort: "high"`
- **GM (統括・分解)**: 軽微な単一機能 ➡️ `Flash 3.8 [high]` / 複数ドメイン・大型機能 ➡️ `Gemini 3.1 Pro [high]`
- **難関Worker (Sonnet系) の廃止 & Fail-Fast一本化**: Flashで解けないチケットはGMに差し戻して再分解（`BLOCKED` + `retry {ID}`）する。

### ② テンプレート発火・中身を「100%遵守」させる3重ガードレール
- **仕組み1 (最強・物理遮断)**: `PreToolUse / PostToolUse` フック（`safety-guard.js` 等）による正規表現・スキーマ検査。違反時は実行ブロック（Deny）して自律修正ループを回す。
- **仕組み2 (認知的制約)**: スキル定義（`SKILL.md`）への Few-Shot（❌ Bad例 / ⭕ Good例）の明記と厳格なシステムプロンプト。
- **仕組み3 (機械的生成)**: CLIスクリプト（`make` / `rtk`）によるテンプレートの直接流し込み（エージェントに自由作文させずコマンドを叩かせる）。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
1. **ScoutのYAML/Markdownプロトコル移行**: `.agents/skills/regista-scout/SKILL.md` 改修完了
2. **GMのチケット直接保存化 & `regista-ticket-writer` 削除**: 完了
3. **`quality-harness` 削除 & `football-researcher`/`whoscored-analyst` の `src/syntax/` 移動**: 完了
4. **コミット完了**: `263275f refactor(agents): optimize regista agent hierarchy and scout protocols`

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. **仕組み1 (フック検証)**: `.agents/scripts/safety-guard.js` またはフック層に、Worker完了報告フォーマット（`✅ 実装完了...`）および差し戻し（`⚠️ チケット前提不備...`）の構文検証・違反ブロック処理を実装する。
2. **仕組み2 (Few-Shot)**: 各Workerスキル（`regista-frontend`, `regista-canvas`, `regista-data`, `regista-extension` 等）の `SKILL.md` に Good/Bad の具体例を反映する。
3. **仕組み3 (CLI出力統合)**: 必要に応じて `make done` や `rtk report` 側でフォーマットを強制出力する仕組みを整備する。
4. **モデル判定バリデータ更新**: `.agents/scripts/validate-tickets.js` に上記の Tier 1〜3 ホワイトリスト整合性チェックを組み込む。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

```markdown
現在、FooticsのRegista組織改善タスク「モデル判定ロジックとテンプレート遵守機構（3重ガードレール）の実装」を進めています。
前回のチャットでアーキテクチャ・プロトコルの基本方針を決定・コミットし、詳細実装を進めるため新規チャットへ引き継ぎました。

### 前提コンテキスト
- **引継ぎサマリーファイル**: file:///home/watter46/src/footics/.regista/handovers/ADH-001-handover.md
- **関連ファイル**:
  - `AGENTS.md`
  - `.agents/scripts/safety-guard.js`
  - `.agents/scripts/validate-tickets.js`
  - `.agents/skills/regista-gm/SKILL.md`
  - `.agents/skills/regista-frontend/SKILL.md` 等

### 実装対象（3重ガードレールと判定ロジック）
1. **仕組み1 (フック)**: `safety-guard.js` による完了報告・差し戻しフォーマットの正規表現検査・強制ブロック
2. **仕組み2 (プロンプト)**: 各Workerスキルへの Few-Shot（Good/Bad例）追加
3. **仕組み3 (CLI/ツール)**: `validate-tickets.js` へのモデルTier 1〜3ホワイトリスト検証の組み込み

まずは引継ぎサマリーファイル (file:///home/watter46/src/footics/.regista/handovers/ADH-001-handover.md) を確認の上、残課題の実装に着手してください。
```
