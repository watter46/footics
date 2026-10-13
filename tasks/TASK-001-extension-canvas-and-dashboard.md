# TASK-001: Extension クイック編集キャンバス & 動画別ダッシュボード実装

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-14
- **Target**: `extension/`, `src/features/tactical-unified/`

## 2. Requirements (要件)
- [x] [要件1: Extension 内部 DB (Dexie / IndexedDB)]
  - `CapturedScreenshot` スキーマ（id, timestamp, videoUrl, videoTitle, videoTime, imageDataUrl, thumbnailDataUrl, canvasAnnotations, isFavorite, syncedToFootics）を管理するテーブル `captured_screenshots` を構築する。
  - 基本保持期間（90日）および自動削除条件（「90日以上経過」AND「総保存件数が100件以上」）に基づき、古い順（timestamp昇順）に削除するクリーンアップロジックを実装する。お気に入り（`isFavorite === true`）は自動削除から除外する。
- [x] [要件2: クイック編集タブ (`canvas.html`)]
  - スクショ撮影完了時に即座に `canvas.html?id=[capture_id]` を新規タブで開く。
  - キャプチャ画像を背景として読み込み、戦術描画（ペン、矢印、直線、テキスト、サークル、矩形）を行える。
  - クリップボードコピー、PNG画像保存、X(Twitter)ポスト誘導、ダッシュボード遷移のアクションバーを備える。
- [x] [要件3: 動画別ダッシュボードタブ (`dashboard.html`)]
  - 保存されたスクショを動画（URL / タイトル）ごとにグループ化して一覧表示する。
  - 動画内の一括ダウンロード、一括削除、各スクショの再編集（`canvas.html` への遷移）、単体ダウンロード、単体削除、お気に入り切り替えを行える。
- [x] [要件4: 将来のFootics連携用疎結合APIハンドラ]
  - Background 側で `GET_SCREENSHOTS_BY_VIDEO`, `GET_SCREENSHOT_DATA`, `DELETE_SCREENSHOT` メッセージハンドラを定義する。
- [x] [要件5: 既存不要ロジックの調査・提示・承認後クリーンアップ]
  - Phase 1〜3 完了後、Footics本体を自動で開いていた不要ロジックを精査・提示し、ユーザー承認を得てから削除する。（※ユーザー承認待ちのため削除コードは未実行が正常）

## 3. Testing Strategy (Worker用テスト実装指示)
- **対象テストファイル**:
  1. `extension/features/capture/db/__tests__/screenshot-db.test.ts`
     - スキーマ保存・取得・更新・削除の正常系
     - 90日経過 & 100件超過時の古い順削除クリーンアップ（100件未満なら削除されないこと、isFavoriteが除外されること）
  2. `extension/features/capture/__tests__/capture-pipeline.test.ts`
     - キャプチャ完了時に DB 保存と `canvas.html` オープンが正しくトリガーされること
  3. `extension/features/dashboard/__tests__/grouping.test.ts`
     - スクショ一覧を videoUrl ごとに正しくグルーピングし統計を算出できること
- **検証コマンド**:
  - `rtk vitest run extension/features/capture/db/__tests__/screenshot-db.test.ts`
  - `rtk vitest run extension/features/dashboard/__tests__/grouping.test.ts`
  - `bun run agent:check-worker <対象ファイル>`

## 4. Implementation Steps (Worker 実装手順)

### Phase 1: Extension 内部 DB & クリーンアップロジックの実装
- [x] 1. **`extension/features/capture/db/screenshot-db.ts`**:
  - Dexie インスタンス `ScreenshotDatabase` および `CapturedScreenshot` インターフェース定義
  - CRUD操作関数（`saveCapturedScreenshot`, `getScreenshotById`, `getAllScreenshots`, `getScreenshotsByVideo`, `updateScreenshot`, `deleteScreenshot`, `deleteScreenshotsByVideo`）
  - クリーンアップロジック `purgeOldScreenshots()` の実装
- [x] 2. **`extension/features/capture/db/__tests__/screenshot-db.test.ts`**:
  - TDD によるテスト作成・RED 確認・実装・GREEN 確認

### Phase 2: クイック編集タブ (`entrypoints/canvas/index.html`) の復元・実装
- [x] 3. **`extension/entrypoints/canvas/index.html` & `main.tsx`**:
  - エントリーポイント HTML & React マウントファイル作成
