# TASK-109: TacticalProject 内のシーン構造化（Phaseフォルダ化）

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-29
- **Target Files**:
  - `src/lib/types/tactical-unified.ts` (MODIFY)
  - `src/lib/db/tactical-projects-db.ts` (MODIFY)
  - `src/lib/tactical/benchmark-presets.ts` (MODIFY)
  - `src/features/tactical-unified/stores/store-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-crud-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (NEW)
  - `src/features/tactical-unified/panels/left-panel/phase-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/left-panel/left-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts` (MODIFY)
  - `src/features/tactical-unified/tactical-unified-page.tsx` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `TacticalProject` スキーマが直下 `slides` を持たず、`phases: TacticalPhase[]`（`id`, `name`, `slides: Slide[]`）および `activePhaseId`, `activeSlideId` を持つ構造にクリーン刷新されていること（過去互換不要）。
- [x] 2. ストア（Zustand）で Phase の追加・削除・名称変更・切り替えが可能であり、シーン操作（追加・複製・削除・並び替え）が現在アクティブな Phase の `slides` を対象として正常に動作すること。
- [x] 3. 左パネルが PowerPoint 風のセクション＆全シーン一覧のネスト構造となっており、各シーンカードに実際の戦術ボード（選手・ボール・矢印等）が 2D キャンバス縮小描画（サムネイル）されること。
- [x] 4. 左パネルの任意のシーンをクリックした際、そのシーンが属する Phase とシーンが 1 手で同時にアクティブ化され、中央キャンバスに即時反映されること。
- [x] 5. 下部タイムラインおよびアニメーション再生・補間が、現在選択中の Phase 内のシーンのみを対象として独立完結すること（Phase を跨いだ補間・自動再生はしない）。
- [x] 6. Phase 削除時は確認ダイアログを表示し、残り 1 つの Phase の削除は禁止（無効化）されること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type { Slide, TacticalPhase, TacticalProject } from '@/lib/types/tactical-unified';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
```

### 3.2 Key Interfaces & Types
```ts
export const TacticalPhaseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  slides: z.array(SlideSchema).min(1),
});
export type TacticalPhase = z.infer<typeof TacticalPhaseSchema>;

// TacticalProjectSchema: 直下 slides を廃止し phases / activePhaseId / activeSlideId を配置
```

### 3.3 Implementation Notes & Gotchas
```ts
// 1. サムネイル描画は renderTacticalFrameToCanvas(ctx, { slides: [slide], timeMs: 0, width, height, aspectRatio, boundaryBox: slide.boundaryBox, pitchAppearance }) を使用
// 2. 左パネルは Level 2 (Domain UI Block)。Level 4 のホスト依存を混入させない
// 3. Konva キャンバス再描画と DOM ホバーの干渉を防ぐため、React.memo とセレクタ局所化を徹底
// 4. store-helpers.ts の getSlide は全 phases から slideId を探すか、activePhase 優先で探索
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: データスキーマ・初期化・永続化層のフェーズ構造化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/types/tactical-unified.ts`
  - `src/lib/db/tactical-projects-db.ts`
  - `src/lib/tactical/benchmark-presets.ts`
- **契約 (Interface)**:
  - `TacticalPhaseSchema` を定義し、`TacticalProjectSchema` に `phases: z.array(TacticalPhaseSchema).min(1)` と `activePhaseId: z.string()` を追加、直下 `slides` を削除。
  - `createDefaultPhase(id?, name?, homeColor?, awayColor?)` および `createDefaultProject(id)` を `phases` 構造で初期化するよう更新。
  - `tactical-projects-db.ts` の `slideCount` 計算を `phases.reduce(...)` に更新。
  - `benchmark-presets.ts` のプリセット作成を `phases` 構造に更新。
- **Testing Strategy**: `src/lib/types/__tests__/tactical-unified.test.ts` で新スキーマパースと初期プロジェクト検証
- **Tasks**:
  - [x] 1. TDD実装: `TacticalPhase` 型・スキーマ追加、`TacticalProject` スキーマ更新、初期値生成関数更新
  - [x] 2. `tactical-projects-db.ts` と `benchmark-presets.ts` の追従修正
  - [x] 3. `bun run ai:check src/lib/types/tactical-unified.ts src/lib/db/tactical-projects-db.ts src/lib/tactical/benchmark-presets.ts` で PASS 確認

