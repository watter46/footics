# Footics Tactical Memo

サッカーの試合をリアルタイムで記録し、戦術的に振り返るための Phase1 プロトタイプアプリケーション。

## 概要

Footics Tactical Memo は、サッカーの試合中にアクションを記録し、後で分析できるツールです。Phase1 では以下の機能を実装しています：

- 試合作成とフォーメーション編集
- リアルタイムタイマーとフェーズ管理
- アクション記録（80 種類以上）
- タイムライン表示と編集
- 選手管理と出場時間追跡

## 技術スタック

- **Next.js 15** - React Server Components & App Router
- **React 19** - 最新の React 機能
- **TypeScript** - 型安全な開発
- **Tailwind CSS v4** - ユーティリティファースト CSS
- **shadcn/ui** - アクセシブルな UI コンポーネント
- **Zustand 5** - 軽量な状態管理
- **Dexie.js 4** - IndexedDB ラッパー（Phase2 で有効化予定）
- **Zod** - スキーマバリデーション
- **date-fns** - 日付フォーマット
- **Lucide React** - アイコンライブラリ

## プロジェクト構造

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── matches/             # 試合関連ルート
│       ├── new/             # 新規試合作成
│       └── [matchId]/       # 試合詳細
├── components/
│   └── ui/                  # shadcn/ui コンポーネント
├── features/                # 機能ごとのモジュール
│   ├── actions/             # アクション記録
│   │   ├── components/      # QuickActionPanel, ActionDetailModal
│   │   └── stores/          # action-record-store
│   ├── formations/          # フォーメーション
│   │   ├── components/      # FormationEditor
│   │   └── stores/          # formation-store
│   ├── matches/             # 試合管理
│   │   ├── components/      # MatchCard, MatchList
│   │   └── stores/          # match-store
│   ├── timer/               # タイマー
│   │   ├── components/      # TimerWidget
│   │   ├── hooks/           # use-timer-tick
│   │   └── stores/          # timer-store
│   └── timeline/            # タイムライン
│       └── components/      # Timeline, TimelineEditModal
├── lib/                     # 共通ユーティリティ
│   ├── constants/           # actions.ts, formations.ts
│   ├── db/                  # Dexie schema & repositories
│   ├── toast/               # Toast通知システム
│   └── utils/               # timer.ts, validation.ts, cn.ts
└── types/                   # TypeScript型定義
    ├── action.ts
    ├── formation.ts
    ├── match.ts
    ├── player.ts
    └── timer.ts
```

## セットアップ

### 前提条件

- **Docker** と **Docker Compose**（コンテナ環境）
- **pnpm**（ホスト側での開発サポート用）
- **VS Code**（推奨エディタ）

### 1. pnpm のインストール（未インストールの場合）

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc  # または ~/.zshrc
```

### 2. 依存関係のインストール

VS Code で TypeScript/ESLint のインテリセンスを有効にするため、ホスト側に依存関係をインストールします:

```bash
pnpm install --frozen-lockfile
```

### 3. 環境変数の設定

```bash
cp .env.example .env.local
```

### 4. VS Code 拡張機能のインストール

VS Code を開くと、推奨拡張機能のインストールを促されます。
または、コマンドパレット（Ctrl/Cmd + Shift + P）から:

```
Extensions: Show Recommended Extensions
```

必須の拡張機能:

- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- Pretty TypeScript Errors
- Error Lens

### 5. 開発サーバーの起動

```bash
# コンテナを起動（バックグラウンド）
make up

# ログを確認
make logs

# http://localhost:3000 でアクセス可能
```

## よく使うコマンド

### Docker 操作

```bash
make up          # コンテナをバックグラウンドで起動
make down        # コンテナを停止・削除
make restart     # コンテナを再起動
make logs        # コンテナのログを表示
make shell       # コンテナ内でbashシェルを起動
make ps          # コンテナの状態を確認
make status      # 詳細なステータス表示
make help        # 全コマンド一覧を表示
```

### 開発

```bash
make dev         # 開発サーバーを起動（フォアグラウンド）
make install     # コンテナ内で依存関係をインストール
make lint        # ESLintを実行
make lint-fix    # ESLintで自動修正
make format      # Prettierでフォーマット
make test        # テストを実行
```

### メンテナンス

