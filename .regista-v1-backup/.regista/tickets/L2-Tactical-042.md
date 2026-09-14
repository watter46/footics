---
id: L2-Tactical-042
emoji: 📐
title: ツールバーと境界線HUDの配置レイアウト最適化
status: DONE
depends_on: []
model: Gemini 3.7 Flash
effort: low
context_files:
  - src/features/tactical-unified/components/toolbar/drawing-toolbar.tsx
  - src/features/tactical-unified/components/toolbar/boundary-box-hud.tsx
---

# 📐 L2-Tactical-042: ツールバーと境界線HUDの配置レイアウト最適化

## UX Impact
縦長ピッチ（4:5等）でもツールバーやエクスポート枠HUDがピッチ（戦術エリア）に被らなくなり、操作性が向上する。アスペクト比切替時もUI配置がブレず視認性が上がる。

## Detailed Spec
1. `src/features/tactical-unified/components/toolbar/drawing-toolbar.tsx`: ピッチのアスペクト比状態 (`useTacticalUnifiedStore((s) => s.project.aspectRatio)`) を監視し、**16:9 の場合は左サイド (`left-4`)**、**16:9 以外（4:5など）の場合は右サイド (`right-4`)** へ描画ツールバーの初期位置を動的に切り替える。位置は縦中央 (`top-1/2 -translate-y-1/2`) とする。
2. `src/features/tactical-unified/components/toolbar/drawing-toolbar.tsx`: ツールバー内のアイコン並びを縦方向（`flex-col`）に変更し、レイアウト・余白を調整する。
3. `src/features/tactical-unified/components/toolbar/boundary-box-hud.tsx`: 境界線ボックスHUD（アスペクト比切替）の境界線追従ロジック（`top` / `left` 計算）を廃止し、キャンバス画面上部（ツールバーと被らない位置）の固定配置に変更する。

## Acceptance Criteria & Verification Commands
- [x] ピッチが16:9の場合は描画ツールバーが画面左端に縦向きで配置されること
- [x] ピッチが16:9以外（4:5等）の場合は描画ツールバーが画面右端（RightPanelの左隣）に縦向きで配置されること
- [x] 境界線HUDが画面上部に固定配置され、境界線ボックスの移動時に追従して動かないこと
- [x] ピッチのアスペクト比を変更しても、ツールバーやHUDが意図せずピッチエリアに重ならないこと

### Verification
`rtk biome check src/features/tactical-unified/components/toolbar/`
`pnpm type-check:scoped src/features/tactical-unified/components/toolbar/drawing-toolbar.tsx`
`pnpm type-check:scoped src/features/tactical-unified/components/toolbar/boundary-box-hud.tsx`
