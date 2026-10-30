# TASK-113: tactical-stage1-completion-and-bridge-di

## 1. Metadata
- **Status**: `DONE`
- **Created**: 2026-10-30
- **Target Files**:
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts` (DELETE)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (MODIFY)
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts` (MODIFY)

## 2. Requirements & Acceptance Criteria (受入要件)
- [x] 1. `adapter-cache-helpers.ts` の `LocalAdapterState`（`drawingPreview`, `isDragging`, `isHudOpen`, `color`, `strokeWidth`, `fontSize`, `customColor`, `markerMode`）と関連ヘルパー（`createInitialLocalState`, `applyLocalStatePartial`）を撤去し、`ToolSlice`（`tool-slice.ts`）へ統合すること。
- [x] 2. `tactical-canvas-store-adapter.ts` が内部でローカル状態を一切保持せず、すべての状態読込・アクション実行・`setState` を `unifiedStore`（マスターストア）へ純粋委譲すること（同値更新時は通知をスキップすること）。
- [x] 3. 未使用のデッドコードとなっている `src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts` を削除すること。
- [x] 4. `injectMatchToTactical`（`match-to-tactical-bridge.ts`）および `injectTeamSquadToTactical`（`squad-to-tactical-bridge.ts`）がオプショナルな `storeApi?: TacticalUnifiedStoreApi`（デフォルトは `defaultTacticalUnifiedStore`）を受け取り、`useTacticalUnifiedStore` の直接 import を排除すること。
- [x] 5. `use-tactical-match-init.ts` の `loadAndInjectMatch` が `injectMatchToTactical({ match, minute, storeApi })` に Context の `storeApi` を引き渡し、独立した `TacticalUnifiedStoreProvider` 配下でも対象ストアへ確実に試合データが注入されること。
- [x] 6. 既存の全テストおよび新規追加テスト、`bun run ai:check` が exit code 0 でパスすること。

## 3. Context Snippets (参照コード・型定義・import)

### 3.1 `tool-slice.ts` への追加プロパティとアクション仕様
```ts
import type { StateCreator } from 'zustand';
import type { DrawingPreviewState } from '@/features/tactical-unified/core/types';
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical-unified';
import type { TacticalUnifiedState } from './tactical-unified-store';

export interface ToolSlice {
  // ── ツール & 選択状態
  activeTool: DrawingTool;
  continuousDrawing: boolean;
  selectedObjects: SelectedObject[];
  connectingPlayerId: string | null;
  activeMarkerOptionTab: MarkerOptionTab | null;

  // ── キャンバス作図設定 & 一時UI状態
  drawingPreview: DrawingPreviewState | null;
  isDragging: boolean;
  isHudOpen: boolean;
  color: string;
  strokeWidth: number;
  fontSize: number;
  customColor: string;
  markerMode: '2d-only' | '3d-only' | 'all';

  // ── 表示制御
  teamVisibility: 'both' | 'home' | 'away';
  panels: PanelState;

  // ── アクション
  setActiveTool: (tool: DrawingTool) => void;
  setContinuousDrawing: (val: boolean) => void;
  toggleContinuousDrawing: () => void;
  setColor: (color: string) => void;
  setCustomColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  setMarkerMode: (mode: '2d-only' | '3d-only' | 'all') => void;
  setDrawingPreview: (preview: DrawingPreviewState | null) => void;
  setIsDragging: (dragging: boolean) => void;
  setIsHudOpen: (open: boolean) => void;
  // ...既存アクション
}
```

### 3.2 ブリッジ関数の `storeApi` DI シグネチャ
```ts
// src/lib/tactical/match-to-tactical-bridge.ts
import {
  defaultTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';

export interface InjectMatchToTacticalOptions {
  match: Match;
  minute?: number;
  slideId?: string;
  storeApi?: TacticalUnifiedStoreApi;
}

export function injectMatchToTactical({
  match,
  minute = 0,
  slideId,
  storeApi = defaultTacticalUnifiedStore,
}: InjectMatchToTacticalOptions): void {
  const store = storeApi.getState();
  // ...
}
```

