# TASK-008: ツールバー & HUD のプラグイン化統合 (Task 1-B)

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-19
- **Target Files**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/use-hud-position.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/hud/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/ContextHud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/drawing-tool-plugin.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/toolbar/index.ts` (MODIFY)
  - `src/features/tactical-unified/core/components/CoreDrawingToolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/toolbar/drawing-toolbar.tsx` (MODIFY)
  - `src/features/tactical-unified/panels/hud/context-hud.tsx` (MODIFY)
  - `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx` (NEW)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] `core/components/ContextHud.tsx` でボール選択時に HUD が表示されロック切替できること（ホスト境界を侵害せずプラグイン注入型で実現）。
- [x] `CoreDrawingToolbar` が `markerMode` props に対応し 2D/3D ツールを適切に出し分けられること。
- [x] Web 側の `panels/toolbar` と `panels/hud` を `core` 側のコンポーネントを呼び出す薄いアダプターラッパーに刷新し、二重管理を解消すること。
- [x] 既存テスト群がすべてグリーンで、`bun run ai:check` が警告ゼロ・Exit Code 0 であること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 Import Specs
```ts
import {
  ContextHud as CoreContextHud,
  CoreDrawingToolbar,
  getDrawingTools,
  type HudTarget,
} from '@/features/tactical-unified/core';
```

### 3.2 Key Interfaces & Types
```ts
export interface ExtraHudProps {
  renderExtraHud?: (selected: SelectedObject) => React.ReactNode;
  resolveExtraTarget?: (selected: SelectedObject, offset: HudOffsetRect) => HudTarget | null;
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: Core HUD へのプラグイン拡張 & Ball 統合
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/hud/` 配下
- **Tasks**:
  - [x] 1. TDD実装: `resolveExtraTarget` / `renderExtraHud` プラグイン拡張と Ball HUD 統合（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `hud-targets.ts` に `resolveExtraTarget` プラグインと `selected.kind === 'ball'` 時の Konva ノード座標解決フォールバックを実装。
  - `use-hud-position.ts` および `ContextHud.tsx` に `resolveExtraTarget` と `renderExtraHud` を配線。
  - `context-hud-extra.test.tsx` にて RED ➔ GREEN を確認。

---

### Phase 2: CoreDrawingToolbar の markerMode 対応
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/core/components/toolbar/` 配下
- **Tasks**:
  - [x] 1. TDD実装: `getDrawingTools` と `CoreDrawingToolbar` の markerMode 対応（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `getDrawingTools(markerMode)` を提供し、`CoreDrawingToolbar` で `2d-only`, `3d-only`, `all` の出し分けをサポート。
  - `toolbar.test.tsx` に markerMode 出し分けテストを追加し GREEN を確認。

---

### Phase 3: panels/toolbar および panels/hud の Core 移行
- **Worker Model**: `flash`
- **対象ファイル**: `src/features/tactical-unified/panels/toolbar/`, `src/features/tactical-unified/panels/hud/`
- **Tasks**:
  - [x] 1. TDD実装: `drawing-toolbar.tsx` と `context-hud.tsx` の薄いラッパー化（RED ➔ GREEN ➔ `ai:check` PASS）
- **Worker Handoff Log**:
  - `drawing-toolbar.tsx`: `CoreDrawingToolbar` の薄いラッパーに刷新（231行から大幅削減）。
  - `context-hud.tsx`: `CoreContextHud` の薄いラッパーに刷新し、`renderExtraHud` で `BallHud`、`resolveExtraTarget` で `getBallTarget` を注入。
  - `ToolbarEraser` と `ToolbarResetButton` のアクセシブルネーム（`aria-label`）を Web 互換に統一。

---

### Phase 4: 全体検証
- **Worker Model**: `flash`
- **対象ファイル**: 全変更ファイル
- **Tasks**:
  - [x] 1. スコープ検証: `bun run ai:check` による TypeScript 型検査、Biome リント、Vitest が全PASS
- **Worker Handoff Log**:
  - `bun run ai:check` で 15 ファイルすべて型検査・Biome・Vitest (18 tests) PASS を確認。
  - `panels/hud/__tests__/context-hud.test.tsx` (8 tests) および `panels/toolbar/__tests__/drawing-toolbar*.test.tsx` (7 tests) もすべて PASS。

---

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `flash`
- **Reviewed At**: 2026-10-19
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 要件網羅性: Requirements の仕様が手抜きなくコードに実在するか（テストのハリボテ化がないか）
  - [x] 境界と副作用: Level 2 core にホスト依存（chrome.*, Web専用ストア）の混入がないか、useEffectによるFlickerがないか
  - [x] 設計負債防止: switch/ifの増殖（OCP違反）がなく、1ファイル250行以内に収まっているか
  - [x] サイレント破壊防止: 指示外ファイルの変更や既存コード・テストの勝手な削除がないか
- **Summary**:
  - Web専用ストアへの直接依存を排除し、プラグイン型で Ball HUD を外部注入することでホスト境界モデルを完全遵守。`CoreDrawingToolbar` への移行により重複実装が解消され、OCP・行数上限を満たしている。LGTM。

## 6. Rejections / Additional Tasks (不可逆修正欄)
<!-- 差し戻し時のみ追記 -->