- **Worker Handoff Log**:
  - `TacticalPhaseSchema`, `TacticalPhase`, `createDefaultPhase` を export。`TacticalProject` は直下 `slides` を廃止し `phases: TacticalPhase[]`, `activePhaseId: string` を保持。
  - Phase 1 対象ファイル単体の Biome / Scoped TSC / Vitest は全件 PASS 済み。リポジトリ全体 TSC は Phase 2〜4 の追従待ち。

---

### Phase 2: ストア状態管理と Phase / Slide CRUD ロジック
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/store-helpers.ts`
  - `src/features/tactical-unified/stores/tactical-unified-selectors.ts`
  - `src/features/tactical-unified/stores/project-slice.ts`
  - `src/features/tactical-unified/stores/slide-crud-slice.ts`
- **契約 (Interface)**:
  - `store-helpers.ts`: `getSlide`, `updateSlideInProject`, `updateSlideImmer` を `project.phases` 配下のスライドを更新する実装に改修。`recordHistory` も phases 全体をスナップショット。
  - `tactical-unified-selectors.ts`: `selectActivePhase(s)`, `selectActivePhaseSlides(s)`, `selectActiveSlide(s)`, `selectPreviousSlide(s)` を提供。
  - `project-slice.ts`: `activePhaseId` を保持し、`loadProject` / `resetProject` で初期化。
  - `slide-crud-slice.ts`:
    - Phase 操作追加: `addPhase(name?)`, `deletePhase(phaseId)`, `renamePhase(phaseId, name)`, `setActivePhase(phaseId)`
    - シーン直接選択追加: `selectPhaseAndSlide(phaseId, slideId)`
    - 既存 Slide 操作改修: `addSlide`, `duplicateSlide`, `deleteSlide`, `reorderSlides`, `setActiveSlide`, `updateSlide` が現在のアクティブ Phase 内の `slides` を対象とするよう更新。
- **Testing Strategy**: `src/features/tactical-unified/stores/__tests__/slide-crud-slice.test.ts` で Phase 追加・削除・名称変更、シーン追加・移動が Phase 内で正しく動作することを検証
- **Tasks**:
  - [x] 1. TDD実装: Phase 操作と activePhase スコープでの Slide 操作、セレクタの実装
  - [x] 2. `store-helpers.ts` の更新
  - [x] 3. `bun run ai:check src/features/tactical-unified/stores/` で PASS 確認

- **Worker Handoff Log**:
  - `addPhase`, `deletePhase`, `renamePhase`, `setActivePhase`, `selectPhaseAndSlide` を `slide-crud-slice` に追加し `phase-crud-actions.ts` に分割。`store-helpers`（`getSlide`, `updateSlideInProject`, `updateSlideImmer`, `recordHistory`）およびセレクタ群（`selectActivePhase`, `selectActivePhaseSlides`, `selectActiveSlide`, `selectPreviousSlide`, `selectIsMultiSlide`）を Phase 構造に完全追従。
  - Scoped TSC（14ファイル）/ Biome / Vitest（33件）全件 PASS 済み。リポジトリ全体 TSC は Phase 3〜4（UI/アニメーション層）の追従待ち。

---

### Phase 3: PowerPoint風ネスト左パネルとキャンバス縮小描画
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (NEW)
  - `src/features/tactical-unified/panels/left-panel/phase-section.tsx` (NEW)
  - `src/features/tactical-unified/panels/left-panel/left-panel.tsx` (MODIFY)
- **契約 (Interface)**:
  - `SceneCanvasThumbnail`: `renderTacticalFrameToCanvas` を用いて、指定された Slide の実際の盤面（選手・ボール・矢印等）を幅 120px 前後の HTML5 `<canvas>` に縮小描画する純粋レンダラーコンポーネント。
  - `PhaseSection`: アコーディオン開閉ヘッダー（Chevron、フェーズ名インライン編集、削除ボタン、シーン数バッジ）＋配下の全シーンカードリスト（縮小サムネイル、シーン番号、時間、アクティブ表示、シーンクリックで即時ジャンプ）。
  - `LeftPanel`: 全 Phase セクションをリスト表示。初期状態は activePhase のみ展開（他は折りたたみ）。「＋ 新規フェーズ追加」ボタンとフェーズ削除確認ダイアログを内包。
- **Testing Strategy**: `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` でフェーズ展開、シーン選択時の `selectPhaseAndSlide` 呼出、名称編集、削除確認ダイアログの表示を検証
- **Tasks**:
  - [x] 1. `SceneCanvasThumbnail` 実装（オフスクリーン/Canvas 2D 描画、BoundaryBox クロップ対応）
  - [x] 2. `PhaseSection` & `LeftPanel` 実装（アコーディオン、インライン編集、削除確認モーダル）
  - [x] 3. `bun run ai:check src/features/tactical-unified/panels/left-panel/` で PASS 確認

- **Worker Handoff Log**:
  - `SceneCanvasThumbnail`（React.memo 適用、DPR 対応、2D Canvas 縮小描画）、`PhaseSection`（アコーディオン開閉、インライン名称編集、シーンカード、削除ガード）、`LeftPanel`（Level 2 純粋コンポーネント、削除確認ダイアログ）を実装。
  - Scoped TSC / Biome / Vitest（14件）全件 PASS 済み。リポジトリ全体 TSC は Phase 4（タイムライン・アニメーション・ページ結合）の追従待ち。

---

### Phase 4: タイムライン・アニメーション再生・ページ統合のフェーズ局所化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/panels/timeline/timeline-bar.tsx`
  - `src/features/tactical-unified/panels/timeline/playback-controls.tsx`
  - `src/features/tactical-unified/hooks/use-tactical-animation.ts`
  - `src/features/tactical-unified/tactical-unified-page.tsx`
