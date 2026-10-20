# TASK-025: 戦術ボード基盤の最適化とピッチ・マーカー描画復元

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-20
- **Target Files**:
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx` (NEW)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (NEW)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (NEW)
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx` (MODIFY)
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/hud/context-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/components/player-layer.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts` (DELETE)
  - `src/features/tactical-unified/core/components/FootRingLayer.tsx` (DELETE)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. **ピッチ描画復元**: 背景画像未指定時・ピッチモード時に `loadPitchSvgImage` / `getCachedPitchSvgImage` を用いたSVGピッチ描画（芝生・ペナルティエリア・センターサークル等）が確実に行われ、アスペクト比に応じた真円サークルが描画されること。
- [x] 2. **選手マーカー描画復元**: 初期ロード時およびDexieからの非同期データ復元時、マスターストアに存在する22名の選手マーカーが即座に確実描画されること。
- [x] 3. **ストア一元化と同期ハック全廃**: `FullTacticalCanvas` における独自 `createCanvasStore` 生成および `JSON.stringify` 比較による更新逆流 `useEffect` を完全全廃し、マスターストア（`useTacticalUnifiedStore`）と一体化するアダプターを供給すること。
- [x] 4. **Undo/Redo完全統合**: 本体の Undo/Redo ボタンおよびショートカットキーでキャンバス上のオブジェクト操作（追加・移動・削除）が Zundo 履歴として正しく巻き戻り・再適用できること。
- [x] 5. **描画コンテナ境界の分離**: `CanvasStageContainer` から浮動ツールバーの強制埋め込みを撤廃して `{toolbar}` スロットに純化し、本体戦術ボードには右側固定のツールバー（ピッチロックボタン含む）が配置されること。
- [x] 6. **デッドコード整理**: 旧キャンバス時代の未使用残骸ファイル（旧 `player-layer.tsx`, `use-player-layer-drag.ts`, `FootRingLayer.tsx`）および二重ストア生成ラッパー（`DrawingToolbarWithAdapter`, `ContextHudWithAdapter`）が安全に整理・削除されること。
- [x] 7. **回帰なし**: 全件の型チェック、Lint、Vitest テストが PASS すること（`bun run ai:check`）。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Pitch SVG Loader Specs
```ts
import {
  getCachedPitchSvgImage,
  loadPitchSvgImage,
  preloadAllPitchSvgImages,
} from '@/lib/tactical/pitch-svg';
import {
  calculatePitchGeometryForAspect,
  DEFAULT_PITCH_MARGIN_PERCENT,
} from '@/lib/tactical/pitch-geometry';
```

### 3.2 Tactical Unified Store & Canvas Store Interfaces
```ts
import type { CanvasStore, CanvasStoreApi } from '@/features/tactical-unified/core/types';
import { useTacticalUnifiedStore, type TacticalUnifiedState } from '@/features/tactical-unified/stores/tactical-unified-store';
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-selectors';
```

---

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ピッチ背景レイヤーの実装と描画復元
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`
- **契約 (Interface)**:
  - `BackgroundImageLayer` は `backgroundImageUrl` が存在する場合はそれを描画し、存在しない場合（またはピッチモード）は `loadPitchSvgImage` / `getCachedPitchSvgImage` を用いて等方ピッチSVGを描画する。
  - 初期マウント時に `preloadAllPitchSvgImages()` を呼び出し、キャッシュ優先でチラつきゼロの描画を実現する。
- **Testing Strategy**:
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx` で、画像なし時にピッチSVGが描画され、画像指定時に画像が描画されることを検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `BackgroundImageLayer.tsx` にピッチSVG描画（`preloadAllPitchSvgImages`, `getCachedPitchSvgImage`, `loadPitchSvgImage`）を統合。
  - `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx` で全4件のテストが PASS。`ai:check` 合格。

---

### Phase 2: TacticalUnifiedStore アダプターの実装とストア一元化
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts`
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `src/features/tactical-unified/views/__tests__/full-tactical-canvas.test.tsx`
- **契約 (Interface)**:
  - `createTacticalCanvasStoreAdapter(unifiedStore)` は `CanvasStoreApi`（`StoreApi<CanvasStore>`）を返す。
  - `getState()` はアクティブスライドの `players` を `annotations.markers` に、`arrows`, `zones`, `texts` を `annotations` にマッピングし、描画ツール状態やピッチ状態を本体ストアと同期して返す。
  - アノテーション操作（`addArrow`, `updateArrow`, `removeArrow`, `addZone`, `updateZone`, `removeZone`, `addText`, `updateText`, `removeText`, `removeSelected`, `eraseAtPoint`）およびマーカー操作（`addMarker` ➔ `addPlayer`, `updateMarker` ➔ `updatePlayer`, `removeMarker` ➔ `removePlayer`）を本体ストアのアクションに直結させる。
  - 履歴操作（`undo`, `redo`, `canUndo`, `canRedo`）を本体の Zundo 履歴（`temporal`）に直結させる。
  - `FullTacticalCanvas.tsx` から `createCanvasStore` および `JSON.stringify` 同期 `useEffect` を全廃し、上記アダプターを `CanvasStoreProvider` に渡す。
