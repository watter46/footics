# 技術スタック・ディレクトリ規約 (Tech Stack & Directory Conventions)

> **【エージェントへの指示】**
> 実装を開始する前に必ずこのドキュメントを参照し、ライブラリ選定・ファイル配置・命名規則・importパスの規約に従うこと。
> このドキュメントに記載のない新しいライブラリの追加やディレクトリの新設は、ユーザーへの確認なしに行ってはならない。

---

## 1. 使用ライブラリ一覧

### コアフレームワーク

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Next.js | 16.3.1 | App Router。SSR は使わず CSR / Static Export が基本 |
| React | 19 | UI ライブラリ |
| TypeScript | latest (strict) | 全ファイルに適用 |

### UI・スタイリング・インタラクション

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Tailwind CSS | v4 | ユーティリティCSSフレームワーク |
| shadcn/ui (`@base-ui/react`) | — | コンポーネント集。`src/components/ui/` に配置 |
| `@floating-ui/react` | latest | オブジェクトオプション（HUD）・ポップオーバーの自動反転（`flip`）・クランプ（`shift`）、および `FloatingPortal` による最前面オーバーレイ表示 |
| `react-colorful` | latest | ポップオーバー内完結の軽量カラーピッカー（`HexColorPicker`） |
| `@dnd-kit/core`, `@dnd-kit/sortable` | — | タイムラインのシーン並び替えおよびドラッグ＆ドロップ操作 |
| `react-hotkeys-hook` | ^5.3.3 | キーボードショートカットの一元管理（自前の `keydown` 分岐および旧 `hotkeys-js` は廃止） |

### キャンバス・グラフィクス・アニメーション

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Konva.js | ^10.3.0 | 戦術ボードのキャンバスエンジン |
| react-konva | ^19.2.5 | Konva の React バインディング |
| `gl-matrix` | ^3.4.4 | 3段階座標変換（`worldToScreen` / `screenToWorld`）およびカメラ透視投影行列計算 |
| `gsap` + `@gsap/react` | ^3.15.0 | タイムライン連続再生・シーク・イージング制御（`gsap.timeline()`, `gsap.parseEase()`、`timeline.kill()` RAII徹底）、およびカメラ操作の補間（自前RAFループ・自前イージング計算は全廃） |

> **[!IMPORTANT]**
> 戦術ボードの実装は Konva を前提とし、以下の **5層レイヤーアーキテクチャ** に厳格に分離する：
> 1. `PitchGroundLayer`: 地面・ピッチ白線枠、ゾーン、矢印、直線、コネクタ、ゴースト軌道
> 2. `BillboardObjectLayer`: 選手マーカー（2Dサークル/3D足元リング）、ボール、テキスト（スクリーンY座標による深さソート `sortBillboardItemsByDepth` 適用）
> 3. `InteractionPreviewLayer`: 作図プレビュー図形、範囲選択ボックス、選択ハイライト枠（純粋描画時は非表示）
> 4. `ViewportCropOverlay`: 画面基準の境界線枠（BoundaryBox）と外側マスク
> 5. `HtmlHudOverlay`: オブジェクトオプション（ContextHud）、境界線オプション、インラインテキストエディタ
> 
> Fabric.js / Canvas 2D API の直接使用は禁止。Konva のベストプラクティス（レイヤー分離・`listening={false}`・`perfectDrawEnabled={false}`）を厳守すること。

### 状態管理

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Zustand | v5 | グローバル状態管理。スライス分割パターンを採用 |
| `zundo` + `immer` | — | Undo/Redo 履歴管理およびイミュータブル状態更新 |

### ローカルデータベース

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Dexie.js | v4 | IndexedDB ラッパー。DB スキーマ v1（死にテーブル撤去・クリーン再設計。旧スキーマからの VersionError 自動リカバリ付き） |

> **[!WARNING]**
> サーバーサイド DB（Supabase 等）は使用していない。データはすべてブラウザの IndexedDB に保存される。
> DB スキーマを変更する場合は必ずバージョンを上げてマイグレーションを記述すること（`src/lib/db/schema.ts`）。

### 動画・画像・ZIPエクスポート

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| `mediabunny` | latest | WebCodecs 統合の MP4 / WebM 動画エンコード・マルチプレクサ（旧 `mp4-muxer` / `webm-muxer` および自前 `VideoEncoder` チャンク制御を置換） |
| `fflate` | latest | 連番PNG一括出力・バックアップ用の高速ZIP圧縮（旧 `jszip` を置換） |
| Konva `stage.toBlob()` | 標準メソッド | 静止画（PNG）切り抜き出力（旧 `html-to-image` および `gif.js` / GIF出力は廃止） |

