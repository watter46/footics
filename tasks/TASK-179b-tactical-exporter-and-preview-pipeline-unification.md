# TASK-179b: 動画出力・プレビュー・サムネイルの単一パイプライン接続

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/video-mediabunny-export.ts` (MODIFY)
  - `src/lib/tactical/export/video-media-recorder-export.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/use-export-preview-animation.ts` (MODIFY)
  - `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx` (MODIFY)
  - `src/features/tactical-unified/hooks/konva-slide-export.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` (MODIFY)
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/export/tactical-phase-frame-renderer.ts` の `RenderTacticalPhaseFrameOptions` を拡張し、`teamVisibility`（`'both' | 'home' | 'away'`）、`pitchTransform` / `pitchTransformOverride` を受け取って `compileSceneGraph` ➔ `rasterizeSceneGraphToCanvas2D` パイプラインに反映できるようにすること。
- [x] 2. `src/lib/tactical/export/video-mediabunny-export.ts` および `src/lib/tactical/export/video-media-recorder-export.ts` にて、フレームループ開始前に `normalizePhases({ slides, aspectRatio, boundaryBox, directorCamera })[0]` で `DomainTacticalPhase` を1回生成し、`renderTacticalFrameToCanvas` に `phase` として渡すこと（60fpsループ内での毎フレーム正規化を回避）。
- [x] 3. `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`、`src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`、`src/features/tactical-unified/hooks/konva-slide-export.ts` の3箇所すべてで、`normalizePhases` により `phase: DomainTacticalPhase` を生成（React Hook/Component内では `useMemo` でメモ化）して `renderTacticalFrameToCanvas` に渡すこと。
- [x] 4. `rtk grep "phase" src/lib/tactical/export/video-mediabunny-export.ts src/lib/tactical/export/video-media-recorder-export.ts src/features/tactical-unified/panels/export/use-export-preview-animation.ts src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx src/features/tactical-unified/hooks/konva-slide-export.ts` で全5ファイルから `phase` が `renderTacticalFrameToCanvas` に渡されていることを確認できること。

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **単一描画パイプラインへの統合**: 動画エクスポート（Mediabunny / MediaRecorder）、エクスポートプレビュー、左パネルのシーンサムネイル、PNG/ZIP スライド出力のすべてが `DomainTacticalPhase` ➔ `evaluateTimelineFrame` ➔ `compileSceneGraph` ➔ `rasterizeSceneGraphToCanvas2D` を通るように統一する。
  2. **既存テスト・モック互換性の維持**: `renderTacticalFrameToCanvas(ctx, options)` の公開シグネチャおよび既存オプション（`slides`, `timeMs`, `width`, `height`, `aspectRatio`, `boundaryBox`, `screenBackground`, `pitchAppearance` 等）はそのまま維持し、`phase` プロパティを追加注入する形で移行することで既存のスパイ検証テストを破壊しないこと。
  3. **BoundaryBox クロップ整合**: `tactical-frame-renderer.ts` で行われている `boundaryBox` クロップ（`offscreen` 描画後の `ctx.drawImage` トリミング）が、`options.phase` 指定時にも同様に機能すること。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/export/__tests__/video-export.test.ts` — `exportVideoWithMediabunny` / `exportVideoWithMediaRecorder` の呼び出しテスト。
  - `src/features/tactical-unified/panels/left-panel/__tests__/left-panel.test.tsx` — `SceneCanvasThumbnail` が `renderTacticalFrameToCanvas` を呼ぶテスト。
  - `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` — プレビューアニメーションが `renderTacticalFrameToCanvas` を呼ぶテスト。
  - `src/features/tactical-unified/__tests__/konva-export-helpers.test.ts` — `renderSlideToPngBlob` / `exportAllSlidesZip` のテスト。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import { normalizePhases } from '@/lib/tactical/acl/slide-normalizer';
import type { DomainTacticalPhase } from '@/lib/types/tactical/domain-hierarchy';
import { renderTacticalFrameToCanvas } from '@/lib/tactical/export/tactical-frame-renderer';
import { renderTacticalPhaseFrameToCanvas } from '@/lib/tactical/export/tactical-phase-frame-renderer';
```

