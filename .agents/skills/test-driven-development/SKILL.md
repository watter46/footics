---
name: test-driven-development
description: モックを排した純粋関数I/Oテストと実StoreProvider結合テストにより、ブラウザ実行時エラーを根絶するテスト実装スキル
---

# Test Implementation & Verification Skill (高信頼テスト実装スキル)

## 概要 (Overview)

テストは通っているのに `bun dev`（ブラウザ操作）で無限ループや初期化クラッシュが起きる問題を根絶するため、形骸化した `ai:check:red` 儀式と内部モック（`vi.mock`）を廃止し、**本物のロジックと本物の StoreProvider を動かすテスト**を実装と同時に作成します。

## 1. 実装とテストの一体作成ワークフロー

1. **旧 `ai:check:red` の廃止**:
   - 実装前にわざと失敗するテストだけを実行するステップ（`ai:check:red`）は行いません。
   - Worker は担当 Phase のプロダクションコード（`[ADD]` / `[MODIFY]` / `[DELETE]`）とテストコードを同時に作成・更新します。
2. **Phase 単位の即時検証**:
   - 実装とテスト記述が完了したら、`bun run ai:check <担当ファイル群>` を1手で実行し、Guardrails（モック禁止検査含む）・Biome・担当テストが PASS することを確認します。
3. **破壊的変更時の既存テスト更新**:
   - シグネチャ変更や旧機能廃止に伴い、古い仕様をテストしていた既存テストはためらわずに新仕様へ書き換えるか削除します（古いテストを通すためにプロダクションコードに後方互換フォールバックを残すことは厳禁です）。

## 2. 内部モック禁止と書くべき2種類のテスト

1. **内部 Store・Hook・コンポーネントの `vi.mock` 禁止**:
   - 自前の Zustand Store（`@/stores/...`, `tactical-stores` 等）や内部フックを `vi.mock` で偽装することは `ai:check` によりエラーとして遮断されます。
2. **① 純粋関数の入出力（I/O）テスト**:
   - ドメイン計算・Command Reducer・Scene Compiler 等に具体的な入力値を与え、出力オブジェクトの全主要フィールドをリテラル期待値で検証します。
3. **② 実 `StoreProvider` を使った結合テスト**:
   - UI コンポーネントやカスタムフックは、本物の `create*Store(initialState)` と `<*StoreProvider>` でラップしてレンダリングし、操作後の実 Store 状態と DOM 変化、および `console.error`（無限レンダリングループ等）が発生しないことを検証します。
