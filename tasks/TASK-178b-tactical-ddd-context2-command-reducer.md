# TASK-178b: 戦術ボードDDD移行(2/7): Pure Command Reducerと単一不変条件ゲート(enforceSlideInvariants)の構築

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/domain/commands.ts` (CREATE)
  - `src/lib/tactical/domain/invariants.ts` (CREATE)
  - `src/lib/tactical/domain/slide-reducer.ts` (CREATE)
  - `src/lib/tactical/domain/project-reducer.ts` (CREATE)
  - `src/lib/tactical/__tests__/domain-invariants.test.ts` (CREATE)
  - `src/lib/tactical/__tests__/domain-reducers.test.ts` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/domain/commands.ts` に `SlideCommand`（選手移動・ベンチ移動・ピッチ復帰・追加・削除・アノテーションCRUD・一括消去・ロック切替・サイド反転・ボール更新）および `TacticalCommand`（フェーズ・スライドCRUD、プロジェクト設定変更、対象スライドへの `SlideCommand` 適用）の判別可能な直和型が定義されていること
- [x] 2. `src/lib/tactical/domain/invariants.ts` に単一不変条件ノーマライザ `enforceSlideInvariants(prevSlide, candidateSlide, command): DomainSlide` が実装され、① ロック保護、② 境界クランプ (`clampToScreenNorm`)、③ ベンチ移動・削除選手を参照する `ConnectLine` および追従 `DomainArrowAnnotation` のカスケード削除、④ ピッチ上選手にバインドされた追従矢印の始点・終点座標同期の4条件を一括保証すること
- [x] 3. `src/lib/tactical/domain/slide-reducer.ts` の `applySlideCommand(slide, command)` がすべての操作の出口で必ず `enforceSlideInvariants` を通過し、入力オブジェクトを一切ミューテーションしない純粋関数であること
- [x] 4. `src/lib/tactical/domain/project-reducer.ts` の `applyTacticalCommand(project, command)` がフェーズ・スライド階層とプロジェクト設定の純粋更新を行い、最低1フェーズ・各フェーズ最低1スライドの不変条件を維持すること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Context 2 (Slide Entities & Invariants) の純粋性**: `src/lib/tactical/domain/**` は React / Konva / DOM / Zustand に一切依存してはならない。
  2. **単一不変条件ゲート原則**: 従来は `canvas-store-cascade.ts` と `slide-player-helpers.ts` にカスケード削除やロック判定が散在していたため操作経路によって不整合が発生していた。これを `enforceSlideInvariants` の1箇所に完全集約する。
  3. **BenchPlayer 型整合**: ピッチ選手がベンチへ移動する際（`MOVE_PLAYER_TO_BENCH`）、`visionCone`, `connectLines`, `badges`, `focus`, `trajectory`, `trajectoryEffect`, `markerEffect` の各プロパティを完全に剥離して `BenchPlayer` (`area: 'bench'`) へ変換すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/types/tactical/branded.ts` (`TASK-178a`) — `clampToScreenNorm`, `toScreenNormPoint`, `ScreenNormPoint`
  - `src/lib/types/tactical/domain-entities.ts` (`TASK-178a`) — `DomainPlayer`, `PitchPlayer`, `BenchPlayer`, `DomainArrowAnnotation`, `DomainZoneAnnotation`, `DomainTextAnnotation`, `DomainBallState`
  - `src/lib/types/tactical/domain-hierarchy.ts` (`TASK-178a`) — `DomainSlide`, `DomainTacticalPhase`, `DomainTacticalProject`

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import {
  clampToScreenNorm,
  type ScreenNormCoord,
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainArrowAnnotation,
  DomainBallState,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
```

