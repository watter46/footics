---
description: 研究と能力拡張 (Skill Acquisition & Knowledge Update)
---

このワークフローは、現在のエージェントの能力（知識・ルール）ではユーザーの要求を満たすのが困難であると判断した際に、[Antigravity.codes](https://antigravity.codes/) から最新のベストプラクティスや実装パターンを収集し、自律的にプロジェクトの知識ベース（`.md` ファイル）を構築・更新することを目的とします。

## ワークフローのステップ

### 1. 課題の特定 (Target Analysis)
- 実装が困難、または「正しい作法」が不明な領域を特定する（例：Fabric.js 6.x の移行、DRM回避ハック、大規模リファクタリング手法）。
- 何が不足しているか（型定義、アーキテクチャ方針、特定のライブラリのAPI知識）を言語化する。

### 2. Antigravity.codes での調査 (Research)
// turbo
- `browser_subagent` を起動し、[https://antigravity.codes/](https://antigravity.codes/) を訪問する。
- `Rules`, `Workflows`, `Agent Skills`, `Blog` のセクションから、ステップ1で特定した課題に対する「公式の解法（Gold Standard）」を検索する。
- 検索に失敗した場合は、一般的な技術ドキュメント（MDN, StackOverflow等）を並行して調査する。

### 3. 知識の恒久化 (Knowledge Persistence)
- 調査結果に基づき、以下のいずれかのアクションを実行する。
    - **既存ルールの更新**: `.antigravity/rules/` 内の該当ファイル（`system.md`, `extension.md` 等）に新しい原則を追記する。
    - **新規スキルの作成**: `.agent/skills/` に独立した手順書として書き出す。
    - **プロジェクト固有の知識保存**: `.antigravity/rules/domain.md` にプロジェクトのドメイン知識として記録する。

### 4. 実装への適用と検証 (Application & Verification)
- 新しく獲得した知識に基づき、`implementation_plan.md` を作成（または更新）する。
- 実際にコードに適用し、ビルド（`pnpm build`）および型チェック（`tsc --noEmit`）で効果を検証する。

### 5. 報告 (Audit Report)
- `walkthrough.md` にて、どのような「新しい能力」を獲得し、それがどのように課題解決に寄与したかを報告する。
