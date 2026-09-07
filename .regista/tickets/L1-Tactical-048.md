---
id: L1-Tactical-048
emoji: 🟢
title: 境界線インタラクタ（HUD）のキャンバス左端固定配置
status: DONE
depends_on: []
code_snapshot: "01e9f0d396703b0d1a144d2af921c5742b711a71"
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
reference_files:
  - src/features/tactical-unified/objects/canvas/components/unified-canvas.tsx
  - src/app/test/pitch-aspect/components/pitch-controls.tsx
---

# 🟢 L1-Tactical-048: 境界線インタラクタ（HUD）のキャンバス左端固定配置

## UX Impact
境界線（Boundary Box）のアスペクト比切替や操作用インタラクタが、キャンバスの左側に固定で配置され、ピッチ中央や操作中のオブジェクトを邪魔せず素早くアクセスできるようになる。

## Detailed Spec
1. src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx 内の配置スタイルを調整する。
2. ピッチ枠の追従位置ではなく、キャンバス左端（left固定領域）にアンカー配置する。
3. 他のUIやツールパレットと干渉しないよう適切な余白とz-indexを設定する。

## Acceptance Criteria
- [ ] 境界線インタラクタがキャンバスの左側に固定表示されること
- [ ] アスペクト比やズーム・パンを変更してもインタラクタの位置がピッチ上で暴れず左側に安定して留まること
- [ ] ボタンのクリック・操作が正常に動作すること

## Verification Commands
```bash
pnpm type-check:scoped src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
rtk biome check src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)

### 1. 変更内容サマリー
- `src/features/tactical-unified/panels/toolbar/boundary-box-hud.tsx` を左上端配置（`top-4 left-4`）の**折りたたみ式カプセルUI（Popover dropdown）**に改修。
- 常時は現在の比率（例: `16:9`）とチルト角度（例: `30°`）をコンパクトなカプセルボタンとして表示し、クリック時のみ詳細設定（アスペクト比プリセット、Fitボタン、2.5Dチルトスライダー）をドロップダウン展開するように変更。
- キャンバス上の視界を最大限確保し、外側クリックで自動クローズする仕様に実装。

### 2. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行: `rtk vitest run src/features/tactical-unified/panels/toolbar/__tests__/boundary-box-hud.test.tsx` (PASS 7/7)

### 3. レビュー・引継ぎ特記事項（あれば）
- なし