### 3.2 Key Interfaces & Types
```ts
export type EntityKind = 'player' | 'arrow' | 'zone' | 'text';

export interface PlayerMoveDelta {
  readonly id: string;
  readonly x: ScreenNormCoord;
  readonly y: ScreenNormCoord;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
export function applySlideCommand(
  prevSlide: DomainSlide,
  command: SlideCommand,
): DomainSlide {
  const candidate = reduceSlideCandidate(prevSlide, command);
  return enforceSlideInvariants(prevSlide, candidate, command);
}
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: TacticalCommand / SlideCommand 定義と `enforceSlideInvariants` の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/domain/commands.ts`, `src/lib/tactical/domain/invariants.ts`, `src/lib/tactical/__tests__/domain-invariants.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/domain/commands.ts
  export type SlideCommand =
    | { readonly type: 'ADD_PLAYER'; readonly player: DomainPlayer }
    | { readonly type: 'MOVE_PLAYERS'; readonly moves: readonly PlayerMoveDelta[] }
    | { readonly type: 'UPDATE_PLAYER'; readonly id: string; readonly patch: Partial<PitchPlayer> }
    | {
        readonly type: 'MOVE_PLAYER_TO_BENCH';
        readonly id: string;
        readonly benchX?: ScreenNormCoord;
        readonly benchY?: ScreenNormCoord;
      }
    | {
        readonly type: 'MOVE_PLAYER_TO_PITCH';
        readonly id: string;
        readonly x: ScreenNormCoord;
        readonly y: ScreenNormCoord;
      }
    | { readonly type: 'REMOVE_PLAYER'; readonly id: string }
    | { readonly type: 'ADD_ARROW'; readonly arrow: DomainArrowAnnotation }
    | { readonly type: 'UPDATE_ARROW'; readonly id: string; readonly patch: Partial<DomainArrowAnnotation> }
    | { readonly type: 'REMOVE_ARROW'; readonly id: string }
    | { readonly type: 'ADD_ZONE'; readonly zone: DomainZoneAnnotation }
    | { readonly type: 'UPDATE_ZONE'; readonly id: string; readonly patch: Partial<DomainZoneAnnotation> }
    | { readonly type: 'REMOVE_ZONE'; readonly id: string }
    | { readonly type: 'ADD_TEXT'; readonly text: DomainTextAnnotation }
    | { readonly type: 'UPDATE_TEXT'; readonly id: string; readonly patch: Partial<DomainTextAnnotation> }
    | { readonly type: 'REMOVE_TEXT'; readonly id: string }
    | { readonly type: 'UPDATE_BALL'; readonly patch: Partial<DomainBallState> }
    | { readonly type: 'TOGGLE_ENTITY_LOCK'; readonly id: string; readonly kind: EntityKind }
    | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
    | { readonly type: 'SWAP_TEAM_SIDES' }
    | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
    | { readonly type: 'UPDATE_SLIDE_META'; readonly patch: Partial<Pick<DomainSlide, 'label' | 'transitionDurationMs' | 'pauseMs' | 'easing' | 'cameraTransitionMode' | 'cameraDurationMs' | 'pitchTransform'>> };

  export type TacticalCommand =
    | {
        readonly type: 'APPLY_SLIDE_COMMAND';
        readonly phaseId: string;
        readonly slideId: string;
        readonly command: SlideCommand;
      }
    | { readonly type: 'ADD_SLIDE'; readonly phaseId: string; readonly afterSlideId?: string }
    | { readonly type: 'DUPLICATE_SLIDE'; readonly phaseId: string; readonly slideId: string }
    | { readonly type: 'DELETE_SLIDE'; readonly phaseId: string; readonly slideId: string }
    | { readonly type: 'REORDER_SLIDES'; readonly phaseId: string; readonly orderedSlideIds: readonly string[] }
    | { readonly type: 'ADD_PHASE'; readonly name: string }
    | { readonly type: 'UPDATE_PHASE'; readonly phaseId: string; readonly patch: Partial<Omit<DomainTacticalPhase, 'id' | 'slides'>> }
    | { readonly type: 'DELETE_PHASE'; readonly phaseId: string }
    | { readonly type: 'UPDATE_PROJECT_META'; readonly patch: Partial<Pick<DomainTacticalProject, 'title' | 'homeColor' | 'awayColor' | 'pitchAppearance' | 'screenBackground' | 'tags' | 'matchFormations'>> };

  // 2. src/lib/tactical/domain/invariants.ts
  export function toBenchPlayer(player: DomainPlayer, x?: ScreenNormCoord, y?: ScreenNormCoord): BenchPlayer;
  export function enforceSlideInvariants(
    prevSlide: DomainSlide,
    candidateSlide: DomainSlide,
    command: SlideCommand,
  ): DomainSlide;
  // 実行順序:
  // 1. Lock Guard: prevSlide で locked === true のエンティティは TOGGLE_ENTITY_LOCK 以外では prevSlide の状態を強制復元
  // 2. Coordinate Clamp: 選手とボールの座標を clampToScreenNorm で正規化し、area === 'bench' の選手は toBenchPlayer でピッチ専用属性を剥離
  // 3. Cascade Clean: area === 'pitch' の選手ID集合 (activePitchIds) に存在しない toPlayerId の ConnectLine と、sourcePlayerId / targetPlayerId が activePitchIds に存在しない追従矢印を除去
  // 4. Endpoint Sync: sourcePlayerId / targetPlayerId がバインドされた矢印の始点 points[0] / 終点 points[last] を該当 PitchPlayer の {x, y} に強制同期
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/domain-invariants.test.ts`:
    - ロック保護: `locked: true` の `p1 (x:20, y:30)` に移動 `(80, 90)` または削除を適用 ➔ `p1` は `(20, 30)` のまま維持。
    - カスケード消去: `p1` が `area: 'bench'` になった際、`p2.connectLines` の `toPlayerId: 'p1'` と `sourcePlayerId: 'p1'` の矢印 `a1` が自動削除されること。
    - 追従同期: `p1` が `(45, 55)` へ移動した際、`sourcePlayerId: 'p1'` の矢印 `a1.points[0]` が `{ x: 45, y: 55 }` に同期されること。
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/domain-invariants.test.ts` (RED) ➔ `commands.ts` & `invariants.ts` 実装 ➔ `bun run ai:check src/lib/tactical/domain/commands.ts src/lib/tactical/domain/invariants.ts src/lib/tactical/__tests__/domain-invariants.test.ts` PASS
- **Worker Handoff Log**:
  - `commands.ts`: `SlideCommand`, `TacticalCommand`, `EntityKind`, `PlayerMoveDelta` を確定 export
  - `invariants.ts`: `toBenchPlayer`, `enforceSlideInvariants` を確定 export。Lock Guard / Clamp / Cascade Clean / Endpoint Sync を一括保証

---

### Phase 2: `applySlideCommand` と `applyTacticalCommand` の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/domain/slide-reducer.ts`, `src/lib/tactical/domain/project-reducer.ts`, `src/lib/tactical/__tests__/domain-reducers.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/domain/slide-reducer.ts
  export function applySlideCommand(
    prevSlide: DomainSlide,
    command: SlideCommand,
  ): DomainSlide;

  // 2. src/lib/tactical/domain/project-reducer.ts
  export function applyTacticalCommand(
    project: DomainTacticalProject,
    command: TacticalCommand,
  ): DomainTacticalProject;
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/domain-reducers.test.ts`:
    - `SWAP_TEAM_SIDES`: `p1 (area:'pitch', x:20, y:30)` ➔ `(80, 70)`、`b1 (area:'bench', x:5, y:90)` ➔ `(5, 90)` 維持、`isSidesSwapped: true`
    - `DELETE_SLIDE` / `DELETE_PHASE`: 最後の1件の場合は削除されず要素数 `1` が維持されること
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/domain-reducers.test.ts` (RED) ➔ `slide-reducer.ts` & `project-reducer.ts` 実装 ➔ `bun run ai:check src/lib/tactical/domain/slide-reducer.ts src/lib/tactical/domain/project-reducer.ts src/lib/tactical/__tests__/domain-reducers.test.ts` PASS
- **Worker Handoff Log**:
  - `slide-reducer.ts`: `applySlideCommand` を確定 export。操作出口で `enforceSlideInvariants` を通過し純粋性を担保
  - `project-reducer.ts`: `applyTacticalCommand` を確定 export。最低1フェーズ・最低1スライドの不変条件維持と階層CRUD純粋更新を完備

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 01:55
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  純粋関数型DDDレデューサーと単一不変条件ゲート（`enforceSlideInvariants`）が厳格に実装され、ロック保護・座標クランプ・カスケード削除・追従矢印同期がすべて確実に保証されていることを確認。すべての受入要件と不変条件をクリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
