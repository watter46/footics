---
id: L2-Tactical-001
emoji: 🔵
title: TacticalページへのmatchIdとminuteの連携受け入れ実装
status: DONE
depends_on: ["L1-Data-002"]
model: Gemini 3.7 Flash
effort: medium
context_files:
  - src/app/tactical/page.tsx
  - src/stores/tactical-unified-store.ts
---

# 🔵 L2-Tactical-001: TacticalページへのmatchIdとminuteの連携受け入れ実装

## UX Impact
TacticalページをURLパラメータ付きで開いた際、指定された試合・時間帯の22人の選手とフォーメーションが自動的にピッチ上に配置された状態で開始できる。

## Detailed Spec
1. `src/app/tactical/page.tsx` において、URLクエリパラメータ（例: `?matchId=123&minute=42`）または Zustand ストア経由で初期値を受け取る処理を追加する。
2. `L1-Data-002` で実装したユーティリティを活用し、IndexedDBから対象試合のデータを取得した後、指定 `minute` の `playerIds` と `formationName` を算出する。
3. 算出された22人の選手とフォーメーションを、Tacticalの初期ステート（ホーム/アウェイのプレイヤー配置）としてストアに流し込み描画させる。

## Acceptance Criteria & Verification Commands
- [x] URLクエリパラメータから `matchId` と `minute` を安全にパースしている。
- [x] Tactical ロード時に IndexedDB から試合データを引き、初期配置に反映している。

### Verification
`rtk biome check src/app/tactical/page.tsx src/stores/tactical-unified-store.ts`
`rtk pnpm type-check:scoped src/app/tactical/page.tsx src/stores/tactical-unified-store.ts`
