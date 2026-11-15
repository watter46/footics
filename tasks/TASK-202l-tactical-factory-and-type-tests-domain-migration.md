# TASK-202l: `factory.ts` の Domain 型刷新と型・基礎テスト移行

- **Status**: `TODO`
- **Commit**: `refactor(tactical): migrate tactical factory to Domain types and update core schema/factory tests`
- **Execution Waves**:
  - Wave 1 (sequential): Phase 1
  - Wave 2 (parallel): Phase 2, Phase 3, Phase 4
- **Negative Contracts**:
  - `rg(src/lib/types/tactical/factory.ts): attachProjectSlidesGetter|TacticalProject|TacticalPhase|\bSlide\b|\bPlayer\b`
  - `rg(src/lib/types/__tests__): ensureTacticalProject|attachProjectSlidesGetter|SlideSchema|TacticalProjectSchema|TacticalPhaseSchema|PlayerSchema`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `factory.ts` の全生成関数は `DomainTacticalProject`, `DomainTacticalPhase`, `DomainSlide`, `PitchPlayer` (`DomainPlayer`) を返し、`attachProjectSlidesGetter` や旧フィールド（スライド側の `aspectRatio`/`boundaryBox`/`backgroundType` 等、プロジェクト側の `activePhaseId`/`activeSlideId`/`aspectRatio`/`boundaryBox` 等）を一切生成しない。
  2. 生成される初期プロジェクト・フェーズ・スライド・選手はすべて `DomainTacticalProjectSchema.safeParse(...)` に合格する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `createDefaultProject(id, options?)` は `version: '3.0.0'`, `createdAt`, `updatedAt`, `homeColor`, `awayColor`, `pitchAppearance`, `screenBackground`, `phases: [createDefaultPhase(...)]`, `tags: []` を持つ `DomainTacticalProject` を返す。
  2. `createDefaultPhase(...)` は `aspectRatio`（既定 `'4:5'`）と `boundaryBox`（既定 `DEFAULT_INITIAL_BOUNDARY_BOX`）を持ち、`createDefaultSlide(index, id?, homeColor?, awayColor?, aspectRatio?, deterministic?)` は `DomainSlide` を返す（既存引数の互換性整理：4〜5引数呼び出しがあれば位置に配慮して `aspectRatio` を安全に扱う）。
  3. `createDefaultPlayer(...)` は `area: 'pitch'`, `x: clampToScreenNorm(x)`, `y: clampToScreenNorm(y)`, `connectLines: []`, `badges: []` を持つ `PitchPlayer` を返す。
  4. `computeBenchGridPositions(players: readonly BenchPlayer[])` は `BenchPlayer[]` を扱い、`clampToScreenNorm` で座標生成する。
- **Consumers (同期更新対象)**:
  - `src/lib/types/tactical/factory.ts`
  - `src/lib/types/__tests__/tactical-factory.test.ts`, `tactical-phase-and-coords.test.ts`, `tactical-unified.test.ts`
  - `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`

## 2. Implementation Phases