- [x] 4. **`extension/features/canvas/components/QuickCanvasView.tsx`**:
  - Canvas 描画エンジン（Konva または Canvas API）による背景画像表示、ツールバー（ペン、矢印、テキスト、サークル等）、色・太さ選択、Undo/Redo
  - アクションバー（クリップボードコピー、ダウンロード、Xポスト、ダッシュボード遷移）
- [x] 5. **`extension/entrypoints/background.ts` & キャプチャ動線の結合**:
  - キャプチャ実行時に DB 保存を行い、`canvas.html?id=...` を開く処理への切り替え

### Phase 3: 動画別ダッシュボードタブ (`entrypoints/dashboard/index.html`) の実装
- [x] 6. **`extension/entrypoints/dashboard/index.html` & `main.tsx`**:
  - エントリーポイント HTML & React マウントファイル作成
- [x] 7. **`extension/features/dashboard/components/DashboardView.tsx`**:
  - 動画別グルーピングロジック (`extension/features/dashboard/utils/grouping.ts`)
  - 動画アコーディオン / カード表示（動画タイトル、URL、サムネイル一覧、枚数）
  - 一括操作（一括ダウンロード、一括削除）
  - 単体操作（再編集、ダウンロード、削除、お気に入り切り替え）
- [x] 8. **`extension/features/dashboard/__tests__/grouping.test.ts`**:
  - グルーピングと統計の単体テスト

### Phase 4: 将来連携 API & 既存ロジッククリーンアップ（調査・提示・承認・削除）
- [x] 9. **Background 側の疎結合 API 実装**:
  - `GET_SCREENSHOTS_BY_VIDEO`, `GET_SCREENSHOT_DATA`, `DELETE_SCREENSHOT` のハンドラ定義
- [x] 10. **クリーンアップ対象の精査・ユーザー提示**:
  - 削除・修正するファイルと差分を提示し、ユーザーの承認を得る
- [x] 11. **承認後のクリーンアップ実行**:
  - Footics 本体側:
    - `src/features/tactical-unified/hooks/use-tactical-capture-bridge.ts` の削除
    - `src/features/tactical-unified/hooks/__tests__/use-tactical-capture-bridge.test.ts` の削除
    - `src/features/tactical-unified/tactical-unified-page.tsx` から `useTacticalCaptureBridge` インポートおよび呼び出しの削除
  - Extension 側:
    - `extension/features/capture/tactical-bridge.ts` の削除
    - `extension/features/capture/__tests__/tactical-bridge.test.ts` の削除
    - `extension/entrypoints/background.ts` から `routeCaptureToTactical` および `SEND_CAPTURE_TO_TACTICAL` の削除
    - `extension/entrypoints/overlay.content.tsx` から `sendCaptureToTactical` の未使用インポート削除
  - 検証: 全体テスト、Biome lint、TypeCheck が PASS することを確認

## 5. Worker Verification (Worker 自己検証)
- [x] すべての Testing Strategy に基づきテストを書き、失敗(RED)を確認してから実装(GREEN)したこと
- [x] すべての Implementation Steps が完了していること
- [x] `bun run agent:check-worker <対象ファイル>` がエラーなく(exit code 0) PASS すること

## 6. Reviewer Checklist (Reviewer 審査基準)
- [x] 自動検証チェック（Biome / TypeCheck / Vitest 全18件 PASS / depcruise 循環依存なし）
- [x] Requirements (要件) が漏れなく実装されていること
- [x] 余計なファイルの削除や、意図しないアーキテクチャの破壊がないこと
- [x] エラーハンドリングや型定義が適切であること

## 7. Reviewer Assessment (審査結果)
- **判定**: `LGTM`
- **総評**:
  - 要件1〜5のすべての実装および不要ロジックのクリーンアップ（Step 11）が完全に完了。
  - 承認リスト通りの4ファイル削除（`use-tactical-capture-bridge.ts`, そのテスト, `tactical-bridge.ts`, そのテスト）および3ファイル修正（`background.ts`, `overlay.content.tsx`, `tactical-unified-page.tsx`）が安全に実施されたことを確認。
  - 余計なファイルの削除や意図しない変更、型エラー、回帰は一切なし。
  - テストは Extension 側全18件、tactical-unified hooks 全12件すべてが PASS。
  - Biome（Lint/Format）および TypeScript 型チェックもエラー0件。
  - アーキテクチャ・依存関係検証も循環参照等の問題なし。
