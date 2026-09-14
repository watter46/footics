---
id: L1-Tactical-051
emoji: 🐛
title: ピッチ外クリック・ドラッグ時のピッチ移動誤作動の修正
status: DONE
depends_on: []
code_snapshot: 75ed3d88a4734dbfb343c8c91beb3ad238fb42de
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
reference_files:
  - src/features/tactical-unified/objects/canvas/hooks/use-canvas-pitch-pan.ts
  - src/features/tactical-unified/objects/canvas/helpers/canvas-coordinates.ts
---

# 🐛 L1-Tactical-051: ピッチ外クリック・ドラッグ時のピッチ移動誤作動の修正

## UX Impact
選択ツール使用時にピッチ外の余白エリアをクリック・ドラッグしてもピッチが掴まれて動いてしまうことがなくなり、ピッチ上（パンやズームされた状態であっても）をクリックした時のみピッチ移動が行われるようになる。

## Detailed Spec
1. 現状の問題点: `use-canvas-pointer-dispatcher.ts` の `handlePointerDown` において、`isInsidePitch` が Stage座標系の `pos` と、初期配置のピッチ矩形 `effectivePitch` で直接比較されている。そのため、ピッチがパン（移動）やズームされている場合、実際のピッチ表示位置と判定領域がずれ、ピッチ外をクリックしてもピッチが移動したり、ピッチ内をクリックしても移動しなかったりする誤作動が発生している。
2. 修正方針: L1-TACTICAL-001で整備された純粋座標変換ヘルパー `getPitchAndNormPos` （または `screenToPitch`）を活用する。`pos` をピッチのローカル座標系に変換した上で、`0 <= pitchPos.x <= effectivePitch.width`, `0 <= pitchPos.y <= effectivePitch.height` に収まっているかで `isInsidePitch` を判定する。この変換には `zoomPan.pitchTransformRef.current` を渡すこと。これにより、パン・ズーム・スケール変更後でも常に正確にピッチ内外を判定できるようになる。
3. `use-canvas-pitch-pan.ts` 側への影響: 既に `isInsidePitch` を受け取って条件判定する構造になっているため、ディスパッチャー側の判定修正のみで適切に動作するはずである。（スペースキー押下時はピッチ外でもパン可能という仕様も維持される）

## Acceptance Criteria
- [ ] 選択ツール時、ピッチがパン・ズームされた状態でも、ピッチ外枠の外側をクリック・ドラッグしてピッチが移動（パン）しないこと
- [ ] 選択ツール時、ピッチがパン・ズームされた状態でも、ピッチ外枠の内側をクリック・ドラッグした場合は従来通りピッチが移動すること
- [ ] スペースキー押下中のパン操作はピッチ外でも正常に動作すること

## Verification Commands
```bash
rtk vitest run src/features/tactical-unified/
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
rtk biome check src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `use-canvas-pointer-dispatcher.ts` の `isInsidePitch` 判定を、`getPitchAndNormPos` によるローカル座標変換後の `pitchPos`（`0 <= pitchPos.x <= effectivePitch.width` かつ `0 <= pitchPos.y <= effectivePitch.height`）で行うよう修正。ズーム・パン後でもピッチ外クリック時に不要なピッチ移動が発生しないようにした。

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- src/features/tactical-unified/objects/canvas/hooks/use-canvas-pointer-dispatcher.ts

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (230 passed)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
