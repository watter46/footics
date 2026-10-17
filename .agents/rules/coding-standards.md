---
description: "Footicsプロジェクトのコーディング規約（TypeScript, React, Zustand, エージェント行動制約）"
globs:
  - "src/**"
  - "extension/**"
  - "tests/**"
---
# コーディング規約 (Coding Standards)

本プロジェクト（Footics）におけるコーディング規約です。エージェントが `src/**`、`extension/**` および `tests/**` のファイルを編集・作成する際は、必ず本規約に従ってください。

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

## 4. React & コンポーネント規約

- **4層アーキテクチャの遵守**: コンポーネントは必ず `.agents/rules/component-architecture.md` の4層モデル（Level 4: Shell, Level 3: Feature View, Level 2: Domain UI Block, Level 1: Primitive）に従って配置してください。
- **ホスト境界の厳守**: `chrome.*` や Dexie DB への直接アクセスを Level 2 以下の共通コンポーネントに持ち込むことを固く禁じます。
- **Props の定義と受け取り**: 
  - コンポーネントのPropsは `type Props = {}` または `interface` で定義します。
  - 引数で必ず Destructuring (分割代入) を行い、関数内で `props.user` のようにアクセスしないでください。
  - `React.FC` の使用は避けてください。
- **命名**: 
  - BooleanのPropsは `isLoading`, `hasError`, `canSubmit` のように「状態や主張」として読める名前にしてください。
- **JSX の可読性**: JSX内で複雑な三項演算子や長いロジックを直接書かず、`return` の前の変数に抽出してください。
- **State (状態管理)**: 
  - 他のPropsやStateから計算可能な派生状態（Derived State）を `useState` で二重に持たないでください。
  - **Store Provider パターンの義務化**: 単一のグローバル Zustand ストア（シングルトン）の濫用を禁止します。Web と Extension で共用する機能や独立インスタンスが必要なコンポーネントでは、Vanilla Store Factory + React Context による Store Provider パターンを採用し、マウント時に初期状態（Initial Props）を確定注入してください（初期チラつき Flicker の根絶）。

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

- **ファイルサイズ**: **1ファイル 200行以下を標準とし、250行を超えたら分割必須**（1ファイル 1コンポーネント）を厳守してください。400〜500行の肥大化したコンポーネントは禁止です。
- **エラーハンドリング**: `try-catch` と `unknown` エラーの安全なキャストを行い、エラーを握りつぶさないでください。
- **`console.log`**: 運用コードにデバッグ用のログを残さないでください。

## 6. import パスの規約

- **エイリアス `@/` の使用**: `src/` 配下へのアクセスは必ず `@/` エイリアスを使用してください。相対パスでの多段遡り（例: `../../../lib/...`）は禁止します。

## 7. Konva.js 利用時の制約

戦術ボードやアノテーションキャンバスで Konva を使用する場合:
- Fabric.js / Canvas 2D API の直接使用は禁止です。
- **プラグイン型ツール設計**: 新規ツールやオブジェクトを追加する際、Stage に `if-else` をベタ書きせず、`CanvasToolPlugin` インターフェースに従ってカプセル化してください。
- **ゼロマージン描画**: 画像背景モードでは周囲余白 0% を徹底し、BoundaryBox との隙間（黒枠）を排除してください。
- **仮想キャンバス座標系**: 描画データは 0〜100% の正規化座標で管理し、ウィンドウリサイズ耐性を確保してください。
- パフォーマンス最適化のため、レイヤー分離、`listening={false}`、`perfectDrawEnabled={false}` を適切に設定してください。