```bash
make clean       # コンテナとボリュームを削除、.nextをクリア
make clean-all   # 上記 + node_modulesも削除
make rebuild     # コンテナを再ビルドして起動
make prune       # 未使用のDockerリソースを全削除
```

### カスタムコマンド実行

```bash
# コンテナ内で任意のコマンドを実行
make exec CMD='pnpm add <package-name>'
make exec CMD='pnpm run build'
```

## トラブルシューティング

### TypeScript/ESLint が機能しない

```bash
# ホスト側で依存関係を再インストール
pnpm install --frozen-lockfile

# VS Codeを再起動
```

### コンテナが起動しない

```bash
# コンテナとボリュームをクリーンアップ
make clean

# イメージを再ビルド
make rebuild
```

### ポート 3000 が使用中

```bash
# 使用中のプロセスを確認
lsof -i :3000

# compose.ymlでポートを変更
# ports:
#   - '3001:3000'
```

## 開発ガイドライン

このプロジェクトは `.github/copilot-instructions.md` に記載されたガイドラインに従っています：

- **Clean Code**: 可読性、保守性、再利用性を重視
- **TypeScript First**: 全て TypeScript で記述
- **Functional Components**: React Hooks を使用
- **Modular Structure**: 機能ごとにモジュール化
- **No Barrel Files**: 直接 import を使用（index.ts 再エクスポートなし）
- **UI/Logic Separation**: UI コンポーネントとロジックを分離
- **pnpm**: パッケージ管理に pnpm を使用

## Phase1 実装状況

### ✅ 完了

- [x] 試合作成フォーム（日付、チーム名、対戦相手、フォーメーション選択）
- [x] フォーメーションエディタ（ドラッグ&ドロップ、プリセット切り替え）
- [x] タイマーシステム（再生/一時停止/リセット、フェーズ管理、ロスタイム追加）
- [x] アクション記録 UI（クイックパネル、詳細モーダル、質評価、位置情報）
- [x] アクション定義（80 種類以上、7 グループ）
- [x] タイムライン表示（時系列ソート、アイコン・色分け）
- [x] タイムライン編集（タイムスタンプ調整、削除、質評価更新）
- [x] 未割当アクション管理（バナー表示、割り当てモーダル）
- [x] 試合終了フロー（未割当確認、終了確認モーダル）
- [x] Toast 通知システム
- [x] データバリデーション（選手期間、アクション、フォーメーション）

### 🔄 部分実装（Phase2 で完全実装予定）

- [ ] IndexedDB 永続化（現在は console.log でプレースホルダー）
- [ ] 選手出場時間管理 UI
- [ ] アクション検索・フィルタリング
- [ ] 統計表示・分析機能

### ⏳ 今後の予定

- [ ] ユニットテスト（Jest + React Testing Library）
- [ ] E2E テスト（Playwright）
- [ ] パフォーマンス最適化
- [ ] モバイル対応強化
- [ ] PWA 対応

## スクリプト

```bash
# 開発サーバー起動
pnpm dev

# 本番ビルド
pnpm build

# 本番サーバー起動
pnpm start

# 型チェック
pnpm type-check

# リントチェック（未設定）
pnpm lint
```

## ドキュメント

詳細な仕様は `docs/` フォルダを参照してください：

### セットアップ・開発

- **[local-development-setup.md](docs/local-development-setup.md)** - ローカル開発環境のセットアップ手順

### Phase1（現在進行中）

- **[00-overview.md](docs/phase1/00-overview.md)** - Phase1 の全体像と実装範囲
- **[completed-tasks.md](docs/phase1/completed-tasks.md)** - 完了した機能一覧
- **[remaining-tasks.md](docs/phase1/remaining-tasks.md)** - 残タスク（優先度付き）
- **[indexeddb-design.md](docs/phase1/indexeddb-design.md)** - DB 設計とデータモデル
- **[component-tree.md](docs/phase1/component-tree.md)** - コンポーネント構造
- **[ai-development-best-practices.md](docs/phase1/ai-development-best-practices.md)** - AI と最速開発する方法

### 全般

- **[spec.md](docs/spec.md)** - プロジェクト全体仕様
- **[phase1-qa.md](docs/phase1-qa.md)** - Phase1 Q&A

## ライセンス

MIT License

## 貢献

Phase1 プロトタイプのため、現在は外部貢献を受け付けていません。
