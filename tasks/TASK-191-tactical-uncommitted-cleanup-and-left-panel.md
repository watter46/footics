# TASK-191: 未コミット不整合整理・TASK-183 決定論ID検証・TASK-182 破棄・LeftPanel ドメイン型移行

- **Status**: `DONE`
- **Commit**: `fix(tactical): clean up uncommitted alignment, complete TASK-183, drop TASK-182, and migrate LeftPanel to domain types`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
  - Wave 2: Phase 4 (sequential after Phase 3)
- **Negative Contracts**:
  - `absent: tasks/TASK-182-fix-tactical-store-provider.md`
  - `rg(src/features/tactical-unified/stores/tactical-store-provider.tsx): crypto\.randomUUID|new Date\(\)\.toISOString`
  - `rg(src/features/tactical-unified/panels/left-panel/): \brenderTacticalFrameToCanvas\b|\bTacticalPhase\b|\bnormalizePhases\b`
  - `rg(src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx): vi\.mock\(`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `createDefaultTacticalProject()` は SSR / Client Hydration Mismatch を防ぐため、決定論的な固定 ID (`'default-project'`, `'default-phase-1'`, `'default-slide-1'`) と固定 ISO 日時 (`'1970-01-01T00:00:00.000Z'`) を返し続けること。
  2. サムネイル描画 (`SceneCanvasThumbnail`) を含む全描画は `renderTacticalPhaseFrameToCanvas` 単一パイプラインへ統一し、旧 `renderTacticalFrameToCanvas` / `normalizePhases` を経由しないこと。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `TacticalUnifiedPage` の `initialState` (`TacticalMatchInitialState` = `MatchDomainProjectBundle`) には `panels` や `workspaceMode` を戻さず、統合テスト・モードテスト側を `initialSession` (`CreateSessionStoreOptions`) と `createDefaultTacticalProject()` へ統一する。
  2. `LeftPanel` の旧 `slides` 後方互換フォールバックは廃止し、`readonly DomainTacticalPhase[]` 必須（省略時は `[]`）に一本化する。
  3. テストファイルで内部モジュール（`tactical-frame-renderer` 等）に対する `vi.mock` を禁止し、JSDOM 上の `HTMLCanvasElement.prototype.getContext` のみ外部ブラウザ境界としてスタブして実描画パスを通過させる。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx` (L178: `<LeftPanel phases={phases} ... />` — 型整合によりエラー解消)
  - `src/features/tactical-unified/panels/left-panel/{left-panel,phase-section,scene-canvas-thumbnail}.tsx`
  - `src/features/tactical-unified/__tests__/tactical-unified-page-{integration,modes}.test.tsx`

## 2. Implementation Phases

### Phase 1: 決定論的 ID 検証追加と animation-canvas テスト型修復
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/stores/__tests__/tactical-store-provider.test.ts` (~70 lines)
  - `[MODIFY]` `src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts` (L1-L210)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`createDefaultTacticalProject`, L35-L92)
  - `src/lib/types/tactical/domain-hierarchy.ts` (`DomainSlide`, L27-L50)
- **Contract**:
  ```ts
  // tactical-store-provider.test.ts: SSR/Client 決定論性検証
  // tactical-animation-canvas.test.ts: ローカル純粋ヘルパー
  function createTestDomainSlide(index: number, id: string): DomainSlide;
  ```
  - 振る舞い仕様・境界条件:
    1. `tactical-store-provider.test.ts` は `createDefaultTacticalProject()` を2回連続呼び出し、`toEqual` 完全一致および `id === 'default-project'`, `phases[0].id === 'default-phase-1'`, `phases[0].slides[0].id === 'default-slide-1'`, `createdAt === '1970-01-01T00:00:00.000Z'` を検証する。
    2. `tactical-animation-canvas.test.ts` の未定義 `createDefaultSlide` 呼び出し（L87, L90, L158, L161, L200）をテスト内定義の `createTestDomainSlide`（`clampToScreenNorm(50)` の `ball` を持つ有効な `DomainSlide`）へ置換し、`tsc` エラーを0件にする。
- **Concrete Test Cases**:
  - `tactical-store-provider.test.ts`（純粋関数 I/O）:
    - `case 1`: `createDefaultTacticalProject()` を2回呼び出し ➔ 構造・ID・タイムスタンプが厳密一致し、`DomainTacticalProjectSchema.safeParse(p).success === true`
  - `tactical-animation-canvas.test.ts`:
    - `case 1`: 既存 `createTacticalTimeline` / `pausePlayback` / `stopPlayback` / `seekPlayback` 全ケースが PASS
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/tactical-store-provider.test.ts src/features/tactical-unified/hooks/__tests__/tactical-animation-canvas.test.ts`

### Phase 2: TacticalUnifiedPage 統合・モードテストの型と UI ラベル同期
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx` (L1-L189)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx` (L70-L210)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/tactical-unified-page.tsx` (`TacticalUnifiedPageProps`, L45-L85)
  - `src/features/tactical-unified/stores/session-store.ts` (`CreateSessionStoreOptions`, L86-L91)
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`createDefaultTacticalProject`, L35-L92)
- **Contract**:
  ```tsx
  // テスト内での正しい props 注入形式
  <TacticalUnifiedPage
    initialState={{ project, activePhaseId, activeSlideId }}
    initialSession={{ workspaceMode: 'board', panels: { ... } }}
  />
  ```
  - 振る舞い仕様・境界条件:
    1. 両テストの `initialState={{ workspaceMode, panels }}` を `initialSession={{ workspaceMode, panels }}` へ修正する（`TacticalUnifiedPage` の `initialState` は `MatchDomainProjectBundle` のみ受け付ける）。
    2. `tactical-unified-page-integration.test.tsx` L140 の `createDefaultProject` を `createDefaultTacticalProject()` に置換し、`initialState={{ project: customProject, activePhaseId: customProject.phases[0].id, activeSlideId: customProject.phases[0].slides[0].id }}` で渡す。
    3. `TopBar` ボタン検索を現行 UI ラベル（`/Copy PNG/i` ➔ `'Copy'`、`/Toggle Director Mode|Toggle 3D Split Preview/i` ➔ `'Toggle Layout Mode'`）へ同期する。
