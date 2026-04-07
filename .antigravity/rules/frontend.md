# Frontend (Next.js 15 & React) Guidelines

## Framework & Tooling Constraints
- **Package Manager**: 必ず `pnpm` を使用。`npm` の指示があっても絶対に `pnpm` に読み替えること。
- **Framework**: Next.js 15.5+ (App Router).
- **Styling**: Tailwind CSS 4, shadcn/ui.
- **State Management**:
  - UI状態・ドラッグ操作・動画同期には `Zustand`。
  - IDBとのデータ同期には `TanStack Query` を使用。

## Component Architecture
- 200行を超えるコンポーネントは、即座に Logic (Hook) と UI に分割すること。既存の `src/components/features/` フォルダ構造を維持する。
- `dnd-kit` を使用したドラッグ操作時は、ドロップ先のハイライト等ユーザーへの明確な視覚的フィードバック（Visual Feedback）を実装すること。
