---
name: rule-governance
description: プロジェクト独自の規約（rules）を作成・編集する際の一貫性と品質を担保するためのスキル
---

# Rule Governance Skill

このスキルは、本プロジェクトにおける「Agent Rule」の作成および維持管理のための基準を定義します。
エージェントが新しいルールを作成したり、既存のルールをリファクタリングしたりする際には、必ず本スキルの指示に従ってください。

## 1. 自動アクティベーション設定 (Frontmatter)

すべてのルールファイルは、システムが自動的にメタデータを認識できるよう、ファイルの先頭に以下の YAML Frontmatter を含める必要があります。

```yaml
---
trigger: always_on
globs: ["path/to/files/**/*", "other/pattern/*.ts"]
---
```

- **trigger**: `always_on` を基本とします。
- **globs**: ルールが適用されるべきファイルパスを glob パターンで指定します。
    - **最適化の原則**: ルールの「影響範囲」を厳密に定義し、不要なファイルへの適用（コンテキストの汚染やトークンの浪費）を避けるため、可能な限り具体的かつ最小限のパターンを指定してください。
    - **精査項目**: 対象外のサブディレクトリが含まれていないか、特定の拡張子に限定できるか、などを定期的に見直します。

## 2. ドキュメント構造の統一

人間可読性とエージェントの理解を両立させるため、以下の構造を遵守してください。

1.  **Header**: ファイル名に対応するタイトルを `#` (H1) で記述。
2.  **Activation (再認識・明示)**: Frontmatter で設定した `trigger` と `globs` を、エージェントが二重に確認し、人間もひと目で適用範囲を理解できるよう、二重アスタリスクで明示します。
    - **記述パターン**: `**Activation:** This rule is **ALWAYS ON** for files matching [glob pattern].`
    - **具体例**:
        - `**Activation:** This rule is **ALWAYS ON** for files matching `extension/**/*.{ts,tsx}`.`
        - `**Activation:** This rule is **ALWAYS ON** for files matching `src/**/*.{ts,tsx}`, `next.config.ts`, and `open-next.config.ts`.`
3.  **Positioning**: 引用ブロック `>` を使い、ルールの役割や位置付けを記述。
4.  **Rationale (NEW)**: なぜこのルールが存在するのか、その背景や意図を記述。
5.  **Principles & Guidelines**: `## 原則 (Principle)` と `### 行動指針 (Guidelines)` の階層構造を使用。
6.  **Anti-patterns (NEW)**: 避けるべき実装や、過去の失敗例を `###` で記述。
7.  **References (NEW)**: 関連する他ルールやドキュメントへの参照。

## 3. 言語方針

- **タイトル・セクション見出し**: 英語（日本語併記可）
- **原則・指針の説明**: 日本語（エージェントの正確な理解のため）
- **技術用語**: 標準的な英語

## 4. ルール作成テンプレート

`.agent/skills/rule-governance/template.md` に標準テンプレートが用意されています。新しいルールを作成する際は、このテンプレートをコピーして使用してください。