- **Testing Strategy**:
  - アダプター単体テストでマスターストアとの双方向同期、Undo/Redo呼び出しを検証。
  - `full-tactical-canvas.test.tsx` でマーカー描画と同期動作を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `createTacticalCanvasStoreAdapter` を実装し、マスターストア（`useTacticalUnifiedStore`）と Level 2 キャンバスを直接接続。
  - `FullTacticalCanvas.tsx` から別ストアインスタンス化および `JSON.stringify` 同期 `useEffect` を全廃。
  - `useSyncExternalStore` 向けにスナップショットキャッシュを施し無限ループを完全防止。
  - `ai:check` で全6ファイル・7テストが PASS。マーカー即時描画とUndo/Redo連動を確認。

---

### Phase 3: 描画コンテナ境界の分離（スロット純化 & 右側固定ツールバー配置）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
  - `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
  - `src/features/tactical-unified/views/FullTacticalCanvas.tsx`
  - `src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx`
- **契約 (Interface)**:
  - `CanvasStageContainer` の末尾描画を `{toolbar ?? <CoreDrawingToolbar />}` から `{toolbar}` に変更（スロット純化）。
  - `FullTacticalCanvas` において、`toolbar` prop が未指定の場合に右側固定ツールバー（ピッチロックボタンを含む `DrawingToolbar`）をスロット注入する。
  - `drawing-toolbar.tsx` 内の `DrawingToolbarWithAdapter` を全廃し、`DrawingToolbar` は単一のコンポーネントとして `CoreDrawingToolbar`（またはピッチロック付きUI）を描画する。
- **Testing Strategy**:
  - `canvas-stage-container.test.tsx` で toolbar スロットの動作を検証。
  - `drawing-toolbar.test.tsx` でツールバー描画とピッチロック操作を検証。
- **Tasks**:
  - [x] 1. TDD実装: `bun run ai:check:red <テストファイル>` ➔ 実装 ➔ `bun run ai:check <対象ファイル>` PASS
- **Worker Handoff Log**:
  - `CanvasStageContainer` からツールバー強制埋め込みを撤廃し `{toolbar}` スロットに純化。
  - `FullTacticalCanvas` で右側固定ツールバー（ピッチロックボタンを含む `DrawingToolbar`）を既定スロット注入。
  - `drawing-toolbar.tsx` 内の `DrawingToolbarWithAdapter` を削除し、単一のクリーンなコンポーネントに簡素化。
  - `canvas-stage-container.test.tsx` でツールバースロットの動作をテストし、`ai:check` 全10件合格。

---

### Phase 4: デッドコード整理（旧player-layer, 旧context-hud等）
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/objects/player/components/player-layer.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts` (DELETE)
  - `src/features/tactical-unified/core/components/FootRingLayer.tsx` (DELETE)
  - `src/features/tactical-unified/objects/player/components/index.ts` (MODIFY)
  - `src/features/tactical-unified/objects/player/hooks/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/panels/hud/context-hud.tsx` (MODIFY)
- **契約 (Interface)**:
  - 未使用となった旧残骸ファイルを物理削除。
  - 各種 index から export を安全に除去。
  - `context-hud.tsx` から不要な `ContextHudWithAdapter`（二重ストア同期ハック）を削除し、純粋な `CoreContextHud` ラッパーに簡素化。
- **Testing Strategy**:
  - `bun run ai:check` で参照切れや構文エラーがないことを検証。
- **Tasks**:
  - [x] 1. リファクタ & 削除 ➔ `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 旧キャンバス時代の残骸（`player-layer.tsx`, `use-player-layer-drag.ts`, `FootRingLayer.tsx`）を物理削除。
  - 各種 index から不要な export をクリーンに除去。
  - `context-hud.tsx` から二重ストア生成ハック（`ContextHudWithAdapter`）を削除し、統一アダプター（`createTacticalCanvasStoreAdapter`）に統合。
  - `ai:check` で全8テスト PASS、TypeScript エラー 0 を確認。

---

### Phase 5: 全体統合検証 & 回帰テスト
- **Worker Model**: `flash`
- **対象ファイル**: 全関連ファイル
- **Testing Strategy**:
  - `bun run ai:check` で型チェック、Lint、Vitestが全て通ることを確認。
  - `bun run ai:report latest` または検証ログを確認。
- **Tasks**:
  - [x] 1. 全体検証: `bun run ai:check` PASS
- **Worker Handoff Log**:
  - 差分全ファイルに対して `bun run ai:check` を実行し、15ファイル全件の Biome / TypeScript Scoped Check / 4ファイル18テストが PASS。
  - `tactical-unified-page-integration.test.tsx` の統合テストも PASS。回帰ゼロを確認。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash-high`
- **Reviewed At**: 2026-10-20
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか
  - [x] 境界と副作用: Level 2 core にホスト依存の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: 1ファイル250行前後に収まり、OCPが守られているか
  - [x] サイレント破壊防止: 3Dチルトに触れていないか、既存セレクタの後方互換性が維持されているか
- **Summary**:
  - 4大定性監査すべて合格。ピッチSVG描画復元、マスターストア一元化アダプター導入、CanvasStageContainerのスロット純化、旧残骸ファイルの安全な削除を確認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
- 特になし
