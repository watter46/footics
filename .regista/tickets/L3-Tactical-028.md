---
status: DONE
id: L3-Tactical-028
emoji: 🔵
title: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合【アーキテクチャ適用完了後に着手】
depends_on: ["L2-Arch-015"]
model: Claude Sonnet 4.6 (thinking)
effort: high
context_files:
  - src/features/tactical-unified/objects/pitch/components/pitch-background.tsx
  - src/features/tactical-unified/hooks/use-konva-export.ts
  - src/features/tactical-unified/panels/toolbar/boundary-box-tilt-controls.tsx
---
status: DONE

# 🔵 L3-Tactical-028: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合

> ⚠️ **このチケットは最低優先度です。L2-Arch-015（アーキテクチャ適用完了）が全てDONEになるまで着手しないこと。**

## UX Impact
ピッチを2.5D的に傾けた状態で境界線が固定されたPNG画像としてエクスポートできるようになり、戦術図としての表現力が向上する。

## Detailed Spec
※ 新アーキテクチャ（objects/canvas/, objects/pitch/, panels/ 等）適用完了後、新しいパス構造を前提に実装すること。

1. **チルト変形ロジック**: ピッチオブジェクトに対してY軸方向の傾きパラメーター（tilt angle）を導入し、Konva の Skew または Matrix transform で疑似2.5D表示を実現する。
2. **境界線固定**: チルト適用後でも境界ボックス（BoundaryBox）の位置がピッチの視覚的端点に追従するよう、変換後座標を計算して固定する。
3. **エクスポート統合**: `use-konva-export.ts` がチルト変形を考慮したステージ全体のPNGを正しく出力できるよう、`canvas-pitch-transform-helper.ts` を拡張する。
4. **UIコントロール**: `boundary-box-tilt-controls.tsx` にチルト角度スライダーを追加し、リアルタイムプレビューを可能にする。
5. 関連テストを `src/features/tactical-unified/components/__tests__/` から新アーキテクチャのパスへ移動し、テストが全てパスすることを確認する。

## Acceptance Criteria & Verification Commands
- [ ] ピッチがチルト角度に応じて2.5D的に傾いて表示される
- [ ] チルト状態でエクスポートした PNG の境界が正しく固定されている
- [ ] `boundary-box-tilt-controls.tsx` のスライダーでリアルタイムに角度が変わる
- [ ] 既存テストが全てパスする

### Verification
`rtk biome check src/features/tactical-unified/objects/pitch/`
`rtk pnpm type-check:scoped src/features/tactical-unified/hooks/use-konva-export.ts`
`rtk vitest run src/features/tactical-unified/`
