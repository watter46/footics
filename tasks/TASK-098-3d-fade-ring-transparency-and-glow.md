# TASK-098: 3D Fade Ring マーカーの透明度改善 & 発光幅（グロウ強度）調整HUD

## 状態
- [x] 完了

## 概要
- 実装した 3D Fade Ring (`markerType: 'ring-fade'`) をリファレンス画像（`3d-marker.jpg`）に近づけるため、中央の黒ずみ・芝生の濁り（接地シャドウ & 黒混じりグラデーション）を完全除去し、100% 透過にする。
- マーカー外周の発光幅（グロウ強度）を調整可能にするため、`MarkerStyleSchema` に `glowBlur` を追加し、`PlayerHud` に発光幅調整コントロールを追加する。
- 外周から芝生側へ自然に光が滲み出る多重ブラー（フォググロウ）を Konva 描画に適用する。

## 実装計画

### Phase 1: スキーマ・型定義の拡張
- [x] 1. `src/lib/types/tactical-unified.ts`: `MarkerStyleSchema` に `glowBlur: z.number().min(0).max(40).default(16).optional()` を追加
- [x] 2. スキーマテスト更新

### Phase 2: 3D Fade Ring コンポーネントの透明度 & グロウ改善
- [x] 1. `src/features/tactical-unified/objects/player/components/player-marker-ring-fade.tsx`:
  - 接地シャドウ（黒楕円 `fill="rgba(0, 0, 0, 0.4)"`）を完全削除
  - ラジアルグラデーションの中央透明色を `rgba(0, 0, 0, 0)` から対象カラーの `rgba(..., 0)` に変更し、黒ずみを根絶
  - `player.style?.glowBlur ?? 16` を参照し、外周エッジストロークの `shadowBlur` に適用
  - 外側への光の滲み出し層（ソフトグロウ楕円）を追加

### Phase 3: PlayerHud に発光幅調整コントロール追加
- [x] 1. `src/features/tactical-unified/core/components/hud/player-hud.tsx`:
  - `isRing`（または `markerType === 'ring-fade'`）の判定を適切に行い、`glowBlur` の `Minus` / `Plus` 調整ボタンを追加
  - 行数上限対策として `PlayerInfoPopover` を `player-info-popover.tsx` に分離
- [x] 2. テストの更新

### Phase 4: 検証
- [x] 1. `bun run ai:check` 全パス確認

## Worker Handoff Log
- `MarkerStyleSchema.glowBlur` (0〜40, default 16) を追加。
- `PlayerMarkerRingFade` から接地シャドウを撤廃し、中央透明色を `hexToRgba(color, 0)` 化して黒ずみを解消。外周ストロークとソフトフォグ層に `glowBlur` を適用。
- `PlayerHud` に発光幅（`glowBlur` 4〜36px）増減ボタンを追加し、ポップオーバーを `PlayerInfoPopover` に分離。
