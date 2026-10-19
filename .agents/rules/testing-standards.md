---
description: "Footicsプロジェクトのテスト規約（Vitest、TDD、React Testing Library）"
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "tests/**"
  - "src/**/__tests__/**"
---
# テスト規約 (Testing Standards)

本プロジェクト（Footics）におけるテスト規約です。エージェントがテストを記述、または新機能を実装する際は、必ず本規約に従ってください。

## 1. Test-Driven Development (TDD) の厳格な遵守

- **RED-GREEN-REFACTOR**: 必ずテストを先に書き、**実行して失敗（RED）することを確認してから**実装を開始してください。
- エージェントは「テストを書いただけでREDを確認せず実装に進む」ことを禁じます。必ずテストランナーで RED 状態を検証してから対象コードを書き換えてください。

## 2. カバレッジとテスト配置要件

- **最小カバレッジ**: 80%以上を維持してください。
- **ファイル配置**: 
  - ユニット/コンポーネントテスト: 対象ファイルと同階層の `__tests__/` ディレクトリ内、または対象ファイルと同じディレクトリに `[name].test.ts(x)` として配置。
  - 統合テスト・エージェントベンチマーク: `tests/` ディレクトリ配下。

## 3. テストの構造 (AAA パターン)

テストは必ず Arrange（準備）、Act（実行）、Assert（検証）のフェーズに分けて記述してください。

```typescript
test('returns correctly formatted string', () => {
  // Arrange
  const input = { firstName: 'John', lastName: 'Doe' };
  
  // Act
  const result = formatName(input);
  
  // Assert
  expect(result).toBe('John Doe');
});
```

## 4. React Component のテスト (React Testing Library)

- **実装詳細のテスト禁止**: コンポーネントの内部 State や渡された Props を直接検証しないでください。「ユーザーが見るもの」「操作するもの」をテストします。
- **クエリの優先順位**: `getByRole`, `getByLabelText`, `getByText` などのアクセシブルなクエリを優先し、`getByTestId` は最終手段としてください。
  - ❌ `container.querySelector('.my-class')` (厳禁)
  - ✅ `screen.getByRole('button', { name: /save/i })`
- **ユーザー操作**: `fireEvent` ではなく `userEvent` を使用してください（常に `await` が必要です）。
- **ネットワークのモック**: コンポーネントテストでのネットワーク通信のモックには、原則として MSW (Mock Service Worker) を使用します。
- **スナップショットの原則禁止**: UI コンポーネントに対する `toMatchSnapshot()` は、壊れやすく意味を持たないため原則禁止とします（純粋なデータシリアライズのテストを除く）。

## 5. 独立性と副作用の排除

- **テストの独立性**: 各テスト (`it` / `test`) は完全に独立して実行可能でなければなりません。前のテストの状態に依存するテストは書かないでください。
- 共有のモック状態は `afterEach` または `beforeEach` で必ずリセット・クリア（`vi.resetAllMocks()` 等）してください。

## 6. エージェントの検証責務

タスク完了の宣言を行う前に、必ず統合検証コマンド（`bun run agent:check-worker` 等）または `rtk vitest run` を実行し、すべてのテストが PASS することを確認してください。検証せずに推測で完了報告を行ってはなりません。

## 7. WXT エントリポイントのテスタビリティ規約

- **インライン実装の禁止**: `defineBackground` や `defineContentScript` 内に全処理を無名クロージャでベタ書きすることを禁じます。
- **実ロジックの export と DI**: タブ制御、コマンドディスパッチ、IPC リレー等の実ロジックは独立した関数・クラス・サービスクラスとして export し、Chrome API を引数やインターフェース経由で注入可能（DI）にしてください。
- **単体テストの必須化**: これにより、拡張機能エントリポイント周り（`extension/entrypoints/__tests__/` 等）にも Vitest による単体テストを作成し、カバレッジを担保してください。

