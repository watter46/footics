# TASK-211c: Eliminate Internal `vi.mock` from Tactical Data, Canvas, and Page Tests

- **Status**: `TODO`
- **Commit**: `test(tactical): replace internal vi.mock with real Dexie and real canvas integration`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 (parallel)
- **Negative Contracts**:
  - `rg(src/lib/tactical/__tests__/player-photo-resolver.test.ts): vi\.mock\(`
  - `rg(src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx): vi\.mock\('@/lib/`
  - `rg(src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx): vi\.mock\(`
  - `rg(src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx): vi\.mock\('\.\./views/`
  - `rg(src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx): vi\.mock\('\.\./views/`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. プロダクションコード（`player-photo-resolver.ts`, `squad-sub-panel.tsx`, `FullTacticalCanvas.tsx`, `tactical-unified-page.tsx`）へのテスト用 optional 引数やフォールバック追加は禁止する。
  2. Next.js 外部フレームワーク境界の `vi.mock('next/navigation')` のみ許容し、内部 DB / Storage / 描画モジュール / 内部コンポーネントの `vi.mock` を根絶する。
  3. 各テストで検証している振る舞い・優先度・エッジケースは1件も削らず維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. DB テスト（`player-photo-resolver.test.ts`, `squad-panel-step5.test.tsx`）は `src/test/setup.ts` で有効化されている `fake-indexeddb` + 本物の `db`（`@/lib/db/schema`）を使用し、`beforeEach` で対象テーブルを `clear()` して独立性を担保する。
  2. `player-photo-resolver.test.ts` の「DB 例外時のフォールバック検証」は `vi.mock` ではなく `vi.spyOn(db.player_photos, 'where').mockImplementationOnce(...)` により実インスタンス上で一時失敗を注入する。
  3. `FullTacticalCanvas` を描画するページ統合テストでは、実 `FullTacticalCanvas` をそのままマウントし、jsdom 境界の `HTMLCanvasElement.prototype.getContext` スタブと `ResizeObserver` モックのみを使用する。
- **Consumers (同期更新対象)**:
  - テストファイルのみの変更のためプロダクション Consumer 変更なし

## 2. Implementation Phases

### Phase 1: De-mock `player-photo-resolver.test.ts` with Real Dexie (`fake-indexeddb`)
- **Target Files**:
  - `[MODIFY]` `src/lib/tactical/__tests__/player-photo-resolver.test.ts` (L1-L294)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/player-photo-resolver.ts`
  - `src/lib/db/schema.ts`
  - `src/lib/db/player-photos.ts`
  - `src/lib/db/queries-player.ts`
- **Contract**:
  1. `vi.mock('@/lib/db/player-photos')` と `vi.mock('@/lib/db/queries')` を完全削除する。
  2. `beforeEach` で `await Promise.all([db.player_photos.clear(), db.players.clear()])` を実行し、テストケースごとに `db.player_photos.put(...)` / `db.players.put(...)` で実データを投入して `resolvePlayerPhotoSources` を検証する。
  3. DB 呼び出し回数（batching）の検証は `vi.spyOn(db.player_photos, 'where')` / `vi.spyOn(db.players, 'where')` で実クエリ呼び出し回数を検証する（0 calls / 1 call）。
  4. エラーハンドリングテストは `vi.spyOn(db.player_photos, 'where').mockImplementationOnce(() => { throw new Error('DB failure'); })` 等で `console.warn` と空 Map 返却を検証する。
- **Concrete Test Cases**:
  - `src/lib/tactical/__tests__/player-photo-resolver.test.ts`:
    - 優先度 1〜5（`player_photos` Blob > `players` master photoBlob > target `photoUrl` > master `photoUrl` > 名前検索 Blob）がすべて実 Dexie 経由で PASS。
    - batching（20件で各1回・空/無効IDで0回・重複排除）およびエラー時ログ出力が PASS。
- **Verification**:
  - `bun run ai:check src/lib/tactical/__tests__/player-photo-resolver.test.ts`

### Phase 2: De-mock `squad-panel-step5.test.tsx` with Real Dexie & `tactical-storage`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx` (L1-L195, L310-L355)
- **Reference Files (Read-Only)**:
  - `src/lib/db/schema.ts`
  - `src/lib/tactical/tactical-storage.ts`
  - `src/lib/tactical/__tests__/tactical-storage.test.ts`
- **Contract**:
  1. `vi.mock('@/lib/db')` と `vi.mock('@/lib/tactical/tactical-storage')` を完全削除する（`vi.mock('next/navigation')` のみ残す）。
  2. `beforeEach` で `await Promise.all([db.matches.clear(), db.tactical_projects.clear(), db.keyval.clear()])` を実行する。
  3. ケース6（`TopBarMoreMenu re-initializes match data when project has matchId`）では本物の `db.matches.put(...)` と `saveActiveProjectToDb(...)` または本物のストレージ API 呼び出しを用いて試合データ再初期化を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`:
    - `SquadSubPanel` 8ケース + `SquadSubForm` 1ケースすべてが実 Dexie / 実 `tactical-storage` 接続で PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

### Phase 3: De-mock `full-tactical-canvas-integration.test.tsx`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx` (L1-L40)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx`
  - `src/lib/tactical/pitch-svg.ts`
- **Contract**:
  - `vi.mock('@/lib/tactical/pitch-svg', ...)` を削除し、`full-tactical-canvas.test.tsx` と同様に実モジュール（`pitch-svg`）のまま `FullTacticalCanvas` 統合テストを実行する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`:
    - `aspectRatio` 変更、初期配置、マーカー drag clamp、再生ループ・unmount の全5ケースが PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/views/__tests__/full-tactical-canvas-integration.test.tsx`

### Phase 4: De-mock `tactical-unified-page-integration.test.tsx`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (L1-L194)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
- **Contract**:
  - `vi.mock('../views/FullTacticalCanvas', ...)` を削除し、本物の `FullTacticalCanvas`（`canvasRef` 経由で実際に描画・操作可能なステージ）を描画した状態でテストを実行する。
  - `FullTacticalCanvas` 内の Konva Stage 描画の有無は `container.querySelector('.konvajs-content')` 等、実 DOM 要素で検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`:
    - マウント、モーダル初期オープン、`\` キー集中モードトグル、タイトル反映、3D Split Preview トグルの全5ケースが PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx`

### Phase 5: De-mock `tactical-unified-page-modes.test.tsx`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` (L1-L212)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
- **Contract**:
  - `vi.mock('../views/FullTacticalCanvas', ...)` を削除し、本物の `FullTacticalCanvas` を描画した状態で Board <-> Director モード遷移を検証する。
  - Board モード時は実 `FullTacticalCanvas` の DOM（`.konvajs-content` または作図ツールバー）、Director モード時は演出ビュー表示とパネル開閉状態を検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`:
    - 初期 board モード、Director 切替、board 復帰、連続クリックの全4ケースが PASS。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`
