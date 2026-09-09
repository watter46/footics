---
id: L2-CANVAS-004
emoji: 🔗
title: player-layer.tsx — pitchTransform と tilt を PlayerMarker へ伝播
status: DONE
depends_on: ["L1-CANVAS-004"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash
effort: low

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/player/components/player-layer.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/player/components/player-marker.tsx
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
---


# 🔗 L2-CANVAS-004: player-layer.tsx — pitchTransform と tilt を PlayerMarker へ伝播

## UX Impact
選手レイヤーが tilt / pan / zoom に応じて正しいスクリーン座標に選手を配置できるようになる（L1-CANVAS-004 の前提条件）。

## Detailed Spec
1. `player-layer.tsx` の Props に `tilt: number`, `panX: number`, `panY: number`, `zoom: number`, `pitchRect: Rect` を追加する
2. `PlayerMarker` コンポーネントへの Props 渡しを拡張し、上記を伝播する:
   ```tsx
   <PlayerMarker
     key={player.id}
     player={player}
     pitchRect={pitchRect}
     panX={panX}
     panY={panY}
     zoom={zoom}
     tilt={tilt}
     // ... existing props
   />
   ```
3. `player-layer.tsx` の呼び出し元 (`unified-canvas.tsx`) に対して必要な Props 増加を確認し、write-back にその旨を記載する（unified-canvas.tsx の変更は L2-CANVAS-003 に委ねる）
4. `DEFAULT_PITCH_PERSPECTIVE` のインポートは `player-marker.tsx` 側で行うため、このチケットでは不要

## Acceptance Criteria
- [ ] `PlayerLayer` の Props に `tilt`, `panX`, `panY`, `zoom`, `pitchRect` が追加されること
- [ ] `PlayerMarker` に上記 Props が伝播されること
- [ ] TypeCheck PASS（PlayerMarker の Props 型と一致していること）
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/components/player-layer.tsx
rtk biome check src/features/tactical-unified/objects/player/components/player-layer.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `src/features/tactical-unified/objects/player/components/player-layer.tsx` の `PlayerLayerProps` に `tilt`, `panX`, `panY`, `zoom`, `pitchRect` を追加
- `PlayerLayer` から `PlayerMarker` コンポーネントへの Props 渡しに `pitchRect`, `panX`, `panY`, `zoom`, `tilt` を追加・伝播

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/player/components/player-layer.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- `player-layer.tsx` への Props 渡し（呼び出し元 `unified-canvas.tsx` からの `tilt`, `panX`, `panY`, `zoom`, `pitchRect` の伝播）は後続チケット `L2-CANVAS-003` にて実施されます。

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
