---
description: "Footicsプロジェクトのテスト規約（Vitest、TDD、React Testing Library、テスタビリティ）"
globs:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "tests/**"
  - "src/**/__tests__/**"
---
# テスト規約 (Testing Standards)

本プロジェクト（Footics）におけるテスト規約です。テストを記述、または新機能を実装する際は、必ず本規約に従ってください。

---

## 1. Test-Driven Development (TDD) の厳格な遵守

- **RED-GREEN-REFACTOR**: 必ずテストを先に書き、**`bun run ai:check:red <test-file>`（または `rtk vitest run <test-file>`）を実行して失敗（RED）することを確認してから**実装を開始してください。
- 実装後は `bun run ai:check <files>` を実行し、Lint・型検査・関連テストがすべて PASS（GREEN）することを確認してください。

---

## 2. カバレッジとテスト配置要件

- **目標カバレッジ**: 変更・新規作成モジュールのカバレッジ **80%以上** を維持してください（計測コマンド: `bun run test:coverage`）。
- **ファイル配置**:
  - ユニット/コンポーネントテスト: 対象ファイルと同階層の `__tests__/[name].test.ts(x)`、または同ディレクトリの `[name].test.ts(x)`。
  - エージェント・フックテスト: `.agents/**/__tests__/*.test.ts`（`bun test ./.agents` で実行）。

---

## 3. テスト品質と決定論的テスト規約 (R12)

### 判定基準
1. **AAA パターン (Arrange / Act / Assert)**: 準備・実行・検証のフェーズを明確に分けて記述してください。
2. **`querySelector` の禁止**: コンポーネントテストで `container.querySelector(...)` による CSS クラスや DOM 構造の直接探索を禁止します。`screen.getByRole`, `getByLabelText`, `getByText` を優先し、Konva キャンバス等の特殊なケースのみ `getByTestId` を使用してください。
3. **ユーザー操作は `userEvent` を優先**:
   - 標準 DOM コンポーネント（ボタン、フォーム、ダイアログ等）の操作には `@testing-library/user-event`（`const user = userEvent.setup(); await user.click(...)`）を使用してください。
   - Konva Stage のカスタムポインター座標イベントや `window` キーボードイベント発火など、低レベルイベントのシミュレートが必要な箇所に限り `fireEvent` を許可します。
4. **テスト内の `as any` 禁止（型付きファクトリ関数の使用）**:
   - テストデータ生成時に `{ id: '1' } as any` で型チェックを黙らせることを禁止します。`createMockPlayer(overrides?: Partial<Player>): Player` のような型付きファクトリ関数を定義して使用してください。
5. **非決定論的要素（時刻・乱数・タイマー）の排除**:
   - 本体コードで `Date.now()` や `Math.random()` を扱う関数は、引数で注入可能にするか、テスト側で `vi.useFakeTimers()` / `vi.setSystemTime()` を使用し、実行タイミングに依存しない決定論的テストにしてください。
   - テスト内で生の `await new Promise((r) => setTimeout(r, 100))` による待機を書くことを禁止します。
6. **スナップショットの原則禁止**: UI コンポーネントに対する `toMatchSnapshot()` は原則禁止とします。

```tsx
// ❌ 禁止: as any テストデータ・querySelector・生 setTimeout 待機
test('saves player', async () => {
  const player = { id: 'p1', name: 'Palmer' } as any;
  const { container } = render(<PlayerForm player={player} />);
  fireEvent.click(container.querySelector('.save-btn')!);
  await new Promise((r) => setTimeout(r, 100));
  expect(mockSave).toHaveBeenCalled();
});

// ✅ 推奨: 型付きファクトリ・getByRole・userEvent
import userEvent from '@testing-library/user-event';

function createMockPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Palmer',
    number: 20,
    team: 'home',
    x: 50,
    y: 50,
    ...overrides,
  };
}

test('saves player when save button is clicked', async () => {
  // Arrange
  const user = userEvent.setup();
  const player = createMockPlayer({ name: 'Palmer' });
  render(<PlayerForm player={player} onSave={mockSave} />);

  // Act
  await user.click(screen.getByRole('button', { name: /保存|save/i }));

  // Assert
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
});
```

---

## 4. 独立性と WXT エントリポイントのテスタビリティ

- **テストの独立性**: 各テスト (`it` / `test`) は完全に独立して実行可能でなければなりません。共有のモック状態や IndexedDB テーブルは `beforeEach` / `afterEach` で必ずリセット・クリアしてください。
- **WXT エントリポイントの DI**:
  - `defineBackground` や `defineContentScript` 内に全処理を無名クロージャでベタ書きすることを禁じます。
  - コマンドディスパッチや IPC リレー等の実ロジックは独立した関数・クラスとして export し、Chrome API をモック注入可能（DI）にして単体テストを作成してください。

---

## 5. エージェントの検証責務

タスク完了の宣言を行う前に、必ず統合検証コマンド **`bun run ai:check <対象ファイル>`** を実行し、すべてのチェックとテストが exit code 0 で PASS することを確認してください。
