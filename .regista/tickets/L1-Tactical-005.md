---
id: L1-Tactical-005
title: コンテキストHUDの機能拡充（各オブジェクト頻出操作の直感化）
status: DONE
depends_on:
  - L1-Tactical-002
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/components/features/tactical-unified/context-hud.tsx
  - src/components/features/tactical-unified/inspector/inspector-panel.tsx
---

# L1-Tactical-005: コンテキストHUDの機能拡充（各オブジェクト頻出操作の直感化）

## UX Impact
各オブジェクト（選手、矢印、ゾーン、テキスト等）を選択した際に、右パネルを開かなくても頻出操作がその場で完結できるようにし、ダブルクリックで詳細インスペクターを開閉できるようにする。また文字のつぶれを解消し、ツールバーに波線矢印を追加する。

## すり合わせ済み詳細仕様要件
1. **共通カラーパレット (ColorPalette)**:
   - `#034694`（チェルシーブルー）および `#000000`（ブラック）の2色を追加。
2. **インスペクター開閉**:
   - HUD右端のインスペクターアイコン（スライダー）は廃止。
   - 各オブジェクトのダブルクリックで右インスペクターパネルを開く。
3. **選手 (Player)**:
   - マーカーオプション（実線矢印、点線矢印、Connect、Vision、Focus）をHUD上に配置。
   - スケール（サイズ変更）をHUD上に配置。
   - 既存HUDにあった機能（背番号、メインカラー、リングカラー、サークル/リング切替、削除）を右パネル（PlayerInspector）にも配置。
4. **リング (RingMarker)**:
   - メインカラーのみ表示（枠線色は省略）。
   - マーカーオプション（実線矢印、点線矢印、Connect、Vision、Focus）をHUD上に配置。
   - スケール（サイズ変更）をHUD上に配置。
   - 削除ボタンを配置。
5. **矢印・ライン系 & ツールバー**:
   - HUD: 既存（実線/点線、太さ、色、削除）を維持。
   - ツールバー: 点線矢印の右に「波線矢印（実線）」の新規アイコン・ツールを追加。
6. **ゾーン (Zone)**:
   - 既存HUD（色、不透明度、削除）を維持。
7. **テキスト (Text)**:
   - 既存HUD（文字サイズ、色、削除）を維持。
   - 文字つぶれの修正（Konvaの `fillAfterStrokeEnabled` 適用、Edge/Chromium対応のフォント・レンダリング最適化）。

## Acceptance Criteria & Verification Commands
- [ ] カラーパレットに `#034694` と `#000000` が表示され選択できること。
- [ ] オブジェクトをダブルクリックすると右インスペクターパネルが開くこと。
- [ ] PlayerおよびRing選択時に、HUD上でマーカーオプションとスケール変更ができること。
- [ ] 右インスペクターパネル（Player）にも背番号や色、形状切替が配置されていること。
- [ ] ツールバーの点線矢印の右に波線矢印アイコンが追加され、実線の波線矢印が描画できること。
- [ ] ピッチ上のテキストがEdgeを含むブラウザでつぶれずにくっきりと表示されること。

### Verification
`rtk biome check src/components/features/tactical-unified/context-hud.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/context-hud.tsx`

