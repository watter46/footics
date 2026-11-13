# TASK-181ji: CameraControlPanel・EffectInspectorPanel & 関連テストの Domain 移行

- **Status**: `DONE`
- **Priority**: HIGH
- **Created**: 2026-11-13
- **Parent**: plan-tactical-legacy-removal.md (181j)
- **Commit**: `feat(tactical): migrate CameraControlPanel and EffectInspectorPanel to Domain stores`

---

## 🎯 目的・背景

3D カメラ制御 (`camera-control-panel.tsx`, `director-cue-inspector.tsx`) およびエフェクトインスペクタ (`effect-inspector-panel.tsx` と4つのエフェクトセクション群) および対応テスト (`camera-control-panel.test.tsx`, `effect-inspector-panel.test.tsx`) から旧 `tactical-unified-store` / `@/lib/types/tactical-unified` 依存を除去する。

## 🚨 残存禁止条件 (Negative Contracts)

- 上記プロダクション・テストファイルに `tactical-unified-store` / `useTacticalUnifiedStore` / `tactical-unified-selectors` / `@/lib/types/tactical-unified` の参照を残してはならない。
- `effect-inspector-panel.test.tsx` の旧 `EffectInspectorPanel` テスト群（テスト 1〜8）および `camera-control-panel.test.tsx` に `vi.spyOn` によるストアアクションスパイを残してはならない（`TacticalStoreProvider` で実ストア状態を検証すること）。

---

## 🏗️ Phase 構成

- **Phase 1**: `director-cue-inspector.tsx`・`camera-control-panel.tsx`・`camera-control-panel.test.tsx`（2プロダクション＋1テスト）
- **Phase 2**: Effect セクション Props Domain 互換化（4プロダクション＋0テスト）
- **Phase 3**: `effect-inspector-panel.tsx`・`effect-inspector-panel.test.tsx`（1プロダクション＋1テスト）

---

### Phase 1: CameraControlPanel & DirectorCueInspector

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx`
  - `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx`

#### Task 1.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/director-cue-inspector.tsx`

**Before:**
```tsx
import type { ActionCameraCue } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import type { ActionCameraCue } from '@/lib/types/tactical/project';
```

#### Task 1.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/camera-control-panel.tsx`

**Before:**
```tsx
import {
  selectActivePhase,
  selectActiveSlide,
} from '@/features/tactical-unified/stores/tactical-unified-selectors';
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { PitchTransform } from '@/lib/types/tactical-unified';
```
**After:**
```tsx
import {
  selectDomainActivePhase,
  selectDomainActiveSlide,
} from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  usePlaybackStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import {
  hasActiveDirectorCameraTrack,
  resolveSyntheticDirectorCamera,
} from '@/lib/tactical/unified-interpolation';
import type { PitchTransform } from '@/lib/types/tactical/slide';
```

**Before:**
```tsx
export function CameraControlPanel(): React.ReactElement {
  const workspaceMode = useTacticalUnifiedStoreContext((s) => s.workspaceMode);
  const playbackSeekTimeMs = useTacticalUnifiedStoreContext(
    (s) => s.playbackSeekTimeMs,
  );
  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const activePhase = useTacticalUnifiedStoreContext(selectActivePhase);
  const activeSlide = useTacticalUnifiedStoreContext(selectActiveSlide);
  const upsertGlobalCameraKeyframe = useTacticalUnifiedStoreContext(
    (s) => s.upsertGlobalCameraKeyframe,
  );
  const upsertActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.upsertActionCameraCue,
  );
  const deleteActionCameraCue = useTacticalUnifiedStoreContext(
    (s) => s.deleteActionCameraCue,
  );
  const updatePitchTransform = useTacticalUnifiedStoreContext(
    (s) => s.updatePitchTransform,
  );
  const pushHistory = useTacticalUnifiedStoreContext((s) => s.pushHistory);

  const isDirectorMode = workspaceMode === 'director';
  const currentTimeMs = playbackSeekTimeMs ?? 0;
```
**After:**
```tsx
export function CameraControlPanel(): React.ReactElement {
  const workspaceMode = useSessionStore((s) => s.workspaceMode);
  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const playbackTimeMs = usePlaybackStore((s) => s.timeMs);
  const activePhase = useDocumentStore((s) =>
    selectDomainActivePhase(s.project, activePhaseId),
  );
  const activeSlide = useDocumentStore((s) =>
    selectDomainActiveSlide(s.project, activePhaseId, activeSlideId),
  );
  const dispatch = useDocumentStore((s) => s.dispatch);

  const isDirectorMode = workspaceMode === 'director';
  const currentTimeMs = Number(playbackTimeMs ?? 0);
```

