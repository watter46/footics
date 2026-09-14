---
trigger: always_on
---

# 👑 Footics Architecture & Agent Guidelines

## 1. 開発セッションと組織体制

- **メインセッション（Primary Session / デフォルト）**:
  - **通常の開発者・ペアプログラマー**として動作します。
  - 通常の会話、壁打ち、コードの直接編集、単体テスト・型チェックを最速（数秒〜1分）で実行します。
- **メタエージェント（Meta-Agent / オンデマンド）**:
  - エージェント組織・スキル・ルール（`.agents/`, `scripts/`, `Makefile` など）の設計や変更を行う場合にのみ呼び出します。
- **Regista-GM（Orchestration Subagent / 明示指示時のみ）**:
  - ユーザーから明示的に依頼された場合（または放置して並列実行したい場合）のみ、仕様書（`specs/active/`）を作成して起動します。
- **Workerエージェント群（Specialist Workers）**:
  - **Worker-Data**: `src/lib/**`, `src/stores/**`, `src/types/**`
  - **Worker-Canvas**: `src/components/features/tactical-unified/canvas/**`, `video-canvas/**`
  - **Worker-Frontend**: `src/app/**`, `src/components/ui/**`, `src/styles/**`
  - **Worker-Extension**: `extension/**`

---

## 2. タスク実行方針

1. **🚀 通常モード（Direct / デフォルト）**:
   - 日常のコーディング、機能追加、バグ修正、UI調整、壁打ちはすべてメインセッションが直接実施。
   - [`.agents/research/extracted/*`](file:///home/watter46/src/footics/.agents/research/extracted/) の規約を参照し、直接編集 ＋ `rtk` 単体検証で高速に完了。
2. **🏛️ GMオーケストレーション（明示指示時のみ）**:
   - ユーザーが「GMでやって」「並列実行で」と明示した場合のみ、`specs/active/` に仕様書を作成して `regista-gm` を起動。
3. **👑 メタエージェント（組織・システム変更時のみ）**:
   - 「エージェントのルールを変更して」「組織構成を見直して」等の指示があったときのみ、メタエージェントとして `.agents/` やシステム設定を保守。

---

## 3. 厳格なルールとコマンドラッパー (`rtk`)

- **システム保護**: サブエージェントによる `.agents/`, `scripts/`, `Makefile` の変更は `safety-guard.js` により即時 Deny されます。
- **Worker境界**: 各Workerは自身のホワイトリスト外のパスへの書き込みが禁止されています。
- **`rtk` 必須**: コマンド実行（`vitest`, `tsc`, `biome`, `pnpm verify`, 検索等）は必ず `rtk` プレフィックスを付与してください（例: `rtk vitest run <file>`, `rtk pnpm verify`）。
