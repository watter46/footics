---
trigger: always_on
---

# 👑 Footics Architecture & Agent Guidelines

## 💡 コア理念: 「安全性・品質」×「高速・低トークン」の両立
Footicsの開発体制は、**最高水準の安全性・品質を前提とし、無駄な手戻り・試行錯誤・コンテキスト肥大化を極限まで削ぎ落とすことで、高速かつ最小トークンでの開発サイクルを実現する**ことを基本思想とします。
- **事前規約準拠**: [`.agents/research/extracted/*`](file:///home/watter46/src/footics/.agents/research/extracted/) に抽出済みの最新ベストプラクティスを一発適用し、手戻りを防止。
- **Fail-Fast 検証**: `rtk` (Rust Token Compressor) を介してテスト・型チェックを実行し、ログを圧縮しながら100%の品質を保証。
- **的確な粒度ルーティング**: 局所改修は直接編集で最小トークン完結、複合改修はGM＋専門Workerで安全境界を保護し並列推進。

---

## 1. 開発セッションと組織体制

- **メインセッション（Primary Session / デフォルト）**:
  - **通常の開発者・ペアプログラマー**として動作。
  - 通常の会話、壁打ち、コードの直接編集、単体テスト・型チェックを安全・確実に最小トークンで実行。
- **Regista-GM（Orchestration Subagent / 明示指示時のみ）**:
  - ユーザーから明示的に依頼された場合（または放置して並列実行したい場合）のみ、仕様書（`specs/active/`）を作成して起動。
- **Workerエージェント群（Specialist Workers）**:
  - **Worker-Data**: `src/lib/**`, `src/stores/**`, `src/types/**`
  - **Worker-Canvas**: `src/components/features/tactical-unified/canvas/**`, `video-canvas/**`
  - **Worker-Frontend**: `src/app/**`, `src/components/ui/**`, `src/styles/**`
  - **Worker-Extension**: `extension/**`

※ エージェント組織・スキル・ルール自体の保守・改修は、別枠のオンデマンドスキル（`/meta-agent`）を使用します。

---

## 2. タスク実行方針

ユーザーからのリクエスト規模・性質に応じて、以下の2モードで実行します。

```text
+-------------------------------------------------+
| タスク要求 (規模・影響度の判定)                 |
+------------------------+------------------------+
                         |
       +-----------------+-----------------+
       | 1〜3ファイル / 局所的             | 4ファイル以上 / 複合領域 / 明示指示
       v                                   v
+-------------------------+      +-------------------------+
| 🚀 Direct Mode (デフォルト)|     | 🏛️ GM Orchestration     |
| ・事前規約を参照        |      | ・specs/active/仕様書作成|
| ・コード直接編集        |      | ・regista-gm 起動       |
| ・rtk 単体テスト/型検証  |      | ・Worker並列実装 & 検証  |
+-------------------------+      +-------------------------+
```

1. **🚀 Direct Mode（即時実装モード / デフォルト）**:
   - **対象**: 1〜3ファイル以内の変更、局所的なバグ修正、UIスタイルの微調整、ストアのフィールド追加など。
   - **手順**:
     1. 該当領域のベストプラクティス（[`.agents/research/extracted/*`](file:///home/watter46/src/footics/.agents/research/extracted/)）を参照。
     2. 最小限の差分でファイルを直接編集。
     3. `vitest run <file>` や `tsc --noEmit` 等で即時自己検証して完了。
2. **🏛️ GM Orchestration Mode（並列委譲モード / 明示指示時）**:
   - **対象**: ユーザーが「GMでやって」「並列実行で」と明示した場合、または4ファイル以上の複合領域改修。
   - **手順**:
     1. `specs/active/YYYY-MM-[feature-name].md` を作成。
     2. `invoke_subagent` で `regista-gm` を起動。
     3. GMが専門Workerを並列指揮し、全体結合検証（`rtk pnpm verify`）まで自律完遂。

---

## 3. 厳格なルールと機械的ガード (`safety-guard.js`)

- **システム保護**: サブエージェントによる `.agents/`, `scripts/`, `Makefile` 等の変更は即時 Deny されます。
- **Worker境界**: 各Workerは自身の担当パス外への書き込みが禁止されています。
- **`rtk` 自動補完**: コマンド実行（`vitest`, `tsc`, `biome` 等）はフックにより透過的に `rtk` が補完され実行されます。そのままコマンドを実行してください。
- **全体テスト禁止**: 引数なしの全体テスト（`vitest run` / `pnpm test` 等）は機械的にブロックされます。必ずファイル単位で指定してください。

---

## 4. 探索・読解パイプライン（未知領域の探索時限定）

未知の領域を探索する際は以下の4ステップを推奨しますが、対象ファイルが既知の場合は直接編集・読解へスキップし、不要な探索（tree/find等）によるトークン浪費を省いてください。

```text
Step 1: ディレクトリ構造把握  ➜  tree <dir> -L 2
Step 2: 対象ファイル特定 ➜  ネイティブツール (find_by_name / grep_search) を利用
Step 3: 型・シグネチャ抽出 (AST) ➜  pnpm tsx scripts/ast/extract-types.ts <file|directory>
Step 4: 局所編集・読解 (必要な場合のみ) ➜ view_file (StartLine, EndLine 指定)
```

## 5. 出力フォーマット規約（CLI最適化）

- **ASCIIアート推奨**: フローチャートや構造図を出力する場合は、CLI端末で直接視認しやすいASCIIテキストボックス形式（`+---+`, `| `, `-->` 等）を使用する（Mermaid記法は使用しない）。
- **表形式**: Markdownの標準テーブル形式（`| ... | ... |`）を使用する。