### 3.2 Key Interfaces & Types
```ts
export interface RenderTacticalPhaseFrameOptions {
  ctx: AnyCanvasRenderingContext2D;
  phase: DomainTacticalPhase;
  timeMs: Milliseconds | number;
  width: number;
  height: number;
  baseWidth?: number;
  baseHeight?: number;
  playerPhotos?: Record<string, CanvasImageSource | null | undefined>;
  pitchAppearance?: PitchAppearanceConfig;
  marbleTexture?: CanvasImageSource | null;
  screenBackground?: ScreenBackgroundConfig;
  transparent?: boolean;
  teamVisibility?: 'both' | 'home' | 'away';
  pitchTransform?: PitchTransform | null;
  pitchTransformOverride?: PitchTransform | null;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// slides 配列から DomainTacticalPhase への正規化（ループ外または useMemo 内で1回実行）
const phase = useMemo(
  () =>
    slides.length > 0
      ? normalizePhases({
          slides,
          aspectRatio,
          boundaryBox,
          directorCamera,
        })[0]
      : undefined,
  [slides, aspectRatio, boundaryBox, directorCamera],
);
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Frame Renderer & Video Exporters の Phase パイプライン統合
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/tactical-phase-frame-renderer.ts`, `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/video-mediabunny-export.ts`, `src/lib/tactical/export/video-media-recorder-export.ts`, `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/tactical/export/tactical-phase-frame-renderer.ts
  // RenderTacticalPhaseFrameOptions に teamVisibility?: 'both' | 'home' | 'away', pitchTransform?: PitchTransform | null, pitchTransformOverride?: PitchTransform | null を追加。
  // evaluateTimelineFrame(phase, toMilliseconds(Number(timeMs))) で得た evaluatedFrame に対し:
  // - effectivePitchTransform = pitchTransformOverride ?? pitchTransform ?? evaluatedFrame.slide.pitchTransform
  // - teamVisibility が 'home' または 'away' の場合、evaluatedFrame.slide.players のうち (p.area === 'pitch' && p.team !== teamVisibility && p.team !== 'neutral') のプレイヤーを除外した slide で compileSceneGraph を呼ぶ。

  // 2. src/lib/tactical/export/tactical-frame-renderer.ts
  // renderTacticalFrameToCanvas(ctx, options) 冒頭の if (options.phase) 分岐において:
  // - boundaryBox クロップが有効（shouldApplyCrop(boundaryBox) === true）かつ options.mvpMatrix == null の場合は、offscreen クロップ処理を通した上で内部描画に phase を引き継ぐか、クロップ後に転写する。
  // - options.mvpMatrix == null && options.precomputedFrame == null && options.directorCamera == null && options.phase != null のとき、renderTacticalPhaseFrameToCanvas に teamVisibility, pitchTransform, pitchTransformOverride を含めて委譲する。

  // 3. src/lib/tactical/export/video-mediabunny-export.ts & src/lib/tactical/export/video-media-recorder-export.ts
  // フレーム描画ループの前に:
  // const phase = slides.length > 0 ? normalizePhases({ slides, aspectRatio, boundaryBox, directorCamera })[0] : undefined;
  // を1回計算し、ループ内の renderTacticalFrameToCanvas(ctx, { ..., phase }) に渡す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` にて以下を検証:
  1. `renderTacticalPhaseFrameToCanvas` に `teamVisibility: 'home'` を渡した際、`team: 'away'` の `PitchPlayer` が描画対象から除外され、`team: 'home'` のプレイヤーのみ描画されること。
  2. `renderTacticalFrameToCanvas` に `phase` と `boundaryBox: { x: 10, y: 10, width: 50, height: 50 }` を渡した際、クロップ描画が正常に実行されること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` ➔ Phase 1 対象4ファイルを実装 ➔ `bun run ai:check src/lib/tactical/export/` PASS
- **Worker Handoff Log**:
  - `RenderTacticalPhaseFrameOptions` に `teamVisibility`, `pitchTransform`, `pitchTransformOverride` を追加。`tactical-frame-renderer` は 300 行制限（現在 295行）のため JSDoc と offscreen クロップ処理をコンパクトに保つこと。

---

### Phase 2: Export Preview・Scene Thumbnail・Slide PNG/ZIP Export の Phase 接続
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/export/use-export-preview-animation.ts`, `src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx`, `src/features/tactical-unified/hooks/konva-slide-export.ts`, `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/features/tactical-unified/panels/export/use-export-preview-animation.ts
  // const phase = useMemo(() => (slides.length > 0 ? normalizePhases({ slides, aspectRatio, boundaryBox, directorCamera })[0] : undefined), [slides, aspectRatio, boundaryBox, directorCamera]);
  // を定義し、renderFrame 内の renderTacticalFrameToCanvas(ctx, { ..., phase }) に渡す。

  // 2. src/features/tactical-unified/panels/left-panel/scene-canvas-thumbnail.tsx
  // const phase = useMemo(() => normalizePhases({ slides: [slide], aspectRatio, boundaryBox: slide.boundaryBox })[0], [slide, aspectRatio]);
  // を定義し、useEffect 内の renderTacticalFrameToCanvas(ctx, { slides: [slide], phase, timeMs: 0, width: dims.width, height: dims.height, aspectRatio, boundaryBox: slide.boundaryBox, pitchAppearance, applyEffects: false }) に渡す。

  // 3. src/features/tactical-unified/hooks/konva-slide-export.ts
  // renderSlideToPngBlob 内で:
  // const phase = normalizePhases({ slides: [slide], aspectRatio, boundaryBox: effectiveBoundaryBox, directorCamera })[0];
  // を生成し、renderTacticalFrameToCanvas(ctx, { ..., phase }) に渡す。
  ```
- **Testing Strategy (Concrete Test Values)**:
  `src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` にて以下を検証:
  1. `useExportPreviewAnimation` が `renderTacticalFrameToCanvas` を呼び出す際、引数オブジェクトに正規化済みの `phase`（`phase.slides.length === slides.length`）が含まれていること。
  2. 既存の `left-panel.test.tsx` および `konva-export-helpers.test.ts` がすべて PASS すること。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red src/features/tactical-unified/panels/export/__tests__/use-export-preview-animation.test.ts` ➔ Phase 2 対象3ファイルを実装 ➔ `bun run ai:check src/features/tactical-unified/panels/export/ src/features/tactical-unified/panels/left-panel/ src/features/tactical-unified/hooks/konva-slide-export.ts` PASS
- **Worker Handoff Log**:
  - `useExportPreviewAnimation`、`SceneCanvasThumbnail`、`renderSlideToPngBlob` に `normalizePhases` 経由の `phase` 注入を接続完了。`resolveExportPreviewMVPMatrix` を `export-preview-constants.ts` へ抽出し 300 行制限をクリア。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 15:10
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  全要件の充足と4大定性監査基準のクリアを確認。動画出力（Mediabunny / MediaRecorder）、プレビュー、サムネイル、画像エクスポートが `DomainTacticalPhase` 単一描画パイプラインへ美しく統合され、クロップ整合性・60fpsループ外正規化・公開シグネチャ互換性が完全に維持されています。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