- **Concrete Test Cases**:
  - `tactical-unified-page-integration.test.tsx` & `tactical-unified-page-modes.test.tsx`:
    - `case 1`: `initialSession={{ panels: { ..., projectManagerModalOpen: true } }}` でダイアログが表示される
    - `case 2`: `\` キー押下で左右パネルの表示がトグルされる
    - `case 3`: `'Toggle Layout Mode'` クリックで `'preview-container'` が展開・復帰する
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/__tests__/tactical-unified-page-integration.test.tsx src/features/tactical-unified/__tests__/tactical-unified-page-modes.test.tsx`

### Phase 3: LeftPanel / PhaseSection / SceneCanvasThumbnail のドメイン型・単一パイプライン移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/left-panel.tsx` (L1-L80, L175-L232)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/phase-section.tsx` (L1-L35)
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (L1-L98)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts` (`DomainSlide`, `DomainTacticalPhase`, L27-L66)
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (`renderTacticalPhaseFrameToCanvas`, L104-L124)
  - `src/lib/types/tactical/slide.ts` (`getDefaultBoundaryBoxForAspect`, `BoundaryBox`)
- **Contract**:
  ```ts
  export interface LeftPanelProps {
    phases?: readonly DomainTacticalPhase[];
    activePhaseId?: string;
    activeSlideId?: string;
    pitchAppearance?: PitchAppearanceConfig;
    onSelectScene?: (phaseId: string, slideId: string) => void;
    onAddPhase?: () => void;
    onDeletePhase?: (phaseId: string) => void;
    onRenamePhase?: (phaseId: string, name: string) => void;
    onAddSlideToPhase?: (phaseId: string) => void;
  }
  export interface SceneCanvasThumbnailProps {
    slide: DomainSlide;
    width?: number;
    height?: number;
    aspectRatio?: AspectRatio;
    boundaryBox?: BoundaryBox;
    pitchAppearance?: PitchAppearanceConfig;
    className?: string;
  }
  ```
  - 振る舞い仕様・境界条件:
    1. `left-panel.tsx` から旧 `TacticalPhase`, `Slide` および後方互換 `slides`, `onSelectSlide`, `onAddSlide` フォールバックを全撤去する。
    2. `phase-section.tsx` の `phase` 型を `DomainTacticalPhase` へ変更し、`SceneCanvasThumbnail` に `phase.aspectRatio` と `phase.boundaryBox` を渡す。
    3. `scene-canvas-thumbnail.tsx` から `normalizePhases` / `renderTacticalFrameToCanvas` を撤去し、`DomainTacticalPhase`（`id: 'thumbnail-phase'`, `name: 'Thumbnail'`, `aspectRatio`, `boundaryBox: propBoundaryBox ?? getDefaultBoundaryBoxForAspect(aspectRatio)`, `backgroundType: 'pitch'`, `slides: [slide]`）を組んで `renderTacticalPhaseFrameToCanvas({ ctx, phase, timeMs: toMilliseconds(0), width: dims.width, height: dims.height, pitchAppearance, applyEffects: false })` を呼び出す。
- **Concrete Test Cases**:
  - Phase 4 の `left-panel.test.tsx` で一括検証（本 Phase では `tsc` 通過を確認）。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/left-panel/left-panel.tsx src/features/tactical-unified/panels/left-panel/phase-section.tsx src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/tactical-unified-page.tsx`

### Phase 4: left-panel.test.tsx のドメイン型移行と内部モック撤去
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` (L1-L380)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/left-panel/left-panel.tsx`
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx` (`createDefaultTacticalProject`)
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 先頭の `vi.mock('@/lib/tactical/export/tactical-frame-renderer', ...)` および `TacticalPhase` / `createDefaultSlide` インポートを完全削除する。
    2. ダミーデータは `DomainTacticalPhase[]` / `DomainSlide`（`clampToScreenNorm` 使用）で構築する。
    3. `SceneCanvasThumbnail` テストでは `HTMLCanvasElement.prototype.getContext` に完全な 2D Context スタブ（`Proxy` で `save`, `scale`, `restore`, `fillRect`, `stroke`, `beginPath`, `createLinearGradient` 等を返す）を与え、実 `renderTacticalPhaseFrameToCanvas` が例外なく走り、`canvas.width` / `canvas.height` / `style.width` / `style.height` が各アスペクト比（`16:9` -> `100x60`, `9:16` -> `100x178`, `4:5` -> `100x125`, `1:1` -> `100x100`）通りに計算・描画されることを検証する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`:
    - `case 1`: `LeftPanel` のアコーディオン開閉・シーン選択・追加・リネーム・削除確認の全インタラクションが PASS
    - `case 2`: `SceneCanvasThumbnail` が実パイプラインで 4比率 (`16:9`, `9:16`, `4:5`, `1:1`) をエラーなく描画し、`canvas.style.width` / `canvas.style.height` が期待値と一致する
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx`
