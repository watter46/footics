# TASK-195c: ContextHud, Overlays, and Inline Text Editor Migration

- **Status**: `DONE`
- **Commit**: `refactor(tactical): migrate ContextHud, HtmlHudOverlay, CanvasOverlays, and PitchInlineTextEditor to three-frequency stores`
- **Execution Waves**:
  - Wave 1 (直列): Phase 1 (ContextHud + context-hud-extra.test.tsx), Phase 2 (pitch-bench-transition.test.ts)
  - Wave 2 (直列): Phase 3 (HtmlHudOverlay, CanvasOverlays, PitchInlineTextEditor)
  - Wave 3 (並列): Phase 4 (five-layer-architecture.test.tsx), Phase 5 (clean-render.test.tsx)
- **Negative Contracts**:
  - `rg(src/features/tactical-unified/core/components/ContextHud.tsx,src/features/tactical-unified/core/components/HtmlHudOverlay.tsx,src/features/tactical-unified/core/components/CanvasOverlays.tsx,src/features/tactical-unified/core/components/PitchInlineTextEditor.tsx): useCanvasStore`
  - `rg(src/features/tactical-unified/core/components/HtmlHudOverlay.tsx,src/features/tactical-unified/core/components/CanvasOverlays.tsx,src/features/tactical-unified/core/components/PitchInlineTextEditor.tsx): \bTextAnnotation\b`

---

## 1. Architectural Invariants & Design Decisions

1. **Registry & Layer Boundary Preservation**:
   - Keep `HUD_CONTENT_RENDERERS` and `registerHudContentRenderer` in `ContextHud.tsx` untouched semantically (only swap `useCanvasStore` selectors to `useSessionStore` / `useDocumentStore`).
   - `HtmlHudOverlay`, `CanvasOverlays`, and `PitchInlineTextEditor` reside in Level 2/3 under `core/components/` and MUST NOT import host-specific Web/Extension stores or `CanvasStore`.
2. **Ephemeral vs Persistent Split**:
   - `ContextHud` reads `selectedObjects`, `isDragging`, `isHudOpen`, `activeTool` from `useSessionStore`.
   - `HtmlHudOverlay` / `CanvasOverlays` read `activeTool` and `isDragging` from `useSessionStore` (or `pitchTransform` for `PitchInlineTextEditor` from `useDocumentStore` active slide via `selectDomainActiveSlide`, forwarding it explicitly as `pitchTransform` prop to `PitchInlineTextEditor`).
3. **DomainTextAnnotation Type Alignment**:
   - `PitchInlineTextEditorProps`, `HtmlHudOverlayProps`, and `CanvasOverlaysProps` accept `editingText: DomainTextAnnotation | null` instead of legacy `TextAnnotation`.

---

## 2. Implementation Phases

### Phase 1: ContextHud and context-hud-extra.test.tsx

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/ContextHud.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/stores/session-store.ts`
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - `ContextHud.tsx`: replace `useCanvasStore` selectors (`selectedObjects`, `isDragging`, `isHudOpen`, `activeTool`) with `useSessionStore`. Keep `HUD_CONTENT_RENDERERS`, `registerHudContentRenderer`, `renderExtraHud`, `resolveExtraTarget` props/APIs intact.
  - `context-hud-extra.test.tsx`: remove all `CanvasStoreContext` / `createCanvasStore` usage; render exclusively with `<TacticalStoreProvider>` (`createDocumentStore`, `createSessionStore`, `createPlaybackStore`) and mutate `sessionStore` for selection (`selectObject`, `setIsDragging`, `setIsHudOpen`).
- **Concrete Test Cases**:
  - `context-hud-extra.test.tsx`: `renderExtraHud` / `resolveExtraTarget` render custom HUDs for custom kinds, standard `'player'` selection renders `PlayerHud`, and `isDragging === true` hides `ContextHud` (`null`).
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/ContextHud.tsx src/features/tactical-unified/core/components/__tests__/context-hud-extra.test.tsx
  ```

---

