---
name: quality-harness
description: 実装後の品質検証（Lint, Type Check, Logic, Context）を統合し、エージェントの出力を「プロ水準」に保つためのスキル
---

# Quality Harness Skill

このスキルは、コードの変更がプロジェクトの品質基準を満たしているか、副作用がないかを検証するための「手綱（Harness）」を提供します。
エージェントは実装フェーズの各ステップ完了時、および最終報告前に必ずこのスキルを活用すること。

## Triggers (実行タイミング)

| 状況 | 実行アクション |
|---|---|
| 実装ステップ（task.mdの各項目）の完了時 | `verify-affected.sh` を実行 |
| 複雑なリファクタリング・ロジック変更後 | `impact-trace.sh` で影響範囲を確認 |
| 最終報告（ユーザーへの完了連絡）の直前 | `pre-deliver.sh` で身だしなみを最終チェック |

## Verification Protocol (3段階検証)

### 1. Static Verification (Biome)
- 構文エラー、スタイル違反、単純なバグ（未使用変数など）を即座に修正する。
- `pnpm check` を使用。

### 2. Semantic Verification (TSC)
- 型の整合性を検証する。
- 修正したファイルだけでなく、そのファイルに依存している他のファイル（Reverse Dependencies）の型が壊れていないかを確認するのが真のハーネス運用。

### 3. Contextual Verification (AGENTS.md Compliance)
- ディレクトリ構造、命名規則、特定のライブラリ使用方針（Zustand, TanStack Query等）が `AGENT.md` の記述と一致しているかを目視またはスクリプトで確認。

## Scripts

### 1. verify-affected.sh (影響範囲に限定した検証)

時間の無駄を省くため、変更されたファイルが含まれるパッケージのみを検証します。

```bash
# 使用例
./.agent/skills/quality-harness/scripts/verify-affected.sh
```

### 2. pre-deliver.sh (最終納品前チェック)

未使用インポート、`console.log`、`TODO` の残りなどをスキャンし、クリーンな状態で報告するためのチェック。

```bash
./.agent/skills/quality-harness/scripts/pre-deliver.sh
```

### 3. impact-trace.sh (副作用予測)

`indexing-awareness` と連携し、変更したシンボルがどこで使われているか、どこを再検証すべきかを提示します。

```bash
./.agent/skills/quality-harness/scripts/impact-trace.sh <シンボル名またはファイル名>
```

## Self-Correction Guide (自己修正の極意)

- **TSCエラーが出たら**: 
    1. エラーメッセージの「どの型とどの型が合っていないか」を正確に読む。
    2. 捏造した型がないか、Zodスキーマと乖離していないかを確認。
    3. `any` で逃げず、適切な型定義またはキャストを行う（理由を添える）。
- **Biomeエラー消えない場合**: 
    - `biome check --write` で自動修正を試みる。
    - 手動修正が必要な場合は、ルールに従ってコード構造を見直す。

## Definition of Done (完了の定義)
- [ ] `pnpm verify` がエラーなしでパスしている。
- [ ] `./.agent/skills/quality-harness/scripts/pre-deliver.sh` がパスしている。
- [ ] `AGENTS.md` の規約に違反した箇所がない。
