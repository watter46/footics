# TASK-001: Extension クイック編集キャンバス刷新・共通設計 & バグ修正

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-14
- **Target**: `src/features/tactical-unified/`, `extension/`

## 2. Requirements (要件)
- [x] [要件1: Extension context invalidated エラーの根絶]
  - `extension/features/storage-sync/footics-app-bridge.ts` にホスト判定ガードを導入し、Footics Web App（`localhost:3000`, `footics-*.pages.dev`, `footics.app` 等）以外のページ（YouTube 等）ではブリッジを起動しない。
  - `extension/utils/context.ts` で `isExtensionContextValid()` を定義し、`offline-queue.ts` および `save-queue.ts` でのストレージアクセス前にコンテキスト有効性をガードして無効化エラーをサイレントに安全終了する。
  - `extension/entrypoints/overlay.content.tsx` の `ctx.onInvalidated` でリスナーやタイマーを確実に解除する。
- [x] [要件2: Tactical Core 描画エンジンの拡張・2重管理排除]
  - `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx` の `Layer 1 (backgroundLayer)` に `PitchBackground` を配置し、`backgroundType === 'image'` かつ `backgroundImageUrl` 指定時に Konva Stage 内に画像を直接描画する（`stage.toDataURL()` で背景画像＋描画が完全に合成される）。
  - `src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx` に `markerMode?: '2d-only' | '3d-only' | 'all'`（デフォルト: `'2d-only'`）を追加し、戦術ボード（Footics本体）では 2Dサークルマーカーのみ、Extension クイックキャンバスでは 3D足元リングマーカー（`player-ring`）のみを表示する。
  - `src/features/tactical-unified/hooks/use-standalone-canvas-session.ts` を作成し、Extension 向けにストア初期化（スクショ画像バインド、選手初期非配置、3Dマーカーモード、アノテーション復元・変更監視）を提供する。
- [x] [要件3: 画像トリミング境界線（BoundaryBox）と Ratio 切替機能]
  - スクリーンショット編集画面で `BoundaryBox`（ドラッグ可能な境界線枠）と `BoundaryBoxHud`（比率切替 HUD）を有効化する。
  - `16:9`, `9:16`, `4:5`, `1:1`, フリー比率（ドラッグ変更）のスナップ・切替を可能にする。
  - クリップボードコピー（`tactical:copy-png`）および PNG ダウンロード時、`boundaryBox` のトリミング枠の範囲を正確にクロップして出力する。
- [x] [要件4: Extension 独自素 Canvas の全廃 & QuickTacticalCanvas 実装]
  - `extension/features/canvas/components/QuickCanvasView.tsx`（旧素Canvas）、`canvas-renderer.ts`, `canvas-history.ts` およびそのテストを完全削除する。
  - `extension/features/canvas/components/QuickCanvasTopBar.tsx` を新規作成（動画タイトル・YouTube元リンク、タイムスタンプ、Undo/Redo、⭐お気に入り、📋コピー、💾保存、🚀X共有、📊ダッシュボードリンク）。
  - `extension/features/canvas/components/QuickTacticalCanvas.tsx` を新規作成（`UnifiedCanvas (markerMode="3d-only")` をマウントし、`screenshot-db.ts` と自動同期）。
  - `extension/entrypoints/canvas/main.tsx` で `QuickTacticalCanvas` をマウントする。

## 3. Testing Strategy (Worker用テスト実装指示)
- **対象テストファイル**:
  1. `extension/features/storage-sync/__tests__/context-guard.test.ts`
     - コンテキスト無効化時のガード動作検証（例外をスローせず安全に終了すること）
  2. `src/features/tactical-unified/panels/toolbar/__tests__/drawing-toolbar-marker-mode.test.tsx`
     - `markerMode === '2d-only'` の時、2Dマーカーのみが表示され 3Dリングマーカーが非表示であること
     - `markerMode === '3d-only'` の時、3D足元リングマーカー（`player-ring`）のみが表示されること
  3. `extension/features/capture/db/__tests__/screenshot-db.test.ts`
     - スキーマ保存・取得・更新・削除の正常系
- **検証コマンド**:
  - `bun test extension/features/storage-sync/__tests__/`
  - `bun test src/features/tactical-unified/panels/toolbar/__tests__/`
  - `bun run typecheck`
  - `bun run lint`
  - `bun run --cwd extension compile`
  - `bun run --cwd extension build`

## 4. Implementation Steps (Worker 実装手順)

