# エージェント設計思想と大方針 (Agent Philosophy & Manifesto)

本ドキュメントは、Footics のエージェントシステムにおける「コアとなる設計哲学」「信条」「大方針」を定義します。
実装仕様、具体的なプロトコル、コーディング規約などは各詳細ドキュメントへ委譲し、本書は**エージェント運用の羅針盤（Manifesto）**として機能します。

---

## 1. The Grand Directive (4大方針)

1. **極限のトークン最適化 (Token Optimization)**
   - 当てずっぽうなファイル探索や長大な生ログ出力をシステムレベルで遮断する。
   - 必要な情報のみを最小限のトークンで抽出し、高速かつ経済的な開発ループを維持する。
2. **高品質な実装の担保 (High-Quality Implementation)**
   - TDD（テスト駆動開発）の完全遵守、TypeScript strict、Biome v2 strict を絶対基準とする。
   - 保守性・パフォーマンス・拡張性を犠牲にした妥協コードの混入を許さない。
3. **推論の排除とスクリプト化 (Determinism via Scripts)**
   - LLMに曖昧な推論を委ねず、機械的に検証可能なタスクはすべて専用スクリプト（静的解析・型検査・テスト・依存関係チェック）で判定・強制する。
4. **能力の積極的拡張 (Capability Extension)**
   - エージェントの知能・精度向上に寄与するツール（AST、rtk、専用MCP、特化スキル、ルール）は積極的に採用・統合する。

---

## 2. コア信条 (Core Beliefs)

### 不可侵原則（知性の保護）
- ルールや手順書の文章・制約を勝手に要約・削減することは「知性の破壊」であり厳禁とする。
- 削ぎ落とすべきは「ツールの生ログ出力」「当てずっぽうなファイル彷徨」「無駄な会話履歴」のみである。

### オンデマンド知識注入 (Progressive Disclosure)
- すべての知識を初期プロンプトに常時ロードしない。
- 常時認識すべき最小限の指針のみを `AGENTS.md` に置き、技術手順は `Skill`、スコープ固有の制約は `Rule` として、必要なコンテキストでのみ動的にロードさせる。

### クリーン・ハンドオフ（文脈の断絶と単一真実源）
- 会話履歴（コンテキスト）を引き回して作業しない。
- エージェント間のバトンタッチは、状態（State）を持つ**「タスクファイル (`tasks/TASK-*.md`)」**と**「Git差分」**のみを介して行い、コンテキスト汚染による幻覚と品質低下を完全に防ぐ。

### プロジェクトネイティブ集約（SuperPowers プラグインの廃止）
- 外部プラグイン `.agents/plugins/superpowers` は完全廃止し、有用スキルは `.agents/skills/` 直下へプロジェクトネイティブ集約・完全日本語化する。
- Footics 固有の制約やワークフロー調整は、すべて `.agents/skills/`（特化スキル）および `.agents/rules/`（スコープルール）のレイヤーで自律運用する。

---

## 3. アーキテクチャ概要 (3-Tier Pipeline)

タスク駆動で自律的に動作する3層分離パイプラインを採用しています。

```
User (要件指示)
  │
  ▼
[ Planner (Flash High) ] ─── タスク分解・仕様策定
  │                       Single Source of Truth: tasks/TASK-*.md 生成
  ▼
[ Worker (Flash) ] ────── TDD実装・全ステップ消化
  │                       ローカル検証: agent:check-worker (PASS)
  ▼
[ Reviewer (Pro) ] ────── 厳格審査 (スクリプト検証 + 要件照合)
  │
  ├── LGTM (合格) ──────▶ Git コミット・タスク完了
  └── REJECTED (差し戻し) ─▶ タスクファイルへ修正指示追記 ➔ Worker へリトライ (上限1回)
```

---

## 4. 詳細リファレンスマップ (Documentation Hub)

各詳細仕様・規約・手順は、以下の対応ドキュメントを参照してください。

| 分野・関心事 | 参照先 | 内容 |
|---|---|---|
| **プロダクト仕様** | [app-overview.md](file:///home/watter46/src/footics/docs/app-overview.md) | ドメイン概念、主要ユースケース、**Open Decisions（未決定事項）** |
| **技術スタック・ディレクトリ** | [tech-stack.md](file:///home/watter46/src/footics/docs/tech-stack.md) | ライブラリ制約、ディレクトリ責務、命名規則、import規約 |
| **データモデル・DB仕様** | [data-model.md](file:///home/watter46/src/footics/docs/data-model.md) | Dexie.js スキーマ、TypeScript型定義、Zod、外部API仕様 |
| **行動ルール (Rules)** | `.agents/rules/` | `coding-standards.md`, `agent-communication.md`, `testing-standards.md` 等 |
| **開発技術・ワークフロースキル** | `.agents/skills/` | `knowledge-integration`, `large-codebase-research`, `writing-plans` 等 |
| **エージェント定義** | `.agents/agents/` | `planner.md`, `worker.md`, `reviewer.md` |
| **ガードレール設定** | `.agents/hooks/guard.ts` | 危険コマンドおよびトークン浪費コマンドの遮断・誘導ロジック |
