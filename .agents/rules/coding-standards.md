---
description: "Footicsプロジェクトのコーディング規約（TypeScript, React 19, Zustand v5, Tailwind v4, エージェント行動制約）"
globs:
  - "src/**"
  - "extension/**"
  - "tests/**"
---
# コーディング規約 (Coding Standards)

本プロジェクト（Footics）におけるコーディング規約です。`src/**`、`extension/**` および `tests/**` のファイルを編集・作成する際は、必ず本規約の「禁止コード ⇔ 推奨コード」と機械検証基準に従ってください。

---

## 1. エージェント向け行動制約 (Agent Behavioral Constraints)

- **事前リサーチの義務 (Research & Reuse)**: 新規実装前に、必ず `src/components/`、`src/features/`、`src/lib/` の既存実装を検索し、再利用してください（車輪の再発明禁止）。
- **推測での修正・存在しない API の捏造禁止**: 型エラーや Lint エラーは当てずっぽうで直さず、必ず型定義を確認してください。規約や計画にない未定義シンボルを勝手に前提としてはなりません。
- **リファクタリングの混入禁止**: 指示されていない既存ロジックの変更、コメントの削除、不要なフォーマット変更を「ついでに」行わないでください。
- **サブエージェントの完了待機**: `invoke_subagent` でタスクを委譲した場合、完了メッセージを受信して結果を統合し、`manage_subagents(Action: "kill")` で破棄してから親タスクを完了してください。

---

## 2. Immutability (不変性の徹底)

- **破壊的変更の禁止**: オブジェクトや配列を変更する際は、既存データや関数引数（Parameter）への再代入・直接書き換えを行わず、新しいコピーを返してください（Biome `noParameterAssign: "error"`）。
- **Zustand / React**: Zustand の State 更新や React の Props 伝播において直接代入（ミューテーション）は厳禁です。

---

## 3. TypeScript 規約 (R1: 型の安全性)

### 判定基準
- **`strict: true`**、**`noFallthroughCasesInSwitch: true`**、**`noImplicitOverride: true`** を強制します。
- **`any` 型・二重キャストの禁止**: `any`（Biome `noExplicitAny: "error"`）および `as unknown as T`、根拠のない `as SomeType` キャストを禁止します。外部入力（IndexedDB、`window.postMessage`、`fetch`、`JSON.parse`）は必ず **Zod スキーマ**で検証（`.parse()` / `.safeParse()`）してください。
- **添字アクセスの安全性 (`noUncheckedIndexedAccess` 準拠)**: 配列や `Record` の添字アクセスは `undefined` の可能性を考慮し、`?.` と `??` で安全に処理してください（※コンパイラオプション本体の有効化は既存 470 箇所の是正タスク完了後に実施）。
- **型チェック付きリテラルと網羅性検査**: 設定定数には `satisfies` を使用し、Union 型の `switch` 分岐には `default` で網羅性チェックを行ってください。
- **`import type` の強制**: 型のみの import は必ず `import type` を使用してください（Biome `useImportType: "error"`）。

```ts
// ❌ 禁止: any キャスト・未検証 JSON・添字の未チェック・分岐漏れ
const data = JSON.parse(raw) as Project;
const firstPlayerName = players[0].name;
function getLabel(kind: ToolKind) {
  switch (kind) {
    case 'select':
      return '選択';
  }
}

// ✅ 推奨: Zod 検証・Optional Chaining・satisfies・網羅性チェック
const data = projectSchema.parse(JSON.parse(raw));
const firstPlayerName = players[0]?.name ?? '';
const DEFAULT_ARROW_STYLE = {
  color: '#ffffff',
  strokeWidth: 2,
} satisfies ArrowStyle;

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}

function getLabel(kind: ToolKind): string {
  switch (kind) {
    case 'select':
      return '選択';
    case 'arrow':
      return '矢印';
    default:
      return assertNever(kind);
  }
}
```

