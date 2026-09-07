---
id: L2-HOOK-001
emoji: 🔧
title: プレイヤーとボールのCanvas境界クランプ処理実装
status: DONE
depends_on:
  - L1-TYPE-001

code_snapshot: "d853f4aa03004f667948ae0e90df70ece76423ef"

model: Gemini 3.7 Flash
effort: medium

target_files:
  - src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts
  - src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts

reference_files:
  - src/lib/types/tactical-unified.ts
---

# 🔧 L2-HOOK-001: プレイヤーとボールのCanvas境界クランプ処理実装

## UX Impact
プレイヤーとボールをピッチ外にドラッグ可能になりつつ、Canvas表示枠からは出られない「見えない壁」が機能する

## Detailed Spec
1. `use-player-layer-drag.ts` において、`stageSize` (width/height) を利用し、オブジェクトがCanvasの境界から外に出ないようにクランプする処理を実装する。
2. `use-ball-drag.ts` においても同様に、引数として渡される `stageSize` を使ってCanvas表示枠境界でのクランプ処理を実装する。
3. 従来の 0〜100 への固定クランプ（Math.max(0, Math.min(100, ...))）を廃止し、Stageの境界（0 ~ stageSize.width / height を正規化座標に変換した範囲など）に基づくクランプへ変更する。

## Acceptance Criteria
- [x] プレイヤーとボールがCanvas表示枠の外へドラッグできないこと
- [x] ピッチ外（ベンチ領域等、Canvas内かつピッチ外）への配置は可能であること
- [x] TypeScriptの型エラーが存在しないこと

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts
rtk pnpm type-check:scoped src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `use-player-layer-drag.ts`: `stageSize` (width/height) に基づく `dragBoundFunc` を提供し、`handleDragEnd` において `0 <= x <= stageSize.width` / `0 <= y <= stageSize.height` の範囲でクランプして正規化座標を計算するように修正。また、関数の肥大化を防ぐためゴースト参照部を `usePlayerGhostRefs` へ分離。
- `use-ball-drag.ts`: `stageSize` (width/height) に基づく `dragBoundFunc` を提供し、`handleDragEnd` において `0 <= x <= stageSize.width` / `0 <= y <= stageSize.height` の範囲でクランプして正規化座標を保存するように修正。

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 3. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
