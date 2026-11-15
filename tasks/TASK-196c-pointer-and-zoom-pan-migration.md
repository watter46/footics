# TASK-196c: Drawing Factory, Zoom/Pan, Polygon Zone, and Pointer Pipeline Migration

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate drawing factory, pointer pipeline, zoom/pan, and polygon zone drafting to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (drawing-factory + test + pointer-drawing)
  - Wave 2 (直列, Phase 1後): Phase 2 (pointer-state + pointer-tools + pointer-dispatcher)
  - Wave 3 (直列, Phase 2後): Phase 3 (zoom-pan + polygon-zone + pointer-interaction)
  - Wave 4 (直列, Phase 3後): Phase 4 (pitch-pan-outer-margin.test.ts + use-canvas-pointer.test.ts)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/utils,src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts,src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts,src/features/tactical-unified/core/hooks/use-canvas-polygon-zone.ts,src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts): useCanvasStore`
  - `rg(src/features/tactical-unified/core/utils/canvas-drawing-factory.ts,src/features/tactical-unified/core/utils/canvas-pointer-state.ts,src/features/tactical-unified/core/utils/canvas-pointer-tools.ts,src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts,src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts,src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts,src/features/tactical-unified/core/hooks/use-canvas-polygon-zone.ts,src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts): arrowHead|isComplete`

---

## 1. Architectural Invariants & Design Decisions

1. **Zero Incomplete Polygons in `DocumentStore`**:
   - `PolygonZoneSchema` (`src/lib/types/tactical/domain-entities.ts`) strictly requires `points.min(3)` and forbids `isComplete`.
   - `useCanvasPolygonZone` MUST store in-progress vertices in `SessionStore.drawingPreview` (`{ tool: 'polygon_zone', startPoint: toScreenNormPoint(...), currentPoint: toScreenNormPoint(...), polygonPoints }`), which `compileDrawingPreview` (`compile-zones.ts`) already renders!
   - Dispatch `{ type: 'ADD_ZONE', zone }` to `DocumentStore` ONLY when closing the polygon (`>= 3` vertices & clicking near vertex 0 or calling `completePolygon` with `>= 3` vertices).
2. **Strict `DomainArrowAnnotation` & `DomainZoneAnnotation` Shapes**:
   - `canvas-drawing-factory.ts` and `canvas-pointer-tools.ts` MUST NOT emit `arrowHead`; use `startMarker` / `endMarker` and `toScreenNormCoord` / `toScreenNormPoint` for all coordinates.
   - `commitDrawingShape` accepts callbacks `(arrow: DomainArrowAnnotation) => void` and `(zone: DomainZoneAnnotation) => void`.
3. **3-Frequency Pipeline Wiring**:
   - `canvas-pointer-state.ts` reads UI state (`activeTool`, `continuousDrawing`, `color`, `strokeWidth`, `drawingPreview`, `connectingPlayerId`) & actions (`setActiveTool`, `setDrawingPreview`, `setConnectingPlayerId`) from `useSessionStore`, reads `players` from `useDocumentStore` (`selectDomainActiveSlide`), dispatches `ADD_ARROW`, `ADD_ZONE`, `ADD_TEXT`, `ADD_PLAYER` via `dispatchSlide`, and implements `eraseAtPoint(normPos, radius = 4)` using `eraseEntitiesAtPoint(slide, normPos, radius)` + `DELETE_ENTITIES` (only when `ids.length > 0`).
   - `useCanvasZoomPan` reads `pitchTransform` from `selectDomainActiveSlide`, enforces `pitchTransform?.isLocked ?? false` Lock Guard, and dispatches `{ type: 'UPDATE_SLIDE_META', patch: { pitchTransform } }`.

---

## 2. Implementation Phases

### Phase 1: Canvas Drawing Factory, Test, and useCanvasPointerDrawing

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-drawing-factory.ts`
  - [MODIFY] `src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  ```ts
  export function commitDrawingShape(
    drawingPreview: DrawingPreview,
    color: string,
    strokeWidth: number,
    addArrow: (arrow: DomainArrowAnnotation) => void,
    addZone: (zone: DomainZoneAnnotation) => void,
  ): void;
  ```
  - `canvas-drawing-factory.ts`: replace `ArrowAnnotation`/`ZoneAnnotation`/`Player` with `DomainArrowAnnotation` (remove `arrowHead`, use `startMarker: 'none'`, `endMarker`, `toScreenNormPoint`), `DomainZoneAnnotation` (`shapeType: 'rect'`, `toScreenNormCoord`), and `PitchPlayer` (`area: 'pitch'`, `connectLines: []`, `badges: []`). Convert `DrawingPreview` inputs cleanly to `ScreenNormPoint` on commit.
  - `canvas-drawing-factory.test.ts`: remove `arrowHead` expectations; assert `endMarker: 'none' | 'dot' | 'arrow'` and `DomainZoneAnnotation` fields.
  - `use-canvas-pointer-drawing.ts`: replace `useCanvasStore` with `useSessionStore` + `useDocumentStore` (`selectDomainActiveSlide`, `dispatchSlide`).
- **Concrete Test Cases**:
  - `canvas-drawing-factory.test.ts`: `line` has `endMarker: 'none'`, `route_line` has `endMarker: 'dot'` & `#38bdf8`, `arrow_solid`/`arrow_dash`/`arrow_wavy` emit `endMarker: 'arrow'` with no `arrowHead`, `zone` emits `shapeType: 'rect'` `#ef4444` opacity `0.25`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/utils/canvas-drawing-factory.ts src/features/tactical-unified/core/utils/__tests__/canvas-drawing-factory.test.ts src/features/tactical-unified/core/hooks/use-canvas-pointer-drawing.ts
  ```

---

### Phase 2: Pointer State, Pointer Tools, and Pointer Dispatcher

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-pointer-state.ts`
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-pointer-tools.ts`
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts`
- **Reference Files**:
  - `src/lib/tactical/domain/erase-entities.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - `canvas-pointer-state.ts`: replace `useCanvasStore` with `useSessionStore` + `useDocumentStore` (`selectDomainActiveSlide`, `dispatchSlide`) + `eraseEntitiesAtPoint`. Expose `players: DomainPlayer[]`, `addArrow`, `addZone`, `addText`, `addPlayer`, `eraseAtPoint`, plus session actions (`setActiveTool`, `setDrawingPreview`, `setConnectingPlayerId`) preserving `UseCanvasPointerStoreReturn` fields expected by `pointer-tools` and `pointer-dispatcher`.
  - `canvas-pointer-tools.ts` & `canvas-pointer-dispatcher.ts`: accept `DomainPlayer[]`, `DomainArrowAnnotation`, `DomainZoneAnnotation`, `DomainTextAnnotation`, `PitchPlayer` creation using `toScreenNormCoord`/`toScreenNormPoint` and zero `arrowHead`.
- **Concrete Test Cases**:
  - Covered cleanly in Phase 4 (`use-canvas-pointer.test.ts`).
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/utils/canvas-pointer-state.ts src/features/tactical-unified/core/utils/canvas-pointer-tools.ts src/features/tactical-unified/core/utils/canvas-pointer-dispatcher.ts
  ```

