---
description: "Footicsプロジェクトのテスト規約（モック禁止、純粋関数I/Oテスト、実StoreProvider結合テスト、console.error即失敗）"
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "tests/**"
  - "src/**/__tests__/**"
---
# テスト規約 (Testing Standards)

テストは通っているのに `bun dev`（実ブラウザ操作）で無限ループや初期化エラーが発生する事態を根絶するため、形骸化したモックテストを廃止し、**本物のロジックと本物の Store を動かすテスト**のみを記述する。

---

## 1. 実装とテストの一体作成（旧 `ai:check:red` の廃止）

- 実装前にわざと失敗するテストを実行する旧 `bun run ai:check:red` ステップは廃止する。
- Worker は自身の Phase スコープ内でプロダクションコードとテストコードを同時に作成・更新し、**`bun run ai:check <担当ファイル群>`** を1手で実行して整形・規約検査・テスト通過を確認する。
- 破壊的変更やリファクタリング時は、古い仕様を前提とした既存テストを温存せず、新しい契約に合わせて既存テストを直接書き換えるか削除する。

---

## 2. 自前モジュールのモック（`vi.mock`）原則禁止 (R12)

1. **内部 Store・Hook・子コンポーネントに対する `vi.mock()` の禁止**:
   - `vi.mock('@/stores/...')`, `vi.mock('.../tactical-stores')`, `vi.mock('../hooks/...')`, `vi.mock('./ChildComponent')` のように自前の状態管理や内部モジュールを偽物に置き換えることを禁止する（`ai:check` の `code-guardrails` により機械遮断される）。
   - モックで Store を偽装すると、React 19 + Zustand v5 のセレクタ参照不一致による無限再レンダリング（`Maximum update depth exceeded`）や `StoreProvider` のラップ漏れを100%見逃す原因となる。
2. **モックが許可される唯一の例外（外部ブラウザ境界のみ）**:
   - `chrome.*`（WebExtension API）、`navigator.clipboard`、WebCodecs（`VideoEncoder` 等）、オフスクリーン Canvas2D コンテキスト等のブラウザ外部 API のみ `vi.fn()` / DI による代替を許可する。

---

## 3. 書くべき2種類のテスト

### ① 純粋関数の入出力（I/O）テスト（最優先・モックゼロ）
- ドメインロジック、Command Reducer（`applySlideCommand` 等）、座標変換、時間補間（`evaluateTimelineFrame`）、Scene Compiler（`compileSceneGraph`）は、すべて React/Zustand 非依存の純粋関数として実装し、**具体的な入力値に対して期待される出力オブジェクトが返ること**を直接検証する。

### ② 実 `StoreProvider` を接続した結合テスト（UI・カスタムフック）
- カスタムフック（`renderHook`）や UI コンポーネント（`render`）をテストする際は、必ず **本物の Store ファクトリ（`create*Store(initialData)`）と本物の `<*StoreProvider>`** でラップして実行する。
- アクション発火後、`vi.fn()` が呼ばれたかではなく **「本物の Store の状態（`store.getState()`）や描画結果がどう変化したか」** を検証する。

```tsx
// ❌ 禁止: Store を vi.mock で偽装し、モック関数が呼ばれたかだけを見るハリボテテスト
vi.mock('@/features/tactical-unified/stores/tactical-stores', () => ({
  useDocumentStore: vi.fn(),
}));

// ✅ 推奨: 本物の StoreProvider でラップし、操作後の実 Store 状態変化と再レンダリング安全性を検証する
test('dispatches move command and updates real store state without render loops', async () => {
  const user = userEvent.setup();
  const initialProject = createTestProject();
  render(
    <TacticalStoreProvider initialProject={initialProject}>
      <TargetComponent />
    </TacticalStoreProvider>,
  );

  await user.click(screen.getByRole('button', { name: 'リセット' }));
  // 実 Store の状態変化と DOM 反映を検証
  expect(screen.getByText('初期配置')).toBeInTheDocument();
});
```

---

## 4. 決定論的テスト品質基準

1. **`console.error` の発火はテスト失敗とみなす**:
   - テスト実行中に React の無限ループ警告（`Maximum update depth exceeded`）、Context Provider 未ラップエラー、key 重複警告などの `console.error` が発火した場合、テストを即座に失敗として扱うこと。
2. **テスト内の `as any` 禁止（型付きファクトリ関数の使用）**:
   - `{ id: '1' } as any` で型チェックを黙らせることを禁止する。必ず `createTestSlide(overrides?: Partial<Slide>): Slide` のような型付きファクトリ関数を使用する。
3. **`querySelector` と生 `setTimeout` の禁止**:
   - DOM 要素の取得には `screen.getByRole`, `getByLabelText`, `getByText` を使用し、操作には `@testing-library/user-event` を使用する。
   - 時刻やタイマーは引数注入または `vi.useFakeTimers()` で決定論的に制御する。
