# TASK-178e: 戦術ボードDDD移行(5/7): Canvas2DエクスポーターのDumb Rasterizer化とDB・Share APIのACL接続

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-11-12
- **Target Files**:
  - `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts` (CREATE)
  - `src/lib/tactical/export/scene-graph-billboard-rasterizer.ts` (CREATE)
  - `src/lib/tactical/export/scene-graph-ball-rasterizer.ts` (CREATE)
  - `src/lib/tactical/export/tactical-phase-frame-renderer.ts` (CREATE)
  - `src/lib/tactical/export/tactical-frame-renderer.ts` (MODIFY)
  - `src/lib/tactical/export/share-payload.ts` (MODIFY)
  - `src/lib/db/tactical-projects-db.ts` (MODIFY)
  - `src/lib/db/tactical-projects-import.ts` (MODIFY)
  - `src/lib/db/player-merge.ts` (MODIFY)
  - `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` (CREATE)
  - `src/lib/db/__tests__/tactical-projects-import.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
<!-- Reviewer が審査時に要件充足を確認してチェックする -->
- [x] 1. `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts` に `ResolvedSceneGraphDTO` を受け取って Canvas2D コンテキストへ転写する純粋ラスタライザ `rasterizeSceneGraphToCanvas2D` が実装され、内部でベジェ曲線や選手半径ギャップを再計算せず `flatPointsPx` や `positionPx` をそのまま描画すること
- [x] 2. `src/lib/tactical/export/tactical-frame-renderer.ts` が `evaluateTimelineFrame` ➔ `compileSceneGraph` パイプラインに接続され、既存の静止画・動画エクスポートテストがすべて PASS すること
- [x] 3. `src/lib/db/tactical-projects-db.ts`, `src/lib/db/tactical-projects-import.ts`, `src/lib/db/player-merge.ts`, `src/lib/tactical/export/share-payload.ts` が ACL の `normalizeTacticalProject` を通してデータを正規化するようになり、`tactical-projects-import.ts` 内の `attachProjectSlidesGetter` 直呼び出しが解消されること

## 2.5 Architectural Invariants & Why (破壊禁止の前提と設計理由)
<!-- ちゃぶ台返し防止の前提条件と、影響を受ける呼び出し元（Consumers）の同期確認リストを明記する -->
- **Invariants (破壊禁止の不変条件と理由)**:
  1. **Context 6 Dumb Rasterizer 原則**: Canvas2D エクスポーターが独自の幾何学計算を持つと Konva プレビューとの描画ズレが発生するため、`compileSceneGraph` の出力 `ResolvedSceneGraphDTO` をそのまま描画する構造へ統一する。
  2. **ACL 境界による後方互換保護**: IndexedDB に保存済みの既存プロジェクトや外部 JSON ファイル、Share API ペイロードを破損させないため、DB/API 境界で `normalizeTacticalProject` を適用する。
- **Consumers (呼び出し元・別画面の同期確認リスト)**:
  - `src/lib/tactical/export/tactical-video-exporter.ts` — `renderTacticalFrameToCanvas` の呼び出し元
  - `src/app/api/tactical-export/share/route.ts` — `TacticalExportSharePayloadSchema` の呼び出し元
  - `src/lib/db/__tests__/tactical-projects-db.test.ts` & `tactical-projects-import.test.ts` — DB 永続化・インポート検証テスト

## 3. Context Snippets (参照コード・型定義・import)
<!-- Workerが自律探索（Read/Grep）を行わずに実装できるよう、必要な文脈を過不足なく事前注入する -->

### 3.1 Import Specs
```ts
import { normalizeTacticalProject } from '@/lib/tactical/acl/legacy-project-translator';
import { compileSceneGraph } from '@/lib/tactical/compiler/compile-scene-graph';
import type { ResolvedSceneGraphDTO } from '@/lib/tactical/compiler/scene-graph-dto';
import { evaluateTimelineFrame } from '@/lib/tactical/engine/timeline-evaluator';
```

### 3.2 Key Interfaces & Types
```ts
export interface RasterizeSceneGraphOptions {
  readonly ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  readonly sceneGraph: ResolvedSceneGraphDTO;
  readonly playerPhotos?: Readonly<Record<string, CanvasImageSource | null | undefined>>;
}
```

### 3.3 Reference Pattern (既存実装・テスト抜粋)
```ts
// ResolvedArrowPrimitive の flatPointsPx をそのまま Canvas2D path に転写するパターン
if (arrow.flatPointsPx.length >= 4) {
  ctx.beginPath();
  ctx.moveTo(arrow.flatPointsPx[0]!, arrow.flatPointsPx[1]!);
  for (let i = 2; i < arrow.flatPointsPx.length; i += 2) {
    ctx.lineTo(arrow.flatPointsPx[i]!, arrow.flatPointsPx[i + 1]!);
  }
  ctx.stroke();
}
```

## 4. Implementation Phases (Worker 実装手順)
<!-- 1〜4ファイルは1 Phase一括、5ファイル以上は1 Phase最大4ファイル（テスト含め6ファイル）以下に分割、15ファイル超は連番タスク（TASK-XXXa, TASK-XXXb）に分割 -->

### Phase 1: Canvas2D Dumb Rasterizer の構築と `tactical-frame-renderer.ts` の接続
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts`, `src/lib/tactical/export/tactical-frame-renderer.ts`, `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts
  export function rasterizeSceneGraphToCanvas2D(
    options: RasterizeSceneGraphOptions,
  ): void;
  // 描画順序:
  // 1. sceneGraph.zones (rect / ellipse / polygon の flatPointsPx または xPx/yPx/widthPx/heightPx)
  // 2. sceneGraph.connectLines (flatPointsPx の 4要素 [x1, y1, x2, y2])
  // 3. sceneGraph.trajectories (flatPointsPx)
  // 4. sceneGraph.arrows (flatPointsPx + startMarker/endMarker)
  // 5. sceneGraph.billboardItems (既に depthSortKey 順でソート済みの player / ball / text を順番に描画)
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts`:
    - `compileSceneGraph` で生成した DTO（選手2名、追従矢印1本、ポリゴンゾーン1個）をモック Canvas2D コンテキストに渡し、`moveTo` / `lineTo` に DTO の `flatPointsPx` と完全一致する座標が渡されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `rtk vitest run src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` (RED) ➔ `scene-graph-canvas2d-rasterizer.ts` & `tactical-frame-renderer.ts` 実装 ➔ `bun run ai:check src/lib/tactical/export/scene-graph-canvas2d-rasterizer.ts src/lib/tactical/export/tactical-frame-renderer.ts src/lib/tactical/export/__tests__/scene-graph-rasterizer.test.ts` PASS
