# TASK-178c: 戦術ボードDDD移行(3/7): Anti-Corruption Layer(ACL)とレガシー・スクショ・プリセット変換層の構築

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/acl/legacy-project-translator.ts` (CREATE)
  - `src/lib/tactical/acl/screenshot-translator.ts` (CREATE)
  - `src/lib/tactical/acl/match-squad-translator.ts` (CREATE)
  - `src/lib/tactical/acl/formation-translator.ts` (CREATE)
  - `src/lib/tactical/__tests__/acl-translators.test.ts` (CREATE)
  - `src/lib/tactical/__tests__/acl-presets.test.ts` (CREATE)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/acl/legacy-project-translator.ts` に `normalizeTacticalProject(raw: unknown): NormalizedProjectBundle` が実装され、旧 `version: '2.0.0'` や階層重複プロパティ（`slide.aspectRatio`, `slide.boundaryBox`, `slide.pitchAppearance`）、旧 `arrow.arrowHead`、未完了ゾーン `isComplete: false`、ベンチ選手の不正属性をロスレスで新 `DomainTacticalProject` (`version: '3.0.0'`) に変換できること
- [x] 2. `src/lib/tactical/acl/screenshot-translator.ts` に Chrome Extension の `canvasAnnotations` JSON 文字列と 1 Phase・1 Slide の `DomainTacticalProject`（`backgroundType: 'image'`）を相互変換する純粋関数 `translateScreenshotToProject` / `serializeProjectToScreenshotJson` が実装されていること
- [x] 3. `src/lib/tactical/acl/match-squad-translator.ts` に試合・スカッドデータを `PitchPlayer | BenchPlayer` 配列へ変換する純粋関数 `translateSquadToDomainPlayers` が実装され、Store を直接書き換えないこと
- [x] 4. `src/lib/tactical/acl/formation-translator.ts` にフォーメーションプリセット（`PitchNormPoint`）を `ScreenNormPoint` へ投影して `DomainSlide` のピッチ選手へ適用する純粋関数 `projectFormationSlotsToScreenNorm` / `applyFormationPresetToSlide` が実装されていること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Context 3 (Anti-Corruption Layer) の境界原則**: 外部データ（IndexedDB の旧レコード、インポート JSON、Extension の旧 `AnnotationsData`、Match/Squad データ）の揺らぎやレガシー仕様はすべてこの ACL で吸収し、Functional Core 内部には正規化済みの `DomainTacticalProject` / `DomainSlide` のみを流入させる。
  2. **Store 直接操作の禁止**: ACL は Zustand ストアや IndexedDB を直接呼ばず、入力データから変換後のドメインオブジェクトを返す 100% 純粋関数とする。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/types/tactical/branded.ts` & `src/lib/tactical/engine/coordinates.ts` (`TASK-178a`)
  - `src/lib/types/tactical/domain-entities.ts` & `src/lib/types/tactical/domain-hierarchy.ts` (`TASK-178a`)
  - `src/lib/tactical/domain/invariants.ts` (`TASK-178b`)

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import {
  clampToScreenNorm,
  type PitchNormPoint,
  type ScreenNormPoint,
  toPitchNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  BenchPlayer,
  DomainArrowAnnotation,
  DomainPlayer,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type {
  DomainSlide,
  DomainTacticalPhase,
  DomainTacticalProject,
} from '@/lib/types/tactical/domain-hierarchy';
import { pitchNormToScreenNorm } from '@/lib/tactical/engine/coordinates';
import { toBenchPlayer } from '@/lib/tactical/domain/invariants';
```