---

## 4. React 19 & コンポーネント宣言規約 (R2)

### 判定基準
- **`React.FC` / `FC` の禁止**: コンポーネントは `export function ComponentName({ ... }: ComponentNameProps)` または名前付き関数と `interface XxxProps` で定義してください（`ai:check` で機械遮断）。
- **`forwardRef` の禁止 (React 19)**: React 19 では `ref` を通常の Props として受け取れます。`React.forwardRef` の新規使用を禁止します（Biome `noReactForwardRef: "error"`）。
- **Props の分割代入必須**: 引数で必ず Destructuring（分割代入）を行い、`props.xxx` アクセスを避けてください。
- **ネストした三項演算子の禁止**: JSX 内外を問わず、三項演算子の入れ子を禁止します（Biome `noNestedTernary: "error"`）。早期リターンまたは説明変数に抽出してください。
- **Boolean Props の命名**: `isLoading`, `hasError`, `canSubmit` のように状態・主張として読める名前にしてください。

```tsx
// ❌ 禁止: React.FC・forwardRef・props直アクセス・ネスト三項演算子
export const PlayerCard: React.FC<Props> = (props) => (
  <div>{props.isHome ? (props.isSelected ? 'Home*' : 'Home') : 'Away'}</div>
);
export const CanvasView = forwardRef<CanvasHandle, Props>((props, ref) => {
  return <div />;
});

// ✅ 推奨: 関数宣言 + interface Props + React 19 ref prop
interface PlayerCardProps {
  name: string;
  isHome: boolean;
  isSelected: boolean;
}

export function PlayerCard({ name, isHome, isSelected }: PlayerCardProps) {
  const teamBadge = isHome ? 'Home' : 'Away';
  const suffix = isHome && isSelected ? '*' : '';
  return (
    <div>
      { name }: {teamBadge}
      {suffix}
    </div>
  );
}

interface CanvasViewProps {
  ref?: React.Ref<CanvasHandle>;
}

export function CanvasView({ ref }: CanvasViewProps) {
  useImperativeHandle(ref, () => ({ exportPng }), [exportPng]);
  return <div />;
}
```

---

## 5. エラーハンドリングとロギング規約 (R7)

### 判定基準
- **空 `catch` ブロックの禁止**: エラーの握りつぶしを禁止します（Biome `noEmptyBlockStatements: "error"`）。
- **`catch` 節の必須アクション**: `catch (error: unknown)` で受け取り、(a) ユーザーへの通知（`toast.error`）、(b) ロガー出力、(c) 文脈を付与した再スロー のいずれかを必ず行ってください。
- **`console.log` の禁止**: 運用コードでの `console.log` / `console.debug` の放置を禁止します（Biome `noConsole: "error"`、ロガー・CLI スクリプトを除く）。

```ts
// ❌ 禁止: 空 catch・生 console.log
try {
  await saveProject(project);
  console.log('saved');
} catch {}

// ✅ 推奨: unknown 型からの安全な処理とユーザー通知
try {
  await saveProject(project);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  toast.error(`保存に失敗しました: ${message}`);
}
```

---

## 6. ファイルサイズ・命名規則 (R8)

### 命名規則
| 種別 | 規則 | 例 |
| :--- | :--- | :--- |
| コンポーネントファイル | **`kebab-case.tsx`**（※新規・分割時は `kebab-case.tsx` に統一。既存の `PascalCase.tsx` は段階移行） | `slide-card.tsx`, `player-hud.tsx` |
| コンポーネント関数 | `PascalCase` | `export function SlideCard()` |
| カスタム Hooks ファイル | `use-kebab-case.ts` | `use-data-sync.ts` |
| カスタム Hooks 関数 | `useCamelCase` | `export function useDataSync()` |
| Zustand ストア / スライス | `kebab-case-store.ts` / `kebab-case-slice.ts` | `tactical-unified-store.ts` |
| 型・インターフェース | `PascalCase` | `interface SlideCardProps`, `type ToolId` |
| 変数・関数 | `camelCase` | `const matchId`, `function loadMatch()` |
| 定数（不変値） | `SCREAMING_SNAKE_CASE` | `const DEFAULT_GRID_STEP = 10` |