- **契約 (Interface)**:
  - `TimelineBar`: `useTacticalUnifiedStore` から現在アクティブな Phase の `slides` のみを取得して表示・並び替え。
  - `PlaybackControls`: アクティブな Phase のシーン数と合計時間を表示・トグル。
  - `useTacticalAnimation`: アクティブな Phase の `slides` のみを用いてタイムラインを作成し、フェーズ内完結でアニメーション再生。
  - `TacticalUnifiedPage`: 新しい `LeftPanel` との結合（Props 更新、または LeftPanel が内部でストア参照）。
- **Testing Strategy**: `src/features/tactical-unified/__tests__/tactical-animation.test.ts` および Timeline 操作テストで、フェーズ内のみでアニメーションとシーン操作が完結することを検証
- **Tasks**:
  - [x] 1. `TimelineBar` と `PlaybackControls` の activePhase スコープ切り替え
  - [x] 2. `useTacticalAnimation` の activePhase スコープ切り替え
  - [x] 3. `TacticalUnifiedPage` の結線整理と全体差分検証
  - [x] 4. `bun run ai:check src/features/tactical-unified/` で PASS 確認

- **Worker Handoff Log**:
  - `TimelineBar`, `PlaybackControls`, `useTacticalAnimation` を `selectActivePhaseSlides` 経由に統一し、フェーズ内完結再生・時間計算・サムネイル表示を実現。
  - `TacticalUnifiedPage` と `LeftPanel` を Phase 仕様に結線。関連する adapter / export / shortcut / panel の `project.slides` 参照も `selectActivePhaseSlides` / `selectActiveSlide` / `updateSlideInProject` に追従修正し、Scoped TSC（21ファイル）/ Biome / Vitest（38件）全件 PASS 完了。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-29 23:20
- **Decision**: `LGTM`
- **Summary**: 受入要件6項目を完全充足。PowerPoint風ネスト左パネル・Canvas縮小描画・Phase内完結再生・ホスト非依存設計を高品質に達成。
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件（直下 slides 廃止、Phase 階層化、PowerPoint 風ネスト左パネル、キャンバスサムネイル描画、フェーズ内完結再生）が満たされているか
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2 以下のホスト非依存、GSAP timeline.kill クリーンアップ、過度な backdrop-filter 排除
  - [x] 3. 設計負債 & 拡張性: OCP 遵守、SLAP/Shell Purity 遵守、Zustand セレクタの局所化
  - [x] 4. サイレント破壊 & 既存保護: 他機能への意図しない悪影響がないか

## 6. Rejections / Additional Tasks (不可逆修正欄)
