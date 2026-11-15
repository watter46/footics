# TASK-195b: Player HUDs and HUD Target Resolution Migration

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate player HUDs and hud-targets to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (並列): Phase 1 (quick-actions + popover), Phase 4 (hud-targets + use-hud-position)
  - Wave 2 (並列, Phase 1後): Phase 2 (player-hud + tests), Phase 5 (context-hud.test.tsx)
  - Wave 3 (直列, Phase 2後): Phase 3 (hud-and-editor.test.tsx PlayerHud verification)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/hud): useCanvasStore`
  - `rg(src/features/tactical-unified/core/components/hud): arrowHead|isComplete`

---

## 1. Architectural Invariants & Design Decisions

1. **Strict Arrow & Player Domain Types**:
   - `player-quick-actions.tsx` arrow creation (`ArrowActionGroup`) MUST NOT emit `arrowHead`; use `startMarker: 'none'`, `endMarker: 'arrow'`, `toScreenNormPoint` for all points, and dispatch `{ type: 'ADD_ARROW', arrow }`.
   - `PlayerQuickActionsProps`, `PlayerInfoPopoverProps`, and `hud-targets.ts` MUST type entities as `DomainPlayer`, `DomainArrowAnnotation`, `DomainZoneAnnotation`, `DomainTextAnnotation` (no legacy `Player` / `ZoneAnnotation`).
2. **Vision Cone, Spotlight, Connect Line & Lock Mutations**:
   - `VisionConeAction`: toggle cone via `{ type: 'SET_PLAYER_VISION_CONE', playerId: player.id, visionCone }`, or update via `{ type: 'UPDATE_PLAYER', id: player.id, patch: { visionCone } }`.
   - `SpotlightAction`: dispatch `{ type: 'SET_PLAYER_FOCUS', playerId: player.id, spotlight }`.
   - `ConnectLineAction`: toggle `sessionStore.connectingPlayerId` / `setConnectingPlayerId`; delete all connect lines on player via `UPDATE_PLAYER` (`connectLines: []`).
   - `PlayerHud`: bench return via `MOVE_PLAYER_TO_BENCH` (`computeNextBenchSlot` / next bench Y), lock via `{ type: 'TOGGLE_ENTITY_LOCK', id: player.id, kind: 'player' }`, remove via `{ type: 'REMOVE_PLAYER', id: player.id }` + `clearSelection()`.
3. **Discriminated Union narrowing in `hud-targets.ts`**:
   - `resolveZoneTarget` narrows polygon zones via `zone.shapeType === 'polygon'` and computes bounding box center (`points`); `rect` / `ellipse` compute center directly from `x + width / 2`, `y + height / 2`.
   - `HudTargetResolver` data context takes `{ players: readonly DomainPlayer[]; arrows: readonly DomainArrowAnnotation[]; zones: readonly DomainZoneAnnotation[]; texts: readonly DomainTextAnnotation[] }`.

---

## 2. Implementation Phases

### Phase 1: PlayerQuickActions and PlayerInfoPopover

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/player-quick-actions.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/player-info-popover.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/__tests__/player-info-popover.test.tsx`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/lib/tactical/domain/commands.ts`
- **Contract**:
  ```ts
  export interface PlayerQuickActionsProps {
    player: DomainPlayer;
  }
  export interface PlayerInfoPopoverProps {
    player: DomainPlayer;
    updateMarker: (id: string, patch: Partial<DomainPlayer>) => void;
    onClose: () => void;
  }
  ```
  - `player-quick-actions.tsx`: replace `useCanvasStore` with `useSessionStore` (`connectingPlayerId`, `setConnectingPlayerId`, `setActiveTool`, `clearSelection`) and `useDocumentStore` (`dispatchSlide`, `selectDomainActiveSlide`, `project.homeColor`, `project.awayColor`). Remove `arrowHead` from pass/dribble arrow creation and convert points via `toScreenNormPoint`.
  - `player-quick-actions.test.tsx`: migrate from `CanvasStoreContext` to `<TacticalStoreProvider>` (`createDocumentStore`, `createSessionStore`), construct test player with `createDefaultDomainPlayer`, assert `documentStore` `visionCone` color update.
  - `player-info-popover.test.tsx`: construct test player as `DomainPlayer` (`createDefaultDomainPlayer`).
- **Concrete Test Cases**:
  - `player-quick-actions.test.tsx`: clicking vision cone toggle / color picker updates `documentStore` active slide player `visionCone.color` to `'#ef4444'`.
  - `player-info-popover.test.tsx`: updates `shirtNo` and `name` via `updateMarker` callback.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/player-quick-actions.tsx src/features/tactical-unified/core/components/hud/__tests__/player-quick-actions.test.tsx src/features/tactical-unified/core/components/hud/player-info-popover.tsx src/features/tactical-unified/core/components/hud/__tests__/player-info-popover.test.tsx
  ```

---

