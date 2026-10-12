---
description: "Footicsプロジェクトのコーディング規約（TypeScript, React, Zustand, エージェント行動制約）"
globs:
  - "src/**"
  - "tests/**"
---
# コーディング規約 (Coding Standards)

本プロジェクト（Footics）におけるコーディング規約です。エージェントが `src/**` および `tests/**` のファイルを編集・作成する際は、必ず本規約に従ってください。

## 1. エージェント向け行動制約 (Agent Behavioral Constraints)

- **事前リサーチの義務 (Research & Reuse)**: 新規実装前に、必ず `src/components/` や `src/lib/` などの既存実装を検索し、再利用を検討してください（車輪の再発明禁止）。
- **推測での修正禁止**: 型エラーやLintエラーは当てずっぽうで直さず、必ず関連する型定義 (`types/`) やインターフェースを確認してください。
- **リファクタリングの混入禁止**: 指示されていない既存ロジックの変更、コメントの削除、不要なフォーマット変更を「ついでに」行わないでください。
- **サブエージェントの完了待機 (Delegation Completion Contract)**: `invoke_subagent` 等でタスクを委譲した場合、タスクを投げっぱなしにせず、完了メッセージを受信して結果を統合してから親タスクを終了してください。

## 2. Immutability (不変性の徹底: CRITICAL)

- **破壊的変更の禁止**: オブジェクトや配列を変更する際は、既存データ（`original`）を直接書き換えず、必ずスプレッド構文等を用いて新しいコピーを作成して返してください。
- **Zustand / React**: ZustandのState更新や、ReactのProps伝播においてミューテーション（直接代入）は厳禁です。

## 3. TypeScript 規約

- **`strict: true`**: 全ての strict チェックが有効です。
- **`any` 型の禁止**: 代わりに `unknown` を使用し、適切に型ガード（Type Guard）やZod等で安全にキャスト（Narrowing）してください。
- **`noUncheckedIndexedAccess`**: 配列やオブジェクトのアクセスには `undefined` の可能性を考慮し存在チェックを行ってください。
- **Public APIの型定義**: 共有ユーティリティや公開関数は、引数と戻り値の型を明示してください。
- **`interface` vs `type`**: 拡張・実装されるオブジェクト形状には `interface` を、Union / Tuple / Utility Type には `type` を使用してください。

## 4. React 規約

- **Props の定義と受け取り**: 
  - コンポーネントのPropsは `type Props = {}` または `interface` で定義します。
  - 引数で必ず Destructuring (分割代入) を行い、関数内で `props.user` のようにアクセスしないでください。
  - `React.FC` の使用は避けてください。
- **命名**: 
  - BooleanのPropsは `isLoading`, `hasError`, `canSubmit` のように「状態や主張」として読める名前にしてください。
- **JSX の可読性**: JSX内で複雑な三項演算子や長いロジックを直接書かず、`return` の前の変数に抽出してください。
- **State (状態管理)**: 
  - 他のPropsやStateから計算可能な派生状態（Derived State）を `useState` で二重に持たないでください。
  - グローバル状態には Zustand を使用します。

## 5. 命名規則・ファイル構成

| 種別 | 規則 | 例 |
|-----|------|----|
| コンポーネントファイル | `PascalCase.tsx` | `UserCard.tsx` |
| コンポーネント関数 | `PascalCase` | `function UserCard()` |
| カスタムHooksファイル | `use-kebab-case.ts` | `use-data-sync.ts` |
| カスタムHooks関数 | `useCamelCase` | `function useDataSync()` |
| Zustand ストアファイル | `kebab-case-store.ts` | `tactical-unified-store.ts` |
| 型・インターフェース | `PascalCase` | `type User`, `interface Props` |
| 変数・関数 | `camelCase` | `const matchId`, `function loadMatch()` |
| 定数（不変値） | `SCREAMING_SNAKE_CASE` | `const GRID_STEP = 10` |

- **ファイルサイズ**: Biomeの制約に従い、**1ファイル 300行以内** を遵守してください。
- **エラーハンドリング**: `try-catch` と `unknown` エラーの安全なキャストを行い、エラーを握りつぶさないでください。
- **`console.log`**: 運用コードにデバッグ用のログを残さないでください。

## 6. import パスの規約

- **エイリアス `@/` の使用**: `src/` 配下へのアクセスは必ず `@/` エイリアスを使用してください。相対パスでの多段遡り（例: `../../../lib/...`）は禁止します。

## 7. Konva.js 利用時の制約

戦術ボード実装等で Konva を使用する場合:
- Fabric.js / Canvas 2D API の直接使用は禁止です。
- パフォーマンス最適化のため、レイヤー分離、`listening={false}`、`perfectDrawEnabled={false}` を適切に設定してください。
