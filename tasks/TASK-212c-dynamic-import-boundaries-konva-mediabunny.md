# TASK-212c: 重量級クライアントモジュール・モーダル・動画出力エンジンの動的インポート境界最適化

- **Status**: `TODO`
- **Commit**: `perf(tactical): lazy-load export modal, split preview, project dialog, and mediabunny engine`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2 (parallel: page dynamic imports & mediabunny lazy import)
  - Wave 2: Phase 3 (sequential after Wave 1: page mode & export engine test alignment)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/tactical-unified-page.tsx): ^import .* from '\./panels/(export/export-modal|dialogs/project-manager-modal|split-preview/tactical-split-preview-panel)'`
  - `rg(src/lib/tactical/export/video-export-engine.ts): ^import .* from '\./video-mediabunny-export'`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `TacticalUnifiedPage` でエクスポートモーダルを開く操作・プロジェクト管理モーダルを開く操作・レイアウトモード（`workspaceMode === 'director'`）へ切り替える操作が従来通り機能すること。
  2. `video-export-engine.ts` の公開 API（`exportTacticalVideo`, `exportVideoDirect`, `exportVideoWithWorker`, `exportMp4Video`, `exportTransparentWebm`, `exportVideoWithMediabunny`, `exportVideoWithMediaRecorder`）のシグネチャと戻り値を壊さず、Web Worker 実行および Worker 非対応時のフォールバック経路が動作すること。
  3. `page.tsx`（Server Component）および `use-tactical-match-init.ts` の初期ロード構成を壊さないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `tactical-unified-page.tsx` の `ExportModal`・`ProjectManagerModal`・`TacticalSplitPreviewPanel` を `next/dynamic(..., { ssr: false })` によるコード分割へ移行し、初期ボード表示バンドルから重量級 Canvas2D プレビュー・動画出力UI・Dexie ダイアログを分離する。
  2. `video-export-engine.ts` から `./video-mediabunny-export` および `./video-media-recorder-export` への静的トップレベル `import` を廃止し、各エクスポート関数内で `await import('./video-mediabunny-export')` / `await import('./video-media-recorder-export')` による動的インポート（遅延ロード）へ置換する（`mediabunny` 本体がメインスレッドの初期チャンクに入らないようにする）。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/lib/tactical/export/video-export-engine.ts`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
  - `src/lib/tactical/__tests__/video-export-engine.test.ts`

## 2. Implementation Phases

### Phase 1: `TacticalUnifiedPage` のモーダル・レイアウト専用パネル `next/dynamic` 化
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/tactical-unified-page.tsx` (L1-L65)
- **Reference Files (Read-Only)**:
  - `.agents/rules/react-nextjs.md`
- **Contract**:
  ```ts
  const ExportModal = dynamic(
    () => import('./panels/export/export-modal').then((m) => m.ExportModal),
    { ssr: false },
  );
  const ProjectManagerModal = dynamic(
    () =>
      import('./panels/dialogs/project-manager-modal').then(
        (m) => m.ProjectManagerModal,
      ),
    { ssr: false },
  );
  const TacticalSplitPreviewPanel = dynamic(
    () =>
      import('./panels/split-preview/tactical-split-preview-panel').then(
        (m) => m.TacticalSplitPreviewPanel,
      ),
    { ssr: false },
  );
  ```
  - 振る舞い仕様・境界条件:
    1. `ExportModal`, `ProjectManagerModal`, `TacticalSplitPreviewPanel` の静的 `import` を削除し、上記 `next/dynamic(..., { ssr: false })` に置き換える。
    2. 既存の条件付きマウント（`exportModalOpen && <ExportModal />`, `projectManagerModalOpen && <ProjectManagerModal ... />`, `isDirectorMode ? <TacticalSplitPreviewPanel /> : <FullTacticalCanvas />`）はそのまま維持し、開いた時／モード切替時のみチャンクがロードされるようにする。
- **Concrete Test Cases**:
  - Phase 3 の統合・モード切替テストで検証。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/tactical-unified-page.tsx`

### Phase 2: `video-export-engine.ts` の `mediabunny` / `MediaRecorder` 動的インポート化
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/export/video-export-engine.ts` (L1-L194)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/export/video-mediabunny-export.ts`
  - `src/lib/tactical/export/video-media-recorder-export.ts`
- **Contract**:
  ```ts
  export async function exportVideoWithMediabunny(
    options: VideoExportOptions,
  ): Promise<Blob>;
  export async function exportVideoWithMediaRecorder(
    options: VideoExportOptions,
  ): Promise<Blob>;
  ```
  - 振る舞い仕様・境界条件:
    1. `video-export-engine.ts` 先頭の `./video-mediabunny-export` および `./video-media-recorder-export` の静的 `import` を削除する。
    2. 既存の呼び出し互換のため、`export async function exportVideoWithMediabunny(options: VideoExportOptions)` と `export async function exportVideoWithMediaRecorder(options: VideoExportOptions)` を薄い動的ローダーラッパー（`const { exportVideoWithMediabunny: run } = await import('./video-mediabunny-export'); return run(options);`）として公開し、`exportVideoDirect`・`exportMp4Video`・`exportTransparentWebm` も同ラッパー経由で呼び出す。
    3. `createVideoExportWorker`, `exportVideoWithWorker`, `exportTacticalVideo`, `calculateBoundaryCrop`, `getSupported*` の振る舞いは完全に保持する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/video-export-engine.test.ts` が引き続き全 PASS すること。
- **Verification**:
  - `bun run ai:check src/lib/tactical/export/video-export-engine.ts src/lib/tactical/__tests__/video-export-engine.test.ts`

### Phase 3: 動的インポート境界のページ統合・モード切替テスト確認
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `next/dynamic` 化に伴い、非同期ロード解決を待つ必要があるアサーションがあれば `findBy*` / `waitFor` を用いて安定化し、初期ボード表示・Director モード切替・ExportModal / ProjectManagerModal の開閉がすべて PASS することを確認する（変更不要な既存テストは最小差分で検証）。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` & `tactical-unified-page-integration.test.tsx`（実 Store 接続・内部 `vi.mock` 禁止）:
    - `case 1`: `board` 初期表示で `ExportModal`・`TacticalSplitPreviewPanel` が未マウントであり、Director 切替で `preview-container` が遅延マウントされること。
    - `case 2`: Export / ProjectManager トリガー操作で対象モーダルが遅延マウントされること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`