**Before:**
```tsx
  const syncSlide = (patch: Partial<PitchTransform>) => {
    if (activeSlideId) updatePitchTransform(activeSlideId, patch);
  };

  const handleTiltChange = (v: number) => {
    const nextTilt = Math.max(0, Math.min(65, Number.isNaN(v) ? 0 : v));
    if (isDirectorMode) {
      upsertGlobalCameraKeyframe(currentTimeMs, { tilt: nextTilt });
    }
    syncSlide({ tilt: nextTilt });
  };
```
**After:**
```tsx
  const upsertGlobalKeyframe = (
    timeMs: number,
    patch: { tilt?: number; yaw?: number },
  ) => {
    if (!activePhaseId) return;
    dispatch({
      type: 'UPSERT_GLOBAL_CAMERA_KEYFRAME',
      phaseId: activePhaseId,
      timeMs,
      patch,
      activeSlideId: activeSlideId || undefined,
    });
  };

  const upsertActionCue = (
    startTimeMs: number,
    patch: Partial<{
      zoom: number;
      panX: number;
      panY: number;
      durationMs: number;
      autoReturn: boolean;
    }>,
    cueId?: string,
  ) => {
    if (!activePhaseId) return;
    dispatch({
      type: 'UPSERT_ACTION_CAMERA_CUE',
      phaseId: activePhaseId,
      startTimeMs,
      patch,
      cueId,
    });
  };

  const syncSlide = (patch: Partial<PitchTransform>) => {
    if (!activePhaseId || !activeSlideId) return;
    dispatch({
      type: 'APPLY_SLIDE_COMMAND',
      phaseId: activePhaseId,
      slideId: activeSlideId,
      command: {
        type: 'UPDATE_SLIDE_META',
        patch: {
          pitchTransform: {
            tilt: activeSlide?.pitchTransform?.tilt ?? 0,
            yaw: activeSlide?.pitchTransform?.yaw ?? 90,
            zoom: activeSlide?.pitchTransform?.zoom ?? 1,
            panX: activeSlide?.pitchTransform?.panX ?? 0,
            panY: activeSlide?.pitchTransform?.panY ?? 0,
            ...patch,
          },
        },
      },
    });
  };

  const handleTiltChange = (v: number) => {
    const nextTilt = Math.max(0, Math.min(65, Number.isNaN(v) ? 0 : v));
    if (isDirectorMode) {
      upsertGlobalKeyframe(currentTimeMs, { tilt: nextTilt });
    }
    syncSlide({ tilt: nextTilt });
  };
```

残りの `handleYawChange`, `handlePresetSelect`, `handleResetCamera`, `handleZoomChange`, `handlePanChange`, `handleSliderChangeEnd`, および `<DirectorCueInspector ... />` のコールバックも同様に `upsertGlobalKeyframe` / `upsertActionCue` / `dispatch({ type: 'DELETE_ACTION_CAMERA_CUE', phaseId: activePhaseId, cueId })` に置換する（`handleSliderChangeEnd = () => {}`）。

#### Task 1.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/camera-control-panel.test.tsx`

`useTacticalUnifiedStore` と `vi.spyOn` を廃止し、`createDocumentStore` + `createSessionStore` + `createPlaybackStore` + `<TacticalStoreProvider>` で全 8 件のテストを実ストア状態検証へ移行する。