### Phase 1: コンテキスト無効化バグの根絶
- [x] 1. **`extension/utils/context.ts`**:
  - `isExtensionContextValid(): boolean` の実装
- [x] 2. **`extension/features/storage-sync/footics-app-bridge.ts`**:
  - ホスト判定ガード（Footics Web App 以外では早期リターン）
  - クリーンアップハンドラ（リスナー解除）の提供
- [x] 3. **`extension/features/storage-sync/offline-queue.ts` & `save-queue.ts`**:
  - `isExtensionContextValid()` ガードの追加
- [x] 4. **`extension/entrypoints/overlay.content.tsx`**:
  - `ctx.onInvalidated` でのブリッジクリーンアップ呼び出し

### Phase 2: Tactical Core 描画エンジンの拡張・2重管理排除
- [x] 5. **`src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx`**:
  - `markerMode?: '2d-only' | '3d-only' | 'all'` プロパティ追加とフィルタリング
- [x] 6. **`src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`**:
  - `markerMode` のプロパティ受け取りと `DrawingToolbar` への伝播
  - `Layer 1 (backgroundLayer)` に `PitchBackground` を配置し、画像背景の Konva Stage 内レンダリングを開通
- [x] 7. **`src/features/tactical-unified/hooks/use-standalone-canvas-session.ts`**:
  - スタンドアロン用セッション管理フックの実装

### Phase 3: Extension クイック編集キャンバスの実装 & 旧コード削除
- [x] 8. **旧素Canvas関連ファイルの完全削除**:
  - `extension/features/canvas/components/QuickCanvasView.tsx`
  - `extension/features/canvas/utils/canvas-renderer.ts`
  - `extension/features/canvas/utils/canvas-history.ts`
  - `extension/features/canvas/__tests__/canvas-renderer.test.ts`
  - `extension/features/canvas/__tests__/canvas-history.test.ts`
- [x] 9. **`extension/features/canvas/components/QuickCanvasTopBar.tsx`**:
  - 動画情報、Undo/Redo、⭐お気に入り、📋コピー、💾保存、🚀X共有、📊ダッシュボードリンク
- [x] 10. **`extension/features/canvas/components/QuickTacticalCanvas.tsx`**:
  - `UnifiedCanvas (markerMode="3d-only")` マウント
  - `screenshot-db.ts` 自動同期
  - BoundaryBox（トリミング境界線）および BoundaryBoxHud（比率切替）の有効化
- [x] 11. **`extension/entrypoints/canvas/main.tsx`**:
  - `QuickTacticalCanvas` をマウント

### Phase 4: 一括検証 & ビルド
- [x] 12. **検証 & ビルド**:
  - `bun run typecheck`
  - `bun run lint`
  - `bun run --cwd extension compile`
  - `bun run --cwd extension build`
  - 全自動テスト PASS 確認

## 5. Worker Verification (Worker 自己検証)
- [x] すべての Testing Strategy に基づきテストが PASS すること
- [x] すべての Implementation Steps が完了していること
- [x] `bun run typecheck` と `bun run lint` がエラー0件であること
- [x] `bun run --cwd extension build` が exit code 0 で成功すること

## 6. Reviewer Checklist (Reviewer 審査基準)
- [x] コンテキスト無効化エラー（Extension context invalidated）の対策が完全であること
- [x] 独自 Canvas 実装が削除され、Footics 本体の Konva 基盤（`UnifiedCanvas`）が再利用されていること（2重管理ゼロ）
- [x] 戦術ボードでは 2D マーカーのみ、Extension では 3D マーカー（足元リング）のみが表示されること
- [x] 画像トリミング境界線（BoundaryBox）と比率切替（16:9, 9:16, 4:5, 1:1, フリー）が動作し、トリミングされた画像がエクスポートされること
- [x] Biome / TypeCheck / Extension Build がすべて PASS すること

---

## 7. Reviewer Assessment
- **判定**: `LGTM` (承認)
- **審査日**: 2026-10-14
- **総評**:
  - 要件1〜4の全項目が漏れなく高品質に実装されています。
  - 旧素Canvas実装が完全に排除され、Konvaベースの `UnifiedCanvas` への統一（2重管理ゼロ）が達成されました。
  - 2Dマーカーと3Dリングマーカーの厳密分離、BoundaryBox トリミングエクスポート、Extension context invalidated ガードの安全終了、および手厚いテストコード（context-guard, marker-mode, screenshot-db）の動作を確認しました。
