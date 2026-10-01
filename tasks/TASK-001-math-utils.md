# TASK-001: Math Utils Implementation

## Objective
`src/utils/math.ts` に足し算(`add`)関数と引き算(`subtract`)関数を実装し、それらのテストを `tests/utils/math.test.ts` に作成する。

## Implementation Steps
1. **Create `src/utils/math.ts`**
   - 以下の関数を実装し、export する。
   - `export function add(a: number, b: number): number { return a + b; }`
   - `export function subtract(a: number, b: number): number { return a - b; }`

2. **Create `tests/utils/math.test.ts`**
   - `src/utils/math.ts` から `add` と `subtract` をインポートする。
   - `add` 関数のテスト: `expect(add(1, 2)).toBe(3)` のように、正しく足し算ができることを検証するテストを書く。
   - `subtract` 関数のテスト: `expect(subtract(5, 3)).toBe(2)` のように、正しく引き算ができることを検証するテストを書く。

## Testing Strategy
- `tests/utils/math.test.ts` を作成し、テストフレームワークを用いて `add(1, 2) === 3` および `subtract(5, 3) === 2` を検証する。
- 実行可能なテストコードを完備すること。

## Rejections / Additional Tasks
(レビューにて差し戻しがあった場合に追記される)
