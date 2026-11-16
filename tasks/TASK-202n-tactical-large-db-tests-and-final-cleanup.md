# TASK-202n: 大型 DB テスト移行、`index.ts` 正規切替、レガシー型定義の完全物理削除

- **Status**: `DONE`
- **Commit**: `refactor(tactical): switch tactical types barrel to Domain types and physically delete legacy schemas and migration.ts`
- **Execution Waves**:
  - Wave 1 (parallel): Phase 1, Phase 2
  - Wave 2 (sequential): Phase 3
- **Negative Contracts**:
  - `rg: attachProjectSlidesGetter|attachSlidesGetter|ensureTacticalProject|LegacyTacticalProjectLike`
  - `rg(src/lib/types/tactical): \b(SlideSchema|TacticalProjectSchema|TacticalPhaseSchema|PlayerSchema|ZoneAnnotationSchema|ArrowAnnotationSchema|TextAnnotationSchema|PlayerTrajectorySchema|BallStateSchema)\b`
  - `rg(src/,extension/): from '@/lib/types/tactical/(annotations|ball|migration|player|project|slide)'`
  - `absent: src/lib/types/tactical/migration.ts`
  - `absent: src/lib/types/tactical/project.ts`
  - `absent: src/lib/types/tactical/slide.ts`
  - `absent: src/lib/types/tactical/player.ts`
  - `absent: src/lib/types/tactical/annotations.ts`
  - `absent: src/lib/types/tactical/ball.ts`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. `src/lib/types/tactical/index.ts`（および `tactical-unified.ts`）は、新設計型（`branded`, `domain-entities`, `domain-hierarchy`）と共有中立モジュール群（`effect-config`, `camera-config`, `pitch-config`, `project-config`, `primitives`, `formations`, `capture`, `factory`）のみを正規公開する。
  2. レガシー型定義ファイル 5 本（`project.ts`, `slide.ts`, `player.ts`, `annotations.ts`, `ball.ts`）および旧変換処理 `migration.ts` はすべて物理削除し、後方互換エイリアス（`TacticalProject = DomainTacticalProject` 等）は一切残さない。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. 大型テスト `queries.test.ts`（1324行）と `data-management.test.ts`（481行）は、それぞれ 1+1 ルールに基づき単独 Phase で更新する。
  2. Phase 3 完了後に全体検証（`tsc`・関連 `vitest`・`depcruise`・Negative Contracts）を通し、漏れなく旧型がゼロになったことを確認する。
- **Consumers (同期更新対象)**:
  - `src/lib/db/__tests__/queries.test.ts`
  - `src/lib/__tests__/data-management.test.ts`
  - `src/lib/types/tactical/index.ts`

## 2. Implementation Phases

### Phase 1: `queries.test.ts` の `DomainTacticalProject` 移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/db/__tests__/queries.test.ts` (1324 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - 冒頭の `import type { TacticalProject } from '@/lib/types/tactical-unified';` とファイル内の `TacticalProject` 型注釈を `DomainTacticalProject`（`@/lib/types/tactical/domain-hierarchy`）へ変更する。
- **Concrete Test Cases**:
  - `queries.test.ts`: 全 DB クエリ・プレイヤーマージ・写真結合テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/db/__tests__/queries.test.ts`

### Phase 2: `data-management.test.ts` の ACL 正規化移行（大型テスト 1+1 特例）
- **Target Files**:
  - `[MODIFY]` `src/lib/__tests__/data-management.test.ts` (481 lines)
- **Reference Files (Read-Only)**:
  - `src/lib/tactical/acl/legacy-project-translator.ts`
- **Contract**:
  - `ensureTacticalProject` の import と呼び出しを `normalizeTacticalProject`（`@/lib/tactical/acl/legacy-project-translator`）へ置き換える（復元されたプロジェクトを `normalizeTacticalProject(raw).project` で検証）。
- **Concrete Test Cases**:
  - `data-management.test.ts`: exportAllDataZip / importAllDataZip の全テストが通過すること。
- **Verification**:
  - `bun run ai:check src/lib/__tests__/data-management.test.ts`

### Phase 3: `index.ts` の正規公開元切替 & レガシー型・`migration.ts` 物理削除
- **Target Files**:
  - `[MODIFY]` `src/lib/types/tactical/index.ts` (11 lines)
  - `[DELETE]` `src/lib/types/tactical/migration.ts`
  - `[DELETE]` `src/lib/types/tactical/project.ts`
  - `[DELETE]` `src/lib/types/tactical/slide.ts`
  - `[DELETE]` `src/lib/types/tactical/player.ts`
  - `[DELETE]` `src/lib/types/tactical/annotations.ts`
  - `[DELETE]` `src/lib/types/tactical/ball.ts`
- **Reference Files (Read-Only)**:
  - `src/lib/types/tactical/branded.ts`, `domain-entities.ts`, `domain-hierarchy.ts`
  - `src/lib/types/tactical/effect-config.ts`, `camera-config.ts`, `pitch-config.ts`, `project-config.ts`
  - `extension/features/canvas/components/QuickAnnotationCanvas.tsx`, `QuickCanvasTopBar.tsx`, `RatioPresetSelector.tsx`
- **Contract**:
  ```ts
  export * from './branded';
  export * from './camera-config';
  export * from './capture';
  export * from './domain-entities';
  export * from './domain-hierarchy';
  export * from './effect-config';
  export * from './factory';
  export * from './formations';
  export * from './pitch-config';
  export * from './primitives';
  export * from './project-config';
  ```
  - 振る舞い仕様・境界条件:
    1. `index.ts` から上記 11 モジュールを正規 re-export し、`tactical-unified.ts` 経由の拡張機能（`extension/features/canvas/components/*`）も含めて全 Consumer が新設計型＋中立設定のみを参照できる状態にする。
    2. レガシー 6 ファイルをすべて物理削除する。
- **Concrete Test Cases**:
  - `bun run ai:check src/lib/types/tactical/index.ts extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/QuickCanvasTopBar.tsx extension/features/canvas/components/RatioPresetSelector.tsx`
- **Verification**:
  - `bun run ai:check src/lib/types/tactical/index.ts extension/features/canvas/components/QuickAnnotationCanvas.tsx extension/features/canvas/components/QuickCanvasTopBar.tsx extension/features/canvas/components/RatioPresetSelector.tsx`
