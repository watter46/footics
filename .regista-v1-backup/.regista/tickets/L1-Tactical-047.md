---
id: L1-Tactical-047
emoji: 🟢
title: マーカーのドラッグ完了時HUD抑止とクリック選択時のみ表示化
status: DONE
depends_on: []
code_snapshot: "01e9f0d396703b0d1a144d2af921c5742b711a71"
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/player/components/player-marker.tsx
  - src/features/tactical-unified/panels/hud/context-hud.tsx
reference_files:
  - src/features/tactical-unified/objects/player/hooks/player-drag-context.ts
  - src/features/tactical-unified/objects/player/components/player-layer.tsx
---

# 🟢 L1-Tactical-047: マーカーのドラッグ完了時HUD抑止とクリック選択時のみ表示化

## UX Impact
選手マーカーやリングマーカーをドラッグ移動した際、ドラッグ終了時にインタラクタ（HUDや編集ハンドル）が自動表示されなくなり、ボード全体の視認性が保たれる。マーカーをクリックして選択した時のみインタラクタが表示される。

## Detailed Spec
1. player-marker.tsx および context-hud.tsx のドラッグ後ハンドリングを見直し、ドラッグ完了時にHUDが自動表示・アクティブ化される挙動を抑止する。
2. マーカーがクリック（またはタップ）によって明示的に選択された場合のみ context-hud を表示する。
3. ドラッグ移動とクリック選択の誤判定を防ぎ、Playerマーカーとリングマーカーで統一した挙動を実現する。

## Acceptance Criteria
- [x] マーカーをドラッグして離した直後にHUD/インタラクタが勝手にポップアップせず、戦術盤が見やすい状態を維持すること
- [x] マーカーをクリック（タップ）した時は、通常通り選択状態となりHUD/インタラクタが表示されること
- [x] ドラッグ後の盤面視認性が向上すること

## Verification Commands
```bash
pnpm type-check:scoped src/features/tactical-unified/objects/player/components/player-marker.tsx src/features/tactical-unified/panels/hud/context-hud.tsx
rtk biome check src/features/tactical-unified/objects/player/components/player-marker.tsx src/features/tactical-unified/panels/hud/context-hud.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->

### 1. 変更内容サマリー
- `player-marker.tsx`: `isDraggingRef` を導入し、ドラッグ完了直後のクリック/タップ誤発火を抑止。
- `player-drag-context.ts`: ドラッグ開始時の強制的な `selectObject` を撤廃し、ドラッグ操作による意図しない選択状態化を防止。
- `use-player-layer-drag.ts`: ドラッグ完了時（`handleDragEnd`）に `clearSelection()` を実行し、ドラッグ後の盤面でHUDが自動ポップアップするのを抑止。
- `context-hud.test.tsx`: ドラッグ完了時および非選択時のHUD抑止に関するテストケースを追加。

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (18 tests)

### 3. レビュー・引継ぎ特記事項（あれば）
- なし
