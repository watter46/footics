# TASK-181jk: SquadPanel・Bench コンポーネント・RightPanel シェルの Domain 移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): migrate SquadSubPanel, bench components, and RightPanel shell to Domain stores`

---

## 🎯 目的・背景

`bench-player-row.tsx`・`bench-swap-selector.tsx`・`squad-bench-canvas.tsx`・`squad-sub-panel.tsx`・`right-panel.tsx` およびベンチ単体・ステップ5テスト (`squad-bench-canvas.test.tsx`, `squad-panel-step5.test.tsx`) を Domain 型および `useDocumentStore` / `useSessionStore` / `TacticalStoreProvider` へ移行する。

## 🚨 残存禁止条件 (Negative Contracts)

- `bench-player-row.tsx`・`bench-swap-selector.tsx`・`squad-bench-canvas.tsx`・`squad-sub-panel.tsx`・`right-panel.tsx`・`squad-bench-canvas.test.tsx` に `tactical-unified-store` / `useTacticalUnifiedStore` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` の参照を残してはならない。
- `squad-panel-step5.test.tsx` に `tactical-unified-store` / `useTacticalUnifiedStore` / `@/lib/types/tactical-unified` の参照を残してはならない。

---

## 🏗️ Phase 構成

- **Phase 1**: Squad/Bench リーフ & `squad-sub-panel.tsx`（4プロダクション＋0テスト）
- **Phase 2**: `right-panel.tsx` & Squad テスト群（1プロダクション＋2テスト）

---

### Phase 1: Squad/Bench コンポーネント & `squad-sub-panel.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/bench-player-row.tsx`
  - `src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx`
  - `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/bench-player-row.tsx`

**Before:**
```tsx
import type { Player } from '@/lib/types/tactical-unified';
import { BenchSwapSelector } from './bench-swap-selector';

interface BenchPlayerRowProps {
  player: Player;
  pitchPlayers: Player[];
  onSendToPitch: (player: Player) => void;
  onSwapWithPitch: (benchPlayer: Player, pitchPlayerId: string) => void;
  onRemove: (id: string) => void;
}
```
**After:**
```tsx
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
import { BenchSwapSelector } from './bench-swap-selector';

interface BenchPlayerRowProps {
  player: DomainPlayer;
  pitchPlayers: readonly DomainPlayer[];
  onSendToPitch: (player: DomainPlayer) => void;
  onSwapWithPitch: (benchPlayer: DomainPlayer, pitchPlayerId: string) => void;
  onRemove: (id: string) => void;
}
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/bench-swap-selector.tsx`

**Before:**
```tsx
import type { Player } from '@/lib/types/tactical-unified';

interface BenchSwapSelectorProps {
  benchPlayer: Player;
  pitchPlayers: Player[];
  onSwapWithPitch: (benchPlayer: Player, pitchPlayerId: string) => void;
}
```
**After:**
```tsx
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

interface BenchSwapSelectorProps {
  benchPlayer: DomainPlayer;
  pitchPlayers: readonly DomainPlayer[];
  onSwapWithPitch: (benchPlayer: DomainPlayer, pitchPlayerId: string) => void;
}
```

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/squad-bench-canvas.tsx`

`PlayerMarkerItem` が `181l` まで旧 `Player` 型を受け取るため、`React.ComponentProps<typeof PlayerMarkerItem>['marker']` へローカルアダプタ (`toBenchRenderMarker`) で変換して `tactical-unified` インポートをゼロにする（`181l` で `PlayerMarkerItem` 移行時に外せる構造）。

