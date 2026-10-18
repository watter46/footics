# TASK-004: マーカー・Zone・HUDリアクティブ追従 & マーカーWavyArrow追加

## 概要
キャンバスコア（`src/features/tactical-unified/core/`）における以下の5要件を実装・検証する。
1. Zone系選択時にオプション（HUD）が出にくい問題の解決（手振れ誤ドラッグ防止 & ドロップ後HUD復帰）
2. マーカーデフォルト色を `#034694`（チェルシーブルー）に変更
3. マーカー移動時のオプション（HUD）リアクティブ追従
4. マーカーオプションに WavyArrow（根本周回 & 黄色 `#eab308` デフォルト）を追加
5. マーカー削除時にそれに紐づくオプション・矢印・コネクトラインを連動削除

## 設計方針・制約
- **ホスト境界厳守**: Level 2 core 内に `isExtension`, `chrome.*`, `process.env` を書かない。
- **OCP 厳守**: 既存機能を壊さず、プラグイン・疎結合設計を維持。
- **ファイル行数制限**: 全ファイル 200行（最大250行）以内。
- **検証プロトコル**: コミットは `bun run ai:commit` で一括検証・ステージング・コミットを行う。

---

## フェーズ一覧

### Phase 1: マーカーデフォルト色 `#034694` 化 & 削除時連動クリーンアップ
- [x] `canvas-drawing-factory.ts` の `createRingMarker` / `create2DPlayerMarker` のデフォルト色を `#034694` に変更
- [x] `canvas-pointer-tools.ts` のマーカー追加時のデフォルト色を `#034694` に変更
- [x] `player-hud.tsx`, `player-quick-actions.tsx`, `PlayerLayer.tsx`, `PlayerConnectLines.tsx` のフォールバック色を `#034694` に統一
- [x] `canvas-store-actions.ts` の `removeMarker(id)` / `removeSelected()` を改修し、対象マーカーを始点・終点とする矢印（`sourcePlayerId` / `targetPlayerId`）および他マーカーからのコネクトライン（`toPlayerId`）を連動削除
- [x] テスト作成・実行 (`src/features/tactical-unified/core/__tests__/canvas-phase11-marker.test.ts`)

### Phase 2: マーカーオプションへの WavyArrow 追加
- [x] `player-quick-actions.tsx` の `ArrowActionGroup` に `WavyArrowIcon`（波線矢印）ボタンを追加
- [x] WavyArrow クリック時に `arrowType: 'dribble'`, `curveType: 'straight'`, `sourcePlayerId: player.id`, `color: '#eab308'` の矢印を生成
- [x] `ArrowObject` / `arrow-geometry.ts` により根本がマーカー円周上にアタッチされ、先端を回すとマーカーの周りを回ることを確認
- [x] テスト作成・実行

### Phase 3: Zone系選択 & HUD表示改善
- [x] `CanvasStageContainer.tsx` の Stage に `dragDistance={3}` を設定し、マウスクリック時の微小な手振れによる `dragstart` 誤検知（クリックキャンセル）を根絶
- [x] `ZoneShapeNode.tsx` の `handleDragEnd` で `setIsDragging(false); setIsHudOpen(true);` を実行
- [x] `ZonePolygonNode.tsx` の `handleGroupDragEnd` で `setIsDragging(false); setIsHudOpen(true);` を実行
- [x] テスト作成・実行

### Phase 4: マーカー移動時の HUD リアクティブ追従
- [x] `PlayerLayer.tsx` の `handleMarkerDragMove`: マーカー移動中にアタッチ矢印の座標を Konva レベルでリアルタイム追従更新
- [x] マーカー移動中に HUD 位置がマーカーにリアルタイム追従するよう、Stage のドラッグ移動イベントまたは位置同期を実装
- [x] `handleDragEnd` で `setIsDragging(false); setIsHudOpen(true);` を維持し、ドロップ後も最新位置でHUDを開いたまま維持
- [x] テスト作成・実行

### Phase 5: 全体検証 & Review
- [x] スコープ検証: `bun run ai:check src/features/tactical-unified/core/`
- [x] 型チェック & Lint: `bun run typecheck && bun run lint`
- [x] Extension ビルド検証: `bun run --cwd extension compile && bun run --cwd extension build`
- [x] Reviewer 検証: `bun run ai:reviewer:check`

---

## Reviewer Checklist & Assessment

### 1. 自動検証ゲート (Automated Verification Gates)
- [x] `bun run ai:check src/features/tactical-unified/core/` (Pass: 12 test files, 61 passed)
- [x] `bun run typecheck && bun run lint` (Pass: 0 errors)
- [x] `bun run --cwd extension compile && bun run --cwd extension build` (Pass: compile & build successful)
- [x] `bun run ai:reviewer:check` (Pass: all files compliant)

### 2. 要件網羅性 (Requirements Coverage)
- [x] **要件1: マーカーデフォルト色 `#034694` 化 & 連動削除**:
  - `canvas-drawing-factory.ts`, `canvas-pointer-tools.ts`, `player-hud.tsx`, `player-quick-actions.tsx`, `PlayerLayer.tsx`, `PlayerConnectLines.tsx` の全箇所でデフォルト/フォールバック色が `#034694` に統一されている。
  - `cascadeRemoveMarker` / `cascadeRemoveSelected` により、マーカー削除時に該当マーカーを始点/終点とする矢印、および他マーカーからのコネクトラインが確実に連動削除される。
- [x] **要件2: マーカーオプションへの WavyArrow 追加**:
  - `player-quick-actions.tsx` に `WavyArrowIcon` を持つ波線矢印ボタンが追加され、デフォルト黄色 `#eab308`、`dribble` 属性で生成される。
  - マーカー円周への根本アタッチおよび周回動作が既存幾何計算（`resolveDynamicArrowPoints`）と連携して機能する。
- [x] **要件3: Zone系選択 & HUD表示改善**:
  - `CanvasStageContainer.tsx` の Konva Stage に `dragDistance={3}` が設定され、クリック時の手振れによる誤ドラッグ・選択キャンセルが根絶されている。
  - `ZoneShapeNode.tsx` および `ZonePolygonNode.tsx` のドラッグ終了ハンドラで `setIsDragging(false); setIsHudOpen(true);` を呼び出し、ドロップ後にHUDが確実に再表示される。
- [x] **要件4: マーカー移動時の HUD リアクティブ追従**:
  - `ContextHud.tsx` の `stage.on('dragmove')` リスナーにより、ドラッグ移動中に Konva ノードの ClientRect を直接追従して HUD の DOM style (left, top, transform) を 60fps でダイレクト更新。
  - `arrow-drag-updater.ts` により、マーカー移動中に Konva レベルで接続矢印もリアルタイム再描画。
  - ドラッグ終了時に HUD が閉じることなく、最新のドロップ位置で維持される。

### 3. 品質・アーキテクチャ規約 (Code Quality & Architecture)
- [x] **行数規約**: 全ファイル200行（最大250行）以内を遵守。
- [x] **ホスト境界厳守**: `src/features/tactical-unified/core/` 内に `isExtension`, `chrome.*`, `process.env` 等の環境依存混入なし。
- [x] **OCP 厳守**: 既存の描画ロジック・HUD構造を破壊することなく、クリーンな拡張と責務分離を実現。

### 総合判定
**LGTM (Looks Good To Me)**
All requirements met with high architectural consistency and clean verification passes.