**Before:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTacticalUnifiedStore } from '@/features/tactical-unified/stores/tactical-unified-store';
import { CameraControlPanel } from '../camera-control-panel';
```
**After:**
```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { toMilliseconds } from '@/lib/types/tactical/branded';
import { CameraControlPanel } from '../camera-control-panel';

function renderCameraPanel(options?: {
  workspaceMode?: 'board' | 'director';
  timeMs?: number;
}) {
  const project = createDefaultTacticalProject();
  const p0 = project.phases[0]!;
  const stores = {
    documentStore: createDocumentStore(project),
    sessionStore: createSessionStore({
      workspaceMode: options?.workspaceMode ?? 'board',
      activePhaseId: p0.id,
      activeSlideId: p0.slides[0]?.id ?? '',
    }),
    playbackStore: createPlaybackStore({
      timeMs: toMilliseconds(options?.timeMs ?? 0),
    }),
  };
  return {
    stores,
    phaseId: p0.id,
    slideId: p0.slides[0]?.id ?? '',
    ...render(
      <TacticalStoreProvider stores={stores}>
        <CameraControlPanel />
      </TacticalStoreProvider>,
    ),
  };
}
```

- テスト 1〜3・5〜8（Director モード）は `stores.documentStore.getState().project.phases[0]?.directorCamera?.globalKeyframes` / `actionCues` を直接検証する。
- テスト 4（Board モード）は `selectDomainActiveSlide(stores.documentStore.getState().project, phaseId, slideId)?.pitchTransform?.tilt` を検証する。

---

### Phase 2: Effect セクション Props の Domain 互換化

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx`
  - `src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx`
  - `src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx`
  - `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx`

#### Task 2.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/arrow-effect-section.tsx`

**Before:**
```tsx
import type {
  ArrowAnnotation,
  ArrowEffectConfig,
  ArrowEffectType,
  EffectEasing,
  EffectExitAction,
} from '@/lib/types/tactical/annotations';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ARROW_EFFECT: ArrowEffectConfig = {
  type: 'grow',
  delay: 0.5,
  duration: 0.8,
  holdDuration: 0.5,
  exitAction: 'keep',
  fadeDuration: 0.3,
  easing: 'ease-out',
};

export interface ArrowEffectSectionProps {
  arrow: ArrowAnnotation;
  onUpdate: (patch: Partial<ArrowAnnotation>) => void;
}
```
**After:**
```tsx
import type {
  ArrowEffectConfig,
  ArrowEffectType,
  EffectEasing,
  EffectExitAction,
} from '@/lib/types/tactical/annotations';
import type { DomainArrowAnnotation } from '@/lib/types/tactical/domain-entities';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ARROW_EFFECT: ArrowEffectConfig = {
  type: 'grow',
  delay: 0.5,
  duration: 0.8,
  holdDuration: 0.5,
  exitAction: 'keep',
  fadeDuration: 0.3,
  easing: 'ease-out',
};

export interface ArrowEffectSectionProps {
  arrow: Pick<DomainArrowAnnotation, 'effect' | 'dashArray'>;
  onUpdate: (patch: { effect?: ArrowEffectConfig; dashArray?: number[] }) => void;
}
```

#### Task 2.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/zone-effect-section.tsx`