**Before:**
```tsx
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Layer, Stage } from 'react-konva';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import type { Player } from '@/lib/types/tactical-unified';

export const BASE_BENCH_HEIGHT = 280;

export interface SquadBenchCanvasProps {
  benchPlayers: Player[];
  selectedIds: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  stageHeight: number;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: Player) => void;
  onClick: (markerId: string, isShift: boolean) => void;
}
```
**After:**
```tsx
import type { KonvaEventObject } from 'konva/lib/Node';
import type React from 'react';
import { Layer, Stage } from 'react-konva';
import { PlayerMarkerItem } from '@/features/tactical-unified/core/components/PlayerMarkerItem';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';

export const BASE_BENCH_HEIGHT = 280;

type RenderMarker = React.ComponentProps<typeof PlayerMarkerItem>['marker'];

function toBenchRenderMarker(player: DomainPlayer): RenderMarker {
  return {
    ...player,
    x: Number(player.x),
    y: Number(player.y),
    connectLines: player.area === 'pitch' ? [...player.connectLines] : [],
    badges: player.area === 'pitch' ? [...player.badges] : [],
  };
}

export interface SquadBenchCanvasProps {
  benchPlayers: readonly DomainPlayer[];
  selectedIds: string[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasWidth: number;
  stageHeight: number;
  onDragStart: (e: KonvaEventObject<DragEvent>, markerId: string) => void;
  onDragEnd: (e: KonvaEventObject<DragEvent>, marker: DomainPlayer) => void;
  onClick: (markerId: string, isShift: boolean) => void;
}
```

**Before:**
```tsx
              {benchPlayers.map((player) => (
                <PlayerMarkerItem
                  key={player.id}
                  marker={player}
                  width={canvasWidth}
                  height={BASE_BENCH_HEIGHT}
                  baseDim={canvasWidth}
                  markerMode="2d-only"
                  isSelected={selectedIds.includes(player.id)}
                  isInteractive={true}
                  connectingPlayerId={null}
                  onDragStart={onDragStart}
                  onDragMove={() => {}}
                  onDragEnd={onDragEnd}
                  onClick={onClick}
                  onUpdateVisionCone={() => {}}
                />
              ))}
```
**After:**
```tsx
              {benchPlayers.map((player) => (
                <PlayerMarkerItem
                  key={player.id}
                  marker={toBenchRenderMarker(player)}
                  width={canvasWidth}
                  height={BASE_BENCH_HEIGHT}
                  baseDim={canvasWidth}
                  markerMode="2d-only"
                  isSelected={selectedIds.includes(player.id)}
                  isInteractive={true}
                  connectingPlayerId={null}
                  onDragStart={onDragStart}
                  onDragMove={() => {}}
                  onDragEnd={(e) => onDragEnd(e, player)}
                  onClick={onClick}
                  onUpdateVisionCone={() => {}}
                />
              ))}
```

#### Task 1.4 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/squad-sub-panel.tsx`

**Before:**
```tsx
import { selectActiveSlide } from '@/features/tactical-unified/stores/tactical-unified-store';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  computeBenchGridPositions,
  createDefaultPlayer,
  type Player,
} from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import { computeDomainBenchGridPositions } from '@/lib/tactical/domain/squad-placement';
import { clampToScreenNorm } from '@/lib/types/tactical/branded';
import type { BenchPlayer, DomainPlayer } from '@/lib/types/tactical/domain-entities';
```

**Before:**
```tsx
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const selectedObjects = useTacticalUnifiedStoreContext(
    (s) => s.selectedObjects,
  );
  const selectObject = useTacticalUnifiedStoreContext((s) => s.selectObject);
  const updatePlayer = useTacticalUnifiedStoreContext((s) => s.updatePlayer);
  const updateSlide = useTacticalUnifiedStoreContext((s) => s.updateSlide);
  const movePlayerToPitch = useTacticalUnifiedStoreContext(
    (s) => s.movePlayerToPitch,
  );
  const addCustomPlayer = useTacticalUnifiedStoreContext(
    (s) => s.addCustomPlayer,
  );
```
**After:**
```tsx
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const selectObject = useSessionStore((s) => s.selectObject);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);
  const activeSlide = selectDomainActiveSlide(
    project,
    activePhaseId,
    activeSlideId,
  );
```