### 3.2 Key Interfaces & Types
```ts
export interface NormalizedProjectBundle {
  readonly project: DomainTacticalProject;
  readonly activePhaseId: string;
  readonly activeSlideId: string;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
const endMarker =
  rawArrow.endMarker ?? (rawArrow.arrowHead === false ? 'none' : 'arrow');
const startMarker = rawArrow.startMarker ?? 'none';
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: Legacy Project Translator と Extension Screenshot Translator の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/acl/legacy-project-translator.ts`, `src/lib/tactical/acl/screenshot-translator.ts`, `src/lib/tactical/__tests__/acl-translators.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/acl/legacy-project-translator.ts
  export function normalizeTacticalProject(raw: unknown): NormalizedProjectBundle;
  // 2. src/lib/tactical/acl/screenshot-translator.ts
  export interface ScreenshotTranslateInput {
    readonly screenshotId: string;
    readonly backgroundImageUrl: string;
    readonly canvasAnnotationsJson?: string;
    readonly aspectRatio?: '16:9' | '9:16' | '4:5' | '1:1';
  }
  export function translateScreenshotToProject(
    input: ScreenshotTranslateInput,
  ): NormalizedProjectBundle;
  export function serializeProjectToScreenshotJson(
    project: DomainTacticalProject,
  ): string;
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/acl-translators.test.ts`:
    - 旧形式 JSON（`slide.aspectRatio: '9:16'`, `arrow.arrowHead: false`, `zone.isComplete: false`, `benchPlayer.connectLines: [...]`）を `normalizeTacticalProject` に入力 ➔ `phase.aspectRatio === '9:16'`、`'aspectRatio' in slide === false`、`arrow.endMarker === 'none'`、未完了ゾーン除外、ベンチ選手から `connectLines` 剥離。
    - `translateScreenshotToProject` ➔ `serializeProjectToScreenshotJson` の往復変換でエンティティ欠損ゼロ。
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/acl-translators.test.ts` (RED) ➔ `legacy-project-translator.ts` & `screenshot-translator.ts` 実装 ➔ `bun run ai:check src/lib/tactical/acl/legacy-project-translator.ts src/lib/tactical/acl/screenshot-translator.ts src/lib/tactical/__tests__/acl-translators.test.ts` PASS
- **Worker Handoff Log**:
  - 確定Export: `normalizeTacticalProject`, `translateScreenshotToProject`, `serializeProjectToScreenshotJson`, `type NormalizedProjectBundle`, `type ScreenshotTranslateInput`
  - Gotcha: 300行制限に準拠するため ACL 内を `player-normalizer`, `arrow-normalizer`, `zone-normalizer`, `slide-normalizer` に凝集分離。MarkerStyle はオブジェクト型デフォルトを完全補完。

---

### Phase 2: Match / Squad Translator と Formation Preset Translator の実装
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/acl/match-squad-translator.ts`, `src/lib/tactical/acl/formation-translator.ts`, `src/lib/tactical/__tests__/acl-presets.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/acl/formation-translator.ts
  export interface FormationSlotPreset {
    readonly shirtNo: string;
    readonly position: string;
    readonly x: number;
    readonly y: number;
  }
  export function projectFormationSlotsToScreenNorm(
    slots: readonly FormationSlotPreset[],
    team: 'home' | 'away',
    mode?: 'full' | 'half',
  ): readonly { readonly shirtNo: string; readonly position: string; readonly point: ScreenNormPoint }[];
  export function applyFormationPresetToSlide(
    slide: DomainSlide,
    slots: readonly FormationSlotPreset[],
    team: 'home' | 'away',
    mode?: 'full' | 'half',
  ): DomainSlide;

  // 2. src/lib/tactical/acl/match-squad-translator.ts
  export interface SquadMemberInput {
    readonly playerId: string;
    readonly name: string;
    readonly shirtNo: string;
    readonly position: string;
    readonly isStarter: boolean;
    readonly pitchPoint?: ScreenNormPoint;
    readonly photoUrl?: string;
  }
  export function translateSquadToDomainPlayers(
    members: readonly SquadMemberInput[],
    team: 'home' | 'away',
    teamColor: string,
  ): readonly DomainPlayer[];
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/__tests__/acl-presets.test.ts`:
    - `projectFormationSlotsToScreenNorm([{ shirtNo: '1', position: 'GK', x: 10, y: 50 }], 'home', 'full')` ➔ `point.x === 10.4, point.y === 50`
    - `translateSquadToDomainPlayers`: スターターは `area: 'pitch'`、サブは `area: 'bench'` かつ `'connectLines' in player === false`
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/__tests__/acl-presets.test.ts` (RED) ➔ `formation-translator.ts` & `match-squad-translator.ts` 実装 ➔ `bun run ai:check src/lib/tactical/acl/formation-translator.ts src/lib/tactical/acl/match-squad-translator.ts src/lib/tactical/__tests__/acl-presets.test.ts` PASS
- **Worker Handoff Log**:
  - `formation-translator.ts`: `projectFormationSlotsToScreenNorm`, `applyFormationPresetToSlide` を提供。フルピッチ時(0.5倍率)およびハーフピッチ時の座標変換と余剰選手の `toBenchPlayer` 降格を完全純粋関数で担保。
  - `match-squad-translator.ts`: `translateSquadToDomainPlayers` を提供。スターターは `PitchPlayer`、サブはピッチ属性剥離済みの `BenchPlayer` へ純粋変換。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 02:15
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Context 3 (ACL) の責務が完全に純粋関数群として分離されており、レガシー重複属性の排除、直和型変換、Branded 座標クランプ、往復完全性が完璧に担保されていることを確認。全要件クリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
