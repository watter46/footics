---
id: L1-Tactical-005
title: コンテキストHUDの機能拡充（各オブジェクト頻出操作の直感化）
status: TODO
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
各オブジェクト（選手、矢印、ゾーン、テキスト等）を選択した際に、右パネルを開かなくても頻出操作がその場で完結できるようにする。

## 詳細すり合わせ項目 & 仕様要件
1. **選手（Player / Ring）**:
   - 名前（テキストラベル）の編集または表示/非表示トグル
   - サイズ変更（小/中/大 またはスケール調整）
   - クイックアクション（選手から直接パス矢印/移動矢印を描画開始するトリガー等）
   - 役割/ポジション（GK, CB, MF, FW等）のクイック設定
2. **矢印（Arrow / Pass）**:
   - 線の形状・スタイルの即時切替（直線 / カーブ / 波線 / パス / ドリブル）
   - 始点・終点マーカー（●付き、矢印なし等）の切り替え
   - アニメーションON/OFF
3. **ゾーン（Zone / Polygon / Area）**:
   - 枠線（ボーダー）の有無・色切り替え
   - レイヤー順序操作（最背面へ送る / 最前面へ持ってくる）
4. **テキスト（Text）**:
   - 背景バッジ（黒背景・半透明角丸）のON/OFF
   - テキストのインライン直接編集フォーカス

## Acceptance Criteria & Verification Commands
- [ ] 各オブジェクト選択時に、対応する頻出プロパティがHUD内で直感的に変更できること。
- [ ] 右パネルを開く頻度が大幅に削減されること。
- [ ] HUDの横幅や配置が画面外にはみ出さず、適切な位置に追従すること。

### Verification
`rtk biome check src/components/features/tactical-unified/context-hud.tsx`
`pnpm type-check:scoped src/components/features/tactical-unified/context-hud.tsx`