- ハンドラ置換契約:
  - `computeBenchGridPositions(teamPlayers.bench)` -> `computeDomainBenchGridPositions(teamPlayers.bench.filter((p): p is BenchPlayer => p.area === 'bench'))` を計算し、`dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'REPLACE_PLAYERS', players: nextPlayers } })`。
  - `movePlayerToPitch(activeSlideId, marker.id, pitchX, pitchY)` / `movePlayerToPitch(activeSlideId, marker.id)` -> `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'MOVE_PLAYER_TO_PITCH', id: marker.id, x: clampToScreenNorm(pitchX ?? 50), y: clampToScreenNorm(pitchY ?? 50) } })`。
  - `updatePlayer(activeSlideId, marker.id, { x: newX, y: newY })` -> `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_PLAYER', id: marker.id, patch: { x: clampToScreenNorm(newX), y: clampToScreenNorm(newY) } } })`。
  - `addCustomPlayer` -> `createDefaultDomainPlayer(team, 20, 14, color, 'bench')` へ `{ name, shirtNo, position, isCustom: true }` を付与し、`dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'ADD_PLAYER', player } })`。
  - `handleSwapWithPitch`: `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'SWAP_PLAYERS', playerAId: benchPlayer.id, playerBId: pitchPlayerId } })`。

---

### Phase 2: `right-panel.tsx` & `squad-bench-canvas.test.tsx`・`squad-panel-step5.test.tsx`

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/right-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/right-panel.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type { RightPanelTab } from '@/features/tactical-unified/stores/tool-types';
import { DEFAULT_PITCH_APPEARANCE } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type { RightPanelTab } from '@/features/tactical-unified/stores/session-ui-state';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  DEFAULT_PITCH_APPEARANCE,
  type PitchAppearanceConfig,
} from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function RightPanel() {
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const rightPanelTab = useTacticalUnifiedStoreContext(
    (s) => s.panels.rightPanelTab,
  );
  const setRightPanelTab = useTacticalUnifiedStoreContext(
    (s) => s.setRightPanelTab,
  );
  const isRightPanelOpen = useTacticalUnifiedStoreContext(
    (s) => s.panels.isRightPanelOpen,
  );
  const toggleRightPanel = useTacticalUnifiedStoreContext(
    (s) => s.toggleRightPanel,
  );
  const setRightPanelOpen = useTacticalUnifiedStoreContext(
    (s) => s.setRightPanelOpen,
  );
  const pitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.project.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE,
  );
  const updatePitchAppearance = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchAppearance,
  );
```
**After:**
```tsx
export function RightPanel() {
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const rightPanelTab = useSessionStore((s) => s.panels.rightPanelTab);
  const setRightPanelTab = useSessionStore((s) => s.setRightPanelTab);
  const isRightPanelOpen = useSessionStore((s) => s.panels.isRightPanelOpen);
  const toggleRightPanel = useSessionStore((s) => s.toggleRightPanel);
  const setRightPanelOpen = useSessionStore((s) => s.setRightPanelOpen);
  const pitchAppearance = useDocumentStore(
    (s) => s.project.pitchAppearance ?? DEFAULT_PITCH_APPEARANCE,
  );
  const dispatch = useDocumentStore((s) => s.dispatch);
  const updatePitchAppearance = (patch: Partial<PitchAppearanceConfig>) => {
    dispatch({
      type: 'UPDATE_PROJECT_META',
      patch: { pitchAppearance: { ...pitchAppearance, ...patch } },
    });
  };
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/squad-bench-canvas.test.tsx`

**Before:**
```tsx
import { SquadBenchCanvas } from '@/features/tactical-unified/panels/right-panel/squad-bench-canvas';
import { createDefaultPlayer, type Player } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import { SquadBenchCanvas } from '@/features/tactical-unified/panels/right-panel/squad-bench-canvas';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import type { DomainPlayer } from '@/lib/types/tactical/domain-entities';
```
- ベンチ選手モック生成を `createDefaultDomainPlayer('home', x, y, '#034694', 'bench', id)` に置換し、変数型を `DomainPlayer[]` に変更する。

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/squad-panel-step5.test.tsx`

- `useTacticalUnifiedStore` と `type Player` (`@/lib/types/tactical-unified`) を廃止し、`createDocumentStore` + `createSessionStore` + `createPlaybackStore` + `<TacticalStoreProvider>` + `selectDomainActiveSlide` + `createDefaultDomainPlayer` / `DomainPlayer` に移行する。
- ベンチ選手のセットアップは `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId, slideId, command: { type: 'ADD_PLAYER', player } })` で実行し、`stores.documentStore.getState().project` と `stores.sessionStore.getState().selectedObjects` を直接アサートする。
