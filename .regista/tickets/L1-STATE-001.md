---
id: L1-STATE-001
emoji: 🔧
title: ピッチ・境界線の状態管理と初期値設定
status: DONE
depends_on: []
code_snapshot: 242dfc980594ec4466aae6e797b996fcba3dce16
model: Gemini 3.7 Flash
effort: low
target_files:
  - src/lib/types/tactical-unified.ts
  - src/features/tactical-unified/stores/pitch-slice.ts
reference_files: []
---

# 🔧 L1-STATE-001: ピッチ・境界線の状態管理と初期値設定

## UX Impact
キャンバス操作時の連動状態・固定状態を内部で保持する

## Detailed Spec
1. `pitch-slice` に `isPitchBoundaryLinked` 状態（初期値 true）と切り替え関数 `togglePitchBoundaryLink` を追加する。
2. `pitch-slice` にピッチ・境界線のみを中央・初期倍率に戻す `centerPitchAndBoundary` を追加する（選手・アノテーションの座標は維持）。
3. ピッチ固定の初期状態が ON（`isLocked: true`）となるよう `PitchTransform` の初期値定義を更新する。

## Acceptance Criteria
- [ ] `isPitchBoundaryLinked` の初期値が true である
- [ ] ピッチ固定（`isLocked`）の初期状態が ON になっている
- [ ] 型チェックとLintが通る

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/stores/pitch-slice.ts
rtk biome check src/features/tactical-unified/stores/pitch-slice.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `PitchTransformSchema` の `isLocked` デフォルト値を `false` から `true` に更新。
- `pitch-slice` に `isPitchBoundaryLinked` (初期値 true) と切り替え関数 `togglePitchBoundaryLink` を追加。
- `pitch-slice` にピッチ・境界線のみを初期状態にリセットする `centerPitchAndBoundary` を追加。

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/lib/types/tactical-unified.ts`
- `src/features/tactical-unified/stores/pitch-slice.ts`
- `src/features/tactical-unified/stores/__tests__/tactical-unified-store.test.ts`

### 3. 検証結果
- [x] `pnpm type-check:scoped` パス
- [x] `rtk biome check` パス
- [x] テスト実行（対象テストがある場合）: PASS

### 4. レビュー・引継ぎ特記事項（あれば）
- なし

---

### ⚠️ Escalation & Missing Info (差し戻し時のみ記入)
<!-- Workerが情報不足でFail-Fast中断した場合のみ以下を記入する -->
<!-- 記入後は必ず status を BLOCKED に更新し、実装を即座に停止すること -->

- **Blocked Reason**: <!-- チケットのどの情報が不足していたか1〜2行で記述 -->
- **Missing for Scout**:
  1. <!-- Scoutが調査すべき具体的な不足情報1 -->
  2. <!-- Scoutが調査すべき具体的な不足情報2（任意）-->
