# TASK-010: 旧キャンバス重複コードの完全撤廃 & 二重管理解消 (Task 1-D)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Assigned**: `full-worker`
- **Reviewer**: `reviewer`
- **Parent Task**: `tactical-unified-refactoring-phase1.md` (Task 1-D)
- **Target Files**:
  - `src/features/tactical-unified/objects/canvas/*` (DELETE)
  - `src/features/tactical-unified/core/index.ts` (MODIFY)
  - `src/features/tactical-unified/index.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `src/features/tactical-unified/objects/canvas` 配下の旧実装（46ファイル）が完全に削除され、残存参照が 0 件であること。
- [x] 2. 共有資産（6ファイル）が `core/` へ移管され、`core/index.ts` から export されていること。
- [x] 3. `src/features/tactical-unified/index.ts` で `UnifiedCanvas` / `BoundaryBox` のエイリアスが維持され、後方互換性が保たれていること。
- [x] 4. `bun run ai:check` および `bun run typecheck` が exit code 0 でパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import {
  normToPx,
  normToScreen,
  useBoundaryBoxDrag,
  useNodePositionTransition,
  type CanvasNodesRegistry,
  type CornerId,
  calculateExportCropRect,
} from '@/features/tactical-unified/core';
```

### 3.2 Key Interfaces & Types
```ts
export type CornerId = 'tl' | 'tr' | 'br' | 'bl';

export interface UseNodePositionTransitionOptions {
  nodeRef: React.RefObject<Konva.Group | Konva.Shape | null>;
  x: number;
  y: number;
  duration?: number;
  disabled?: boolean;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: 共有資産の core 移管 & エクスポート
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/tactical-unified/core/` 配下
- **Tasks**:
  - [x] 1. 共有資産 6 ファイルおよび単体テストを `core/` へ移管。
  - [x] 2. `core/index.ts` から移管した関数・型を export。
- **Worker Handoff Log**:
  - 移管完了: `use-boundary-box-drag.ts`, `use-node-position-transition.ts`, `canvas-registry.ts`, `canvas-coordinates.ts`, `canvas-pitch-transform-helper.ts`, `matrix-coordinates.ts`

### Phase 2: 残存参照箇所の import 切り替え
- **Worker Model**: `inherit`
- **対象ファイル**: 全 34 ファイル（コンポーネント、フック、パネル、テスト等）
- **Tasks**:
  - [x] 1. `@/features/tactical-unified/objects/canvas` から `@/features/tactical-unified/core` へ一括置換。
  - [x] 2. `src/features/tactical-unified/index.ts` にて `UnifiedCanvas` / `BoundaryBox` のエイリアスを提供。
- **Worker Handoff Log**:
  - 全 34 箇所の import パスを `@/features/tactical-unified/core` へ切り替え完了。

### Phase 3: objects/canvas ディレクトリの完全削除
- **Worker Model**: `inherit`
- **対象ファイル**: `src/features/tactical-unified/objects/canvas/` (46ファイル)
- **Tasks**:
  - [x] 1. `git rm -rf src/features/tactical-unified/objects/canvas` を実行。
  - [x] 2. 残存参照 0 件を確認。
- **Worker Handoff Log**:
  - 旧キャンバス実装 46 ファイルを完全に削除。

### Phase 4: 検証
- **Worker Model**: `inherit`
- **Tasks**:
  - [x] 1. `bun run ai:check` を実行し、全件 PASS を確認。
  - [x] 2. `bun run typecheck` を実行し、型エラー 0 件を確認。
- **Worker Handoff Log**:
  - `bun run ai:check`: EXIT 0 (全79テスト通過), `bun run typecheck`: EXIT 0

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `inherit`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存（chrome.*, Web専用ストア）の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  - 旧キャンバス実装 46 ファイルの完全撤廃、共有資産の core 移管、全 34 ファイルの参照置換が完全に確認され、4大定性監査にすべて合格。LGTM。
