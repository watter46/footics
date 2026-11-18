# TASK-212o: 境界線プリセットメニュー統一・ドキュメント最新化・戦術用語洗い出し

- **Status**: `TODO`
- **Commit**: `docs(tactical): rename BoundaryPresetMenu, sync docs/rules, and add tactical glossary inventory`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel)
  - Wave 2: Phase 4 (sequential after Wave 1)
- **Negative Contracts**:
  - `absent: src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`
  - `absent: src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx`
  - `rg: XMediaPresetMenu|x-media-preset-menu`
  - `rg(docs): src/lib/tactical/\{.*spatial|DrawingPreviewLayer|tactical-frame-renderer|canvas-store\.ts`
  - `rg(docs,.agents/rules): tactical-unified-store`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `docs/` および `.agents/rules/` の構成記述は、`TASK-212a` 〜 `TASK-212n` 実施後の実ファイル配置（`src/lib/tactical/{domain,acl,engine,compiler,export,shared}/`, `TacticalStoreProvider`, `InteractionPreviewLayer`, `ObjectOptions`, `LayoutPreview`, `BoundaryPresetMenu`）と 100% 一致させること。
  2. 大規模リネーム（`tactical-unified` 254ファイル、`Slide` ➔ `Scene` 100+ファイル、`FullTacticalCanvas`, `CoreDrawingToolbar`, `XMediaPresetKey` 等）は本タスクではコード変更を行わず、網羅的な用語・配置洗い出し仕様書 `docs/spec/tactical-glossary.md` に記録して次期大規模タスクの入力とすること。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `x-media-preset-menu.tsx` を `boundary-preset-menu.tsx`（`BoundaryPresetMenu`）へ置換し、`panels/toolbar/index.ts` とテストを更新して旧ファイルを削除する（※定数・型名 `X_MEDIA_PRESETS` / `XMediaPresetKey` はデータ層に跨るため用語洗い出しリストに記録）。
  2. `docs/spec/tactical-board.md`、`docs/tech-stack.md`、`docs/data-model.md`、`docs/README.md`、`.agents/rules/coding-standards.md` の古い記述を実態に合わせて更新する。
  3. 新規 `docs/spec/tactical-glossary.md` に、戦術ボード領域のユビキタス言語とコード命名・ファイル配置の残存ギャップ一覧を網羅する。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/panels/toolbar/index.ts`
  - `docs/spec/tactical-board.md`, `docs/tech-stack.md`, `docs/data-model.md`, `docs/README.md`, `.agents/rules/coding-standards.md`

## 2. Implementation Phases

### Phase 1: `XMediaPresetMenu` ➔ `BoundaryPresetMenu` 命名統一
- **Target Files**:
  - `[ADD]` `src/features/tactical-unified/panels/toolbar/boundary-preset-menu.tsx` (~271 lines)
  - `[MODIFY]` `src/features/tactical-unified/panels/toolbar/index.ts` (L10, BoundaryPresetMenu)
  - `[ADD]` `src/features/tactical-unified/panels/toolbar/__tests__/boundary-preset-menu.test.tsx` (~140 lines)
  - `[DELETE]` `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`
  - `[DELETE]` `src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx`
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/panels/toolbar/x-media-preset-menu.tsx`
  - `src/features/tactical-unified/panels/toolbar/__tests__/x-media-preset-menu.test.tsx`
- **Contract**:
  ```ts
  export function BoundaryPresetMenu(): React.ReactNode;
  ```
  - 振る舞い仕様・境界条件:
    1. `XMediaPresetMenu` を `BoundaryPresetMenu` に改名し、`panels/toolbar/index.ts` からエクスポートする。
    2. 旧 `x-media-preset-menu.tsx` と専用テストを物理削除する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/panels/toolbar/__tests__/boundary-preset-menu.test.tsx`（実 StoreProvider 接続）:
    - `case 1`: `BoundaryPresetMenu` の描画・トグル・各プリセット選択コマンド発行テストがすべて通過すること。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/panels/toolbar/boundary-preset-menu.tsx src/features/tactical-unified/panels/toolbar/index.ts src/features/tactical-unified/panels/toolbar/__tests__/boundary-preset-menu.test.tsx`

