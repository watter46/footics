# TASK-196a: Viewport, Background, Vision Cone Handles, Export, and Shortcuts Migration

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate viewport, CanvasStageContainer, BackgroundImageLayer, export, vision cone handles, and shortcuts to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (types + viewport + export), Phase 3 (BackgroundImageLayer + test)
  - Wave 2 (並列, Phase 1後): Phase 2 (CanvasStageContainer + test), Phase 4 (vision cone handles + shortcuts + test)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/hooks/use-canvas-viewport.ts,src/features/tactical-unified/core/hooks/use-canvas-export.ts,src/features/tactical-unified/core/components/CanvasStageContainer.tsx,src/features/tactical-unified/core/components/BackgroundImageLayer.tsx,src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx,src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts): useCanvasStore`
  - `rg(src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts): arrowHead|isComplete`

---

## 1. Architectural Invariants & Design Decisions

1. **Zero Fallback for `paddingRatio`**:
   - Replace `useCanvasStore((s) => s.capabilities?.paddingRatio ?? 0)` in `useCanvasViewport` with an explicit `paddingRatio?: number` parameter (default `0`) on `UseCanvasViewportParams` and `CanvasStageProps` (`CanvasStageContainerProps`).
2. **Document vs Session Mapping**:
   - `BackgroundImageLayer`: reads `backgroundImageUrl` and `aspectRatio` from `selectDomainActivePhase(project, activePhaseId)`, and `pitchAppearance` from `project.pitchAppearance` (`useDocumentStore` + `useSessionStore`).
   - `useCanvasExport`: reads `boundaryBox` from `selectDomainActiveBoundaryBox(project, activePhaseId)`.
   - `CanvasStageContainer`: reads `texts` from `selectDomainActiveSlide`, `canUndo` from `s.past.length > 0`, `canRedo` from `s.future.length > 0`, `undo`/`redo`/`dispatchSlide` from `useDocumentStore`, and `setIsDragging`/`setIsHudOpen`/`clearSelection` from `useSessionStore`. Note `editingText` state holds `DomainTextAnnotation | null` (resolving from `texts.find((t) => t.id === editingTextId)`), and text save/remove dispatches `UPDATE_TEXT` / `REMOVE_TEXT`.
   - `PlayerVisionConeHandles`: reads `setIsDragging` and `setIsHudOpen` from `useSessionStore`.
   - `useCanvasShortcuts`: uses `useTacticalStoresContext()` (`documentStore`, `sessionStore`), `selectDomainActiveSlide`, `extractSelectedObjects`, and `cloneAndOffsetClipboard` (`src/lib/tactical/domain/clipboard.ts`). Copy/Duplicate/Paste mutate `sessionStore.setClipboard` / `dispatchSlide({ type: 'INSERT_ENTITIES', ... })`; Delete/Backspace dispatch `{ type: 'DELETE_ENTITIES', ids }` (`selectedObjects.map((o) => o.id)`) + `clearSelection()`; Undo/Redo call `documentStore.getState().undo()` / `.redo()`.
3. **Konva Stage Test Dual-Wrap Compatibility**:
   - Until Wave C (`TASK-197`) migrates Konva layers (`PitchGroundLayer`, `BillboardObjectLayer`, `InteractionPreviewLayer`), `canvas-stage-container.test.tsx` keeps `<CanvasStoreContext.Provider>` nested inside `<TacticalStoreProvider>` for child Konva layers while verifying shortcuts, undo/redo, clearSelection, `paddingRatio={0.06}`, and PNG export against 3-frequency stores.

---

## 2. Implementation Phases

### Phase 1: CanvasStageProps, useCanvasViewport, and useCanvasExport

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/types.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-viewport.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-export.ts`
- **Reference Files**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
  - `src/features/tactical-unified/core/utils/virtual-canvas-rect.ts`
- **Contract**:
  ```ts
  export interface UseCanvasViewportParams {
    imageAspect?: number;
    paddingRatio?: number;
    onStageSizeChange?: (size: { width: number; height: number }) => void;
  }
  // In src/features/tactical-unified/core/types.ts CanvasStageProps:
  // Add optional: paddingRatio?: number;
  ```
  - `useCanvasViewport`: accept `paddingRatio = 0` from params, remove `useCanvasStore`, pass `paddingRatio` directly to `calculateVirtualCanvasRect`.
  - `useCanvasExport`: read `activePhaseId` from `useSessionStore`, read `boundaryBox` via `useDocumentStore((s) => selectDomainActiveBoundaryBox(s.project, activePhaseId))`. Remove `useCanvasStore`.
