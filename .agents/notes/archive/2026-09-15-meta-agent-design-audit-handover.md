# 📋 メタエージェント設計監査・引継ぎ書（Proモデル検証用）

- **作成日**: 2026-09-15
- **セッション目的**: トークン最小化・探索パイプライン・ガード機構の改修内容の整理と、Proモデルによる客観的妥当性検証の引継ぎ
- **参照ファイル**:
  - [AGENTS.md](file:///home/watter46/src/footics/AGENTS.md)
  - [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js)
  - [`.agents/hooks.json`](file:///home/watter46/src/footics/.agents/hooks.json)
  - [`scripts/ast/extract-types.ts`](file:///home/watter46/src/footics/scripts/ast/extract-types.ts)
  - [`.agents/skills/meta-agent/SKILL.md`](file:///home/watter46/src/footics/.agents/skills/meta-agent/SKILL.md)

---

## 1. 今回決定・変更・実装を完了したもの（現行状態）

| # | 変更対象ファイル | 変更内容・仕様 | 目的・論理的根拠 |
| :--- | :--- | :--- | :--- |
| **1** | [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js) | **引数なし全体テストの機械的遮断**<br>`rtk vitest run` / `pnpm test` 等の単体実行を Deny。 | 調査フェーズや局所修正での無関係な数百件のテストログによるコンテキスト汚染（5k〜20k tok）を防止。 |
| **2** | [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js)<br>[`.agents/hooks.json`](file:///home/watter46/src/footics/.agents/hooks.json) | **生探索ツールの機械的遮断 ＆ RTK強制**<br>`find_by_name`, `grep_search` を Deny し、`rtk find`, `rtk grep` へ自動誘導。 | 冗長な絶対パス一覧や生grepログを圧縮（80〜90%トークン削減）。 |
| **3** | [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js) | **RTKプレフィックスの全エージェント強制**<br>サブエージェントだけでなく、メインセッション含む全コマンドで生コマンド（`vitest`, `tsc`, `biome`, `pnpm verify` 等）を遮断。 | 全セッションでのコマンド出力ログ圧縮を徹底。 |
| **4** | [`scripts/ast/extract-types.ts`](file:///home/watter46/src/footics/scripts/ast/extract-types.ts) | **ディレクトリ一括AST抽出に対応**<br>`rtk pnpm tsx scripts/ast/extract-types.ts <dir>` で配下全ファイルの型・シグネチャを一括抽出可能に。 | 複数ファイルの中身を1つずつ全読みせず、ディレクトリ単位で数十トークンで構造把握を可能化。 |
| **5** | [AGENTS.md](file:///home/watter46/src/footics/AGENTS.md) | **標準探索・読解パイプライン（4ステップ）の策定**<br>1. `tree` ➜ 2. `find/grep` ➜ 3. AST抽出 ➜ 4. 局所 `view_file` を明文化。 | 探索の試行錯誤を無くし、エージェントの行動パターンを標準化。 |
| **6** | [`.agents/skills/meta-agent/SKILL.md`](file:///home/watter46/src/footics/.agents/skills/meta-agent/SKILL.md) | **メタエージェント運用憲章の刷新**<br>「Yesマンの絶対禁止」と「3軸の批判的意思決定フィルター（ROI・DX/Friction・Complexity）」を確立。 | 盲従を排除し、客観的・自律的な組織改善役として再定義。 |
| **7** | [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js) | **`view_file` ガードの撤廃（自律是正）**<br>開発摩擦とDeny往復ログによる逆トークン浪費を防ぐため、フックを解除。 | 実装編集フェーズでの正当なファイル閲覧をストレスフリー化。 |

---

## 2. まだ変更されていないもの（今後の検討・未着手課題）

| # | 課題項目 | 対象ファイル/領域 | 現状と問題点 | 提案される対応案 |
| :--- | :--- | :--- | :--- | :--- |
| **A** | **Worker/GMスキルの指示文同期** | [`.agents/skills/worker-*`](file:///home/watter46/src/footics/.agents/skills/)<br>[`.agents/skills/regista-gm`](file:///home/watter46/src/footics/.agents/skills/regista-gm/) | 各Workerの検証手順や探索手順に最新の「4ステップ探索パイプライン」が明記されていない。 | 各専門Workerスキルに `rtk` および AST 型抽出による事前確認手順を反映する。 |
| **B** | **ベースプロンプト（常時ロード情報）の軽量化** | `~/.gemini/config/skills/`<br>`.agents/skills/` | 全スキルの description（メタ情報）が毎ターン常時ロードされ、約1〜2kトークンを固定消費している。 | 不要・休眠スキルの整理、または description を1行極短に圧縮する。 |
| **C** | **探索コマンドのインターセプト（透過プロキシ化）** | [`.agents/guards/safety-guard.js`](file:///home/watter46/src/footics/.agents/guards/safety-guard.js) | 現状は生コマンドを「Deny」して再試行させているため、1往復のエラーログが発生する。 | 生 `find`/`grep` を検知した際、Denyせず自動で `rtk` コマンドに書き換えて実行・返却するプロキシ化の是非。 |
| **D** | **過去の監査ログのアーカイブ** | [`.agents/notes/2026-09-15-...md`](file:///home/watter46/src/footics/.agents/notes/2026-09-15-agent-behavior-audit-and-prompt-restriction.md) | Alt+S不具合調査時の問題ログが未完了のまま残っている。 | 今回の改修結果を紐付けてクローズ・アーカイブ化する。 |

---

## 3. 次のチャット（Proモデル）で検討すべき論点（プロンプト用）

Proモデルとの対話開始時に、以下の問いを投げて全体妥当性を監査してください：

1. **今回導入した「機械的ガード（全体テスト遮断・生ツール遮断）」および「4ステップ探索パイプライン」に、開発を阻害する副作用や見落としはないか？**
2. **`safety-guard.js` において「Denyして再試行させる方式」と「裏で透過的にrtkへ書き換えて通す方式」のどちらがトークン・DX両面で優れているか？**
3. **常時ロードされているスキル群（Base Prompt）の最小化にあたり、どのスキルを退避・圧縮すべきか？**
