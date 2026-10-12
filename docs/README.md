# Footics ドキュメント・リファレンス辞書 (Documentation Hub)

本ディレクトリは、Footics プロジェクトのアーキテクチャ設計・ドメイン知識・技術スタック・データ仕様を引き当てるための**辞書（Single Source of Truth / Reference）**です。
作業用ファイルや一時的なメモ、過去の報告書は含まれません。

---

## 辞書インデックス (Reference Index)

| ドキュメント | 概要 | 主な利用場面 |
|---|---|---|
| [**philosophy.md**](file:///home/watter46/src/footics/docs/philosophy.md) | **エージェント設計思想と大方針**<br>4大方針（トークン最適化・高品質・スクリプト化・能力拡張）、コア信条、3層パイプライン構造 | エージェントの基本スタンスや運用哲学を確認するとき |
| [**app-overview.md**](file:///home/watter46/src/footics/docs/app-overview.md) | **アプリケーション概要・ドメイン概念**<br>プロダクト概要、主要ドメイン概念（Match, Team, Player等）、主要ユースケース、**Open Decisions（未決定事項）** | ドメイン仕様の確認、未決定事項の確認 |
| [**tech-stack.md**](file:///home/watter46/src/footics/docs/tech-stack.md) | **技術スタック・ディレクトリ規約**<br>使用ライブラリ制約（Next.js, Konva, Dexie等）、ディレクトリ責務、ファイル命名規則、import規約 | ライブラリ選定、ファイル新規作成・配置規約の確認 |
| [**data-model.md**](file:///home/watter46/src/footics/docs/data-model.md) | **データモデル・API仕様**<br>Dexie.js スキーマ、TypeScript型定義、Zod Contract-Firstバリデーション規約、外部API連携 | DBアクセス、スキーマ変更、型定義・バリデーション実装時 |

---

## 関連ディレクトリ案内

- **タスク・開発進行**: `tasks/`（タスク駆動開発の `TASK-*.md`）
- **エージェント自動ルール**: `.agents/rules/`（コーディング・テスト・データアクセス規約）
- **エージェントオンデマンド手順**: `.agents/skills/`（Dexie, Zustand, Konva 等の固有手順）
- **過去資料・ロードマップ退避**: `archive/`（過去の監査レポート、初期ロードマップ、リサーチ資料）
