# Regista Management Board

> **Source of Truth**: `.regista/board.json` (Last Updated: 2026-09-02T20:09:30.935Z)

## 1. [Active Focus]
- **【Phase 11: Workflow Evolution, Video Pipeline & Architecture Solidification】**:
  - **目的 & 課題**: スライドD&D並び替え、WebCodecs MP4自動トランジション動画エクスポート、Dexie複数プロジェクト管理、Syntax戦術JSON連携、およびストア・描画レイヤー・共通型定義の徹底リファクタリング。

## 2. [Task Matrix]

| Ticket ID | タスク名 | 担当 | 対象ファイル | ユーザー体験の変化 (UX Impact) | ステータス |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **AAWU-6-1** | 🔲 Default Auto-Fit Pitch Boundary Box | `regista-canvas` | `src/lib/types/tactical-unified.ts`<br>`src/components/features/tactical-unified/canvas/boundary-box.tsx`<br>`src/stores/tactical-unified-store.ts` | 新規スライド作成時やリセット時に、境界線ボックスが常にピッチ白線外周の均等余白に自動フィットするようになります。 | **DONE ✅** |
| **AAWU-6-2** | 🏷️ Player Label High-Contrast Visibility Fix | `regista-canvas` | `src/components/features/tactical-unified/canvas/player-layer.tsx`<br>`src/lib/tactical/export/tactical-frame-renderer.ts` | 暗いピッチ背景やスナップショット写真上でも、選手名と背番号ラベルがくっきり白文字＋アウトラインで視認できるようになります。 | **DONE ✅** |
| **AAWU-6-4** | 👥 Sub-Centric Squad Panel & One-Click Pitch Deploy | `regista-frontend` | `src/components/features/tactical-unified/right-panel/squad-sub-panel.tsx`<br>`src/components/features/tactical-unified/canvas/unified-canvas.tsx` | 右パネルのSquadタブから、サブ選手をドラッグ＆ドロップせずともワンクリックでピッチ上の空きスペースへ投入できるようになります。 | **DONE ✅** |
| **AAWU-9-1** | 🧩 Tactical Unified Store Slice Pattern Refactoring | `regista-data` | `src/stores/tactical-unified-store.ts`<br>`src/stores/slices/slide-slice.ts`<br>`src/stores/slices/history-slice.ts`<br>`src/stores/slices/clipboard-slice.ts` | ストアが機能別にモジュール化され、大量のスライドや複雑な戦術操作時でも高速な型推論と安定した状態同期が保証されます。 | **DONE ✅** |
| **AAWU-8-1** | 📸 Hardened DRM Capture Engine & Precise Video Crop | `regista-extension` | `extension/features/capture/drm-capture-engine.ts`<br>`extension/features/capture/video-cropper.ts`<br>`extension/features/capture/__tests__/video-cropper.test.ts` | DRM保護された動画配信サイトでも黒画面にならず、上下左右の不要な黒帯を自動トリミングして試合ピッチ映像のみを瞬時にキャプチャできます。 | **DONE ✅** |
| **AAWU-8-2** | 🔌 Extension Integration & Global Shortcut Trigger | `regista-extension` | `extension/entrypoints/background.ts`<br>`extension/entrypoints/overlay.content.tsx`<br>`extension/types/messaging.ts`<br>`extension/wxt.config.ts` | ブラウザ上の動画視聴中に Alt+S を押すだけで、拡張機能単独で高精度キャプチャが即座に起動します。 | **DONE ✅** |
| **AAWU-8-3-A** | 🖼️ Snapshot Analysis Mode & Clean Canvas Initialization | `regista-frontend` | `src/stores/tactical-unified-store.ts`<br>`src/components/features/tactical-unified/hooks/use-tactical-capture-bridge.ts`<br>`src/components/features/tactical-unified/right-panel/right-panel.tsx`<br>`src/components/features/tactical-unified/toolbar/top-bar.tsx` | 拡張機能からキャプチャを受信した際、自動で白紙・画像モードに切り替わり、画面全体にキャプチャ画像がフィットして即座に戦術描画を開始できます。 | **DONE ✅** |
| **AAWU-8-3-B** | ⭕ 3D Foot Ring & Spotlight Pillar Rendering Integration | `regista-canvas` | `src/lib/tactical/marker-assets.ts`<br>`src/components/features/tactical-unified/canvas/player-layer.tsx`<br>`src/lib/types/tactical-unified.ts` | 動画キャプチャ上の選手足元にリアルな立体リングマーカーや、上空から照らす光の柱（スポットライト）を描画できるようになります。 | **DONE ✅** |
| **AAWU-8-3-C** | 🛠️ Ring Placement Toolbar & Snapshot-Centric Right Panel | `regista-frontend` | `src/components/features/tactical-unified/toolbar/top-bar.tsx`<br>`src/components/features/tactical-unified/right-panel/right-panel.tsx`<br>`src/components/features/tactical-unified/inspector/inspector-panel.tsx` | ツールバーの「⭕ リング」ボタンからワンクリックでリングを配置し、右パネルで色・矢印・スポットライトを直感的に設定できます。 | **DONE ✅** |
| **AAWU-8-3-D** | 📑 Timeline Right-Click Duplicate & Snapshot Context Carryover | `regista-data` | `src/components/features/tactical-unified/timeline/timeline-bar.tsx`<br>`src/components/features/tactical-unified/timeline/slide-item.tsx`<br>`src/stores/tactical-unified-store.ts` | タイムラインスライドを右クリック複製すると、キャプチャ画像やリング設定をそのまま次のシーンに引き継いで連続解説を作成できます（左クリック+は通常ピッチ白紙追加）。 | **DONE ✅** |
| **AAWU-8-4** | 🧹 Legacy Video-Canvas Deprecation & Workspace Cleanup | `regista-gm` | `pnpm-workspace.yaml`<br>`package.json`<br>`AGENTS.md` | 拡張機能が1つに統合され、ビルドと同期が一元化されて保守性が向上しました。 | **DONE ✅** |
| **AAWU-10-1** | ⚡ Ultra-Fast Capture & Instant Tactical Tab Switching Pipeline | `regista-extension` | `extension/entrypoints/overlay.content.tsx`<br>`extension/entrypoints/background.ts`<br>`extension/features/capture/video-cropper.ts`<br>`extension/features/capture/tactical-bridge.ts` | Alt+Sでのキャプチャ実行からFootics Tactical画面への遷移・画像反映がほぼ瞬時（ラグ体感ゼロ）になり、動画分析をストレスなく連続実行できるようになります。 | **DONE ✅** |
| **AAWU-10-2** | 💾 Persistent Tactical Project & Dexie Auto-Save on Reload | `regista-data` | `src/stores/tactical-unified-store.ts`<br>`src/stores/slices/slide-slice.ts`<br>`src/components/features/tactical-unified/toolbar/top-bar.tsx`<br>`src/components/features/tactical-unified/tactical-unified-page.tsx` | 作業中にブラウザを誤ってリロード（F5）したり閉じたりしても、作成したスライド・選手配置・アノテーション・キャプチャ画像がそのまま保持・復元され、安心して作業できるようになります（TopBarからいつでも新規白紙リセット可能）。 | **DONE ✅** |
| **AAWU-10-3** | 🗑️ Intuitive Slide Selection & Keyboard / Context Menu Deletion | `regista-frontend` | `src/components/features/tactical-unified/timeline/slide-card.tsx`<br>`src/components/features/tactical-unified/timeline/timeline-bar.tsx`<br>`src/components/features/tactical-unified/hooks/use-keyboard-shortcuts.ts`<br>`src/stores/slices/slide-slice.ts` | タイムライン上でスライドを選択して Delete / Backspace キーを押すだけで即座にスライドを削除できるようになり、右クリックメニューからも直感的に複製・削除・移動が可能になります（Ctrl+Zで即時復元可能）。 | **DONE ✅** |
| **AAWU-10-4** | 🎞️ Non-Destructive Capture on Active Slide & Auto-New Slide Append | `regista-data` | `src/stores/tactical-unified-store.ts`<br>`src/stores/__tests__/tactical-unified-store.test.ts` | スライド編集中にAlt+Sで新しいスクリーンショットをキャプチャした際、編集中のスライドを上書き破壊せず、自動的に新しいスライドを追加してキャプチャ画像を配置するため、連続シーン分析を安全に行えます。 | **DONE ✅** |
| **AAWU-11-1** | 🔀 Timeline Slide Drag & Drop Reordering | `regista-frontend` | `src/components/features/tactical-unified/timeline/timeline-bar.tsx`<br>`src/components/features/tactical-unified/timeline/slide-card.tsx`<br>`src/stores/slices/slide-slice.ts` | タイムライン上でスライドカードをドラッグ＆ドロップして直感的にスライドの順番を入れ替えられるようになり、戦術ストーリーの構成変更が格段にスムーズになります。 | **DONE ✅** |
| **AAWU-11-2** | 🎬 Multi-Slide Morphing Video Export (WebCodecs MP4) | `regista-canvas` | `src/lib/tactical/export/tactical-video-exporter.ts`<br>`src/lib/tactical/export/tactical-frame-renderer.ts`<br>`src/components/features/tactical-unified/export/export-modal.tsx` | 作成した複数スライドを繋げ、同一選手の移動やボールのパス軌道を滑らかにアニメーション補間（モーフィング）した高品質MP4動画をワンクリックでエクスポートできます。 | **DONE ✅** |
| **AAWU-11-3** | 📁 Dexie Multi-Project Storage & Project Manager Dialog | `regista-data` | `src/lib/db/tactical-projects-db.ts`<br>`src/components/features/tactical-unified/dialogs/project-manager-modal.tsx`<br>`src/components/features/tactical-unified/toolbar/top-bar.tsx` | 「アーセナル vs マンチェスターC」「ビルドアップ解説」のように複数の戦術分析プロジェクトに名前を付けて保存・一覧管理・切り替え・複製・削除ができるようになります。 | **DONE ✅** |
| **AAWU-11-5** | 🧩 Store Modularization: Annotation & Tool Slices Extraction | `regista-data` | `src/stores/tactical-unified-store.ts`<br>`src/stores/slices/annotation-slice.ts`<br>`src/stores/slices/tool-slice.ts`<br>`src/stores/slices/slide-slice.ts` | ストアの状態更新が局所化され、描画ツールの切り替えやアノテーション追加時の不要な再レンダリングを完全に防止して超低負荷な動作を実現します。 | **DONE ✅** |
| **AAWU-11-7** | 📦 Shared Types Monorepo Extraction (@footics/types / Shared Contracts) | `regista-data` | `src/lib/types/tactical-unified.ts`<br>`extension/types/messaging.ts`<br>`src/lib/types/capture-protocol.ts` | Web本体とブラウザ拡張機能（Extension）の間でキャプチャ通信や戦術データの型定義が一元化され、将来の機能拡張やアップデート時も型不整合バグを完全に未然防止します。 | **DONE ✅** |
| **AAWU-12-1** | 🧹 Workspace & Legacy Component Purge | `regista-frontend` | `src/stores/tactical-unified-store.ts.bak`<br>`src/app/animation-test/page.tsx`<br>`src/components/features/dashboard/Dashboard.tsx`<br>`src/stores/ui-store.ts`<br>`src/stores/tactical-animation-store.ts`<br>`src/stores/tactical-store.ts` | レガシーコード・不要モーダルが完全撤廃され、アプリ全体のバンドルサイズが削減され、ダッシュボードから最新の /tactical 画面へ迷わず遷移できるようになります。 | **DONE ✅** |
| **AAWU-12-2** | 👥 Unified Multi-Team Squad Architecture | `regista-frontend` | `src/components/features/teams/ChelseaSquadClient.tsx`<br>`src/app/teams/[teamId]/page.tsx`<br>`src/app/teams/chelsea/page.tsx`<br>`src/components/features/teams/squad-header.tsx` | チーム管理画面が全クラブ（アーセナル、マンC、レアル等）で一貫した設計になり、重複ルートが解消されてURLとコンポーネントの整合性が保たれます。 | **DONE ✅** |
| **AAWU-12-3** | 🎯 Trajectory Tracking Arrow Parity & Ball Trajectory Engine | `regista-canvas` | `src/lib/types/tactical-unified.ts`<br>`src/lib/tactical/unified-interpolation.ts`<br>`src/stores/slices/slide-slice.ts`<br>`src/stores/tactical-unified-store.ts`<br>`src/components/features/tactical-unified/canvas/ghost-trajectory-arrow.tsx`<br>`src/components/features/tactical-unified/canvas/player-layer.tsx`<br>`src/components/features/tactical-unified/canvas/ball-object.tsx` | スライド間の追跡矢印でポインタを動かした際に矢印が常にポインタ上に吸着し、枠外へのドラッグでも挙動が安定します。またボールも選手同様に追跡矢印が表示され、ベジェ曲線による直感的な弾道編集・アニメーション移動が可能になります。 | **DONE ✅** |