**Before:**
```tsx
import type {
  ZoneAnnotation,
  ZoneEffectConfig,
} from '@/lib/types/tactical/annotations';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ZONE_EFFECT: ZoneEffectConfig = {
  type: 'pulse',
  duration: 1.2,
  minOpacity: 0.15,
  maxOpacity: 0.45,
};

export interface ZoneEffectSectionProps {
  zone: ZoneAnnotation;
  onUpdate: (patch: Partial<ZoneAnnotation>) => void;
}
```
**After:**
```tsx
import type { ZoneEffectConfig } from '@/lib/types/tactical/annotations';
import type { DomainZoneAnnotation } from '@/lib/types/tactical/domain-entities';
import { NumberSliderField } from './effect-number-slider';

export const DEFAULT_ZONE_EFFECT: ZoneEffectConfig = {
  type: 'pulse',
  duration: 1.2,
  minOpacity: 0.15,
  maxOpacity: 0.45,
};

export interface ZoneEffectSectionProps {
  zone: Pick<DomainZoneAnnotation, 'effect'>;
  onUpdate: (patch: { effect?: ZoneEffectConfig }) => void;
}
```

#### Task 2.3 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/marker-effect-section.tsx`

**Before:**
```tsx
import type {
  MarkerEffectConfig,
  MarkerEffectType,
  Player,
} from '@/lib/types/tactical/player';
```
**After:**
```tsx
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type {
  MarkerEffectConfig,
  MarkerEffectType,
  MarkerStyle,
} from '@/lib/types/tactical/player';
```

**Before:**
```tsx
export interface MarkerEffectSectionProps {
  player: Player;
  onUpdate: (patch: Partial<Player>) => void;
}
```
**After:**
```tsx
export interface MarkerEffectSectionProps {
  player: Pick<PitchPlayer, 'style'>;
  onUpdate: (patch: { style?: MarkerStyle }) => void;
}
```

#### Task 2.4 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/player-trajectory-effect-section.tsx`

**Before:**
```tsx
import type { EffectExitAction } from '@/lib/types/tactical/annotations';
import type {
  Player,
  PlayerTrajectoryEffectConfig,
} from '@/lib/types/tactical/player';
```
**After:**
```tsx
import type { EffectExitAction } from '@/lib/types/tactical/annotations';
import type { PitchPlayer } from '@/lib/types/tactical/domain-entities';
import type { PlayerTrajectoryEffectConfig } from '@/lib/types/tactical/player';
```

**Before:**
```tsx
export interface PlayerTrajectoryEffectSectionProps {
  player: Player;
  onUpdate: (patch: Partial<Player>) => void;
}
```
**After:**
```tsx
export interface PlayerTrajectoryEffectSectionProps {
  player: Pick<PitchPlayer, 'trajectoryEffect'>;
  onUpdate: (patch: {
    trajectoryEffect?: PlayerTrajectoryEffectConfig;
  }) => void;
}
```

---

### Phase 3: EffectInspectorPanel & テスト移行

- **担当ファイル**:
  - `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx`
  - `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx`

#### Task 3.1 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/effect-inspector-panel.tsx`

**Before:**
```tsx
import { useTacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
```
**After:**
```tsx
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import {
  useDocumentStore,
  useSessionStore,
} from '@/features/tactical-unified/stores/tactical-store-provider';
```

**Before:**
```tsx
  const [isExpanded, setIsExpanded] = useState(true);

  const activeSlideId = useTacticalUnifiedStoreContext((s) => s.activeSlideId);
  const selectedObjects = useTacticalUnifiedStoreContext(
    (s) => s.selectedObjects,
  );
  const project = useTacticalUnifiedStoreContext((s) => s.project);
  const updateArrow = useTacticalUnifiedStoreContext((s) => s.updateArrow);
  const updatePlayer = useTacticalUnifiedStoreContext((s) => s.updatePlayer);
  const updateZone = useTacticalUnifiedStoreContext((s) => s.updateZone);

  if (selectedObjects.length !== 1) {
    return null;
  }

  const selected = selectedObjects[0];
  if (!selected) return null;

  const slide = project.phases
    .flatMap((p) => p.slides)
    .find((sl) => sl.id === activeSlideId);
  if (!slide) return null;
```
**After:**
```tsx
  const [isExpanded, setIsExpanded] = useState(true);

  const activePhaseId = useSessionStore((s) => s.activePhaseId);
  const activeSlideId = useSessionStore((s) => s.activeSlideId);
  const selectedObjects = useSessionStore((s) => s.selectedObjects);
  const project = useDocumentStore((s) => s.project);
  const dispatch = useDocumentStore((s) => s.dispatch);

  if (selectedObjects.length !== 1) {
    return null;
  }

  const selected = selectedObjects[0];
  if (!selected) return null;

  const slide = selectDomainActiveSlide(project, activePhaseId, activeSlideId);
  if (!slide) return null;
```