### Phase 2: `docs/` 仕様書4ファイルの最新化
- **Target Files**:
  - `[MODIFY]` `docs/spec/tactical-board.md` (L15-L90, L286-L324)
  - `[MODIFY]` `docs/tech-stack.md` (L43-L50, L130-L140)
  - `[MODIFY]` `docs/data-model.md` (L259-L300)
  - `[MODIFY]` `docs/README.md` (用語・リンク整合)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `docs/spec/tactical-board.md`: `spatial/temporal` ➔ `engine`、`shared/`、`ObjectOptions`、`LayoutPreview`、`BoundaryPresetMenu`、`easing.ts`/`use-keyboard-shortcuts.ts`/`use-hud-position.ts` の実態記載、および `TASK-212a〜212o` の履歴追記。
    2. `docs/tech-stack.md`: `DrawingPreviewLayer` ➔ `InteractionPreviewLayer`、`tactical-frame-renderer` ➔ `tactical-phase-frame-renderer.ts` / `scene-graph-canvas2d-rasterizer.ts`、旧 `canvas-store.ts` / `tactical-unified-store.ts` ➔ `TacticalStoreProvider` 構成へ更新。
    3. `docs/data-model.md`: `DomainTacticalProjectSchema` (`version: '3.0.0'`, `screenBackground`, `TacticalPhase` の `backgroundType`/`backgroundImageUrl`/`directorCamera`, `SessionStore` の `activePhaseId`/`activeSlideId`) に同期。
- **Concrete Test Cases**:
  - `docs/` は Markdown のため、`Negative Contracts` の `rg(docs):` パターンが 0 件であること。
- **Verification**:
  - `bun run task:validate tasks/TASK-212o-tactical-boundary-preset-and-docs-glossary.md`

### Phase 3: `.agents/rules/coding-standards.md` の古いストア参照除去
- **Target Files**:
  - `[MODIFY]` `.agents/rules/coding-standards.md` (L159, L181 付近)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `.agents/rules/coding-standards.md` 内の削除済ストア `tactical-unified-store` 例示を、`TacticalStoreProvider`（`document-store.ts` / `session-store.ts` / `playback-store.ts`）に準拠した記載へ更新する。
- **Concrete Test Cases**:
  - `.agents/` は Markdown のため `rg(.agents/rules): tactical-unified-store` が 0 件であること。
- **Verification**:
  - `bun test ./.agents`

### Phase 4: 戦術ボード全用語・残存ギャップ洗い出し仕様書 (`tactical-glossary.md`) の作成
- **Target Files**:
  - `[ADD]` `docs/spec/tactical-glossary.md` (~180 lines)
  - `[MODIFY]` `docs/README.md` (tactical-glossary.md へのインデックスリンク追記)
- **Reference Files (Read-Only)**:
  - `docs/spec/tactical-board.md`
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. 大規模リネーム（別タスク群）の前段として、戦術ボード領域の全ユビキタス言語とコード上の残存ズレを網羅した対照表を `docs/spec/tactical-glossary.md` に作成する。
    2. 最低限以下を含めること：① `tactical-unified` (254ファイル), ② `Slide` vs `Scene` (100+ファイル・IndexedDB/ZIP互換変換要), ③ `FullTacticalCanvas` vs `MainCanvas` / `CoreDrawingToolbar` vs `Toolbar` / `X_MEDIA_PRESETS` & `XMediaPresetKey` vs `BoundaryPreset`, ④ `core/components/hud/` 内リーフファイル名群 (`player-hud` 等) の `object-options/` 統一候補, ⑤ `src/lib/tactical/` 直下残存のチーム・選手整形・ストレージ系 (`formations`, `chelsea-preset`, `teams-config`, `player-formatting`, `tactical-storage` 等) の横断切り出し候補。
- **Concrete Test Cases**:
  - ドキュメント整備のため `docs/README.md` からリンクされ、`rg` で全5カテゴリの残存ギャップが網羅されていること。
- **Verification**:
  - `bun run task:validate tasks/TASK-212o-tactical-boundary-preset-and-docs-glossary.md`