> **[!NOTE]**
> **完全廃止・撤去済みのライブラリ**:
> `qrcode`（PWA直接共有へ刷新）、`hotkeys-js`（`react-hotkeys-hook` へ置換）、`html-to-image`（`stage.toBlob()` へ置換）、`gif.js`（GIF出力全廃）、`mp4-muxer` / `webm-muxer`（`mediabunny` へ置換）、`jszip`（`fflate` へ置換）。

### Chrome 拡張

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| WXT | — | Chrome 拡張のビルドフレームワーク。`extension/` ディレクトリで独立管理 |

### テスト

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Vitest | — | テストランナー |
| happy-dom | — | テスト用 DOM 環境 |
| Testing Library | — | コンポーネントテスト |

### Lint / フォーマット

| ライブラリ | バージョン | 用途 |
|-----------|---------|------|
| Biome | v2 | Lint + フォーマット（ESLint / Prettier の代替） |

> **[!IMPORTANT]**
> ESLint・Prettier は使用していない。Biome のみを使用すること。
> `biome-ignore` コメントの新規追加は原則禁止。既存のものは技術的負債として扱う。

---

## 2. ディレクトリ構成と各フォルダの責務

```
footics/
├── src/                            # Next.js アプリ本体（tsconfig.json の対象）
│   ├── app/                        # App Router: ページ・レイアウト・API Route
│   │   ├── layout.tsx              # ルートレイアウト
│   │   ├── manifest.ts             # PWA マニフェスト（start_url: '/export', standalone）
│   │   ├── page.tsx                # / : 試合一覧 + JSONインポート
│   │   ├── api/                    # API Routes（/api/tactical-export/share 等）
│   │   ├── export/                 # iPhone PWA エクスポート専用ページ（一覧・詳細DL）
│   │   ├── match/[matchId]/        # イベントタイムライン分析
│   │   ├── tactical/               # 戦術ボードエディタ
│   │   ├── teams/[teamId]/         # 選手マスターデータ
│   │
│   ├── components/                 # UI コンポーネント
│   │   ├── ui/                     # shadcn/ui コンポーネント（自動生成。原則編集しない）
│   │   ├── layout/                 # ナビゲーション・共通レイアウト部品
│   │   └── features/               # 機能単位のコンポーネント群
│   │
│   ├── features/                   # ページ単位の大きな機能コンポーネント
│   │   ├── analysis/               # 試合分析ダッシュボード
│   │   ├── dashboard/              # 試合一覧ダッシュボード
│   │   ├── management/             # データ管理
│   │   ├── match/                  # 試合詳細
│   │   ├── memo-overlay/           # メモオーバーレイ
│   │   ├── national-dashboard/     # 代表戦ダッシュボード
│   │   ├── sidebar/                # サイドバー
│   │   ├── tactical-unified/       # 戦術ボード（メイン機能）
│   │   └── teams/                  # チーム・選手管理
│   │
│   ├── hooks/                      # カスタム React Hooks
│   │   ├── use-data-sync.ts
│   │   └── use-shortcut.ts
│   │
│   ├── lib/                        # ビジネスロジック・ユーティリティ（UI 非依存）
│   │   ├── agents/                 # エージェント評価ランタイム
│   │   ├── data/                   # フォーメーション・ピッチ座標・戦術ユーティリティ
│   │   ├── db/                     # Dexie.js スキーマ・クエリ関数
│   │   ├── features/               # 機能ロジック（memo-overlay 等）
│   │   └── tactical/               # 戦術ボード計算・座標変換・チェルシープリセット
│   │
│   ├── registry/                   # イベント定義レジストリ
│   │   └── events/
│   │
│   ├── services/                   # 外部サービス・ドメインサービス層
│   │   └── event-filter.ts
│   │
│   ├── stores/                     # Zustand ストア
│   │   ├── tactical-unified-store.ts   # 戦術ボードのメインストア（11スライス）
│   │   ├── ui-store.ts
│   │   └── pilotStore.ts           # ⚠️ 削除予定（デモ用）
│   │
│   └── types/                      # TypeScript 型定義
│       └── index.ts
│
├── extension/                      # Chrome 拡張（WXT）
│   │                               # 独立した tsconfig / package.json を持つ
│   └── ...                         # Next.js の tsconfig.json の exclude 対象
│
├── tasks/                          # エージェント用タスクファイル格納先
│
├── tests/                          # 統合テスト・エージェント評価ベンチマーク
│
└── docs/                           # 仕様・ドメイン知識リファレンス（辞書）
```

---