- **Concrete Test Cases**:
  - Verified cleanly via `canvas-stage-container.test.tsx` in Phase 2 (`paddingRatio={0.06}` margin & PNG export offset).
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/types.ts src/features/tactical-unified/core/hooks/use-canvas-viewport.ts src/features/tactical-unified/core/hooks/use-canvas-export.ts
  ```

---

### Phase 2: CanvasStageContainer and canvas-stage-container.test.tsx

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  - `CanvasStageContainer`: accept `paddingRatio` from props and forward to `useCanvasViewport`. Remove all `useCanvasStore` calls:
    - Read `activePhaseId`, `activeSlideId`, `setIsDragging`, `setIsHudOpen`, `clearSelection` from `useSessionStore`.
    - Read `texts`, `canUndo` (`s.past.length > 0`), `canRedo` (`s.future.length > 0`), `undo`, `redo`, `dispatchSlide` from `useDocumentStore`.
    - Dispatch `UPDATE_TEXT` / `REMOVE_TEXT` on text save/remove handlers; keep imperative `CanvasStageHandle` (`exportPng`, `copyToClipboard`, `undo`, `redo`, `canUndo`, `canRedo`).
  - `canvas-stage-container.test.tsx`: pass `paddingRatio={0.06}` in `Full-Tactical Margin & PNG Export Offset` test; seed/assert tool shortcuts, Delete/Backspace, Undo/Redo, and `handle` methods against `documentStore` and `sessionStore`.
- **Concrete Test Cases**:
  - `canvas-stage-container.test.tsx`: `paddingRatio={0.06}` ensures `vRect.x > 0, vRect.y > 0`; imperative `undo`/`redo`/`canUndo`/`canRedo` reflect `documentStore.past`/`future`; shortcuts delete seeded `arrow-del-1` in `documentStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/CanvasStageContainer.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx
  ```

---

### Phase 3: BackgroundImageLayer and background-image-layer.test.tsx

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/BackgroundImageLayer.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/stores/domain-selectors.ts`
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  - `BackgroundImageLayer`: read `activePhaseId` from `useSessionStore`, read `activePhase = useDocumentStore((s) => selectDomainActivePhase(s.project, activePhaseId))`, derive `backgroundImageUrl = activePhase?.backgroundImageUrl`, `aspectRatio = activePhase?.aspectRatio ?? '16:9'`, and `pitchAppearance = useDocumentStore((s) => s.project.pitchAppearance)`. Remove `useCanvasStore`.
  - `background-image-layer.test.tsx`: remove `CanvasStoreContext` / `createCanvasStore`; wrap in `<TacticalStoreProvider>` with custom `initialProject` (`backgroundImageUrl`, `aspectRatio`, `pitchAppearance`).
- **Concrete Test Cases**:
  - `background-image-layer.test.tsx`: mounts `preloadAllPitchSvgImages`, renders pitch SVG when `backgroundImageUrl` is absent, loads cached/async SVG, prioritizes `backgroundImageUrl` when set on active phase.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/BackgroundImageLayer.tsx src/features/tactical-unified/core/components/__tests__/background-image-layer.test.tsx
  ```

---

### Phase 4: PlayerVisionConeHandles and useCanvasShortcuts

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/__tests__/use-canvas-shortcuts.test.tsx`
- **Reference Files**:
  - `src/lib/tactical/domain/clipboard.ts`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  - `PlayerVisionConeHandles`: replace `useCanvasStore` `setIsDragging` / `setIsHudOpen` with `useSessionStore((s) => s.setIsDragging)` / `useSessionStore((s) => s.setIsHudOpen)`.
  - `useCanvasShortcuts`: obtain `{ documentStore, sessionStore }` from `useTacticalStoresContext()`. Preserve disabled/input-focus/modifier guards cleanly:
    - `Escape`: `setDrawingPreview(null)`, `setConnectingPlayerId(null)`, `clearSelection()`, `setActiveTool('select')`.
    - `Delete`/`Backspace`: if `selectedObjects.length > 0`, `documentStore.getState().dispatchSlide(activePhaseId, activeSlideId, { type: 'DELETE_ENTITIES', ids })` and `clearSelection()`.
    - `Cmd/Ctrl+Z` / `Shift+Z` / `Y`: `documentStore.getState().undo()` / `.redo()`.
    - `Cmd/Ctrl+C` / `V` / `D`: use `extractSelectedObjects(slide, selectedObjects)`, `sessionStore.getState().setClipboard`, `cloneAndOffsetClipboard(clipboard)`, and `dispatchSlide(..., { type: 'INSERT_ENTITIES', ... })` + `selectObjects(newSelectedObjects)`.
  - `use-canvas-shortcuts.test.tsx`: replace `CanvasStoreContext` / `createCanvasStore` with `<TacticalStoreProvider>` and verify `sessionStore` tool changes & `disabled` guard.
- **Concrete Test Cases**:
  - `use-canvas-shortcuts.test.tsx`: verifies numeric/letter tool shortcuts update `sessionStore.activeTool`, ignores when `disabled: true` or focused in `<input>`, `Escape` resets active tool/selection, `Delete` removes selected entity in `documentStore`, `Cmd+Z` restores it, `Cmd+C`/`Cmd+V` clones entities with offset into `documentStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/objects/player/components/player-vision-cone-handles.tsx src/features/tactical-unified/core/hooks/use-canvas-shortcuts.ts src/features/tactical-unified/core/hooks/__tests__/use-canvas-shortcuts.test.tsx
  ```