## 4. Implementation Phases (Worker 実装手順)

### Phase 1: ToolSlice へのキャンバスUI状態の統合とアダプター内部ローカル状態の完全撤去
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/features/tactical-unified/stores/tool-slice.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-cache-helpers.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/tactical-canvas-store-adapter.ts` (MODIFY)
  - `src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts` (DELETE)
  - `src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` (MODIFY)
- **契約 (Interface)**:
  - `tool-slice.ts`:
    - 初期値: `drawingPreview: null`, `isDragging: false`, `isHudOpen: true`, `color: '#ffffff'`, `strokeWidth: 2`, `fontSize: 14`, `customColor: '#ffffff'`, `markerMode: 'all'` を追加。
    - 各 setter（`setColor`, `setCustomColor`, `setStrokeWidth`, `setFontSize`, `setMarkerMode`, `setDrawingPreview`, `setIsDragging`, `setIsHudOpen`）は同値チェック（例: `set((s) => (s.isDragging === dragging ? s : { isDragging: dragging }))`）を行い、同じ値の時は状態更新・通知を発生させないこと。
    - `selectObject(obj, multi)` で `obj` が非 null の場合、および `selectObjects(objects, multi)` で `objects.length === 1` の場合は `isHudOpen: true` も同時にセットすること。
  - `adapter-cache-helpers.ts`:
    - `LocalAdapterState`, `createInitialLocalState`, `applyLocalStatePartial` を削除し、`DEFAULT_CAPABILITIES`, `DEFAULT_HISTORY`, `DEFAULT_BALL`, `createAnnotationCache`, `createSelectedIdsCache` のみを残す。
  - `tactical-canvas-store-adapter.ts`:
    - `local` 変数と `setLocal` を完全撤去。
    - `setColor`, `setCustomColor`, `setStrokeWidth`, `setFontSize`, `setMarkerMode`, `setDrawingPreview`, `setIsDragging`, `setIsHudOpen` を全て `s().setXxx(...)` に直接委譲。
    - `buildState()` では `state.color`, `state.customColor`, `state.strokeWidth`, `state.fontSize`, `state.markerMode`, `state.drawingPreview`, `state.isDragging`, `state.isHudOpen` を直接射影する。
    - `setState(partial)` では `next`（関数またはオブジェクト）から `drawingPreview`, `isDragging`, `isHudOpen`, `color`, `strokeWidth`, `fontSize`, `customColor`, `markerMode` の差分を抽出し、現在の `s()` と異なる値が存在する場合のみ `unifiedStore.setState(patch)` を呼ぶ。
  - `adapter-clipboard-helpers.ts`: `git rm src/features/tactical-unified/adapters/adapter-clipboard-helpers.ts` で削除する。
- **Testing Strategy**: `tactical-canvas-store-adapter.test.ts` で、`setColor` / `setStrokeWidth` / `setIsDragging` / `setDrawingPreview` / `setMarkerMode` がマスターストア（`unifiedStore`）の状態と双方向に完全一致すること、および同値 `setState` で通知がスキップされることを検証。
- **Tasks**:
  - [x] 1. TDD RED: `tactical-canvas-store-adapter.test.ts` にマスターストアとの双方向状態一致テストを追加し、`bun run ai:check:red src/features/tactical-unified/adapters/__tests__/tactical-canvas-store-adapter.test.ts` で失敗を確認
  - [x] 2. TDD GREEN & 削除: `tool-slice.ts`, `adapter-cache-helpers.ts`, `tactical-canvas-store-adapter.ts` を実装し、`adapter-clipboard-helpers.ts` を削除
  - [x] 3. 検証: `bun run ai:check src/features/tactical-unified/stores/tool-slice.ts src/features/tactical-unified/adapters/` PASS
- **Worker Handoff Log**:
  - `ToolSlice` に UI 状態（`drawingPreview`, `isDragging`, `isHudOpen`, `color`, `strokeWidth`, `fontSize`, `customColor`, `markerMode`）および同値チェック付き setter を統合完了。
  - アダプター内部ローカル状態を全廃し、`buildState`・`setState` ともにマスターストアへの完全委譲（差分時のみ `setState` 呼出し）を実現。

---

### Phase 2: 外部ブリッジ関数（Match / Squad）と `useTacticalMatchInit` の `storeApi` DI 対応
- **Worker Model**: `flash`
- **対象ファイル**:
  - `src/lib/tactical/match-to-tactical-bridge.ts` (MODIFY)
  - `src/lib/tactical/squad-to-tactical-bridge.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/use-tactical-match-init.ts` (MODIFY)
  - `src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts` (MODIFY)
  - `src/lib/tactical/__tests__/squad-to-tactical-bridge.test.ts` (MODIFY)
  - `src/features/tactical-unified/hooks/__tests__/use-tactical-match-init.test.ts` (MODIFY)
- **契約 (Interface)**:
  - `match-to-tactical-bridge.ts`: `InjectMatchToTacticalOptions` に `storeApi?: TacticalUnifiedStoreApi` を追加し、`injectMatchToTactical` 内で `(storeApi ?? defaultTacticalUnifiedStore).getState()` を使用する。`useTacticalUnifiedStore` の import を削除する。
  - `squad-to-tactical-bridge.ts`: `InjectTeamSquadOptions` に `storeApi?: TacticalUnifiedStoreApi` を追加し、`injectTeamSquadToTactical` 内で `(storeApi ?? defaultTacticalUnifiedStore).getState()` を使用する。`useTacticalUnifiedStore` の import を削除する。
  - `use-tactical-match-init.ts`: `loadAndInjectMatch` 内の `injectMatchToTactical({ match, minute, storeApi })` に `storeApi` を渡す。
- **Testing Strategy**: `match-to-tactical-bridge.test.ts`, `squad-to-tactical-bridge.test.ts`, `use-tactical-match-init.test.ts` に、独立生成した `createTacticalUnifiedStore()` インスタンスへ注入した際に `defaultTacticalUnifiedStore` を汚染せず対象ストアのみが更新されるテストを追加。
- **Tasks**:
  - [x] 1. TDD RED: 各テストファイルに独立 `storeApi` 注入テストを追加し、`bun run ai:check:red src/lib/tactical/__tests__/match-to-tactical-bridge.test.ts` で失敗を確認
  - [x] 2. TDD GREEN: `match-to-tactical-bridge.ts`, `squad-to-tactical-bridge.ts`, `use-tactical-match-init.ts` を実装
  - [x] 3. 検証: `bun run ai:check src/lib/tactical/ src/features/tactical-unified/hooks/` PASS
- **Worker Handoff Log**:
  - `injectMatchToTactical` および `injectTeamSquadToTactical` に `storeApi?: TacticalUnifiedStoreApi` オプション引数を導入し、`useTacticalUnifiedStore` の直接インポートを根絶。
  - `useTacticalMatchInit` が Context 経由の `storeApi` を注入関数へ連携し、独立ストアプロバイダー配下での完全隔離動作を担保。

## 5. Reviewer Assessment (コード差分監査)
- **Reviewer Model**: `pro`
- **Reviewed At**: 2026-10-30 11:05
- **Decision**: `LGTM`
- **Audit Checklist**:
  - [x] 1. 要件網羅性 & テスタビリティ: 受入要件の全網羅、ダミー実装・ハックの排除、DI可能な設計と検証
  - [x] 2. ホスト境界 & Store Provider & Zero-Flicker & RAII: Level 2以下のホスト非依存、Store Provider経由取得、初期値Props確定注入、副作用クリーンアップ
  - [x] 3. 設計負債 & 拡張性: OCPプラグイン/レジストリ化、SLAP/Shell Purity遵守、局所性担保
  - [x] 4. サイレント破壊 & 既存保護: 公開シグネチャ・既存型破壊の防止、指示外変更の排除
- **Summary**: キャンバスUI状態のToolSlice単一化と同値更新ガード、各ブリッジ関数および初期化hookへのstoreApi DI注入を4大定性監査基準に基づき承認。

## 6. Rejections / Additional Tasks (不可逆修正欄)