## 3. [Active Ticket Details (自己完結チケット詳細)]

## 4. [Completion History (完了実績ログ)]

- **2026-09-03**: [AAWU-12-3 Complete: 🎯 Trajectory Tracking Arrow Parity & Ball Trajectory Engine]
  1. ツールバー矢印と完全同一の2次ベジェ曲線・制御点逆算・非クランプ共通コンポーネント (GhostTrajectoryArrow) を実装し、ポインタ上への完全吸着と範囲外許容を実現
  2. BallStateSchema に trajectory を追加し、ボール選択時のゴーストボール表示・追跡矢印描画・ベジェ曲線弾道操作を完全実装
  3. interpolateBall におけるベジェ曲線補間移動、および左右反転・アスペクト比変更時の制御点変換に対応
  4. 専用テスト (tracking-arrow-and-ball-trajectory.test.ts) を含む全32件の関連Vitest・型チェック・Biomeをパス

- **2026-09-02**: [AAWU-12-2 Complete: 👥 Unified Multi-Team Squad Architecture]
  1. ChelseaSquadClient を汎用 TeamSquadClient にリファクタリングし、旧戦術モーダル依存を完全排除して統合戦術ボード (/tactical) 連携へ統一
  2. src/app/teams/chelsea/page.tsx の静的ルートを削除し、動的ルート (/teams/[teamId]) で全クラブを一元処理。squad-header/ダイアログのクラブ動的対応とテスト作成完了