- L88 ゾーン更新: `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_ZONE', id: zone.id, patch } })`
- L121 矢印更新: `dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_ARROW', id: arrow.id, patch } })`
- L130-165 選手更新: `const player = slide.players.find((p) => p.id === selected.id); if (!player || player.area !== 'pitch') return null;` で `PitchPlayer` に絞り、`dispatch({ type: 'APPLY_SLIDE_COMMAND', phaseId: activePhaseId, slideId: activeSlideId, command: { type: 'UPDATE_PLAYER', id: player.id, patch } })` を使用する。

#### Task 3.2 `[MODIFY]` `src/features/tactical-unified/panels/right-panel/__tests__/effect-inspector-panel.test.tsx`

`createTacticalUnifiedStore` / `TacticalUnifiedStoreContext` / `createDefaultPlayer` (`tactical-unified`) / `vi.spyOn` を廃止し、`createDocumentStore` + `createSessionStore` + `createPlaybackStore` + `<TacticalStoreProvider>` + `createDefaultDomainPlayer` + `toScreenNormCoord` へ移行する（`ArrowHud` をテストする 9 番目の `describe('ArrowHud ⚡️ ボタン')` のみ `CanvasStore` スコープのため現状維持）。

**Before:**
```tsx
import {
  createTacticalUnifiedStore,
  type TacticalUnifiedStoreApi,
} from '@/features/tactical-unified/stores/tactical-unified-store';
import { TacticalUnifiedStoreContext } from '@/features/tactical-unified/stores/tactical-unified-store-provider';
import type {
  ArrowAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical/annotations';
import { createDefaultPlayer } from '@/lib/types/tactical-unified';

function renderWithTacticalStore(
  ui: React.ReactElement,
  store: TacticalUnifiedStoreApi,
) {
  return render(
    <TacticalUnifiedStoreContext.Provider value={store}>
      {ui}
    </TacticalUnifiedStoreContext.Provider>,
  );
}
```
**After:**
```tsx
import { createDocumentStore } from '@/features/tactical-unified/stores/document-store';
import { selectDomainActiveSlide } from '@/features/tactical-unified/stores/domain-selectors';
import { createPlaybackStore } from '@/features/tactical-unified/stores/playback-store';
import { createSessionStore } from '@/features/tactical-unified/stores/session-store';
import {
  createDefaultTacticalProject,
  type TacticalStores,
  TacticalStoreProvider,
} from '@/features/tactical-unified/stores/tactical-store-provider';
import { createDefaultDomainPlayer } from '@/lib/tactical/domain/formation-placement';
import { toScreenNormCoord } from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';

function renderWithTacticalStores(ui: React.ReactElement, stores: TacticalStores) {
  return render(<TacticalStoreProvider stores={stores}>{ui}</TacticalStoreProvider>);
}
```

- `createTestArrow` は `DomainArrowAnnotation`（`points: [{ x: toScreenNormCoord(10), y: toScreenNormCoord(10) }, ...]`, `startMarker: 'none'`, `endMarker: 'arrow'`）を返し、`createTestZone` は `DomainZoneAnnotation`（`x: toScreenNormCoord(10)`, `y: toScreenNormCoord(10)`, `points` 不要）を返す。
- テスト 2〜8 では `dispatch` (`ADD_ARROW`, `ADD_PLAYER`, `ADD_ZONE`) と `stores.sessionStore.getState().setSelectedObjects([...])` を使い、操作後は `selectDomainActiveSlide(stores.documentStore.getState().project, phaseId, slideId)` の状態変化を検証する。