---

### Phase 3: useCanvasZoomPan, useCanvasPolygonZone, and useCanvasPointerInteraction

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-polygon-zone.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts`
- **Reference Files**:
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/lib/tactical/compiler/compile-zones.ts`
- **Contract**:
  - `useCanvasZoomPan`: read `activePhaseId`, `activeSlideId` from `useSessionStore`, read `pitchTransform` from `useDocumentStore((s) => selectDomainActiveSlide(...).pitchTransform)`. Enforce `isLocked` Lock Guard and dispatch `{ type: 'UPDATE_SLIDE_META', patch: { pitchTransform } }`.
  - `useCanvasPolygonZone`: replace `useCanvasStore` with `useSessionStore` (`activeTool`, `continuousDrawing`, `color`, `drawingPreview`, `setDrawingPreview`, `setActiveTool`, `selectObject`) and `useDocumentStore` (`dispatchSlide`). Keep in-progress polygon vertices in `drawingPreview.polygonPoints` (`ScreenNormPoint[]`); only dispatch `ADD_ZONE` on closure (`>= 3` points, no `isComplete`, no incomplete slide zones cleanup needed).
  - `useCanvasPointerInteraction`: read `pitchTransform` from `useDocumentStore` (`selectDomainActiveSlide`), `clearSelection` from `useSessionStore`, remove `useCanvasStore`. Return `drawingPreview` directly from `pointerStore.drawingPreview` / `useSessionStore`.
- **Concrete Test Cases**:
  - Verified cleanly in Phase 4 tests.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/hooks/use-canvas-zoom-pan.ts src/features/tactical-unified/core/hooks/use-canvas-polygon-zone.ts src/features/tactical-unified/core/hooks/use-canvas-pointer-interaction.ts
  ```

---

### Phase 4: Zoom/Pan and Pointer Interaction Test Suite Migration

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/__tests__/pitch-pan-outer-margin.test.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts`
- **Reference Files**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - `pitch-pan-outer-margin.test.ts`: replace `CanvasStoreContext` / `createCanvasStore` with `<TacticalStoreProvider>` (`documentStore`, `sessionStore`); seed `pitchTransform.isLocked: true` via `UPDATE_SLIDE_META` on `documentStore` for lock test.
  - `use-canvas-pointer.test.ts`: replace `CanvasStoreContext` / `createCanvasStore` with `<TacticalStoreProvider>`. Update zoom/pan assertions to check `selectDomainActiveSlide` `pitchTransform`. Update polygon test (`[L146-201]`) to verify drafting appends vertices to `sessionStore.getState().drawingPreview?.polygonPoints` with `documentStore` `zones` length `0` while open, and commits 1 closed `DomainZoneAnnotation` (`shapeType: 'polygon'`, no `isComplete`) to `documentStore` only when clicking near vertex 0.
- **Concrete Test Cases**:
  - `pitch-pan-outer-margin.test.ts`: normal click does not pan, `Space` + click starts pan, locked pitch prevents pan.
  - `use-canvas-pointer.test.ts`: wheel zoom updates `pitchTransform.zoom` around cursor, `Space` drag updates `panX`/`panY`, `polygon_zone` drafts in `SessionStore` and commits on close to `DocumentStore`, empty drag extends `selectionBox`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/__tests__/pitch-pan-outer-margin.test.ts src/features/tactical-unified/core/hooks/__tests__/use-canvas-pointer.test.ts
  ```
