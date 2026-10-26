# Footics ドキュメント・リファレンス辞書 (Documentation Hub)

本ディレクトリは、Footics プロジェクトのアーキテクチャ設計・ドメイン知識・技術スタック・データ仕様を引き当てるための**辞書（Single Source of Truth / Reference）**です。
作業用ファイルや一時的なメモ、過去の報告書は含まれません。

---

## 辞書インデックス (Reference Index)

### 1. システム基盤・共通設計 (System & Architecture)

| ドキュメント | 概要 | 主な利用場面 |
|---|---|---|
| [**philosophy.md**](file:///home/watter46/src/footics/docs/philosophy.md) | **エージェント設計思想と大方針**<br>4大方針（トークン最適化・高品質・スクリプト化・能力拡張）、コア信条、3層パイプライン構造 | エージェントの基本スタンスや運用哲学を確認するとき |
| [**app-overview.md**](file:///home/watter46/src/footics/docs/app-overview.md) | **アプリケーション概要・ドメイン概念**<br>プロダクト概要、主要ドメイン概念（Match, Team, Player等）、主要ユースケース、**Open Decisions（未決定事項）** | ドメイン仕様の確認、未決定事項の確認 |
| [**tech-stack.md**](file:///home/watter46/src/footics/docs/tech-stack.md) | **技術スタック・ディレクトリ規約**<br>使用ライブラリ制約（Next.js, Konva, Dexie等）、ディレクトリ責務、ファイル命名規則、import規約 | ライブラリ選定、ファイル新規作成・配置規約の確認 |
| [**data-model.md**](file:///home/watter46/src/footics/docs/data-model.md) | **データモデル・API仕様**<br>Dexie.js スキーマ、TypeScript型定義、Zod Contract-Firstバリデーション規約、外部API連携 | DBアクセス、スキーマ変更、型定義・バリデーション実装時 |

---

### 2. 画面・機能別仕様書 (Feature Specifications: `docs/spec/`)

ユーザー目線での「できること (DO)」「やってはいけないこと (DON'T)」「画面遷移」「エラー・例外挙動」を定義した確定仕様書です。

| ドキュメント | 対象画面・機能 | 主な内容 |
|---|---|---|
| [**spec/overview.md**](file:///home/watter46/src/footics/docs/spec/overview.md) | **システム全体概要** | 全体像、DO / DON'T、共通ナビゲーション、保存トリガー、例外復旧 |
| [**spec/dashboard.md**](file:///home/watter46/src/footics/docs/spec/dashboard.md) | **ダッシュボード (`/`)** | 試合カード一覧、種別・チーム絞り込み、WhoScored JSONインポート |
| [**spec/match-analysis.md**](file:///home/watter46/src/footics/docs/spec/match-analysis.md) | **試合分析 (`/match/[id]`)** | タイムライン閲覧、多角フィルタ、戦術メモ・独自イベント、戦術ボード別タブ連携 |
| [**spec/tactical-board.md**](file:///home/watter46/src/footics/docs/spec/tactical-board.md) | **戦術ボード (`/tactical`)** | メインキャンバス作図、5層レイヤー、HUD、Formation/Squadパネル、陣地反転、GSAPタイムライン |
| [**spec/team-player-master.md**](file:///home/watter46/src/footics/docs/spec/team-player-master.md) | **選手・チーム管理 (`/teams/[id]`)** | シーズン別スカッド管理、256px WebP顔写真管理、手動選手と公式データリンク、戦術ボード送出 |
| [**spec/data-management.md**](file:///home/watter46/src/footics/docs/spec/data-management.md) | **グローバルデータ管理** | 全データ（試合・メモ・選手・写真）のZIPバックアップおよび復元マージ |
| [**spec/export.md**](file:///home/watter46/src/footics/docs/spec/export.md) | **エクスポート・共有** | 静止画PNG、動画MP4/WebM（mediabunny）、iPhone PWA連携（`/export`）、無劣化保存 |
| [**spec/extension-capture.md**](file:///home/watter46/src/footics/docs/spec/extension-capture.md) | **拡張機能連携** | YouTube動画キャプチャ（Alt+S）、独立タブ軽量キャンバス作図、動画視聴中メモオーバーレイ |

---

## 関連ディレクトリ案内

- **タスク・開発進行**: `tasks/`（タスク駆動開発の `TASK-*.md`）
- **エージェント自動ルール**: `.agents/rules/`（コーディング・テスト・データアクセス規約）
- **エージェントオンデマンド手順**: `.agents/skills/`（Dexie, Zustand, Konva 等の固有手順）
- **過去資料・ロードマップ退避**: `archive/`（過去の監査レポート、初期ロードマップ、リサーチ資料）
