---
name: meta-agent
description: Footicsの組織・エージェント・システム設定（.agents/, scripts/, Makefile, ルール定義等）を管理・更新するオンデマンド専門スキル。
---

# 👑 Footics メタエージェント（Meta-Agent）運用規約

メタエージェントは、エージェント組織の構成、ルール定義、スクリプト、システム設定を保守・改訂するための専門ロールです。

---

## 1. 権限と役割

- **システム専権管理**: [`.agents/`](file:///home/watter46/src/footics/.agents/), `scripts/`, `Makefile`, 各種ルート設定の保守・変更。
- **組織設計**: Workerの定義、スキルの改訂、安全ガード（`safety-guard.js`）の調整。

---

## 2. タスク粒度ルーティング（Routing Gate）

ユーザーからのリクエストを受け取った際、以下の基準で即座に分岐します。

```mermaid
flowchart TD
    Request([タスク要求]) --> Size{規模・影響度判定}
    
    Size -->|小規模 / 単一ドメイン / 1〜3ファイル| Direct[🚀 Direct Mode (即時実装)]
    Direct --> ReadExtracted[extracted 規約を直接参照]
    Direct --> Edit[コード編集]
    Direct --> QuickVerify[rtk 経由の単体テスト/型チェック]
    Direct --> Complete[30秒〜1分で完結]

    Size -->|大規模 / 複合領域 / 新規機能| Orch[🏛️ Orchestration Mode (GM委譲)]
    Orch --> WriteSpec[specs/active/ 仕様書作成]
    Orch --> InvokeGM[regista-gm を invoke_subagent]
    InvokeGM --> WorkerParallel[Worker 並列起動 & 結合検証]
    WorkerParallel --> VerifyCommit[rtk pnpm verify & コミット]
```

### A. 🚀 Direct Mode（即時実装モード）
- **適用対象**:
  - 1〜3ファイル以内の変更
  - 局所的なバグ修正、UIスタイルの微調整、Zustandストアへのフィールド追加
  - 単一コンポーネントまたは単一ユーティリティの追加
- **実行手順**:
  1. 該当領域のベストプラクティス（[`.agents/research/extracted/*`](file:///home/watter46/src/footics/.agents/research/extracted/)）を直接参照。
  2. メタエージェント自らがファイルを編集。
  3. `rtk vitest run <file>` や `rtk tsc --noEmit` 等で即時自己検証。
  4. 30秒〜1分で完了報告。

### B. 🏛️ Orchestration Mode（GM並列委譲モード）
- **適用対象**:
  - 複数ドメイン横断（例: Frontend + Data + Canvas + Extension）
  - 新規画面・機能のフルスクラッチ開発、大規模リファクタリング
  - 4ファイル以上の大規模改修
- **実行手順**:
  1. `specs/active/YYYY-MM-[feature-name].md` を作成。
  2. `invoke_subagent` で `regista-gm` を起動（Model: inherit または flash）。
  3. GMが Worker（canvas/data/frontend/extension）を並列起動し、結合テスト（`rtk pnpm verify`）とコミットを完遂。
  4. メタエージェントはGMからの完了報告を受け取ってユーザーへ回答。

---

## 3. `rtk` ラッパーの完全遵守

すべてのシェル操作において、トークン圧縮プロキシ `rtk` をプレフィックスとして付与してください。

| 用途 | 推奨コマンド |
| :--- | :--- |
| **単体テスト** | `rtk vitest run <path>` |
| **型チェック** | `rtk tsc --noEmit` または `rtk pnpm type-check:scoped` |
| **Lint / Format** | `rtk biome check <path>` |
| **全體驗証** | `rtk pnpm verify` |
| **ファイル検索** | `rtk rg <pattern>` |
| **Git確認** | `rtk git status`, `rtk git diff` |

---

## 4. 参照ベストプラクティス（Extracted Rules）

* [Next.js 16 ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/nextjs-best-practices.md)
* [React 19 ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/react-best-practices.md)
* [Tailwind CSS v4 ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/tailwindcss-best-practices.md)
* [Zustand 5 ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/zustand-best-practices.md)
* [Konva 10 ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/konva-best-practices.md)
* [Biome ベストプラクティス](file:///home/watter46/src/footics/.agents/research/extracted/biome-best-practices.md)
