---
id: L1-CANVAS-004
emoji: 🔧
title: player-marker.tsx — normToScreen による 3D 射影座標への移行
status: DONE
depends_on: []

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash
effort: medium

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/player/components/player-marker.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/player/components/player-layer.tsx
---


# 🔧 L1-CANVAS-004: player-marker.tsx — normToScreen による 3D 射影座標への移行

## UX Impact
ピッチが CSS 3D で傾いていても、選手マーカーが正しいスクリーン座標に配置される。選手は真円のまま・テキストは水平のままで、接地点（足元）がピッチ上の正確な位置に対応する。

## Detailed Spec
1. `player-marker.tsx` の `pxX / pxY` 計算（現在 `normToPx` 2D 線形）を `normToScreen` 3D 射影へ置き換える:
   ```ts
   // Before
   const pxX = normToPx(player.x, width);
   const pxY = normToPx(player.y, height);
   
   // After
   import { normToScreen } from '../../../canvas/helpers/canvas-coordinates';
   const { x: pxX, y: pxY } = normToScreen(
     { x: player.x, y: player.y },
     pitchRect,      // effectivePitchSize から構築
     panX, panY, zoom, tilt,
     perspective ?? DEFAULT_PITCH_PERSPECTIVE
   );
   ```
2. `player-marker.tsx` が受け取る Props に `pitchRect`, `panX`, `panY`, `zoom`, `tilt`, `perspective?` を追加する
3. `normToScreen` は `canvas-coordinates.ts` の L246 に既実装済み（追加実装不要）
4. `DEFAULT_PITCH_PERSPECTIVE` は `canvas-coordinates.ts` からインポートする
5. `useNodePositionTransition` の `x/y` に計算済みスクリーン座標を渡す

## Acceptance Criteria
- [ ] Props に `tilt`, `pitchRect`, `panX`, `panY`, `zoom` が追加されること
- [ ] `normToScreen` を使用してスクリーン座標が計算されること
- [ ] `normToPx` 依存が残らないこと（他の計算に使用している場合は除く）
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/components/player-marker.tsx
rtk biome check src/features/tactical-unified/objects/player/components/player-marker.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `player-marker.tsx` の Props に `pitchRect`, `panX`, `panY`, `zoom`, `tilt`, `perspective` を追加
- 選手座標の計算を `normToPx` から `normToScreen` 3D 射影計算へと置き換え
- `useNodePositionTransition` に計算後の 3D スクリーン座標を渡すように更新

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/objects/player/components/player-marker.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [ ] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- 後続チケット `L2-CANVAS-004` (`player-layer.tsx`) にて、親レイヤーから `PlayerMarker` へ `pitchRect`, `panX`, `panY`, `zoom`, `tilt` を伝播すること

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
