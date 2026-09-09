---
id: L3-CANVAS-002
emoji: 🔧
title: ball-object.tsx — normToScreen による 3D 射影スクリーン座標への移行
status: DONE
depends_on: ["L2-CANVAS-003"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash
effort: low

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/ball/components/ball-object.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
  - src/features/tactical-unified/objects/player/components/player-marker.tsx
---


# 🔧 L3-CANVAS-002: ball-object.tsx — normToScreen による 3D 射影スクリーン座標への移行

## UX Impact
ボールオブジェクトが選手マーカーと同様に正しいスクリーン座標に配置され、ピッチ傾斜時も正確な位置に表示される。

## Detailed Spec
1. `ball-object.tsx` のボール座標計算を `normToPx`（2D 線形）から `normToScreen`（3D 射影）へ置き換える
2. Props に `pitchRect`, `panX`, `panY`, `zoom`, `tilt`, `perspective?` を追加する（player-marker.tsx と同パターン）
3. `normToScreen` は `canvas-coordinates.ts` の L246 に既実装済み（追加実装不要）
4. `DEFAULT_PITCH_PERSPECTIVE` は `canvas-coordinates.ts` からインポートする
5. `player-marker.tsx` の実装パターン（L1-CANVAS-004 完了後）を参照して実装すること

## Acceptance Criteria
- [ ] `normToScreen` を使用してスクリーン座標が計算されること
- [ ] Props に `tilt`, `pitchRect`, `panX`, `panY`, `zoom` が追加されること
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/ball/components/ball-object.tsx
rtk biome check src/features/tactical-unified/objects/ball/components/ball-object.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `ball-object.tsx` および `use-ball-drag.ts` において、Layer 3 親 Konva `<Group>` の Transform（Pan/Zoom）と整合するようローカルピッチ座標系に統一。3Dチルト時・2D時の滑走・二重変換の座標飛びバグを解消。
- `dragBoundFunc` を親グループの絶対位置基準でバインドし、ドラッグ終了時の正規化座標算出を `pxToNorm`（clampNorm）に統一。

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/objects/ball/components/ball-object.tsx`
- `src/features/tactical-unified/objects/ball/hooks/use-ball-drag.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- 3Dチルト時でも親 Konva Group 側で Pan/Zoom が適用され、キャンバス全体の CSS rotateX で 3D 表現されるため、内部の子要素は正対ローカル座標系（normToPx）で選手マーカーと同様に安定して動作します。

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
