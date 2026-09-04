---
id: L1-Tactical-102
emoji: 🎨
title: ZoneObjectコンポーネントの分割とKonvaルールの適用
status: DONE
depends_on: []
model: Gemini 3.8 Flash
effort: medium
context_files:
  - src/features/tactical-unified/components/canvas/annotations/zone-object.tsx
---

# 🎨 L1-Tactical-102: ZoneObjectコンポーネントの分割とKonvaルールの適用

## UX Impact
描画パフォーマンスが最適化され、今後のアノテーション描画の拡張が容易になります（見た目上の変化はありません）。

## Detailed Spec
1. `src/features/tactical-unified/components/canvas/annotations/zone-object.tsx` (365行) を調査する。
2. コンポーネント行数制限（最大200行）および、Konvaの「状態と描画の分離」「親・子ノードの同居禁止」ルールに従ってファイルを分割する。
3. イベントハンドリングのロジックがある場合は Custom Hook に抽出する。

## Acceptance Criteria & Verification Commands
- [x] zone-object.tsx および分割されたファイルがそれぞれ最大200行の制限を満たしていること。
- [x] コンポーネント内に過度な状態管理がなく、View に徹していること。

### Verification
`rtk biome check src/features/tactical-unified/components/canvas/annotations`
`pnpm type-check:scoped src/features/tactical-unified/components/canvas/annotations/zone-object.tsx`