- **2026-09-02**: [AAWU-12-1 Complete: 🧹 Workspace & Legacy Component Purge]
  1. 旧戦術コンポーネント(tactical-board, tactical-animation)および旧ストア・フック・補間ワーカーを完全撤廃
  2. AddPlayerDialogをteamsディレクトリへ移設しDashboard/NationalDashboardから統合戦術ボード(/tactical)への導線に一本化
  3. pnpm buildおよび全単体テスト・型チェックがエラー0件でパス

- **2026-09-02**: [AAWU-11-7 Complete: 📦 Shared Types Monorepo Extraction (@footics/types / Shared Contracts)]
  1. Web本体とExtension間のキャプチャ通信契約をsrc/lib/types/capture-protocol.tsへ集約しZod検証・定数・型安全パイプラインを確立
  2. ExtensionおよびWebアプリ側の重複手動定義を撤廃し単一契約参照への一本化とScoped型チェック・Biome・Vitest全テスト完全パス

- **2026-09-02**: [AAWU-11-5 Complete: 🧩 Store Modularization: Annotation & Tool Slices Extraction]
  1. アノテーションCRUDおよび消しゴム操作をannotation-slice.tsへ、描画ツール・オブジェクト選択・パネル状態をtool-slice.tsへ完全分離
  2. tactical-unified-storeへの型安全なスライス合成と公開型・セレクターの100%後方互換性を維持し全単体テスト59件完全パス

