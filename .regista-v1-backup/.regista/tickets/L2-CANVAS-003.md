---
id: L2-CANVAS-003
emoji: 🐛
title: unified-canvas + BoundaryBox — 黒背景遮蔽・境界線非表示バグ修正
status: DONE
depends_on: []

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: "f51caaf99dcc76767d2a3e6bfba417e6081799d6"

# 推奨実行環境（ホワイトリストから選定）
model: Claude Sonnet 4.6 (thinking)
effort: high

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/features/tactical-unified/objects/canvas/components/boundary-box.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx
---


# 🐛 L2-CANVAS-003: unified-canvas + BoundaryBox — 黒背景遮蔽・境界線非表示バグ修正

## Scout調査結果（根本原因）
Scout cache: `.regista/scout-cache/canvas-3d-pitch-debug-f51caaf9.json`

**Bug 1 (最重要)**: `unified-canvas.tsx` の Konva Stage Layer 1 に不透明な黒色 Rect が残存している。
- L2-CANVAS-003 の初回実装でピッチ背景を DOM レイヤー（PitchBackgroundDom）に移行したが、
  Konva Stage の Layer 1 に `<Rect fill="#020617" width={stageSize.width} height={stageSize.height} />` を残した
- この Rect が Stage (zIndex: 10) を完全に不透明な黒キャンバスにし、背後の PitchBackgroundDom を 100% 遮蔽している
- 結果: 2D/3D ともにピッチが表示されず背景が真っ黒になる

**Bug 2**: `boundary-box.tsx` のルート div に z-index が未指定 (auto)。
- Konva Stage が zIndex: 10 を持つのに対し、BoundaryBox ラッパー div は z-index: auto
- CSS Stacking Context のルールにより Stage 背面に潜り込み、黒 Rect に隠されて完全非表示になる

## UX Impact
2D/3D ともにピッチが表示され、選手マーカーの背後にグリーンのフィールドが見えるようになる。3D モード時は CSS perspective による傾き表現が視覚的に確認できるようになる。BoundaryBox（クロップツール）も正常に画面前面で操作できるようになる。

## Detailed Spec

### Fix 1: unified-canvas.tsx — Layer 1 の黒 Rect 削除

Layer 1 (`backgroundLayer`) から画面全域を塗りつぶす黒 Rect を削除し、Layer を空にする。

**修正前（削除対象）:**
```tsx
<Layer listening={false} ref={backgroundLayer}>
  <Rect
    x={0}
    y={0}
    width={stageSize.width}
    height={stageSize.height}
    fill="#020617"
    listening={false}
  />
</Layer>
```

**修正後:**
```tsx
<Layer listening={false} ref={backgroundLayer} />
```

- `backgroundLayer` ref は他の箇所で参照されている可能性があるため `ref={backgroundLayer}` は維持すること
- `Rect` import は他の Layer でも使用されている可能性がある。使用箇所を確認し、他に使われていなければ import を削除する

### Fix 2: unified-canvas.tsx — PitchBackgroundDom に zIndex: 0 を明示

DOM 重なり順（PitchBackgroundDom [z-0] < Stage [z-10] < BoundaryBox [z-20]）を確定させる。

**修正対象:** `<PitchBackgroundDom ... />` の props に `style={{ zIndex: 0 }}` を追加（または既存の style prop にマージ）

### Fix 3: boundary-box.tsx — ルート div に zIndex: 20 を設定

**修正対象:** `boundary-box.tsx` のルート `<div>` の style に `zIndex: 20` を追加する。
- Konva Stage (zIndex: 10) より前面、HUD 系要素 (z-40 相当) より背面に配置
- `position: absolute` が設定されていることを確認（zIndex はポジション指定が必要）

## DOM 重なり順（修正後の期待値）
```
PitchBackgroundDom  [position: absolute, zIndex: 0]   ← ピッチ背景（DOM）
Konva Stage         [position: absolute, zIndex: 10]  ← 選手・ボール・アノテーション（透明Background）
BoundaryBox         [position: absolute, zIndex: 20]  ← 境界線・リサイズハンドル
HUD / Controls      [z-40 以上]                       ← UI コントロール類
```

## Acceptance Criteria
- [ ] 2D モード（tilt=0）でピッチ（グリーンフィールド）が表示されること（手動確認）
- [ ] 3D モード（tilt>0）でピッチが傾いて表示されること（手動確認）
- [ ] 選手・ボールが 2D/3D ともに通常通り操作できること（手動確認）
- [ ] BoundaryBox（クロップツール）が Stage 前面に表示・操作できること（手動確認）
- [ ] Konva Stage の Layer 1 に黒 Rect が存在しないこと（コード確認）
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
rtk biome check src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
rtk pnpm type-check:scoped src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
rtk biome check src/features/tactical-unified/objects/canvas/components/boundary-box.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- unified-canvas.tsx: Layer 1 (backgroundLayer) から黒 Rect (`fill="#020617"`) を削除し空 Layer にした。Rect の react-konva import も削除
- unified-canvas.tsx: PitchBackgroundDom に `style={{ zIndex: 0 }}` を追加（DOM重なり順を確定）
- boundary-box.tsx: ルート div の style に `zIndex: 20` を追加し Konva Stage (z-10) 前面に配置
- pitch-background-dom.tsx: `style?: CSSProperties` prop を追加し containerStyle にマージ対応（type-safe）

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx`
- `src/features/tactical-unified/objects/canvas/components/boundary-box.tsx`
- `src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス（unified-canvas.tsx, boundary-box.tsx とも No errors found）
- [x] `rtk biome check` パス（unified-canvas.tsx, boundary-box.tsx とも exit code 0）
- [ ] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- pitch-background-dom.tsx は reference_files 指定だったが、style prop が存在せず型エラーになるため最小変更（props追加＋containerStyleマージ）を実施（Level 2 自律解決）

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
