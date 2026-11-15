# TASK-195a: Core Leaf HUDs Migration to Three-Frequency Stores

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate leaf HUD components to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1, Phase 2 (arrow-hud + effect-inspector test), Phase 3 (zone-hud + stage-container pre-wrap)
  - Wave 2 (直列): Phase 4 (hud-and-editor.test.tsx Dual-Wrap & MiniColorPicker/Arrow/Zone Verification)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/hud/mini-color-picker.tsx,src/features/tactical-unified/core/components/hud/text-hud.tsx,src/features/tactical-unified/core/components/hud/connect-line-hud.tsx,src/features/tactical-unified/core/components/hud/arrow-hud.tsx,src/features/tactical-unified/core/components/hud/zone-hud.tsx): useCanvasStore`
  - `rg(src/features/tactical-unified/core/components/hud/arrow-hud.tsx,src/features/tactical-unified/core/components/hud/zone-hud.tsx): arrowHead|isComplete`

---

## 1. Architectural Invariants & Design Decisions

1. **Zero Fallback & 3-Frequency Split**:
   - Ephemeral UI (`customColor`, `setCustomColor`, `clearSelection`) uses `useSessionStore` (`src/features/tactical-unified/stores/session-store.ts`).
   - Persistent slide entities (`texts`, `arrows`, `zones`, `players`, `homeColor`, `awayColor`) read from `useDocumentStore` via `selectDomainActiveSlide(state.project, activePhaseId, activeSlideId)` and mutate exclusively via `dispatchSlide(...)`.
2. **Lock Guard Invariant**:
   - `enforceSlideInvariants` (`src/lib/tactical/domain/invariants.ts`) restores locked entities on `UPDATE_*` commands unless `command.type === 'TOGGLE_ENTITY_LOCK'`.
   - Lock toggle buttons in `text-hud.tsx`, `arrow-hud.tsx`, `zone-hud.tsx` MUST dispatch `{ type: 'TOGGLE_ENTITY_LOCK', id, kind }`.
3. **Zone Discriminated Union Narrowing**:
   - `DomainZoneAnnotation` is a union (`RectZone | EllipseZone | PolygonZone`). Polygon checks MUST narrow on `zone.shapeType === 'polygon'` instead of truthiness on `zone.points`.
4. **Effect Inspector & Intermediate Dual-Wrap Compatibility**:
   - Until `ContextHud` (`TASK-195c`) and Konva Layers (`TASK-197`) migrate, integration tests (`canvas-stage-container.test.tsx`, `hud-and-editor.test.tsx`) temporarily wrap `<TacticalStoreProvider>` alongside `<CanvasStoreContext.Provider>` and seed `arrow-del-1` / test entities in both stores so every phase passes `vitest` and `tsc` standalone.

---

## 2. Implementation Phases

### Phase 1: MiniColorPicker, TextHud, and ConnectLineHud

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/mini-color-picker.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/text-hud.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/connect-line-hud.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/__tests__/connect-line-hud.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/components/hud/ball-hud.tsx`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  - `MiniColorPicker`: replace `useCanvasStore` `customColor` / `setCustomColor` with `useSessionStore((s) => s.customColor)` and `useSessionStore((s) => s.setCustomColor)`.
  - `TextHud`: read active slide via `useSessionStore` (`activePhaseId`, `activeSlideId`) + `useDocumentStore((s) => selectDomainActiveSlide(...))`, find `text` in `slide?.texts`. Mutate via `dispatchSlide` (`UPDATE_TEXT`, `REMOVE_TEXT`, `TOGGLE_ENTITY_LOCK` with `kind: 'text'`) and `useSessionStore((s) => s.clearSelection)` on delete.
  - `ConnectLineHud`: read `player` (`area === 'pitch'`), `homeColor`/`awayColor` from `useDocumentStore`, resolve connect line by `connectLineId`. Mutate via `dispatchSlide({ type: 'UPDATE_PLAYER', id: parentPlayerId, patch: { connectLines } })` (update/delete `connectLines` array on `PitchPlayer`) and `clearSelection()` via `useSessionStore` on delete.
  - `connect-line-hud.test.tsx`: replace `CanvasStoreContext` / `createCanvasStore` with `<TacticalStoreProvider>` (`createDefaultTacticalProject` + `createDocumentStore` + `createSessionStore`), wrap state assertions on `documentStore.getState()` and `sessionStore.getState()`.