- **2026-09-02**: [AAWU-11-3 Complete: 📁 Dexie Multi-Project Storage & Project Manager Dialog]
  1. Dexie v20スキーマにtactical_projectsテーブルを新設しマルチプロジェクト永続化・CRUD・インラインリネームを実装
  2. プロジェクト管理モーダル（選択式・複数インポート・一括ZIPエクスポート・一括削除・検索）を配備しHydration Mismatchエラーも解消

- **2026-09-02**: [AAWU-11-2 Complete: 🎬 Multi-Slide Morphing Video Export (WebCodecs MP4)]
  1. WebCodecs VideoEncoder + mp4-muxer による高速・軽量なMP4エンコードパイプライン (tactical-video-exporter.ts) を構築
  2. スライド間の選手ID/背番号/名前マッチングによる滑らかな位置・姿勢・アノテーションのイージング補間を統合
  3. エクスポートモーダルにスライド間遷移秒数(1.0s~3.0s)、静止保持秒数(0s~2.0s)、イージング選択UIを配備

- **2026-09-02**: [AAWU-11-1 Complete: 🔀 Timeline Slide Drag & Drop Reordering]
  1. SlideCard に @dnd-kit/sortable および SlideCardOverlay を実装し滑らかな水平D&D並び替えと追従アニメーションを配備
  2. TimelineBar に DndContext/SortableContext を統合し 5px 遊び付き PointerSensor でクリック/右クリックと競合ゼロの並び替え＆Undo復元を達成

- **2026-09-02**: [AAWU-10-4 Complete: 🎞️ Non-Destructive Capture on Active Slide & Auto-New Slide Append]
  1. 初期4-4-2ピッチからの選手移動・スタイル変更・アノテーション・ボール位置などの微小変更を完全検知し編集中スライドの自動保持＆新規スライド追加パイプラインを配備
  2. 単体テスト全42件および型チェック完全パス

