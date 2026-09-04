---
id: L3-Tactical-028
title: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合
status: TODO
depends_on: ["L2-Tactical-026"]
model: Gemini 3.8 Flash
effort: high
context_files:
  - src/components/features/tactical-unified/canvas/unified-canvas.tsx
  - src/components/features/tactical-unified/hooks/use-konva-export.ts
  - src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx
---

# L3-Tactical-028: ピッチ単体チルト(2.5D)変形と境界線固定エクスポート(PNG)の統合

## UX Impact
境界線枠は正対したまま、ピッチのみを奥側へ傾けた立体感あるチルト表示（0°〜60°）が可能になり、PNG出力時も境界線枠で切り取られた高品質な2.5Dピッチ画像がそのまま保存・コピーされます。

## Detailed Spec
1. `src/components/features/tactical-unified/canvas/unified-canvas.tsx`:
   - ピッチ用コンテナに CSS `perspective` & `rotateX`（または Konva 3D パースペクティブプロジェクション）を適用。
   - 境界線（BoundaryBox）はチルト回転の外側（スクリーン平面）に固定配置。
2. `src/components/features/tactical-unified/toolbar/boundary-box-hud.tsx`:
   - チルト角度調整スライダーまたはワンクリック角度切替（0° / 25° / 45°）UIの提供。
3. `src/components/features/tactical-unified/hooks/use-konva-export.ts`:
   - 境界線で定義された矩形範囲をそのままチルト状態を保持してクロップ・エクスポートする出力パイプラインを保証。

## Acceptance Criteria & Verification Commands
- [ ] チルト角度を変更した際、境界線は傾かずピッチのみが立体的に奥へ傾くこと
- [ ] PNGコピーおよびダウンロード時、傾いたピッチが境界線枠の比率通りにキャプチャされること

### Verification
`rtk biome check src/components/features/tactical-unified/hooks/use-konva-export.ts`
`pnpm type-check:scoped src/components/features/tactical-unified/hooks/use-konva-export.ts`
