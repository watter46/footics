# TASK-110: tactical-unified 型定義ファイルのモジュール分割

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/lib/types/tactical/primitives.ts` (NEW)
  - `src/lib/types/tactical/player.ts` (NEW)
  - `src/lib/types/tactical/annotations.ts` (NEW)
  - `src/lib/types/tactical/ball.ts` (NEW)
  - `src/lib/types/tactical/capture.ts` (NEW)
  - `src/lib/types/tactical/slide.ts` (NEW)
  - `src/lib/types/tactical/project.ts` (NEW)
  - `src/lib/types/tactical/factory.ts` (NEW)
  - `src/lib/types/tactical/index.ts` (NEW)
  - `src/lib/types/tactical-unified.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. 1,129行の `src/lib/types/tactical-unified.ts` を `src/lib/types/tactical/` 配下の8モジュールに分割すること
- [x] 2. `src/lib/types/tactical/index.ts` および `src/lib/types/tactical-unified.ts` から全シンボルを完全 re-export し、既存200箇所以上の import を一切壊さないこと
- [x] 3. 循環参照（Circular Dependency）が一切存在しないこと
- [x] 4. 単体テスト `rtk vitest run src/lib/types/__tests__/tactical-unified.test.ts` が 30件すべて PASS すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
// src/lib/types/tactical-unified.ts
export * from './tactical';

// src/lib/types/tactical/index.ts
export * from './primitives';
export * from './player';
export * from './annotations';
export * from './ball';
export * from './slide';
export * from './project';
export * from './factory';
export * from './capture';
```

### 3.2 Key Module Responsibilities
- `primitives.ts`: NormalizedCoordSchema, AspectRatioSchema, ASPECT_RATIOS, transformCoord, transformPoints
- `player.ts`: MarkerStyle, VisionCone, ConnectLine, PlayerBadge, PlayerFocus, PlayerTrajectory, Player
- `annotations.ts`: ArrowAnnotation, ZoneAnnotation, TextAnnotation, UnifiedAnnotation
- `ball.ts`: BallSchema, Ball
- `slide.ts`: Easing, BoundaryBox, XMediaPreset, PitchAppearanceConfig, Slide
- `project.ts`: TacticalPhase, TacticalProject, ExportTarget, FormationPreset, DrawingTool
- `factory.ts`: computeBenchGridPositions, createDefaultInitialPlayers, createDefaultProject, createDefaultSlide
- `capture.ts`: CaptureScope, CapturePayload, CaptureResponse

### 3.3 Implementation Notes & Gotchas
- 型名・スキーマ名・関数名は1文字も変更せず、元の実装コードを正確に移行すること。
- モジュール間の依存方向（DAG）を厳守し、循環 import を発生させないこと。

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 基本定義モジュールの分離 (Primitives, Player, Annotations, Ball)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/primitives.ts`
  - `src/lib/types/tactical/player.ts`
  - `src/lib/types/tactical/annotations.ts`
  - `src/lib/types/tactical/ball.ts`
- **契約 (Interface)**:
  - `primitives.ts`: zod のみに依存
  - `player.ts`: `primitives.ts` に依存
  - `annotations.ts`: zod のみに依存
  - `ball.ts`: `player.ts` (PlayerTrajectorySchema) に依存
- **Testing Strategy**: `bun run ai:check src/lib/types/tactical/primitives.ts src/lib/types/tactical/player.ts src/lib/types/tactical/annotations.ts src/lib/types/tactical/ball.ts`
- **Tasks**:
  - [x] 1. 4ファイルを `tactical-unified.ts` の該当セクション（§1〜§7）から正確に切り出し作成する
- **Worker Handoff Log**:
  - `primitives.ts`, `player.ts`, `annotations.ts`, `ball.ts` を作成。`NormalizedCoordSchema`, `transformCoord`, `Player`, `ArrowAnnotation`, `ZoneAnnotation`, `TextAnnotation`, `Ball` 等を完全 export。
  - Scoped TSC / Biome / Vitest 検証 PASS 済み（リポジトリ全体 TSC は TASK-109 関連テスト追従待ち）。

---

### Phase 2: キャプチャおよびシーン・プロジェクトモジュールの分離 (Capture, Slide, Project)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/capture.ts`
  - `src/lib/types/tactical/slide.ts`
  - `src/lib/types/tactical/project.ts`
- **契約 (Interface)**:
  - `capture.ts`: `../capture-protocol` に依存
  - `slide.ts`: `primitives.ts`, `player.ts`, `annotations.ts`, `ball.ts` に依存
  - `project.ts`: `primitives.ts`, `slide.ts` に依存
- **Testing Strategy**: `bun run ai:check src/lib/types/tactical/capture.ts src/lib/types/tactical/slide.ts src/lib/types/tactical/project.ts`
- **Tasks**:
  - [x] 1. 3ファイルを `tactical-unified.ts` の該当セクション（§16, §8, §8.1, §9〜§12）から正確に切り出し作成する
- **Worker Handoff Log**:
  - `capture.ts` (Capture Protocol re-export), `slide.ts` (BoundaryBox, XMediaPreset, Slide), `project.ts` (TacticalPhase, TacticalProject, ExportTarget, FormationPreset, DrawingTool) を完全 export。
  - Scoped TSC / Biome / Vitest 関連チェック PASS 済み（リポジトリ全体 TSC は TASK-109 関連テスト追従待ち）。

---

### Phase 3: 生成関数群の分離とバレル再集約 (Factory, Index, Tactical-Unified)
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical/factory.ts`
  - `src/lib/types/tactical/index.ts`
  - `src/lib/types/tactical-unified.ts`
- **契約 (Interface)**:
  - `factory.ts`: `primitives.ts`, `player.ts`, `slide.ts`, `project.ts` に依存
  - `index.ts`: 8モジュールを全 re-export
  - `tactical-unified.ts`: `export * from './tactical'` のみの集約バレルファイル化
- **Testing Strategy**: `bun test src/lib/types/__tests__/tactical-unified.test.ts` (PASS 30件確認)
- **Tasks**:
  - [x] 1. `factory.ts` に §13 の生成関数群を切り出し作成する
  - [x] 2. `src/lib/types/tactical/index.ts` を作成し全サブモジュールを re-export する
  - [x] 3. `src/lib/types/tactical-unified.ts` を `export * from './tactical'` に置き換える
  - [x] 4. `bun test src/lib/types/__tests__/tactical-unified.test.ts` が 30件 PASS することを確認する
- **Worker Handoff Log**:
  - `factory.ts`, `index.ts`, `tactical-unified.ts` を作成・集約バレル化。全30件の単体テストが完全PASS（30 pass, 0 fail）。
  - Scoped TSC / Biome / Vitest PASS 済み（リポジトリ全体 TSC は TASK-109 関連テスト追従待ち）。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-29 23:40
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 全8モジュールへの分割完了、既存30件テストの完全PASS
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: 型定義レイヤーとしての責務純粋性の維持
  - [x] 3. 設計負債 & 拡張性: モジュール間循環依存ゼロ、単一責任原則の遵守
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型名・関数の完全保護、外部import破損ゼロ
- **Summary**: 1,129行の巨大型定義を責務別8モジュールへ完全分割。DAG依存関係の遵守（循環依存ゼロ）、ホスト依存の混入なし、完全なre-exportによる既存200箇所以上の下位互換性確保を冷徹に確認。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