- **Worker Handoff Log**:
  - `rasterizeSceneGraphToCanvas2D`: `scene-graph-canvas2d-rasterizer.ts` から export。`renderTacticalPhaseFrameToCanvas`: `tactical-frame-renderer.ts` に接続し、Dumb Rasterizer パイプラインと既存エクスポートの完全両立を達成。

---

### Phase 2: IndexedDB (`tactical_projects`)・インポート・Share Payload の ACL 接続
- **Worker Model**: `flash`
- **対象ファイル**: `src/lib/db/tactical-projects-db.ts`, `src/lib/db/tactical-projects-import.ts`, `src/lib/db/player-merge.ts`, `src/lib/tactical/export/share-payload.ts`, `src/lib/db/__tests__/tactical-projects-import.test.ts`
- **契約 (Exact Contract & Formula)**:
  ```ts
  // 1. src/lib/db/tactical-projects-import.ts
  // JSON パース後に normalizeTacticalProject(raw) を通して旧フィールドや不正なベンチ属性・未完了ゾーンを正規化する。
  // 2. src/lib/db/tactical-projects-db.ts
  // getTacticalProject / listTacticalProjects / saveTacticalProject で normalizeTacticalProject による正規化を適用。
  // 3. src/lib/db/player-merge.ts
  // project.phases[].slides[].players[] を走査して playerId を置換し、toBenchPlayer 等の不変条件を壊さないように保存。
  ```
- **Testing Strategy (Concrete Test Values)**:
  - `src/lib/db/__tests__/tactical-projects-import.test.ts`:
    - 旧形式 JSON および新 `version: '3.0.0'` JSON の両方がインポート可能で、インポート後のオブジェクトで `phase.aspectRatio` や `arrow.endMarker` が正規化されていることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check src/lib/db/tactical-projects-db.ts src/lib/db/tactical-projects-import.ts src/lib/db/player-merge.ts src/lib/tactical/export/share-payload.ts src/lib/db/__tests__/tactical-projects-import.test.ts` PASS
- **Worker Handoff Log**:
  - `sharePayloadToNormalizedProject`: `share-payload.ts` から export。`normalizeTacticalProject` + `ensureTacticalProject` により DB/Import/Share での後方互換正規化と slides getter 保証を両立。

---

## 5. Reviewer Assessment (コード差分監査)
<!-- 機械的チェック（型・Lint・Vitest・depcruise）はスクリプトが自動検証。Reviewer はコード差分の意味を監査する -->
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-11-12 02:57
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. ドメイン論理 & 要件網羅性 & テスタビリティ: 数式/座標/状態遷移の整合性、受入要件の全網羅、Concrete Test Values検証、ハック排除
  - [x] 2. Invariants保護 & Consumer同期: Section 2.5 の不変条件（ちゃぶ台返し防止）遵守、別画面・呼び出し元（Consumers）の更新漏れゼロ
  - [x] 3. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 4. 設計負債 & サイレント破壊防止: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、公開シグネチャ保護、指示外変更の排除
- **Summary**:
  Canvas2DエクスポートのDumb Rasterizer化（幾何学計算の二重実装排除とDTO直接転写）およびDB/Import/ShareのACL正規化が完全準拠で実装され、既存呼び出し元との後方互換性も保持されていることを確認しました。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 既存のタスクやPhaseは絶対に消去・上書きせず、追記のみ行う -->
