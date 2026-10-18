# TASK-005: Extension開発ビルドのWindows側（Edge/Chrome）自動同期 & メタデータ整備

## 概要
WSL2上の開発環境でビルドした Extension 成果物（`extension/.output/chrome-mv3`）を、Windows側のローカルフォルダ（`C:\Users\<user>\extensions\footics`）へワンコマンドで同期、または watch モードで自動同期するパイプラインを構築する。
あわせて、拡張機能の名前（`Footics Tactical`）、バージョン（`1.0.0`）、説明文、およびアイコンを整備する。

## 設計方針・制約
- **依存ゼロ**: 外部npmライブラリを新規追加せず、Node.js標準（`node:fs`, `node:path`, `node:child_process`）およびBun標準APIのみで完結。
- **動的パス検出**: Windowsユーザー名を固定ハードコードせず、`cmd.exe /c "echo %USERPROFILE%"` と `wslpath` を用いて動的に検出。環境変数 `FOOTICS_EXTENSION_SYNC_DIR` によるオーバーライドもサポート。
- **同期先フォルダ**: `C:\Users\<user>\extensions\footics`（WSL: `/mnt/c/Users/<user>/extensions/footics`）
- **メタデータ**:
  - 名前: `Footics Tactical`
  - バージョン: `1.0.0`
  - 説明: `Premier League tactical analysis, video frame capture, and interactive tactical board.`
  - アイコン: `src/app/logo.png` を基に `extension/public/icons/`（16, 32, 48, 128）を配置・登録
- **1ファイル200行制限**: 責務を適切に分離し、200行（最大250行）以内を厳守。
- **TDD (テスト駆動開発)**: ロジック部（パス解決、同期処理）の単体テストを作成し、RED -> GREEN を確認。
- **コミット手順**: コミットは `bun run ai:commit` で一括検証・ステージング・コミットを行う。

---

## フェーズ一覧

### Phase 1: メタデータ・バージョン・アイコンの適用
- [x] `extension/wxt.config.ts` と `extension/package.json` のメタデータ（名前、バージョン、説明、icons）を更新
- [x] `extension/public/icons/` にアイコン画像（`icon-16.png`, `icon-32.png`, `icon-48.png`, `icon-128.png`）を配置
- [x] ビルドを実行し、`extension/.output/chrome-mv3/manifest.json` に設定が反映されていることを確認

### Phase 2: パス解決 & 同期コアロジック実装とテスト (TDD)
- [x] `scripts/extension/sync-utils.ts` の作成（動的パス解決、同期処理、統計情報取得）
- [x] `scripts/extension/__tests__/sync-utils.test.ts` の作成とテスト実行 (RED -> GREEN)

### Phase 3: CLI スクリプト & Watch同期実装
- [x] `scripts/extension/sync-windows.ts` の作成（CLI引数解析、ビルド実行、watch監視、Edge向け案内UI）
- [x] `package.json` および `extension/package.json` に `extension:sync` / `extension:dev:sync` スクリプトを追加

### Phase 4: 実機動作検証 & レビュー
- [x] 実際のビルド & 同期コマンドの実行テスト（Windows側の `C:\Users\nowat\extensions\footics` への同期確認）
- [x] Biome / Typecheck / テストの検証（`bun test scripts/extension`, `bun run typecheck`, `bun run lint`）
- [x] Reviewer によるコード審査と LGTM 獲得
- [x] `bun run ai:commit` によるコミット

---

## Reviewer Checklist & Assessment

### 1. 自動検証ゲート (Automated Verification Gates)
- [x] `bun test scripts/extension`: 全 8 テスト PASS (20 expect calls)
- [x] `bun run typecheck`: エラー 0 件
- [x] `bun run lint`: Biome v2 strict 適合、エラー 0 件
- [x] `bun run ai:reviewer:check`: 全チェック完全通過

### 2. 要件網羅性 (Requirements Coverage)
- [x] **要件1: 同期先ディレクトリ**: Windows 側の `C:\Users\nowat\extensions\footics` を動的に検出し、ワンショットまたは watch モードで確実に 20 ファイルを同期。
- [x] **要件2: メタデータ**: 名前 `Footics Tactical`、バージョン `1.0.0`、説明、およびアイコン（16, 32, 48, 128）が Manifest V3 に完全反映。
- [x] **要件3: コマンド導線**: ルートから `bun run extension:sync` および `bun run extension:dev:sync` で即座に実行可能。

### 3. 品質・アーキテクチャ規約 (Code Quality & Architecture)
- [x] **行数規約**: 全ファイル 160 行以下（最大 250 行ルール厳守）。
- [x] **依存ゼロ**: 外部 npm パッケージを追加せず、標準モジュールと Bun API のみで実装。

### 総合判定
**LGTM (Looks Good To Me)**
All requirements met with high architectural consistency and clean verification passes.
