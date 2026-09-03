---
id: L1-Tactical-018
title: アスペクト比最適化ピッチ検証ページ作成（レスポンシブ真円描画・ズーム・パン・3Dチルト・境界線フィット）
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/canvas/pitch-background.tsx
  - src/lib/data/formations.ts
  - src/lib/types/tactical-unified.ts
---

# L1-Tactical-018: アスペクト比最適化ピッチ検証ページ作成（レスポンシブ真円描画・ズーム・パン・3Dチルト・境界線フィット）

## UX Impact
`/test/pitch-aspect` にて、16:9 / 9:16 / 4:5 / 1:1 の各比率でピッチを画面いっぱいに表示し、センターサークルの真円を保ったままズーム・パン・奥へのチルト（2.5D遠近感）や境界線フィットを直感的に検証・体験できる。

## Detailed Spec
1. **新規テストページ作成 (`src/app/test/pitch-aspect/page.tsx`)**:
   - 既存コードに影響を与えないスタンドアロン検証用ページとして作成。
2. **ピッチのアスペクト比切り替えタブ**:
   - `16:9` (1920x1080), `9:16` (1080x1920), `4:5` (1080x1350), `1:1` (1080x1080) を選択可能。
   - 選択された比率に応じてピッチ外枠をキャンバス画面いっぱいに広げつつ、センターサークルやペナルティエリアの比率（真円・角度）が歪まないレスポンシブSVG/Canvas描画を行う。
3. **境界線（Boundary Box）アスペクト比切り替え & ピッチフィット機能**:
   - 境界線用のアスペクト比切り替えタブ（`16:9`, `9:16`, `4:5`, `1:1`）。
   - 「ピッチにフィット」ボタンを押すと、現在表示中のピッチ外枠境界に合わせた境界線ボックスを自動計算して表示・フィットさせる。
4. **マウスホイールによるズーム＆ドラッグ移動（Pan）**:
   - ホイール操作で拡大・縮小（0.5x 〜 3.0x）。
   - ドラッグ操作でキャンバス内のピッチをスムーズに平行移動。
5. **奥側に倒すチルト角度スライダー（0°〜35°）**:
   - スライダー（0°〜35°）でピッチを奥側に倒すCSS 3D / Perspective変換（またはKonvaトランスフォーム）を適用し、立体的な見下ろしアングル（2.5D）の視認性を検証可能にする。

## Acceptance Criteria & Verification Commands
- [ ] `/test/pitch-aspect` にアクセスして各アスペクト比タブ（16:9, 9:16, 4:5, 1:1）を切り替えられること。
- [ ] どの比率でもピッチが画面いっぱいに広がり、かつセンターサークルが楕円にならず真円を維持していること。
- [ ] 境界線フィットボタンでピッチに枠が一致すること。
- [ ] マウスホイールでの拡大縮小、ドラッグでの移動が滑らかに動作すること。
- [ ] チルト角度スライダーでピッチを奥側に傾けて表示できること。

### Verification
`rtk biome check src/app/test/pitch-aspect`
`pnpm type-check:scoped src/app/test/pitch-aspect/page.tsx`
