---
id: L1-CANVAS-003
emoji: 🎨
title: ピッチ背景DOM要素化 — PitchBackgroundDom コンポーネント新規作成
status: DONE
depends_on: []

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: "760c0434cb0fa355c91bb9412b239fd512cea025"

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash
effort: medium

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
  - src/features/tactical-unified/objects/pitch/hooks/use-pitch-image.ts
---


# 🎨 L1-CANVAS-003: ピッチ背景DOM要素化 — PitchBackgroundDom コンポーネント新規作成

## UX Impact
ピッチ背景（芝生・白線）のみを CSS 3D で傾斜させ、選手マーカー・ボール・アノテーションは正対 2D のまま表示できるようになる。Hit Test 破綻と選手楕円化が根本解消される。

## Detailed Spec
1. `pitch-background-dom.tsx` を新規作成し、以下の `PitchBackgroundDom` コンポーネントを実装する:
   - Props: `{ width: number; height: number; tilt: number; perspective?: number; panX: number; panY: number; zoom: number; className?: string }`
   - DOM 要素（`<div>` + `<img>` or `<canvas>`）で `background.svg` の芝生・白線をレンダリングする
   - コンポーネント内の outerDiv に `transform: rotateX(${tilt}deg)` / `perspective: ${perspective}px` / `transformOrigin: '50% 50%'` を CSS として適用する
   - `use-pitch-image.ts` の `pitchImg` (HTMLImageElement) を `<img src={pitchImg.src}>` として DOM に埋め込む（または CSS `background-image` として設定する）
   - Pan/Zoom は `transform: translate3d(${panX}px, ${panY}px, 0) scale(${zoom}) rotateX(${tilt}deg)` の合成で表現する
2. Konva Layer ではなく純粋な DOM 要素として実装すること（Konva 依存なし）
3. absolute 配置で Konva Stage と重ね合わせできるよう `position: 'absolute'`, `inset: 0` をデフォルトとする
4. `tilt === 0` の場合は rotateX 変換を省略し、通常の 2D 表示とする

## Acceptance Criteria
- [ ] `PitchBackgroundDom` コンポーネントが正常にビルドできること
- [ ] tilt > 0 時に DOM 要素に CSS 3D transform が適用されること
- [ ] Konva 依存がないこと
- [ ] Biome / TypeCheck PASS

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx
rtk biome check src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- CSS 3D transform (perspective / rotateX / pan / zoom) に対応した DOM ベースのピッチ背景コンポーネント `PitchBackgroundDom` を新規作成

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/objects/pitch/components/pitch-background-dom.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [ ] テスト実行（対象テストがある場合）: PASS

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
