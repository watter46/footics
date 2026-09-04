---
id: L1-Tactical-030
title: player-marker-options-section.tsx のサブコンポーネント分割 (200行制限準拠)
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/inspector/player-marker-options-section.tsx
---

# L1-Tactical-030: player-marker-options-section.tsx のサブコンポーネント分割 (200行制限準拠)

## UX Impact
UIや操作感の挙動は変えず、インスペクター内の各設定項目を独立モジュール化してレンダリング効率と保守性を向上させる。

## Detailed Spec
1. `src/features/tactical-unified/components/inspector/player-marker-options-section.tsx` (1083行) を各責務ごとに分割。
   - `marker-appearance-section.tsx`: 番号・名前・フォント・基本カラー設定
   - `marker-foot-ring-section.tsx`: 足元リングの色・太さ・グロー設定
   - `marker-spotlight-section.tsx`: スポットライトの高さ・照射半径設定
   - `marker-connector-section.tsx`: 接続線・リンク設定
2. 各分割コンポーネントを200行以内に収め、親コンポーネント `player-marker-options-section.tsx` を合成のみの構成（100行以下）にする。

## Acceptance Criteria & Verification Commands
- [ ] すべての分割コンポーネントが200行以内であること
- [ ] プレイヤーマーカー選択時のインスペクター設定がこれまで通り動作すること

### Verification
`rtk biome check src/features/tactical-unified/components/inspector`
`pnpm type-check:scoped src/features/tactical-unified/components/inspector/player-marker-options-section.tsx`
