# TASK-082: [Tactical Panels, Timeline & Export] 戦術ボードUIパネル・ストア・出力の垂直リファクタリング

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-26
- **Target Files**:
  - `src/features/tactical-unified/stores/annotation-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/stores/store-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-export-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/export-preview-player.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/lib/db/tactical-projects-db.ts` (MODIFY)
  - `src/lib/tactical/export/video-export-engine.ts` (MODIFY)
  - `src/lib/tactical/export/renderers/pitch-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/tactical/export/auto-benchmark-engine.ts` (MODIFY)
  - `src/lib/tactical/export/share-store.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `annotation-slice.ts` (320行), `project-slice.ts` (310行), `tactical-canvas-store-adapter.ts` (348行), `tactical-projects-db.ts` (401行) を各 300行以下に分割し、`store-helpers.ts` 等の `any` (計6件) を全廃すること
- [x] 2. `animation-node-updater.ts` (`any` 16件), `konva-export-helpers.ts` (338行・`any` 3件), `use-keyboard-shortcuts.ts` (`any` 1件), `use-tactical-match-init.ts` (`any` 1件) の `any` を全廃し、300行以下に分割すること
- [x] 3. `export-preview-player.tsx` (372行・`any` 1件), `squad-sub-panel.tsx` (367行) を 300行以下に分割し、`top-bar-more-menu.tsx` (`any` 3件) の UI直DBアクセス（`@/lib/db` 直参照）をフック/サービス経由へ移行すること
- [x] 4. `video-export-engine.ts` (873行・`any` 4件), `pitch-renderer.ts` (490行), `share-payload.ts` (379行), `auto-benchmark-engine.ts` (304行), `share-store.ts` (`any` 6件) を 300行以下に分割し、`any` を全廃すること

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import type Konva from 'konva';
import type { TacticalSlide, TacticalAnnotation, TacticalPlayer } from '@/lib/types/tactical-unified';
```

### 3.2 Key Interfaces & Types
```ts
export interface KonvaNodeMap {
  stage: Konva.Stage | null;
  playersLayer: Konva.Layer | null;
  annotationsLayer: Konva.Layer | null;
}
```

### 3.3 Implementation Notes & Gotchas (注意点・境界契約)
```ts
// 1. 分割時は元のモジュールから公開関数・コンポーネントを re-export し、既存のテストや呼び出し側の import を一切壊さないこと
// 2. top-bar-more-menu.tsx から @/lib/db への直接 import を除去し、フックまたはプロジェクト DB ヘルパー経由に統一すること（.dependency-cruiser の例外撤去準備）
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Store スライス・Adapter・Projects DB の 300行以下分割と any 全廃
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/annotation-slice.ts`, `project-slice.ts`, `store-helpers.ts`, `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`, `src/lib/db/tactical-projects-db.ts`
- **契約 (Interface)**:
  ```ts
  // 各ファイルの公開インターフェースを維持したまま、初期状態や純粋変換ヘルパーを別ファイルへ切り出し 300行以下・explicitAny 0 を達成
  ```
- **Testing Strategy**: 戦術ストア・アダプター・プロジェクト保存の既存テストが全件 PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: 5ファイルの 300行以下分割と `any` 排除 ➔ `bun run ai:check src/features/tactical-unified/stores/annotation-slice.ts src/features/tactical-unified/stores/project-slice.ts src/features/tactical-unified/stores/store-helpers.ts src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts src/lib/db/tactical-projects-db.ts` PASS
- **Worker Handoff Log**:
  - `annotation-slice.ts` (203行) から `annotation-erase-helpers.ts` (128行) に `eraseAnnotationsAtPoint` を分離、`project-slice.ts` (85行) から `project-slice-actions.ts` (259行) にアクション生成関数を分離。
  - `tactical-canvas-store-adapter.ts` (259行) から `adapter-cache-helpers.ts` (145行) にキャッシュと状態更新ロジックを分離、`tactical-projects-db.ts` (286行) から `tactical-projects-import.ts` (119行) にインポート処理を分離。`any` / `as unknown as` は全廃（0件）。全ファイルで re-export を行い公開シグネチャを完全維持。

### Phase 2: Animation Node Updater & Export Helpers の型安全化と分割
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `konva-export-helpers.ts`, `use-keyboard-shortcuts.ts`, `use-tactical-match-init.ts`
- **契約 (Interface)**:
  ```ts
  // animation-node-updater.ts の Konva ノード操作 (any 16件) を Konva.Node / Konva.Group / Konva.Shape 型で厳密化
  ```
