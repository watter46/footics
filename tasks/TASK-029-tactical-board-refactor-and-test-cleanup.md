# TASK-029: 戦術ボード仕様再調整・リファクタ & テストスリム化

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-21
- **Design Artifact**: `/home/watter46/.gemini/antigravity-cli/brain/d56e2a1a-ddcb-42a5-98c3-dd19713b3049/plan.md`
- **Target Files**:
  - `src/features/tactical-unified/core/utils/matrix-coordinates.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/tactical-animation-canvas.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/animation-node-updater.ts` (MODIFY)
  - `src/features/tactical-unified/stores/slide-flip-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/stores/project-slice.ts` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-more-menu.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-panel.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/**/__tests__/*phase*.test.ts*` (DELETE/CLEANUP)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 【アニメーション座標統合】: `tactical-animation-canvas.ts` と `animation-node-updater.ts` がピッチ外枠オフセット（`pitchRect.x, y`）を反映し、再生開始時にマーカーが左上に消失するバグを根絶すること。
- [x] 【縦型・正方形ピッチ陣地反転】: `9:16`, `4:5`, `1:1` を正しく縦型ピッチ判定（`isVerticalPitch`）として扱い、上下反転（攻守交代）が確実に実行されること。
- [x] 【Swap ボタン再配置】: Moreメニュー奥底から「TopBarヘッダー」および「Formationパネル」へ押しやすいボタンを直接配置すること。
- [x] 【3Dマーカー本体除外】: `WEB_DRAWING_TOOLS` から `TOOL_PLUGIN_PLAYER_3D_RING` を除外し、2D選手マーカーのみに統一すること。
- [x] 【D&D ベンチ↔ピッチ操作】: `@dnd-kit/core` を用いてベンチカードを掴みピッチへドロップ投入、およびピッチ選手をベンチへ戻す操作が機能すること。
- [x] 【不要テスト削除 & 全体PASS】: `phase8`〜`11` 等の使い捨て・重複テストを削除し、ドメイン本質テストにスリム化、`bun run ai:check` がエラー・警告ゼロであること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 座標射影 & ピッチ外枠オフセット (matrix-coordinates.ts)
```ts
import { projectPitchToScreen, unprojectScreenToPitch, type CameraParams } from '@/features/tactical-unified/core/utils/matrix-coordinates';
import { calculatePitchRect } from '@/lib/tactical/pitch-geometry';

// アニメーション更新時の画面座標算出規約:
// pitchRect.x, pitchRect.y を原点とし、pitchRect.width, pitchRect.height で正規化座標(0..100)をpxに変換
const pxX = pitchRect.x + (pState.x / 100) * pitchRect.width;
const pxY = pitchRect.y + (pState.y / 100) * pitchRect.height;
```

### 3.2 縦型ピッチ判定 & 陣地反転ヘルパー (slide-flip-helpers.ts)
```ts
export function isVerticalPitch(aspectRatio: AspectRatio): boolean {
  return aspectRatio === '9:16' || aspectRatio === '4:5' || aspectRatio === '1:1';
}
// flipSlideObjects(slide, isVerticalPitch(project.aspectRatio))
```

### 3.3 描画ツール定義 (drawing-tool-plugin.ts)
```ts
// Web本体では 2D マーカーのみ
export const WEB_DRAWING_TOOLS: DrawingToolPlugin[] = [
  ...DRAWING_TOOLS_CORE,
  TOOL_PLUGIN_PLAYER_2D,
];
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: アニメーション再生時の座標消失バグ修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/hooks/animation-node-updater.ts`, `src/features/tactical-unified/hooks/tactical-animation-canvas.ts`
- **Tasks**:
  - [x] 1. TDD: `calculatePitchRect` の `x, y` オフセットを `update*Nodes` に渡し、原点ズレを修正するテスト作成
  - [x] 2. `updatePlayerNodes`, `updateBallNode`, `updateZoneNodes`, `updateArrowNodes`, `updateTextNodes` の位置計算に `offsetX`, `offsetY` を反映
  - [x] 3. `bun run ai:check src/features/tactical-unified/hooks/` PASS 確認
- **Worker Handoff Log**:
  - `animation-node-updater.test.ts` にて `offsetX/offsetY` 反映テストを作成し RED 確認後、各 updater 関数で `offsetX/offsetY` を加算する実装を完了。
  - `tactical-animation-canvas.ts` の `calculatePitchDimensions` が `rect.x, rect.y` を返し、`renderFrameToCanvas` と `runAnimationLoop` が `offsetX, offsetY` を透過。
  - `bun run ai:check src/features/tactical-unified/hooks/` 全19ファイル、23テスト ALL PASS。

---

### Phase 2: 陣地反転 (Swap) の縦型・正方形ピッチ判定修正
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/stores/slide-flip-helpers.ts`, `src/features/tactical-unified/stores/project-slice.ts`
- **Tasks**:
  - [x] 1. TDD: `isVerticalPitch` ヘルパーを新設し、`9:16`, `4:5`, `1:1` で上下反転されるテストを追加
  - [x] 2. `project-slice.ts` の `swapTeamSides` で `isVerticalPitch(s.project.aspectRatio)` を適用
  - [x] 3. `bun run ai:check src/features/tactical-unified/stores/` PASS 確認
- **Worker Handoff Log**:
  - `slide-flip-helpers.ts` に `isVerticalPitch(aspectRatio)` を新設（9:16, 4:5, 1:1 を縦型ピッチ判定）。
  - `project-slice.ts` の `swapTeamSides` でハードコード（`=== '9:16'`）を撤廃し `isVerticalPitch` を適用。
  - `slide-flip-helpers.test.ts` 新設および `tactical-unified-store.test.ts` の Swap テスト（4:5, 1:1, 16:9）全件 PASS。`ai:check` PASS。

---

### Phase 3: Swap ボタン再配置 & 3D マーカーの本体除外
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`, `src/features/tactical-unified/panels/toolbar/top-bar-center.tsx`, `src/features/tactical-unified/panels/right-panel/formation-panel.tsx`
- **Tasks**:
  - [x] 1. `drawing-tool-plugin.ts` の `WEB_DRAWING_TOOLS` から 3D Ring を除外
  - [x] 2. `top-bar-center.tsx` に SwapSides ボタンを追加
  - [x] 3. `formation-panel.tsx` の FormationTeamToggle またはヘッダーに SwapSides ボタンを配置
  - [x] 4. `bun run ai:check` PASS 確認
- **Worker Handoff Log**:
  - `WEB_DRAWING_TOOLS` から 3D Ring を除外（2D Player Marker に統一）。
  - `top-bar-center.tsx` に直感的な Swap ボタン（縦型時は ArrowUpDown、横型時は ArrowLeftRight）を配置。
  - `formation-preset-selector.tsx` および `formation-panel.tsx` に SwapSides を統合。
  - `top-bar-more-menu.tsx` の縦型判定も `isVerticalPitch` に統一。
  - `bun run ai:check` PASS。

---

### Phase 4: ベンチ↔ピッチの @dnd-kit ドラッグ＆ドロップ連携
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/right-panel/formation-bench-item.tsx`, `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`, `src/features/tactical-unified/tactical-unified-page.tsx`, `src/features/tactical-unified/core/utils/dnd-coordinates.ts`
- **Tasks**:
  - [x] 1. `@dnd-kit/core` の `useDraggable` を `FormationBenchItem` に適用
  - [x] 2. `CanvasStageContainer`（ピッチ）を `useDroppable` に登録し、ドロップ時に `unprojectScreenToPitch` またはピッチ相対座標へ選手を配置
  - [x] 3. `bun run ai:check` PASS 確認
- **Worker Handoff Log**:
  - ドロップ座標計算純関数 `dnd-coordinates.ts` およびテスト `dnd-coordinates.test.ts` を TDD で新設。
  - `FormationBenchItem` に `useDraggable` とドラッグハンドル（GripVertical）を組み込み。
  - `CanvasStageContainer` を `useDroppable` に登録（isOver時のビジュアルフィードバック付き）。
  - `tactical-unified-page.tsx` に `DndContext` を配線し、ベンチからのドロップで `movePlayerToPitch` を呼び出す連携を完了。
  - `bun run ai:check` PASS。

---

### Phase 5: Tactical 関連テストの精査・不要テスト削除 & 全体験証
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/**/__tests__/`, `src/lib/tactical/**/__tests__/`
- **Tasks**:
  - [x] 1. 過去の一時的フェーズテスト（`*phase*`, 重複スナップショット等）を精査・削除
  - [x] 2. コア仕様テスト（座標変換、アニメーション補間、D&D、アスペクト比）の健全性確認
  - [x] 3. `bun run ai:check` で全PASS確認
- **Worker Handoff Log**:
  - `canvas-phase8.test.tsx`, `canvas-phase9.test.tsx`, `canvas-phase10-ui.test.tsx`, `canvas-phase11-marker.test.ts` を削除しスリム化。
  - `toolbar.test.tsx`, `drawing-toolbar.test.tsx`, `drawing-toolbar-marker-mode.test.tsx`, `tracking-arrow-and-ball-trajectory.test.ts` 等を新仕様（2D統一、SwapSides、CanvasStoreProvider）に合わせて適正化。
  - Tactical 関連テスト 300+ tests 全件 PASS。
  - `bun run ai:check` 全件 PASS（TypeScript 0 errors, Biome 0 errors）。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-21
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: 1ファイル250行以内、OCP遵守、余計な自前計算の混入がないか
  - [x] サイレント破壊防止: Tactical以外のモジュールへの副作用がないか
- **Summary**:
  - アニメーション再生時の原点消失バグ根絶（offsetX/offsetY適用）。
  - isVerticalPitch による 9:16/4:5/1:1 の上下反転統一。
  - WEB_DRAWING_TOOLS の 2D マーカー一本化、SwapSides ボタンの再配置。
  - @dnd-kit/core によるベンチ↔ピッチ連携および純関数 dnd-coordinates による高テスタビリティ。
  - 過去フェーズテスト（phase8〜11）の安全な削除と Tactical 全テスト（300+）の完全PASS確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
なし（一発承認 LGTM）
