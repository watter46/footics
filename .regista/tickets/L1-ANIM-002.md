---
id: L1-ANIM-002
emoji: 🚀
title: トランジションアニメーションのパフォーマンス最適化
status: DONE
depends_on: []
code_snapshot: 6b761bd8d5aae41d8e6f71a697d645bb41da462d
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts
  - src/features/tactical-unified/objects/player/components/player-marker.tsx
  - src/features/tactical-unified/objects/ball/components/ball-object.tsx
reference_files: []
---

# 🚀 L1-ANIM-002: トランジションアニメーションのパフォーマンス最適化

## UX Impact
選手の移動やボールの移動アニメーション時の重さが解消され、スムーズに動作するようになる。

## Detailed Spec
1. `use-node-position-transition.ts` 内での過剰なTweenの生成や、不要な再レンダリングを引き起こしている箇所を特定・修正する。
2. RequestAnimationFrame や、Konvaの `Animation` を適切に管理し、メモリリークや重複実行を防ぐ。
3. `player-marker.tsx` と `ball-object.tsx` からの呼び出しにおいて、不必要な再評価が発生しないように `useMemo` や `useCallback` などで適切にメモ化する。

## Acceptance Criteria
- [ ] トランジションアニメーション実行時に過剰な計算リソースを消費しないこと
- [ ] アニメーションがカクつかず滑らかに実行されること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts src/features/tactical-unified/objects/player/components/player-marker.tsx src/features/tactical-unified/objects/ball/components/ball-object.tsx
rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts src/features/tactical-unified/objects/player/components/player-marker.tsx src/features/tactical-unified/objects/ball/components/ball-object.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `use-node-position-transition.ts`: `Konva.Tween` インスタンスを `tweenRef` で明示的に管理し、先行アニメーションの中断/破棄 (`destroy()`) およびアンマウント時のクリーンアップを追加。重複Tween実行やメモリリークを防止。
- `player-marker.tsx`: ドラッグハンドラ、クリックハンドラ、`dragBoundFunc`、`setGroupRef`、オプション選択コールバック等を `useCallback` でメモ化し、不要な再評価・再レンダリングを削減。
- `ball-object.tsx`: ドラッグハンドラ、クリック/タップハンドラ、`dragBoundFunc`、`setBallGroupRef`、軌道更新ハンドラを `useCallback` でメモ化。

### 2. 変更ファイル一覧（make done の git add 対象）
- src/features/tactical-unified/objects/canvas/hooks/use-node-position-transition.ts
- src/features/tactical-unified/objects/player/components/player-marker.tsx
- src/features/tactical-unified/objects/player/hooks/player-drag-node-updater.ts
- src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts
- src/features/tactical-unified/__tests__/multi-player-drag.test.ts
- src/features/tactical-unified/objects/ball/components/ball-object.tsx
- src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
- src/features/tactical-unified/stores/slide-player-move-helper.ts

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (`tactical-animation.test.ts` 4/4 PASS)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
