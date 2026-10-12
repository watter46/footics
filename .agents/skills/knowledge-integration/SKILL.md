---
name: knowledge-integration
description: Use this skill when you encounter unknown domains or technologies not covered in the project's rules or ecc files. It defines the workflow from conducting zero-based research to integrating the best practices into the project's rules, skills, or agents.
---

# Knowledge Integration Process

本スキルは、未知の技術ドメインや要件（例：新しいライブラリ、アーキテクチャパターン）に直面した際、現状に妥協せずベストプラクティスをリサーチし、エージェントシステム（Rules / Skills / Agents）に統合するためのワークフローを定義します。

## ワークフロー (The Workflow)

このプロセスは4つのフェーズで構成されます。必ずこの順序に従って実行してください。

### Phase 1: 課題定義とゼロベース思考 (Define)
- **現状の否定**: 「既存のコードがこうだから」というバイアスを捨て、ゼロベースで「最も保守性・拡張性・パフォーマンスが高い理想形」は何かを定義します。
- **要件の抽出**: そのドメインで達成すべきコア要件を列挙します。

### Phase 2: 徹底リサーチと1次データの保存 (Deep Research)
- `search_web` や `read_url_content` を活用し、公式ドキュメントやリファレンス実装を検索します（`tech-researcher` スキルも併用可）。
- **[CRITICAL] 1次データの保存**: 取得したWebページの内容や記事の本文をチャットコンテキスト上で直接要約せず、必ず `.agents/research/raw/` ディレクトリ配下にマークダウンファイル等でそのまま保存してください（Raw Data Dump）。
- **比較検討**: 複数の選択肢がある場合、長所と短所を客観的に評価します。

### Phase 3: 1次データからの知見の蒸留 (Distill)
- Phase 2 で保存した1次データファイル (`.agents/research/raw/`) を `view_file` で読み込み、以下の観点で「本プロジェクトで採用すべきアーキテクチャパターン」を蒸留（抽出）してドキュメント (`docs/` 配下等) にまとめます。
  1. **ディレクトリ構造**
  2. **責務の分離**
  3. **データフローと同期**

### Phase 4: エージェントシステムへの落とし込み (Codify)
蒸留した知見を、エージェントが自律的に守れるように以下のいずれか（または複数）に変換して実装します。

1. **Rules (`.agents/rules/*.md`)**
   - 対象ディレクトリを触る際に自動適用される「やってはいけないこと」「強制フォーマット」の定義。
2. **Skills (`.agents/skills/*.md`)**
   - 特定のタスクを達成するための「一連の手順書（ワークフロー）」。
3. **Agents (`.agents/agents/*.md`)**
   - 専門的なレビューや計画を行うための特化型エージェント定義。

---
**エージェントへの指示**:
未知の技術について質問された場合、または新規導入が必要な場合は、「この knowledge-integration のプロセスに沿って、1次データの収集からルールへの落とし込みまで行いましょうか？」とユーザーに提案してください。
