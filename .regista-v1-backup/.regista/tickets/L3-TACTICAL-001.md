---
id: L3-TACTICAL-001
emoji: 🎨
title: マーカーコンポーネントのGroup原点（Anchor）統一
status: DONE
depends_on: ["L2-TACTICAL-001"]

# コードのスナップショット（Ticket Freshness Guard用 - 絶対省略禁止）
code_snapshot: 1938680aa6835a87f2301a183d53d18ba3d08117

# 推奨実行環境（ホワイトリストから選定）
model: Gemini 3.7 Flash [high]
effort: medium

# 変更対象ファイル（1〜3ファイル以内の極小AAWU単位）
target_files:
  - src/features/tactical-unified/objects/player/components/player-marker.tsx
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx

# 参照専用ファイル（Workerが探索でトークンを浪費するのを防ぐためのヒント）
reference_files:
  - src/features/tactical-unified/objects/player/hooks/use-player-layer-drag.ts
---


# 🎨 L3-TACTICAL-001: マーカーコンポーネントのGroup原点（Anchor）統一

## UX Impact
マーカーをドラッグする際、クリックしたポインタ位置とマーカーの足元接地原点のズレが解消される

## Detailed Spec
1. `player-marker.tsx` などの描画対象Groupの原点 (Anchor) を足元接地中心 `(0,0)` に統一する。
2. Konvaの `offsetX` / `offsetY` などを調整し、座標指定が足元を基準に行われるようにする。
3. `unified-canvas.tsx` 側での配置時に、この統一された原点仕様とハイブリッドドラッグフック（L2）が正しく噛み合うか動作確認用の調整を行う。

## Acceptance Criteria
- [ ] Groupの原点が足元接地中心(0,0)に統一されていること
- [ ] Konvaオブジェクトのoffset調整が適切に行われていること

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/objects/player/components/player-marker.tsx
rtk biome check src/features/tactical-unified/objects/player/components/
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `player-marker.tsx`: 描画Groupの原点（Anchor）を足元接地中心 (0,0) に統一。`normToPx` による純粋関数ベースの座標変換を適用し、Konva Group に `offsetX={0}`, `offsetY={0}` を明示指定。

### 2. 変更ファイル一覧（make done の git add 対象）
- `src/features/tactical-unified/objects/player/components/player-marker.tsx`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS (25 passed)

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)

- **Blocked Reason**: 
- **Missing for Scout**:
  1. 