### Phase 2: PlayerHud, PlayerHud Test, and ContextHud Extra Dual-Wrap

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/player-hud.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/__tests__/player-hud.test.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`
- **Reference Files**:
  - `src/lib/tactical/domain/invariants.ts`
  - `src/features/tactical-unified/components/hud/ball-hud.tsx`
- **Contract**:
  - `PlayerHud`: read `player` from `selectDomainActiveSlide` (`players.find((p) => p.id === playerId)`), `allPlayers` (`slide.players`), `workspaceMode` / `clearSelection` from `useSessionStore` (note: determine bench/delete capability cleanly from `sessionStore.workspaceMode` or `capabilities`, matching existing `mode === 'tactical-board'` vs `'screenshot-edit'` behavior via `workspaceMode !== 'annotation'` or `player.area` checks). Check `useSessionStore` workspaceMode values in `session-ui-state.ts` before writing!
  - Mutate via `dispatchSlide` (`UPDATE_PLAYER`, `MOVE_PLAYER_TO_BENCH`, `TOGGLE_ENTITY_LOCK`, `REMOVE_PLAYER`).
  - `player-hud.test.tsx`: replace `CanvasStoreContext` with `<TacticalStoreProvider>` and verify updates in `documentStore`.
  - `context-hud-extra.test.tsx`: wrap `ContextHud` renders with `<TacticalStoreProvider>` seeded with `'p1'` alongside `<CanvasStoreContext.Provider>` (kept until `TASK-195c` migrates `ContextHud.tsx`).
- **Concrete Test Cases**:
  - `player-hud.test.tsx`: color/glowBlur/bench/lock/delete controls dispatch expected `SlideCommand`s to `documentStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/player-hud.tsx src/features/tactical-unified/core/components/hud/__tests__/player-hud.test.tsx src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx
  ```

---

### Phase 3: Complete PlayerHud Verification in HUD and Editor Test

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/core/components/hud/player-hud.tsx`
- **Contract**:
  - Update `describe('PlayerHud')` (`[L337-551]`) in `hud-and-editor.test.tsx` to assert `shirtNo`, `name`, `glowBlur`, and removal against `documentStore` (`selectDomainActiveSlide`), ensuring `workspaceMode` covers Web 2D vs Extension 3D cases cleanly.
- **Concrete Test Cases**:
  - `hud-and-editor.test.tsx`: Web 2D hides bench/delete buttons; Extension mode shows delete button; `glowBlur` updates `documentStore` player `style.glowBlur`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/__tests__/hud-and-editor.test.tsx
  ```

---

### Phase 4: HUD Targets Resolution and useHudPosition

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - [MODIFY] `src/features/tactical-unified/core/components/hud/use-hud-position.ts`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  ```ts
  export type HudTargetResolver = (ctx: {
    selected: SelectedObject;
    offset: HudOffsetRect;
    nodesRegistryRef?: React.MutableRefObject<CanvasNodesRegistry>;
    data: {
      players: readonly DomainPlayer[];
      arrows: readonly DomainArrowAnnotation[];
      zones: readonly DomainZoneAnnotation[];
      texts: readonly DomainTextAnnotation[];
    };
  }) => HudTarget | null;
  ```
  - `hud-targets.ts`: replace legacy `Player`/`ArrowAnnotation`/`ZoneAnnotation`/`TextAnnotation` and `markers` field with `Domain*` types and `players`. Narrow polygon zone via `zone.shapeType === 'polygon'`. Keep `HUD_TARGET_RESOLVERS` registry and `registerHudTargetResolver` intact.
  - `use-hud-position.ts`: replace `useCanvasStore` (`annotations`, `pitchTransform`, `teamVisibility`) with `useSessionStore` (`activePhaseId`, `activeSlideId`, `teamVisibility`) + `useDocumentStore((s) => selectDomainActiveSlide(...))`. Compute offset using `slide?.pitchTransform` and pass `{ players, arrows, zones, texts }` to `resolveHudTarget`.
- **Concrete Test Cases**:
  - `useHudPosition` computes `HudPosition` from `DomainSlide` entities and `pitchTransform` without touching `CanvasStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/hud/hud-targets.ts src/features/tactical-unified/core/components/hud/use-hud-position.ts
  ```

---

### Phase 5: Update context-hud.test.tsx Target Resolution Callers

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/__tests__/context-hud.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/core/components/hud/hud-targets.ts`
  - `src/lib/types/tactical/branded.ts`
- **Contract**:
  - Update all `resolveHudTarget` calls (`[L49-309]`) in `context-hud.test.tsx` from `data: { markers, arrows, zones, texts }` to `data: { players, arrows, zones, texts }` with valid `DomainPlayer`, `DomainArrowAnnotation` (no `arrowHead`), `DomainZoneAnnotation` (`shapeType: 'rect' | 'polygon'`, `toScreenNormCoord`/`toScreenNormPoint`).
- **Concrete Test Cases**:
  - `context-hud.test.tsx`: Arrow (curved/straight/Konva node), Zone (rect/polygon/Konva node), Player (Konva node), `computeClampedHudPos`, `BallHud & ContextHud ball selection`, and `PlayerMarkerLabel` all pass.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/__tests__/context-hud.test.tsx
  ```
