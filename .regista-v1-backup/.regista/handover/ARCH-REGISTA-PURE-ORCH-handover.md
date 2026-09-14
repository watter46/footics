# 引継ぎサマリー: ARCH-REGISTA-PURE-ORCH (Regista Pure Orchestration 再設計)

## 1. タスク概要
- **チケットID**: `ARCH-REGISTA-PURE-ORCH`
- **タスク名**: Regista組織アーキテクチャのPure Orchestration化（Fast-Track完全撤廃・ツールの完全ホワイトリスト化・探索の100%外部委譲）
- **作業ブランチ**: `main`
- **関連ファイル**:
  - `file:///home/watter46/src/footics/AGENTS.md`
  - `file:///home/watter46/src/footics/.agents/skills/regista-gm/SKILL.md`
  - `file:///home/watter46/src/footics/.agents/skills/regista-scout/SKILL.md`
  - `file:///home/watter46/src/footics/.agents/skills/regista-ticket-writer/SKILL.md`
  - `file:///home/watter46/src/footics/.agents/hooks.json`

---

## 2. 手詰まり・引継ぎの経緯 (Background & Impasse Reason)
- **引継ぎの経緯**: Fast-Trackの完全撤廃、GMの完全非読解化（Pure Orchestration）、ツールの完全ホワイトリスト化、探索の100%外部委譲（Scout専属化）に向けた基本方針が確定したため、高精度な推論が可能な Pro モデルで詳細設計と規約改修を実施するために引き継ぐ。
- **廃止・変更する方針**:
  - Fast-Track Mode の完全撤廃（コード変更を伴う作業は例外なくチケット必須・別チャット実行）
  - GMによるソースコードの直接読み取り（`view_file` による `.ts`/`.tsx` 等の読解）の完全禁止

---

## 3. ユーザーとの対話で確定した前提概念・確定仕様 (Confirmed Specs & Mental Models)
### ① Fast-trackの完全撤廃
- 全てのコード変更タスク（大小問わず）をチケットベースのOrchestrated Flowに一本化する。
- 質問・相談・設計の壁打ちはチャット上で即時回答するが、コード変更は必ずチケットを発行して別チャット/Workerで実行する。

### ② エージェントのツールの完全ホワイトリスト化
- 各エージェント（特にGM、Scout、Worker）の権限と使用可能ツール/参照可能ファイルを厳格に定義・制限する。
- GMは「チケット（`.regista/`）・仕様書/設計書（`docs/`）・アーキテクチャガイドライン・ディレクトリ構成」のみ参照可能とし、ソースコード本体は直接読まない。

### ③ 探索の100%外部委譲（Scout専属化）
- コードベースの調査、影響範囲分析、型定義の確認はすべて `regista-scout` に委譲する。
- GM ⇄ Scout ⇄ Ticket-Writer 間の通信は Compact JSON（超軽量フォーマット）に限定し、コンテキスト消費とレイテンシを極小化する。

---

## 4. 現時点の実装状況と検証結果 (Implementation & Verification)
- 現状の `AGENTS.md`、`regista-gm/SKILL.md`、`regista-scout/SKILL.md`、`hooks.json` の仕様と構造の調査完了。
- 変更方針の合意形成完了。

---

## 5. 残課題 / 次のチャットでやるべきこと (Next Steps & Action Items)
1. **`AGENTS.md` の改修設計**:
   - Fast-Track Mode 関連の記述を完全削除。
   - GMの Pure Orchestration 規約（コード完全非読解、ツールのホワイトリスト制約）の明文化。
   - Scout への 100% 探索委譲と Compact JSON 通信プロトコルの規定。
2. **`skills/` 配下の各エージェント定義の更新**:
   - `regista-gm/SKILL.md` のシステムプロンプト刷新。
   - `regista-scout/SKILL.md`、`regista-ticket-writer/SKILL.md` のプロトコル強化。
3. **`hooks.json` / 安全ガードレールの検討**:
   - ホワイトリスト制御やコード読み書きの物理的ブロックの必要性に応じたフック更新。
4. **不要テンプレートの整理**:
   - `fast-track-report.md` 等の不要ファイルの削除または更新。

---

## 6. 新しい会話に貼り付けるプロンプト (Next Conversation Prompt)

別の会話（新規Conversation）を開き、**Gemini Pro (または Sonnet)** を選択して以下のプロンプトをそのまま貼り付けて開始してください。

```markdown
現在、Footics開発組織「Regista」のアーキテクチャ再設計を進めています。
これまでの議論で以下の方針が確定しています：
1. **Fast-trackの完全撤廃**: コード変更を伴うタスクは規模に関わらず全てチケットベースに一本化。
2. **エージェントのツールの完全ホワイトリスト化**: 各ロールが使用・参照できるツールとファイル範囲を厳格に制限（特にGMはコードを読まない）。
3. **探索の100%外部委譲（Scout専属化）**: 調査・探索は全てScoutへCompact JSON経由で委譲。

### 参照引継ぎファイル
- [ARCH-REGISTA-PURE-ORCH-handover.md](file:///home/watter46/src/footics/.regista/handover/ARCH-REGISTA-PURE-ORCH-handover.md)

### やるべきこと
Proモデルとしての高度な推論を活かし、上記3方針に基づいた `AGENTS.md`、`.agents/skills/`（GM, Scout, Ticket-Writer等）、および `hooks.json` の具体的な改修設計と実装を行ってください。
```