### ファイルサイズ基準（1本化）
- **上限 300 行**: 非テストファイルは **300行以内** を絶対上限とします（Biome `noExcessiveLinesPerFile: 300`、`ai:check`、`scripts/lint/check-file-size.ts` で統一）。
- **200行を目安に分割**: 200行を超えたら Custom Hook・純粋ヘルパー・サブコンポーネントへの分割を検討してください。
- **例外**: プリセットデータや静的イベント定義ファイルは 설정ファイルの override リストで明示的に除外管理します。
- **`eslint-disable` コメントの禁止**: 本プロジェクトは Biome を使用しています。無効な `eslint-disable` コメントの記述・残置を禁止します（`ai:check` で機械遮断）。

---

## 7. import パスとモジュール境界規約 (R9)

### 判定基準
- **`@/` エイリアスの使用と多段相対パスの禁止**: 親ディレクトリへ 2階層以上遡る相対 import（`../../` 以上）を禁止します（`ai:check` で機械遮断）。`src/` 配下は `@/`、`extension/` 配下は `~/`（または同一機能内の `./`・`../` 1階層まで）を使用してください。
- **Barrel ファイル（再エクスポート専用ファイル）の禁止**: `export * from '...'` のみを行う中継ファイルを新規作成することを禁止します（Biome `noReExportAll: "error"`）。

```ts
// ❌ 禁止: 2階層以上の相対遡り・全面再エクスポート
import { DEFAULT_BOUNDARY_BOX } from '../../core/store/canvas-store-pitch';
export * from '@/features/tactical-unified/stores/tactical-unified-store';

// ✅ 推奨: エイリアスによる直接 import・明示的な名前付き import
import { DEFAULT_BOUNDARY_BOX } from '@/features/tactical-unified/core/store/canvas-store-pitch';
```

---

## 8. スタイリング規約 (R10: Tailwind CSS v4)

### 判定基準
- **条件付きクラス結合は `cn()` に統一**: テンプレートリテラルによる条件分岐（`` className={`px-2 ${active ? '...' : ''}`} ``）を避け、`@/lib/utils` の `cn()` を使用してください。
- **ハードコード色指定の抑制**: `bg-[#123456]` のような Arbitrary Hex Color の直書きを避け、`src/app/globals.css` の `@theme` トークンまたは標準パレットを使用してください。

```tsx
// ❌ 禁止: テンプレート文字列での条件結合・マジックカラー直書き
<button className={`px-3 py-1 ${isActive ? 'bg-[#1e3a8a] text-white' : 'bg-transparent'}`} />

// ✅ 推奨: cn() + テーマトークン
<button className={cn('px-3 py-1 bg-transparent', isActive && 'bg-primary text-primary-foreground')} />
```

---

## 9. Konva.js 利用時の制約

戦術ボードやアノテーションキャンバスで Konva を使用する場合:
- Fabric.js / 生の Canvas 2D API のコンポーネント内直接使用は禁止です（オフスクリーン動画エクスポート用レンダラーを除く）。
- **ゼロマージン描画**: 画像背景モードでは周囲余白 0% を徹底し、BoundaryBox との隙間（黒枠）を排除してください。
- **仮想キャンバス座標系 (`0〜100`)**: 永続化データは `0〜100` の論理座標で管理し、描画座標への変換は `src/features/tactical-unified/core/utils/canvas-coordinates.ts`（`worldToScreen` / `screenToWorld`）または `matrix-coordinates.ts` を経由してください。
- パフォーマンス最適化のため、レイヤー分離、静的要素への `listening={false}`、`perfectDrawEnabled={false}` を徹底してください。