- **Testing Strategy**: `konva-export-helpers.test.ts` および `use-tactical-match-init.test.ts` が PASS し、行数 <= 300・`explicitAny` === 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: 4フックの `any` 21件排除と `konva-export-helpers.ts` 分割 ➔ `bun run ai:check src/features/tactical-unified/hooks/animation-node-updater.ts src/features/tactical-unified/hooks/konva-export-helpers.ts src/features/tactical-unified/hooks/use-keyboard-shortcuts.ts src/features/tactical-unified/hooks/use-tactical-match-init.ts` PASS
- **Worker Handoff Log**:
  - `konva-slide-export.ts` にスライド単位オフスクリーンレンダリング関数を切り出し、`konva-export-helpers.ts` から完全 re-export。
  - `animation-node-updater.ts` の Konva 具象型付け (Line/Rect/Ellipse)、`use-keyboard-shortcuts.ts` の DrawingTool 型付け、`use-tactical-match-init.ts` の matchId 型厳密化により explicitAny は 0 件。全ファイル <= 200 行。

### Phase 3: Tactical Panels の 300行以下分割と UI直DBアクセス解消
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/export-preview-player.tsx`, `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`, `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx`
- **契約 (Interface)**:
  ```ts
  // top-bar-more-menu.tsx から @/lib/db の直接 import を排除し、フック経由に移行。3ファイルすべて 300行以下・explicitAny 0
  ```
- **Testing Strategy**: `squad-panel-step5.test.tsx` 等のパネルテストが PASS し、`top-bar-more-menu.tsx` の DB 直参照がゼロになること。
- **Tasks**:
  - [x] 1. TDD実装: パネル3ファイルの分割・DB直参照解消・`any` 排除 ➔ `bun run ai:check src/features/tactical-unified/panels/export/export-preview-player.tsx src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` PASS
- **Worker Handoff Log**:
  - `export-preview-player.tsx` (134行) から `export-preview-controls.tsx` (54行), `use-export-preview-animation.ts` (216行) に分割。
  - `squad-sub-panel.tsx` (290行) から `squad-bench-canvas.tsx` (74行), `squad-sub-form.tsx` (60行), `squad-team-switcher.tsx` (61行) に分割。
  - `top-bar-more-menu.tsx` (150行) の UI直DBアクセスを `tactical-match-helper.ts` (22行) 経由に統一し `@/lib/db` 直接依存を排除、メニューセクションを `top-bar-more-menu-sections.tsx` (141行) に分離。
  - 全対象・分割ファイルで explicitAny 0件、行数 <= 300、全公開シンボルを元ファイルから re-export して互換性を維持。`squad-panel-step5.test.tsx` (全8件) PASS。

### Phase 4: Video Export Engine & Pitch Renderer の 300行以下分割と any 全廃
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/video-export-engine.ts`, `src/lib/tactical/export/renderers/pitch-renderer.ts`, `src/lib/tactical/export/share-payload.ts`, `src/lib/tactical/export/auto-benchmark-engine.ts`, `src/lib/tactical/export/share-store.ts`
- **契約 (Interface)**:
  ```ts
  // video-export-engine.ts (873行) と pitch-renderer.ts (490行) を機能単位のサブモジュールに分割し、re-export で既存シグネチャを維持
  ```
- **Testing Strategy**: `src/lib/tactical/__tests__/video-export-engine.test.ts` 等が全件 PASS し、全対象ファイルが 300行以下・`explicitAny` === 0 になること。
- **Tasks**:
  - [x] 1. TDD実装: Export エンジン5ファイルの 300行以下分割と `any` 10件排除 ➔ `bun run ai:check src/lib/tactical/export/` PASS
- **Worker Handoff Log**:
  - `video-export-engine.ts` (125行) から `video-crop-calc.ts` (146行), `video-codec-support.ts` (153行), `video-export-types.ts` (35行), `video-mediabunny-export.ts` (203行), `video-media-recorder-export.ts` (242行) に分割。
  - `pitch-renderer.ts` (92行) から `pitch-markings-3d.ts` (191行), `pitch-markings-2d.ts` (259行) に分割。
  - `share-payload.ts` (94行) から `share-photos.ts` (293行) に分割、`auto-benchmark-engine.ts` (219行) から `auto-benchmark-report.ts` (89行) に分割、`share-store.ts` (245行) から `share-kv.ts` (76行) に分割。
  - 全対象・分割ファイル (15ファイル) で `explicitAny` / `as unknown as` は 0 件、行数はすべて <= 293 行。公開シグネチャを元ファイルから re-export し完全維持。既存テスト (56件) PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-26 21:50
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: 全17対象ファイルおよび新規分割先16ファイルの300行以下分割（最大293行）、explicitAny全廃、top-bar-more-menuのUI直DBアクセス解消、ImageBitmap/RAFクリーンアップ(RAII)、re-exportによる完全後方互換性を確認。4大定性監査・6大設計品質原則を完全クリア。

## 6. Rejections / Additional Tasks (不可逆修正欄)
