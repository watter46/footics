---
name: brainstorming
description: 新機能の設計や大きな振る舞い変更の着手前に、ユーザーとの自然な対話を通じて意図・要件・設計を合意形成するスキル
---

# Brainstorming (要件・設計ブレインストーミングスキル)

## 概要 (Overview)

新機能の作成、大規模なリファクタリング、未確定な仕様を含むタスクに着手する前に、ユーザーとの対話と最効率のコード裏取りを通じて、ボトルネック・不変条件・具体設計を潰し切り合意形成するためのスキルです。

## コア方針 (Core Principles)

1. **迎合禁止と裏取り必須 (Anti-Sycophancy & Bottleneck Check)**:
   - ユーザーの提案を未検証のまま肯定してすぐメモ作成に進むことを禁止します。
   - 必ず既存実装との整合性・ボトルネック（描画/計算負荷、状態競合、非同期タイミング、他画面 Consumers への悪影響、対症療法パッチ）を裏取りし、問題があれば **`⚠️ 設計破綻・ボトルネックの指摘`** として反論・代替アーキテクチャを提示してください。
   - 裏取りの結果、**本当にボトルネックや副作用がない場合は無理に捏造せず**、「確認した箇所（`path:line`）と整合しボトルネックなし」と1行で簡潔に結論づけてください。
2. **最効率の探索・読込とチャット出力規律**:
   - `.agents/rules/efficient-exploration.md` に従い、`ai:impact` ➔ `ai:peek` ➔ `rg -l` / `rtk grep` / `ast-grep` ➔ 範囲指定 `read_file` の順でボトルネック検証に必要な行範囲のみ最小トークンで確認します。
   - チャット応答に実コード（コードブロック）を長々と出力することを禁止します。根拠は `ファイル名:行番号` と1〜2行の平易な説明のみで示してください。
3. **不変条件 (Architectural Invariants) と Consumers 同期の特定**:
   - ちゃぶ台返しを防ぐための破壊禁止の前提条件（Invariants & Why）と、変更に伴い同期更新が必要な別画面・呼び出し元（Consumers）を壁打ち段階で特定します。
4. **書き込み権限の限定 (`notes/**` のみ)**:
   - ブレスト段階での書き込み権限は `notes/brainstorm-<機能名>.md` のみに限定されます。
   - `tasks/TASK-*.md`（Planner専管）、`src/**`, `extension/**`, `tests/**`（Worker専管）、`docs/spec/**`（実装完了後の正本のみ）の作成・編集は厳禁です。
5. **コンテキスト量に応じた Planner 引き継ぎの使い分け**:
   - **短ターン（対話1〜3ターン程度・低コンテキスト消費）**: メモファイル（`notes/`）は作成せず、チャット上に合意事項サマリーを出力し、**同一チャットでユーザーが Planner に切り替えて（`/plan`）タスク作成へ進む**よう案内します。
   - **長ターン（対話4ターン以上・高コンテキスト消費、またはユーザー指定時）**: 合意内容（背景・目的、Invariants & Design Decisions、Consumers、公開インターフェース/Contract、Concrete Test Cases、Negative Contracts）を漏れなく `notes/brainstorm-<機能名>.md` に保存し、**新チャットで `@notes/brainstorm-<機能名>.md` と `/plan` を使って Planner に引き継ぐ**よう案内します。
   - タスク化の分割基準：「1 Phase 実作業（`[ADD]`/`[MODIFY]`）推奨2〜3・上限4ファイル（`[DELETE]` 除外）、既存300行超ファイル移行は `1+1`（読込 ~600行以内）、1タスク上限5 Phase・全体400行以内・コードブロック40行以内（超過時は `TASK-XXXa`, `TASK-XXXb` に分割）」。

## ブレインストーミングの3ステップ

### 1. 意図の把握と既存コードの裏取り (Discover & Verify)
- 実現したい体験と制約（Local-first、パフォーマンス、単一座標系、Store Provider、ホスト境界）を把握する。
- **戦術ボード領域（`src/features/tactical-unified/**`, `src/lib/tactical/**`, `src/lib/types/tactical/**`）を扱う場合は、必ず `.agents/rules/tactical-domain-architecture.md` を読み込み**、6コンテキスト分離・単一所有権階層・直和型エンティティ・Branded Coordinates・3周波数状態分離（Cold/Hot/Stream）・Pure Command Reducer（`applySlideCommand` + `enforceSlideInvariants`）・`compileSceneGraph`（Dumb Rasterizer）・`CanvasStore` アダプター廃止の7大不変条件に照らしてボトルネックを裏取りする。
- `ai:impact` / `ai:peek` / `rg -l` / `rtk grep` / 範囲指定 `read_file` で関連コードの該当行を裏取りし、ボトルネックがあれば `⚠️ 設計破綻・ボトルネックの指摘`（実コード貼付なし・`path:line`明記）、なければ `✅ ボトルネックなし` と端的に判定する。

### 2. 要件とアプローチの提示 (Present Options & Design)
- 複数のアプローチがある場合は、メリット・デメリットと推奨案を提示し、`ask_question` または選択肢リストでユーザーの判断を仰ぎます。
- 全ての論点が解消するまで、早期にメモ作成へ移行しようとしてはなりません。

### 3. 人間承認とコンテキスト量に応じたハンドオフ (Context-Aware Handoff)
- ユーザーから明示的な合意（「この方針でOK」「進めて」等）を得ます。
- **短ターン（低コンテキスト消費）の場合**: `notes/` ファイルは作らず、チャット上に合意サマリーを出して同一チャットでの Planner 切り替え（`/plan`）を案内します。
- **長ターン（高コンテキスト消費）の場合**: 合意事項を `notes/brainstorm-<機能名>.md` に漏れなく `write_file` で保存し、`@notes/brainstorm-<機能名>.md` と `/plan` をつけた新セッション用の引き継ぎプロンプトを出力します。
