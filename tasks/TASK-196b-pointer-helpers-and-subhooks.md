# TASK-196b: Domain Erase, Selection Box, and Zone Rotation Migration

- **Status**: `DONE`
- **Commit**: `refactor(tactical): add domain eraseEntitiesAtPoint and migrate selection box and zone rotation hooks to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (domain erase-entities), Phase 2 (selection helpers + hook), Phase 4 (zone rotation helpers + hook)
  - Wave 2 (直列, Phase 2後): Phase 3 (five-layer-architecture.test.tsx useCanvasSelectionBox)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/utils/canvas-selection-helpers.ts,src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts,src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts,src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts): useCanvasStore`
  - `rg(src/features/tactical-unified/core/utils/canvas-selection-helpers.ts,src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts,src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts,src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts,src/lib/tactical/domain/erase-entities.ts): arrowHead|isComplete`

---

## 1. Architectural Invariants & Design Decisions

1. **Pure Domain Hit-Testing for Eraser (`src/lib/tactical/domain/erase-entities.ts`)**:
   - Place `eraseEntitiesAtPoint(slide: DomainSlide, point: { x: number; y: number }, radius?: number): readonly string[]` in Context 1 (`src/lib/tactical/domain/`), with zero React/Konva/Store imports.
   - Skip ALL entities with `locked === true` (consistent with `invariants.ts` Lock Guard and preventing empty undo records).
   - Never erase normal players (`shirtNo !== ''` or non-ring markers); ONLY erase ring markers (`shirtNo === '' && (style.markerType === 'ring' || style.markerType === 'ring-fade')`), arrows (`points`), zones (`shapeType === 'polygon'` vs `rect`/`ellipse`), and texts.
2. **Zone Discriminated Union Narrowing**:
   - Both `canvas-selection-helpers.ts` and `canvas-zone-rotation-helpers.ts` MUST accept `DomainZoneAnnotation` and narrow on `zone.shapeType === 'polygon'` instead of checking `zone.points` truthiness.
3. **Selection Box & Zone Rotation Store Split**:
   - `useCanvasSelectionBox`: reads `activeTool`, `activePhaseId`, `activeSlideId`, `teamVisibility`, `selectObjects`, `clearSelection` from `useSessionStore`; reads `activeSlide` (`DomainSlide`) + `pitchTransform` from `useDocumentStore` via `selectDomainActiveSlide`. Only selects `area === 'pitch'` players matching `teamVisibility`.
   - `useCanvasZoneRotation`: reads `activePhaseId`, `activeSlideId`, `setIsDragging`, `setIsHudOpen` from `useSessionStore`; reads `activeSlide?.zones` and dispatches `{ type: 'UPDATE_ZONE', id, patch: { rotation } }` via `useDocumentStore`.

---

## 2. Implementation Phases

### Phase 1: Pure Domain Entity Eraser (`eraseEntitiesAtPoint`)

- **Targets**:
  - [ADD] `src/lib/tactical/domain/erase-entities.ts`
  - [ADD] `src/lib/tactical/domain/__tests__/erase-entities.test.ts`
- **Reference Files**:
  - `src/features/tactical-unified/core/store/canvas-store-eraser.ts`
  - `src/features/tactical-unified/stores/annotation-erase-helpers.ts`
  - `src/lib/types/tactical/domain-hierarchy.ts`
- **Contract**:
  ```ts
  export function eraseEntitiesAtPoint(
    slide: DomainSlide,
    point: { readonly x: number; readonly y: number },
    radius?: number,
  ): readonly string[];
  ```
  - Default `radius = 4.0`.
  - Hit-test: arrows (segment distance across `arrow.points` <= radius), zones (`shapeType === 'polygon'` polygon containment/edge proximity; `'rect'` / `'ellipse'` rotated AABB/ellipse proximity), texts (center/label box proximity), and ring markers (`p.area === 'pitch' && p.shirtNo === '' && (p.style.markerType === 'ring' || p.style.markerType === 'ring-fade')`).
  - Exclude regular players (`shirtNo !== ''` or non-ring markers) and any entity where `locked === true`.
