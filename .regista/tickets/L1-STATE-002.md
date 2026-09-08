---
id: L1-STATE-002
emoji: 🔄
title: 戦術リセット（一括初期化）ロジックの実装
status: DONE
depends_on: []
code_snapshot: 242dfc980594ec4466aae6e797b996fcba3dce16
model: Gemini 3.7 Flash
effort: medium
target_files:
  - src/features/tactical-unified/stores/slide-reset-helpers.ts
  - src/features/tactical-unified/stores/project-slice.ts
reference_files:
  - src/lib/types/tactical-unified.ts
---

# 🔄 L1-STATE-002: 戦術リセット（一括初期化）ロジックの実装

## UX Impact
ユーザーが1クリックで戦術を初期状態に戻せるようになる

## Detailed Spec
1. `slide-reset-helpers` に、選手メタデータを維持しつつ座標（x, y）をフォーメーション初期配置に再計算し、アノテーション（矢印・ゾーン等）を全削除するロジックを実装する。
2. さらにピッチ・境界線の位置・スケールもデフォルトにリセットする処理を含める。
3. `project-slice` に `resetTactics` アクションを追加し、上記のヘルパー関数を利用して一括リセット処理を公開する。

## Acceptance Criteria
- [ ] 選手メタデータを維持したまま初期フォーメーション位置へリセットできる
- [ ] 描画オブジェクトが全削除される
- [ ] 型チェックとLintが通る

## Verification Commands
```bash
rtk pnpm type-check:scoped src/features/tactical-unified/stores/project-slice.ts
rtk biome check src/features/tactical-unified/stores/project-slice.ts
```

---

## 📝 Implementation & Write-back Log (Worker記入欄)
<!-- Workerは作業完了後、以下を記入して status を DONE に更新すること -->
<!-- 差し戻し（Level 3 Escalation）の場合は status を BLOCKED に更新し、Escalationセクションを記入すること -->

### 1. 変更内容サマリー
- `slide-reset-helpers.ts` に選手メタデータを維持したままフォーメーション初期座標に再計算し、アノテーション削除およびピッチ・境界線をリセットする `resetSlideTacticsData` を追加。
- `project-slice.ts` に一括リセットを行う `resetTactics` アクションを追加。
- `tactical-unified-store.test.ts` に `resetTactics` の包括的な単体テストを追加。

### 2. 変更ファイル一覧（make done の git add 対象）
<!-- Workerが実際に変更したファイルを記入。target_filesと差異がある場合は必ず更新すること -->
- `src/features/tactical-unified/stores/slide-reset-helpers.ts`
- `src/features/tactical-unified/stores/project-slice.ts`
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