- **Concrete Test Cases**:
  - `connect-line-hud.test.tsx`: renders `ConnectLineHud` for `cl-1` on `p1`, color change updates `player.connectLines[0].color` in `documentStore`, style/dash toggle updates `dashArray`/`lineStyle`, delete removes `cl-1` from `player.connectLines` and clears `sessionStore.selectedObjects`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/mini-color-picker.tsx src/features/tactical-unified/core/components/hud/text-hud.tsx src/features/tactical-unified/core/components/hud/connect-line-hud.tsx src/features/tactical-unified/core/components/hud/__tests__/connect-line-hud.test.tsx
  ```

---

### Phase 2: ArrowHud and Effect Inspector Test

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/arrow-hud.tsx`
  - [MODIFY] `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/components/hud/ball-hud.tsx`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  - `ArrowHud`: read `arrow` from `selectDomainActiveSlide(state.project, activePhaseId, activeSlideId)?.arrows`.
  - Dispatch `{ type: 'UPDATE_ARROW', id: arrow.id, patch }` for color, strokeWidth, dashArray, marker (`endMarker`/`startMarker`), effect toggle (`type: 'grow' | 'none'`).
  - Dispatch `{ type: 'TOGGLE_ENTITY_LOCK', id: arrow.id, kind: 'arrow' }` for lock toggle.
  - Dispatch `{ type: 'REMOVE_ARROW', id: arrow.id }` + `clearSelection()` for delete.
  - `effect-inspector-panel.test.tsx` (`describe('ArrowHud ⚡️ ボタン')` [L379-457]): migrate from `createCanvasStore`/`renderWithCanvasStore` to `renderWithTacticalStores` (already defined in L31), remove unused `createCanvasStore`/`CanvasStoreContext`/`renderWithCanvasStore`/`ArrowAnnotation` imports, verify `documentStore` slide arrow `effect.type` toggles `'grow'` <-> `'none'`.
- **Concrete Test Cases**:
  - `effect-inspector-panel.test.tsx`: clicking ⚡️ button dispatches `UPDATE_ARROW` toggling `effect.type` from `undefined`/`'none'` to `'grow'` and back to `'none'` inside `documentStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/arrow-hud.tsx src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx
  ```

---

### Phase 3: ZoneHud and Stage Container Test Dual-Wrap

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/zone-hud.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/tactical/domain/invariants.ts`
- **Contract**:
  - `ZoneHud`: read `zone` from `selectDomainActiveSlide(...)?.zones`. Narrow polygon check via `zone.shapeType === 'polygon'` (`isPolygon`).
  - Dispatch `{ type: 'UPDATE_ZONE', id: zone.id, patch }` for color, opacity, strokeColor, strokeWidth, dashArray, shape/pattern updates.
  - Dispatch `{ type: 'TOGGLE_ENTITY_LOCK', id: zone.id, kind: 'zone' }` for lock toggle.
  - Dispatch `{ type: 'REMOVE_ZONE', id: zone.id }` + `clearSelection()` on delete.
  - `canvas-stage-container.test.tsx`: wrap `renderWithStore` helper in `<TacticalStoreProvider>` around `<CanvasStoreContext.Provider>` and seed `arrow-del-1` (`DomainArrowAnnotation` with `toScreenNormPoint`) in `initialProject` so `ArrowHud` rendering on `arrow-del-1` selection continues passing cleanly until `TASK-196a`.
- **Concrete Test Cases**:
  - `ZoneHud` narrows `shapeType === 'polygon'` without reading `zone.points` on `rect`/`ellipse` zones.
  - `canvas-stage-container.test.tsx` Delete/Backspace key tests continue passing with `ArrowHud` mounted.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/zone-hud.tsx src/features/tactical-unified/core/components/__tests__/canvas-stage-container.test.tsx
  ```

---

### Phase 4: HUD and Editor Test Update (MiniColorPicker, ArrowHud, ZoneHud, Text)

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - Update `renderWithStore` helper in `hud-and-editor.test.tsx` to wrap `<TacticalStoreProvider>` with real `documentStore` and `sessionStore` instances returned from the helper (seeded with matching test arrow, rect zone, and players alongside `CanvasStoreContext.Provider` for `ContextHud` and `PlayerHud` until `TASK-195b`/`195c`).
  - Update `describe('MiniColorPicker')` (`[L305-335]`) to wrap `<TacticalStoreProvider>` and verify swatch/`HexColorPicker` updates `sessionStore.getState().customColor` or calls `onChange`.
  - Update `describe('ContextHud')` arrow & zone color/strokeWidth assertions (`[L68-161]`) to assert changes on `documentStore` (`selectDomainActiveSlide(...)?.arrows` / `zones`), while keeping player marker test seeded in both stores until `TASK-195b`.
  - Update `describe('PitchInlineTextEditor')` (`[L204-241]`) mock text to valid `DomainTextAnnotation` (`toScreenNormCoord`), compatible with both current `TextAnnotation` and upcoming `TASK-195c`.
- **Concrete Test Cases**:
  - `hud-and-editor.test.tsx`: passes all `ContextHud`, `MiniColorPicker`, `PitchInlineTextEditor`, `PlayerHud`, and 2D zoom/pan tests cleanly.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx
  ```
