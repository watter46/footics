# TASK-099: 3D Fade Ring & コネクタの発光幅・透明度デュアル制御 & パフォーマンス最適化

## 状態
- [x] 完了

## 概要
- デモHTMLで検証した発光表現（外側へ薄くなる多重フォグ）を本番コンポーネント（Extension向け）に完全移植する。
- 以前のmax（Blur: 50, Opacity: 1.0）が**中央値（デフォルト値）**となるようレンジを拡張:
  - `glowBlur`: 0〜100（デフォルト・中央値 50）
  - `glowOpacity`: 0.0〜1.0（デフォルト・中央値 1.0、または 0〜2.0 的な乗数設定）※通常 opacity は 0.0〜1.0 のため、UI上は 0.0〜1.0 でデフォルト 1.0、フォグ多重の強さ・係数をチューニング。
- **マーカー側（`PlayerMarkerRingFade`）**:
  - `MarkerStyleSchema` に `glowBlur` (0〜100, default 50) と `glowOpacity` (0〜1, default 1.0) を追加
  - `PlayerHud` に「発光幅」と「発光透明度」の調整コントロールを追加
- **コネクタ側（`PlayerConnectLines`）**:
  - `ConnectLineSchema` に `glowBlur` (0〜100, default 50) と `glowOpacity` (0〜1, default 1.0) を追加
  - `ConnectLineHud` に「発光幅」と「発光透明度」の調整コントロールを追加
- **パフォーマンス最適化**:
  - Konva で `shadowBlur` の大きな多重描画は高負荷になりがちなため、`perfectDrawEnabled={false}`、キャッシュ可能なオフラインキャンバス/単一 `Shape` での効率的 `CanvasRenderingContext2D` パス描画、不要なレイヤ再描画の抑制を実施。

## 実装計画

### Phase 1: スキーマ・型拡張 (`src/lib/types/tactical-unified.ts`)
- `MarkerStyleSchema`:
  - `glowBlur: z.number().min(0).max(100).default(50).optional()`
  - `glowOpacity: z.number().min(0).max(1).default(1.0).optional()`
- `ConnectLineSchema`:
  - `glowBlur: z.number().min(0).max(100).default(50).optional()`
  - `glowOpacity: z.number().min(0).max(1).default(1.0).optional()`
- スキーマテストの更新

### Phase 2: マーカー実装 (`player-marker-ring-fade.tsx`)
- デモの多重フォグ減衰（広域フォグ＋中間フォグ＋エッジストローク）を Konva Shape で描画
- `glowBlur` (中央値 50) と `glowOpacity` (中央値 1.0) を反映
- 接地シャドウなし、中央透明 `hexToRgba(color, 0)` で芝生のクリアな透過を維持
- デフォルトスケール感（従来の2.0x相当の基準半径）

### Phase 3: コネクタ実装 (`PlayerConnectLines.tsx`)
- 多段フォググラデーション（広域＋中間＋コアライン）を効率的に描画
- `cl.glowBlur ?? 50`, `cl.glowOpacity ?? 1.0` を反映
- マーカー外周トリミングの維持

### Phase 4: HUDコントロール追加
- `src/features/tactical-unified/core/components/hud/player-hud.tsx`:
  - `ring-fade` 選択時に「発光幅 (Blur)」と「透明度 (Opacity)」の調整UIを追加
- `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx`:
  - 「発光幅 (Blur)」と「透明度 (Opacity)」の調整UIを追加

### Phase 5: 検証
- [x] `bun run ai:check`
- [x] 単体テスト・HUDテストの更新と全パス確認

## Worker Handoff Log
- `MarkerStyleSchema` / `ConnectLineSchema` に `glowBlur` (0〜100, default 50) と `glowOpacity` (0〜1, default 1.0) を追加。
- `PlayerMarkerRingFade` / `PlayerConnectLines` にデモ準拠の多重フォグ減衰描画（`perfectDrawEnabled={false}` 最適化付き）を実装。
- `PlayerHud` / `ConnectLineHud` に発光幅 (0〜100) と発光透明度 (0〜100%) のデュアル調整UIを追加。全65テストPASS。
