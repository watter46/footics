# TASK-097: 3D Fade Ring マーカー & コネクタ表現強化 (お試し実装 in Extension)

## 状態
- [x] 完了

## 概要
- リファレンス画像（Chelsea vs Everton）に基づき、既存の `markerType: 'ring'` とは別に、中央に向けてフェードアウトして消える新マーカー `markerType: 'ring-fade'` を追加する。
- 選手間コネクタ（`ConnectLine`）に `glowBlur` オプションを追加し、マーカー外周境界トリミングと発光・グロウ強度変更（HUD）を可能にする。
- Extension（`QuickTacticalCanvas`）にて既存マーカーに影響を与えることなく利用できるようにする。

## 実装計画

### Phase 1: スキーマ・型定義の拡張
- [x] `src/lib/types/tactical-unified.ts`:
  - `MarkerStyleSchema.markerType`: `z.enum(['circle', 'ring', 'ring-fade'])` に拡張
  - `ConnectLineSchema`: `glowBlur: z.number().min(0).max(40).default(16).optional()` を追加
  - `DrawingToolSchema`: `'player-ring-fade'` を追加

### Phase 2: 3D Fade Ring コンポーネント実装
- [x] `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx` を新規作成
  - 接地シャドウ
  - 3Dシリンダー側面（厚み部分の下部リム）
  - 外周が明るく、中央に向かって透明に消滅するラジアルグラデーション楕円ディスク
  - 外周のシャープなストロークエッジ
  - 既存の `PlayerMarkerItem` (`PlayerMarkerItem.tsx`) で `markerType === 'ring-fade'` の場合に切り替え描画
  - `src/features/tactical-unified/objects/player/components/index.ts` から export

### Phase 3: コネクタ描画 & HUD (グロウ強度) 対応
- [x] `src/lib/tactical/marker-geometry.ts`:
  - `isRing` に `ring-fade` を含め、コネクタの楕円境界トリミングを適用
- [x] `src/features/tactical-unified/core/components/PlayerConnectLines.tsx`:
  - `ConnectLine.glowBlur ?? 16` に応じた `shadowBlur` の動的反映
  - コアラインに選択色を反映
- [x] `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx`:
  - グロウ強度（`glowBlur`）の調整ボタン（+/-）を追加

### Phase 4: ツールバー & Extension 連携
- [x] `src/features/tactical-unified/core/components/toolbar/core-toolbar-icons.tsx`:
  - `RingFadeMarkerIcon` を追加
- [x] `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts`:
  - `TOOL_PLUGIN_PLAYER_3D_RING_FADE` を追加（'player-ring-fade'）
  - `EXTENSION_DRAWING_TOOLS` に追加
- [x] `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`:
  - `createRingFadeMarker` を追加
- [x] `src/features/tactical-unified/core/utils/canvas-pointer-tools.ts` & `use-canvas-pointer-drawing.ts`:
  - `activeTool === 'player-ring-fade'` 時の生成ハンドラを接続

### Phase 5: 検証
- [x] `bun run ai:check`
- [x] 単体テスト追加 & 既存テスト全通過確認（7テストスイート / 51テスト全パス）

## Handoff Log
- 新規 export: `PlayerMarkerRingFade` (`player-marker-ring-fade.tsx`), `RingFadeMarkerIcon` (`core-toolbar-icons.tsx`), `TOOL_PLUGIN_PLAYER_3D_RING_FADE` (`drawing-tool-plugin.ts`), `createRingFadeMarker` (`canvas-drawing-factory.ts`)
- 注意点: コネクタトリミング（`marker-geometry.ts`）に `ring-fade` を含めることで、新マーカーでも境界線上で精密にクリップされるよう整合性を担保。
