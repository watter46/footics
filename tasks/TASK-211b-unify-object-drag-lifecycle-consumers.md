# TASK-211b: 全盤面オブジェクトへの共通ドラッグライフサイクル適用

- **Status**: `DONE`
- **Commit**: `refactor(tactical): apply useObjectDragLifecycle across all board objects`
- **Execution Waves**:
  - Wave 1: Phase 1, Phase 2, Phase 3 (parallel; `TASK-211a` 完了後に実行)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx): setIsDragging\(true\);`
  - `rg(src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx): setIsDragging\(true\);`
  - `rg(src/features/tactical-unified/core/components/annotations/TextObject.tsx): setIsDragging\(true\);`

## 1. Architectural Invariants & Design Decisions
- **Invariants (壊してはいけない前提条件)**:
  1. ドラッグ移動中は `documentStore`（Undo/Redo 履歴）を更新せず、`dragend` 時のみ確定する。
  2. 選手マーカー・ゾーンの既存 HUD 開閉仕様（ドラッグ開始時は HUD 非表示、選手はドラッグ終了後も非表示のまま、ゾーンのみ終了後再表示）を崩さない。
  3. ベンチへのドロップや複数選択一括移動など、`useMarkerDragHandlers` 固有の挙動を維持する。
- **Design Decisions (実行時に迷わせない確定事項)**:
  1. `ZoneShapeNode`・`ZonePolygonNode`・`TextObject`・`ArrowLineNode` の個別 `setIsDragging` / `setIsHudOpen` / `!isSelected && onSelect` 実装を廃止し、`TASK-211a` で作成した `useObjectDragLifecycle` へ統一する。
  2. `useMarkerDragHandlers` は複数選択と props 注入互換を保ちつつ、`resolveEffectiveDragSelectedIds` を用いて Shift+未選択ドラッグ時の対象ズレを解消する。
  3. `ArrowObject` を単独レンダーしていた 2 つのテストファイル（`route-line-rendering.test.tsx`, `arrow-object-interaction.test.tsx`）はフォールバック逃げを作らず実 `TacticalStoreProvider` でラップする。
- **Consumers (同期更新対象)**:
  - `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts`
  - `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx`
  - `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx`
  - `src/features/tactical-unified/core/components/annotations/TextObject.tsx`
  - `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx`

## 2. Implementation Phases

### Phase 1: 選手マーカードラッグの Shift 複数選択整合とライフサイクル統一
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/use-marker-drag-handlers.ts` (L64-L122)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx` (L50-L136)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `useMarkerDragHandlers` の `handleDragStart` で `const isShift = Boolean((e.evt as MouseEvent | undefined)?.shiftKey);` を判定し、`!selectedIds.includes(markerId)` 時に `selectObject(markerId, isShift)` を呼ぶ。
    2. `effectiveSelectedIds` の算出に `resolveEffectiveDragSelectedIds(selectedIds, markerId, isShift)` を使用し、既存選択 `['p1']` の状態で Shift+未選択 `'p2'` をドラッグ開始した際も `dragMultiStateRef` が `['p1', 'p2']` の両方をスナップショットして同期追従させる。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx`:
    - 既存の HUD テスト 2 件を維持し、以下を追加:
    - `case 3`: `selectedIds=['p1']` の状態で `shiftKey=true` かつ未選択 `'p2'` を `dragstart` ➔ `dragmove` ➔ `dragend` したとき、`selectObject('p2', true)` が呼ばれ、`updateMarkers` に `'p1'` と `'p2'` の両方の移動パッチが渡される（単発 `updateMarker` にならない）。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/use-marker-drag-handlers.ts src/features/tactical-unified/core/components/__tests__/use-marker-drag-handlers-hud.test.tsx`

### Phase 2: ゾーン 2 種（Shape / Polygon）の共通ドラッグライフサイクル適用
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx` (L1-L70)
  - `[MODIFY]` `src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx` (L1-L85)
  - `[ADD]` `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx` (~130 lines)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `ZoneShapeNode` と `ZonePolygonNode` は `useSessionStore` の `setIsDragging` / `setIsHudOpen` を直接参照せず、`useObjectDragLifecycle({ isSelected, onSelect: (_isShift, e) => onSelect(e), reopenHudOnEnd: true })` を使用する。
    2. `ZoneShapeNode` のドラッグ（`handleDragStart` / `handleDragEnd`）および変形（`handleTransformStart` / `handleTransformEnd`）は `beginDrag`（または変形時は選択変更なしの開始）と `endDrag()` により `sessionStore.isDragging` と `isHudOpen` を一貫して遷移させる。
    3. `ZonePolygonNode` の `onDragStart` / `handleGroupDragEnd` も `beginDrag(e)` + `handleGroupDragStart(e)`、`rawHandleGroupDragEnd(e)` + `endDrag()` へ統一する。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`（実 `TacticalStoreProvider` 接続）:
    - `case 1`: 未選択の `ZoneShapeNode` を `dragstart` ➔ `sessionStore.isDragging === true`, `isHudOpen === false`, `onSelect` が呼ばれる。`dragend` ➔ `isDragging === false`, `isHudOpen === true`, `updateZone` が呼ばれる。
    - `case 2`: 未選択の `ZonePolygonNode` で同様に `dragstart` / `dragend` の選択同期と HUD 遷移が行われる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/zones/ZoneShapeNode.tsx src/features/tactical-unified/core/components/zones/ZonePolygonNode.tsx src/features/tactical-unified/__tests__/zone-and-text-drag-lifecycle.test.tsx`

### Phase 3: テキスト・矢印の共通ドラッグライフサイクル適用
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/TextObject.tsx` (L29-L95)
  - `[MODIFY]` `src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx` (L27-L132)
  - `[MODIFY]` `src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx` (L55-L80)
  - `[MODIFY]` `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx` (L94-L270)
- **Reference Files (Read-Only)**:
  - `src/features/tactical-unified/core/hooks/use-object-drag-lifecycle.ts`
- **Contract**:
  - 振る舞い仕様・境界条件:
    1. `TextObject` は `useSessionStore` 直接呼び出しを廃止し、`useObjectDragLifecycle({ isSelected, onSelect: (_isShift, e) => onSelect(e) })` の `beginDrag` / `endDrag` を `onDragStart` / `onDragEnd` で呼ぶ（`TextObject` 既存仕様どおり `reopenHudOnEnd` は `false`）。
    2. `ArrowLineNode` は `isAttachedToPlayer` でなければ `onDragStart` で `beginDrag(e)`、`onDragEnd` で `endDrag()` を呼ぶ（これにより矢印ドラッグ中も `sessionStore.isDragging === true`, `isHudOpen === false` が他オブジェクトと同等に機能する）。
    3. `route-line-rendering.test.tsx` と `arrow-object-interaction.test.tsx` のレンダーヘルパー／各ケースを `<TacticalStoreProvider>` でラップする。
- **Concrete Test Cases**:
  - `src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`:
    - 既存 4 ケース全パスに加え、以下を追加:
    - `case 5`: 未選択の `ArrowObject` 本体を `dragstart` ➔ `dragend` したとき、`isDragging` が `true` ➔ `false`、`isHudOpen` が `false` に遷移し `onSelect` が呼ばれる。
- **Verification**:
  - `bun run ai:check src/features/tactical-unified/core/components/annotations/TextObject.tsx src/features/tactical-unified/core/components/annotations/arrow-line-node.tsx src/features/tactical-unified/core/components/__tests__/route-line-rendering.test.tsx src/features/tactical-unified/__tests__/arrow-object-interaction.test.tsx`