- **Concrete Test Cases**:
  - `erase-entities.test.ts`: erases hit arrow, rect/ellipse/polygon zone, text, and ring marker; ignores regular player at hit coordinates; skips locked arrow/zone/text/ring marker.
- **Verification**:
  ```bash
  bun run ai:check src/lib/tactical/domain/erase-entities.ts src/lib/tactical/domain/__tests__/erase-entities.test.ts
  ```

---

### Phase 2: Selection Helpers and useCanvasSelectionBox

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-selection-helpers.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts`
- **Reference Files**:
  - `src/lib/types/tactical/domain-hierarchy.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  - `canvas-selection-helpers.ts`: replace legacy `Player`/`ArrowAnnotation`/`ZoneAnnotation`/`TextAnnotation` params with `DomainSlide` (`slide.players`, `slide.arrows`, `slide.zones`, `slide.texts`). Filter players strictly to `p.area === 'pitch'` and matching `teamVisibility` (`'both' | 'home' | 'away'`). Narrow zones using `z.shapeType === 'polygon'` vs `rect`/`ellipse`.
  - `useCanvasSelectionBox`: replace `useCanvasStore` with `useSessionStore` (`activeTool`, `activePhaseId`, `activeSlideId`, `teamVisibility`, `selectObjects`, `clearSelection`) and `useDocumentStore` (`selectDomainActiveSlide` for `slide` and `pitchTransform`).
- **Concrete Test Cases**:
  - Verified in Phase 3 via `five-layer-architecture.test.tsx`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/utils/canvas-selection-helpers.ts src/features/tactical-unified/core/hooks/use-canvas-selection-box.ts
  ```

---

### Phase 3: five-layer-architecture.test.tsx useCanvasSelectionBox Wrap

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/tactical/domain/formation-placement.ts`
- **Contract**:
  - Migrate `describe('useCanvasSelectionBox')` (`[L573-791]`) in `five-layer-architecture.test.tsx` from `<CanvasStoreProvider>` / `useCanvasStore` to `<TacticalStoreProvider>` (`documentStore`, `sessionStore`, `createDefaultDomainPlayer`), observing `sessionStore.selectedObjects` (`map((o) => o.id)`) instead of `useCanvasStore((s) => s.selectedIds)`. Verify offset `vRect`, transformed `pitchTransform`, and bench/teamVisibility exclusion.
- **Concrete Test Cases**:
  - `five-layer-architecture.test.tsx`: all 3 `useCanvasSelectionBox` test cases pass via `TacticalStoreProvider` and `sessionStore.selectedObjects`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx
  ```

---

### Phase 4: Zone Rotation Helpers and useCanvasZoneRotation

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts`
  - [MODIFY] `src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  - `canvas-zone-rotation-helpers.ts`: accept `DomainZoneAnnotation` and narrow `zone.shapeType === 'polygon'` (bounding center from `zone.points`) vs `rect`/`ellipse` (center from `zone.x + zone.width / 2`, `zone.y + zone.height / 2`).
  - `useCanvasZoneRotation`: replace `useCanvasStore` with `useSessionStore` (`activePhaseId`, `activeSlideId`, `setIsDragging`, `setIsHudOpen`) and `useDocumentStore` (`selectDomainActiveSlide`, `dispatchSlide`). Dispatch `{ type: 'UPDATE_ZONE', id, patch: { rotation } }` during move/up.
- **Concrete Test Cases**:
  - Rotation center helper calculates bounding centroid for polygon zones and box center for rect/ellipse zones; `useCanvasZoneRotation` dispatches `UPDATE_ZONE` rotation update cleanly and restores `isDragging`/`isHudOpen` on pointerUp.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/utils/canvas-zone-rotation-helpers.ts src/features/tactical-unified/core/hooks/use-canvas-zone-rotation.ts
  ```