### Phase 1: `factory.ts` の Domain 型全面刷新と `tactical-factory.test.ts` 更新
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/factory.ts` (294 lines)
  - `[MODIFY]` `src/lib/types/__tests__/tactical-factory.test.ts` (79 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `domain-entities.ts`, `branded.ts`
  - `src/lib/types/tactical/pitch-config.ts`, `project-config.ts`, `camera-config.ts`
- **Contract**:
  ```ts
  export function computeBenchGridPositions(players: readonly BenchPlayer[]): BenchPlayer[];
  export function createDefaultInitialPlayers(homeColor?: string, awayColor?: string, aspectRatio?: AspectRatio, deterministic?: boolean): PitchPlayer[];
  export function createDefault442Players(homeColor?: string, awayColor?: string, aspectRatio?: AspectRatio): PitchPlayer[];
  export function createDefaultPhase(id?: string, name?: string, homeColor?: string, awayColor?: string, slideId?: string, deterministic?: boolean, aspectRatio?: AspectRatio, boundaryBox?: BoundaryBox): DomainTacticalPhase;
  export function createDefaultProject(id: string, options?: { phaseId?: string; slideId?: string; deterministic?: boolean; createdAt?: string }): DomainTacticalProject;
  export function createInitialProject(): DomainTacticalProject;
  export function createDefaultSlide(index: number, id?: string, homeColor?: string, awayColor?: string, aspectRatio?: AspectRatio, deterministic?: boolean): DomainSlide;
  export function createDefaultPlayer(team: 'home' | 'away' | 'neutral', x: number, y: number, primaryColor: string, id?: string): PitchPlayer;
  ```
  - 振る舞い仕様・境界条件:
    1. `attachProjectSlidesGetter` の import・呼び出しを完全撤去する。
    2. `tactical-factory.test.ts` で `project.phases[0].aspectRatio`, `project.phases[0].boundaryBox`, `DomainTacticalProjectSchema.safeParse(project).success` を検証する。
- **Concrete Test Cases**:
  - `tactical-factory.test.ts`: 4:5 初期プロジェクト/フェーズ/スライド生成、22人初期選手生成、`DomainTacticalProjectSchema` 検証通過。
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/factory.ts src/lib/types/__tests__/tactical-factory.test.ts`

### Phase 2: `tactical-phase-and-coords.test.ts` の Domain / ACL 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/types/__tests__/tactical-phase-and-coords.test.ts` (346 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/acl/legacy-project-translator.ts`
  - `src/lib/types/tactical/pitch-config.ts`
- **Contract**:
  - `ensureTacticalProject` テストを `normalizeTacticalProject`（`NormalizedProjectBundle` の `project.phases[0].aspectRatio` / `boundaryBox` 検証）へ移行し、`slide` import を `pitch-config` へ変更する。
- **Concrete Test Cases**:
  - `tactical-phase-and-coords.test.ts`: 旧プロジェクト正規化、座標変換往復、X Media Presets 全通過。
- **Verification**:
  - `bun run ai:check src/lib/types/__tests__/tactical-phase-and-coords.test.ts`

### Phase 3: `tactical-unified.test.ts` の Domain スキーマ & ACL 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/types/__tests__/tactical-unified.test.ts` (454 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`, `domain-entities.ts`, `branded.ts`
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  - 旧スキーマ（`TacticalProjectSchema`, `TacticalPhaseSchema`, `SlideSchema`, `PlayerSchema`）と `ensureTacticalProject` / `attachProjectSlidesGetter` のテストを、`DomainTacticalProjectSchema`, `DomainTacticalPhaseSchema`, `DomainSlideSchema`, `DomainPlayerSchema`（`PitchPlayer`）および `normalizeTacticalProject` の検証テストへ刷新する。
- **Concrete Test Cases**:
  - `tactical-unified.test.ts`: AspectRatio, transformCoord, Domain スキーマ群, BoundaryBox/XMedia, MarkerStyle/ConnectLine/DrawingTool, normalizeTacticalProject, createInitialProject 全通過。
- **Verification**:
  - `bun run ai:check src/lib/types/__tests__/tactical-unified.test.ts`

### Phase 4: `step5-defaults-and-bench-grid.test.ts` の `DomainPlayerSchema` 移行
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts` (288 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-entities.ts`, `branded.ts`
- **Contract**:
  - `PlayerSchema` を `DomainPlayerSchema`（`PitchPlayer` / `BenchPlayer`）へ変更し、`computeBenchGridPositions` テストのベンチ選手入力に `area: 'bench'`, `toScreenNormCoord` を付与する。
- **Concrete Test Cases**:
  - `step5-defaults-and-bench-grid.test.ts`: `DomainPlayerSchema` による `isCustom` 許容とベンチグリッド整列全通過。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/stores/__tests__/step5-defaults-and-bench-grid.test.ts`