- **2026-09-02**: [AAWU-10-3 Complete: 🗑️ Intuitive Slide Selection & Keyboard / Context Menu Deletion]
  1. Delete/Backspaceキーでのアクティブスライド削除（最低1枚制限トースト）とCtrl+Z復元を実装
  2. SlideCard右クリックのカスタムコンテキストメニュー（複製・削除・左右移動）を配備しwindow.confirmを撤廃

- **2026-09-02**: [AAWU-10-2 Complete: 💾 Persistent Tactical Project & Dexie Auto-Save on Reload]
  1. Dexie.js keyval テーブルを活用した単一キー上書き型の軽量戦術プロジェクト自動保存 (800ms デバウンス) & 初回復元パイプラインを配備
  2. TopBar に控えめな保存ステータスインジケーター (Saved/Saving) と IndexedDB完全削除連動の「新規作成 (New)」ボタンを実装

- **2026-09-02**: [AAWU-10-1 Complete: ⚡ Ultra-Fast Capture & Instant Tactical Tab Switching Pipeline]
  1. キャプチャ撮影パイプラインをJPEG 98%およびクロップ出力をWebP 0.95%に最適化し高画質維持とタブ間転送サイズ70-80%削減を両立
  2. 既存tacticalタブ探索・アクティブ化・フォーカスを並行処理化しタブ切り替えラグを半減
  3. WXT ctxライフサイクルとisContextValidガードにより拡張機能リロード時のContext Invalidatedスタックトレースを解消

- **2026-09-01**: [AAWU-8-4 Complete: 🧹 Legacy Video-Canvas Deprecation & Workspace Cleanup]
  1. video-canvas パッケージを完全削除し、全キャプチャ機能を extension/ 単一パッケージへ完全集約

- **2026-09-01**: [AAWU-8-3-D Complete: 📑 Timeline Right-Click Duplicate & Snapshot Context Carryover]
  1. + ボタン左クリック白紙初期化と右クリック完全引き継ぎ複製を実装
  2. スライド切り替え連動とVitest全158件パス達成

- **2026-09-01**: [AAWU-8-3-C Complete: 🛠️ Ring Placement Toolbar & Snapshot-Centric Right Panel]
  1. ツールバーにリング配置ボタンを新設し、右パネルインスペクターでの全アノテーション操作を完備

- **2026-09-01**: [AAWU-8-3-B Complete: ⭕ 3D Foot Ring & Spotlight Pillar Rendering Integration]
  1. 3D足元リングおよび光の柱（スポットライトビーム）のKonva描画レイヤー完全統合
  2. 視野コーン楕円連動および単体テスト全パス

- **2026-09-01**: [AAWU-8-3-A Complete: 🖼️ Snapshot Analysis Mode & Clean Canvas Initialization]
  1. スナップショット解析モードへの自動初期化とクリーンキャンバス切り替えを実装
  2. 右パネルの自動 Properties 最適化完了

- **2026-09-01**: [AAWU-8-2 Complete: 🔌 Extension Integration & Global Shortcut Trigger]
  1. Alt+S グローバルショートカットとメッセージングパイプラインを extension/ 単一パッケージに完全集約
  2. Chrome MV3 ビルドおよび Windows 側への sync-extension 完了

- **2026-09-01**: [AAWU-8-1 Complete: 📸 Hardened DRM Capture Engine & Precise Video Crop]
  1. 多層GPU合成DRM回避CSSトリックを整備しスクロールバーを完全隠蔽
  2. アスペクト比連動の黒帯自動トリミングエンジンを構築し単体テスト全5件パス

- **2026-09-01**: [AAWU-9-1 Complete: 🧩 Tactical Unified Store Slice Pattern Refactoring]
  1. Refactored to Slice Pattern
  2. Tests passed

- **2026-09-01**: [AAWU-6-4 Complete: 👥 Sub-Centric Squad Panel & One-Click Pitch Deploy]
  1. SquadSubPanel にワンクリックピッチ投入ボタン ([+] 投入) を完備し、各ポジション別アコーディオンから即時投入可能に実装済

- **2026-09-01**: [AAWU-6-2 Complete: 🏷️ Player Label High-Contrast Visibility Fix]
  1. 選手マーカー下ラベルおよび動画エクスポート用 renderer で #ffffff + stroke=#020617 (strokeWidth=2) による高コントラスト白文字描画を適用済

- **2026-09-01**: [AAWU-6-1 Complete: 🔲 Default Auto-Fit Pitch Boundary Box]
  1. ピッチ白線フィット境界線のデフォルト値 (16:9 / 9:16 / スクリーンショット) を tactical-unified.ts および boundary-box.tsx に配備済