### Phase 2: Migrate ContextHud Section in pitch-bench-transition.test.ts

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts`
- **Reference Files**:
  - `src/features/tactical-unified/stores/tactical-store-provider.tsx`
- **Contract**:
  - Update `describe('ContextHud')` (`[L298-326]`) in `pitch-bench-transition.test.ts` (and remove unused `CanvasStoreProvider` / `useCanvasStore` imports if unused after this update — preserve lines 1-297 tactical-unified-store tests untouched!). Wait: verify if lines 1-297 use `CanvasStoreProvider`; if only L298-326 uses it, replace `<CanvasStoreProvider>` there with `<TacticalStoreProvider>` + `sessionStore`/`documentStore`.
- **Concrete Test Cases**:
  - `pitch-bench-transition.test.ts`: `describe('ContextHud')` renders cleanly with `TacticalStoreProvider`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/__tests__/pitch-bench-transition.test.ts
  ```

---

### Phase 3: HtmlHudOverlay, CanvasOverlays, and PitchInlineTextEditor

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/PitchInlineTextEditor.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
  - [MODIFY] `src/features/tactical-unified/core/components/CanvasOverlays.tsx`
- **Reference Files**:
  - `src/lib/types/tactical/domain-entities.ts`
  - `src/features/tactical-unified/stores/domain-selectors.ts`
- **Contract**:
  ```ts
  export interface PitchInlineTextEditorProps {
    editingText: DomainTextAnnotation | null;
    stageSize: { width: number; height: number };
    pitchRect?: { x: number; y: number; width: number; height: number };
    pitchTransform?: { panX: number; panY: number; zoom: number; tilt?: number };
    onSave: (textId: string, content: string) => void;
    onRemove: (textId: string) => void;
    onClose: () => void;
  }
  ```
  - `HtmlHudOverlay.tsx`: change `editingText: DomainTextAnnotation | null`; read `activeTool` & `isDragging` (if used) from `useSessionStore`, read active slide `pitchTransform` from `useDocumentStore` (via `useSessionStore` `activePhaseId`/`activeSlideId` + `selectDomainActiveSlide`), pass `pitchTransform` to `PitchInlineTextEditor`.
  - `CanvasOverlays.tsx`: change `editingText: DomainTextAnnotation | null`; read `pitchTransform` from `useDocumentStore` active slide (`selectDomainActiveSlide`) instead of `useCanvasStore`, pass to `PitchInlineTextEditor`.
- **Concrete Test Cases**:
  - Covered in Phase 4 (`five-layer-architecture.test.tsx`) & existing `hud-and-editor.test.tsx` (`PitchInlineTextEditor` save/remove on Enter/Escape).
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/PitchInlineTextEditor.tsx src/features/tactical-unified/core/components/HtmlHudOverlay.tsx src/features/tactical-unified/core/components/CanvasOverlays.tsx
  ```

---

### Phase 4: five-layer-architecture.test.tsx HtmlHudOverlay Wrap

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/core/components/HtmlHudOverlay.tsx`
- **Contract**:
  - Update `describe('HtmlHudOverlay')` (`[L907-956]`) in `five-layer-architecture.test.tsx` to wrap `<HtmlHudOverlay />` with `<TacticalStoreProvider>` (alongside outer providers) so `ContextHud` and `HtmlHudOverlay` read from real 3-frequency stores. Preserve all other `describe` blocks in `five-layer-architecture.test.tsx` untouched until Wave B-2 / Wave C.
- **Concrete Test Cases**:
  - `five-layer-architecture.test.tsx`: `HtmlHudOverlay` mounts `ContextHud` when `cleanRender` is omitted/false, and suppresses it when `cleanRender={true}`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/__tests__/five-layer-architecture.test.tsx
  ```

---

### Phase 5: clean-render.test.tsx Verification

- **Targets**:
  - [MODIFY] `src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx`
- **Reference Files**:
  - `src/features/tactical-unified/core/components/CanvasStageContainer.tsx`
- **Contract**:
  - Update `clean-render.test.tsx` to wrap `<CanvasStageContainer>` in `<TacticalStoreProvider>` (alongside `<CanvasStoreContext.Provider>` kept for Konva layers until Wave C), verifying `cleanRender={true}` suppresses HUD overlays (`ContextHud` / `HtmlHudOverlay`).
- **Concrete Test Cases**:
  - `clean-render.test.tsx`: `cleanRender=true` renders zero HUD / `InteractionPreviewLayer` DOM nodes even if an object is selected in `sessionStore`.
- **Verification**:
  ```bash
  bun run ai:check src/features/tactical-unified/core/components/__tests__/clean-render.test.tsx
  ```
