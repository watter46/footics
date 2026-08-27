# Footics コードベース分析レポート

## 1. プロジェクト概要

Footicsは、サッカー戦術分析に特化したモノレポ構成のWebプラットフォームです。
試合データの取り込み、戦術ボード上でのフォーメーション可視化、アニメーション生成、
ビデオスクリーンショットへの描画・注釈、そしてこれらの共有・エクスポートを実現します。

## 2. パッケージ構成

| パッケージ | 役割 | フレームワーク | ファイル数 |
|---|---|---|---|
| `src/` | メインWebアプリ | Next.js 16 / React 19 / Tailwind v4 | ~180ファイル |
| `extension/` | ショートカット操作拡張機能 | WXT (Manifest V3) | ~26ファイル |
| `video-canvas/` | 映像スクリーンショット描画 | WXT + react-konva | ~29ファイル |

## 3. コア技術スタック

- **フロントエンド**: React 19 / TypeScript (Strict) / Tailwind CSS v4
- **フレームワーク**: Next.js 16 (Turbopack, Cloudflare Pages Edge deploy)
- **状態管理**: Zustand v5 (Sliceパターン)
- **データ永続化**: Dexie.js (IndexedDB) - FooticsDatabase v19
- **データ取得**: TanStack Query v5
- **2Dグラフィックス**: react-konva / Konva (Canvas API)
- **描画ツール**: Konva shapes (ArrowShape, ZoneShape等)
- **アニメーション**: カスタム補間エンジン (easing, interpolation, trajectory)
- **ビデオエクスポート**: mp4-muxer, html-to-image, Canvas recording
- **検証**: Zod v4
- **テスト**: Vitest v4
- **Lint**: Biome v2
- **デプロイ**: Cloudflare Pages (OpenNext)

## 4. 開発ドメイン分類

### Domain A: Web App Core (src/app/, src/components/ui/, src/components/layout/)
- ルーティング・ページ構成 (Next.js App Router)
- UI基盤コンポーネント (shadcn/ui, Base UI)
- グローバルレイアウト・プロバイダ
- データ管理メニュー (ImportMatchButton, GlobalDataManagement)
- ダッシュボード (Dashboard, NationalDashboard)

### Domain B: Tactical Board & Animation (src/components/features/tactical-*)
- **tactical-board/**: フォーメーション表示・選手配置 (react-konva)
  - PlayerMarker, Pitch, BenchArea, AddPlayerDialog
  - Drawing系: ArrowShape, ZoneShape, TacticalDrawingCanvas
  - DnD: @dnd-kit によるドラッグ&ドロップ
- **tactical-animation/**: フレームアニメーション
  - AnimationPitch, AnimationTimeline, AnimationInspector
  - FormationSelectPanel, MarkerSizeControl
- **Stores**: tactical-store.ts, tactical-animation-store.ts
- **Lib**: src/lib/tactical/ (coordinates, easing, interpolation, trajectory等)

### Domain C: Video & Export Pipeline
- **video-canvas/**: WXT拡張 + react-konva エディタ
  - Canvas.tsx, Workspace.tsx, EditorApp.tsx
  - useExport.ts (スクリーンショット & エクスポート)
- **src/lib/tactical/export/**: 共有・エクスポートロジック
  - pitch-renderer.ts, photo-loader.ts, share-payload.ts, share-store.ts
- **src/hooks/use-tactical-video-export.ts**: ビデオエクスポート
- **src/app/api/tactical-export/share/**: API エンドポイント

### Domain D: Data Layer (src/lib/db/, src/lib/data/)
- **DB**: FooticsDatabase (Dexie.js) - 8テーブル
  - matches, events, event_memos, custom_events, match_memos,
    tactical_snapshots, keyval, players
- **Data Loading**: data-loader.ts, data-management.ts
- **Query Keys**: query-keys.ts (TanStack Query)
- **Schema/Validation**: schema.ts, national-match-schema.ts (Zod)

### Domain E: Browser Extension (extension/)
- WXT Content Scripts / Background Service Worker
- Overlay UI (Shadow DOM)
- Storage Sync (cache-sync.ts, save-queue.ts)
- Messaging Bridge (webext-bridge)

### Domain F: Analysis & Memo
- EventTimeline, MatchMemoDisplay, PlayerBadgeGroup
- MemoOverlay系 (Modal/View/Parts)
- Sidebar フィルタ群 (Team, Strategy, Outcome, TimelineSource)

## 5. 技術的負債・改善領域

| # | 領域 | 概要 |
|---|---|---|
| 1 | DB Migration複雑化 | v15→v19で5段階migration、players再作成あり |
| 2 | 型定義の散在 | types/index.ts(225行)に全ドメイン型が集中 |
| 3 | tactical-board/肥大化 | 12ファイル + drawing/サブディレクトリ |
| 4 | テストカバレッジ | tactical系は充実、UI/Componentテストは少ない |
| 5 | エクスポートパイプライン | 複数の独立したエクスポート経路が分散 |
