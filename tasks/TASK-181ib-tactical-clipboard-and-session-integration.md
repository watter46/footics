# TASK-181ib: クリップボード純粋関数・`INSERT_ENTITIES`・SessionStore 統合（旧ストア完全廃止シリーズ）

## 1. Metadata & Goal
- **Status**: `TODO`
- **Commit**: `feat(tactical): add domain clipboard, insert command, and session integration`
- **Series**: 旧ストア完全廃止シリーズ。181ia（ディレクターカメラ）➔ **181ib（本タスク）** ➔ 181ic（スライド生成・リセット・試合ACL）➔ 181j〜。181ia の完了を前提とする。
- **Goal**: 旧 `clipboard-helpers.ts` / `clipboard-slice.ts` を型安全な Domain クリップボード純粋関数（`extractSelectedObjects` / `cloneAndOffsetClipboard`）、一括挿入コマンド `INSERT_ENTITIES`（1手 Undo）、および `SessionStore.clipboard` 状態へ統合する。
- **Negative Contracts (完了時に0件であるべき条件)**:
  - Deleted files: なし（旧スライスの削除は 181l）
  - `src/lib/tactical/domain/` が `@/features/tactical-unified/` を import しないこと（`depcruise` 境界違反ゼロ）

## 2. Architectural Invariants & Consumers
- **Invariants (壊してはいけない前提条件)**:
  1. **直和型の厳格性**: `BenchPlayer` に `visionCone` / `connectLines` / `badges` / `focus` / `trajectory` を付与しない。また `DomainZoneAnnotation` は `shapeType`（`'rect' | 'ellipse'` 対 `'polygon'`）で分岐し、旧 `clipboard-helpers.ts` のような全ゾーン `.points` 前提バグを持ち込まない。
  2. **1手 Undo と選択同期**: ペースト／複製時は `INSERT_ENTITIES` 1回で選手・矢印・ゾーン・テキストを一括挿入し、返却された `selectedRefs` で `SessionStore.selectObjects` を更新する。空挿入時は元スライド参照をそのまま返す。
  3. **Hot/Cold 分離**: コピー状態（`clipboard`）は `SessionStore` に保持し、`setClipboard` 呼び出しが `DocumentStore.past` や `isDirty` に影響しないこと。
- **Consumers (同期更新対象の全ファイルリスト)**:
  - `SlideCommand`: `src/lib/tactical/domain/slide-reducer.ts`
  - `SessionUiState`: `src/features/tactical-unified/stores/session-ui-state.ts`, `src/features/tactical-unified/stores/session-store.ts`, `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

## 3. Implementation Phases (タスクファイル > フェーズ > タスク)

### Phase 1: クリップボード純粋関数と `INSERT_ENTITIES` 命令の実装・テスト
- **Worker Model**: `flash`
- **Target Files**:
  - `[ADD]` `src/lib/tactical/domain/clipboard.ts`
  - `[MODIFY]` `src/lib/tactical/domain/commands.ts`
  - `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
  - `[ADD]` `src/lib/tactical/__tests__/clipboard-commands.test.ts`

#### Task 1.1: `[ADD]` `src/lib/tactical/domain/clipboard.ts`
① 型定義・`extractSelectedObjects`・`cloneAndOffsetPlayers`:
```ts
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainArrowAnnotation,
  DomainPlayer,
  DomainTextAnnotation,
  DomainZoneAnnotation,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { EntityKind } from './commands';

export interface ClipboardSelectionRef {
  readonly id: string;
  readonly kind: string;
}

export interface DomainTacticalClipboard {
  readonly players: readonly DomainPlayer[];
  readonly arrows: readonly DomainArrowAnnotation[];
  readonly zones: readonly DomainZoneAnnotation[];
  readonly texts: readonly DomainTextAnnotation[];
}

export interface ClonedClipboardResult {
  readonly players: readonly DomainPlayer[];
  readonly arrows: readonly DomainArrowAnnotation[];
  readonly zones: readonly DomainZoneAnnotation[];
  readonly texts: readonly DomainTextAnnotation[];
  readonly selectedRefs: readonly {
    readonly id: string;
    readonly kind: EntityKind;
  }[];
}

export function extractSelectedObjects(
  slide: DomainSlide,
  selectedObjects: readonly ClipboardSelectionRef[],
): DomainTacticalClipboard {
  const selectedKindById = new Map<string, string>();
  for (const obj of selectedObjects) {
    selectedKindById.set(obj.id, obj.kind);
  }

  return {
    players: slide.players
      .filter((p) => selectedKindById.get(p.id) === 'player')
      .map((p) => structuredClone(p)),
    arrows: slide.arrows
      .filter((a) => selectedKindById.get(a.id) === 'arrow')
      .map((a) => structuredClone(a)),
    zones: slide.zones
      .filter((z) => selectedKindById.get(z.id) === 'zone')
      .map((z) => structuredClone(z)),
    texts: slide.texts
      .filter((t) => selectedKindById.get(t.id) === 'text')
      .map((t) => structuredClone(t)),
  };
}

function cloneAndOffsetPlayers(
  players: readonly DomainPlayer[],
  offsetX: number,
  offsetY: number,
  playerIdMap: Map<string, string>,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainPlayer[] {
  return players.map((orig) => {
    const newId = crypto.randomUUID();
    playerIdMap.set(orig.id, newId);
    selectedRefs.push({ id: newId, kind: 'player' });

    const cloned = structuredClone(orig);
    const x = clampToScreenNorm(orig.x + offsetX, 2, 98);
    const y = clampToScreenNorm(orig.y + offsetY, 2, 98);

    if (cloned.area === 'bench') {
      return { ...cloned, id: newId, x, y };
    }

    return {
      ...cloned,
      id: newId,
      x,
      y,
      visionCone: undefined,
      connectLines: [],
      badges: [],
      focus: undefined,
      trajectory: undefined,
    };
  });
}
```

② 末尾へ `cloneAndOffsetArrows` と `cloneAndOffsetZones` を追記:
```ts
function cloneAndOffsetArrows(
  arrows: readonly DomainArrowAnnotation[],
  offsetX: number,
  offsetY: number,
  playerIdMap: ReadonlyMap<string, string>,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainArrowAnnotation[] {
  return arrows.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'arrow' });

    const cloned = structuredClone(orig);
    const points = cloned.points.map((pt) =>
      toScreenNormPoint(
        Math.min(99, Math.max(1, pt.x + offsetX)),
        Math.min(99, Math.max(1, pt.y + offsetY)),
        true,
      ),
    );
    const controlPoint = cloned.controlPoint
      ? toScreenNormPoint(
          Math.min(99, Math.max(1, cloned.controlPoint.x + offsetX)),
          Math.min(99, Math.max(1, cloned.controlPoint.y + offsetY)),
          true,
        )
      : undefined;

    return {
      ...cloned,
      id: newId,
      points,
      controlPoint,
      sourcePlayerId:
        cloned.sourcePlayerId && playerIdMap.has(cloned.sourcePlayerId)
          ? playerIdMap.get(cloned.sourcePlayerId)
          : cloned.sourcePlayerId,
      targetPlayerId:
        cloned.targetPlayerId && playerIdMap.has(cloned.targetPlayerId)
          ? playerIdMap.get(cloned.targetPlayerId)
          : cloned.targetPlayerId,
    };
  });
}

function cloneAndOffsetZones(
  zones: readonly DomainZoneAnnotation[],
  offsetX: number,
  offsetY: number,
  selectedRefs: { id: string; kind: EntityKind }[],
): DomainZoneAnnotation[] {
  return zones.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'zone' });

    const cloned = structuredClone(orig);
    if (cloned.shapeType === 'polygon') {
      return {
        ...cloned,
        id: newId,
        points: cloned.points.map((pt) =>
          toScreenNormPoint(
            Math.min(99, Math.max(1, pt.x + offsetX)),
            Math.min(99, Math.max(1, pt.y + offsetY)),
            true,
          ),
        ),
      };
    }

    return {
      ...cloned,
      id: newId,
      x: clampToScreenNorm(cloned.x + offsetX, 0, 98),
      y: clampToScreenNorm(cloned.y + offsetY, 0, 98),
    };
  });
}
```

③ 末尾へ `cloneAndOffsetClipboard` を追記:
```ts
export function cloneAndOffsetClipboard(
  clipboard: DomainTacticalClipboard,
  offsetX = 3,
  offsetY = 3,
): ClonedClipboardResult {
  const playerIdMap = new Map<string, string>();
  const selectedRefs: { id: string; kind: EntityKind }[] = [];

  const players = cloneAndOffsetPlayers(
    clipboard.players,
    offsetX,
    offsetY,
    playerIdMap,
    selectedRefs,
  );
  const arrows = cloneAndOffsetArrows(
    clipboard.arrows,
    offsetX,
    offsetY,
    playerIdMap,
    selectedRefs,
  );
  const zones = cloneAndOffsetZones(
    clipboard.zones,
    offsetX,
    offsetY,
    selectedRefs,
  );
  const texts = clipboard.texts.map((orig) => {
    const newId = crypto.randomUUID();
    selectedRefs.push({ id: newId, kind: 'text' });
    const cloned = structuredClone(orig);
    return {
      ...cloned,
      id: newId,
      x: clampToScreenNorm(cloned.x + offsetX, 0, 98),
      y: clampToScreenNorm(cloned.y + offsetY, 0, 98),
    };
  });

  return { players, arrows, zones, texts, selectedRefs };
}
```

#### Task 1.2: `[MODIFY]` `src/lib/tactical/domain/commands.ts`
**Before (L126-L134)**
```ts
      readonly id: string;
      readonly kind: EntityKind;
    }
  | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
```
**After**
```ts
      readonly id: string;
      readonly kind: EntityKind;
    }
  | {
      readonly type: 'INSERT_ENTITIES';
      readonly players?: readonly DomainPlayer[];
      readonly arrows?: readonly DomainArrowAnnotation[];
      readonly zones?: readonly DomainZoneAnnotation[];
      readonly texts?: readonly DomainTextAnnotation[];
    }
  | { readonly type: 'DELETE_ENTITIES'; readonly ids: readonly string[] }
  | { readonly type: 'SWAP_TEAM_SIDES' }
  | { readonly type: 'RESET_SLIDE_OBJECTS'; readonly keepSquad: boolean }
```

#### Task 1.3: `[MODIFY]` `src/lib/tactical/domain/slide-reducer.ts`
**Before (L229-L240)**
```ts
    case 'DELETE_ENTITIES': {
      const idSet = new Set(command.ids);
      return {
        ...prevSlide,
        players: prevSlide.players.filter((p) => !idSet.has(p.id)),
        arrows: prevSlide.arrows.filter((a) => !idSet.has(a.id)),
        zones: prevSlide.zones.filter((z) => !idSet.has(z.id)),
        texts: prevSlide.texts.filter((t) => !idSet.has(t.id)),
      };
    }
```
**After**
```ts
    case 'INSERT_ENTITIES': {
      const addPlayers = command.players ?? [];
      const addArrows = command.arrows ?? [];
      const addZones = command.zones ?? [];
      const addTexts = command.texts ?? [];
      if (
        addPlayers.length === 0 &&
        addArrows.length === 0 &&
        addZones.length === 0 &&
        addTexts.length === 0
      ) {
        return prevSlide;
      }
      return {
        ...prevSlide,
        players: [...prevSlide.players, ...addPlayers],
        arrows: [...prevSlide.arrows, ...addArrows],
        zones: [...prevSlide.zones, ...addZones],
        texts: [...prevSlide.texts, ...addTexts],
      };
    }

    case 'DELETE_ENTITIES': {
      const idSet = new Set(command.ids);
      return {
        ...prevSlide,
        players: prevSlide.players.filter((p) => !idSet.has(p.id)),
        arrows: prevSlide.arrows.filter((a) => !idSet.has(a.id)),
        zones: prevSlide.zones.filter((z) => !idSet.has(z.id)),
        texts: prevSlide.texts.filter((t) => !idSet.has(t.id)),
      };
    }
```

#### Task 1.4: `[ADD]` `src/lib/tactical/__tests__/clipboard-commands.test.ts`
① テストフィクスチャ（選手・矢印・ゾーン・テキスト定義）:
```ts
import { describe, expect, it } from 'vitest';
import {
  clampToScreenNorm,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import {
  type DomainSlide,
  DomainSlideSchema,
} from '@/lib/types/tactical/domain-hierarchy';
import {
  cloneAndOffsetClipboard,
  extractSelectedObjects,
} from '../domain/clipboard';
import { applySlideCommand } from '../domain/slide-reducer';

const BASE_STYLE = {
  markerType: 'circle' as const,
  insideContent: 'number' as const,
  bottomLabel: 'name' as const,
  color: '#ef4444',
  strokeColor: '#ffffff',
  strokeWidth: 2,
  sizeScale: 1,
  numberSizeScale: 1,
  labelSizeScale: 1,
};

function createClipboardSlide(): DomainSlide {
  return {
    id: 'sl-clip',
    index: 0,
    players: [
      {
        id: 'p-pitch',
        area: 'pitch',
        team: 'home',
        name: 'Saka',
        shirtNo: '7',
        x: clampToScreenNorm(30),
        y: clampToScreenNorm(40),
        style: BASE_STYLE,
        visionCone: { enabled: true, angle: 90, direction: 0, distance: 15, opacity: 0.25 },
        connectLines: [{ id: 'cl-1', toPlayerId: 'p-other', color: '#fff', strokeWidth: 2, dashArray: [] }],
        badges: [{ id: 'b-1', label: 'K', color: '#000', textColor: '#fff', offsetX: 0, offsetY: 0, visible: true }],
        focus: { enabled: true, color: '#fff', pulseSpeed: 1, radius: 10 },
        trajectory: { type: 'straight' },
      },
      {
        id: 'p-bench',
        area: 'bench',
        team: 'home',
        name: 'Trossard',
        x: clampToScreenNorm(10),
        y: clampToScreenNorm(96),
        style: BASE_STYLE,
      },
    ],
    arrows: [
      {
        id: 'a-1',
        annotationType: 'arrow',
        arrowType: 'pass',
        curveType: 'straight',
        points: [toScreenNormPoint(30, 40), toScreenNormPoint(60, 50)],
        color: '#ffffff',
        strokeWidth: 3,
        dashArray: [],
        startMarker: 'none',
        endMarker: 'arrow',
        sourcePlayerId: 'p-pitch',
      },
    ],
    zones: [
      {
        id: 'z-rect',
        annotationType: 'zone',
        shapeType: 'rect',
        zoneType: 'highlight',
        x: clampToScreenNorm(20),
        y: clampToScreenNorm(20),
        width: 15,
        height: 10,
        color: '#f59e0b',
        opacity: 0.25,
        strokeWidth: 3,
      },
      {
        id: 'z-poly',
        annotationType: 'zone',
        shapeType: 'polygon',
        zoneType: 'space',
        points: [toScreenNormPoint(10, 10), toScreenNormPoint(20, 10), toScreenNormPoint(15, 20)],
        color: '#3b82f6',
        opacity: 0.25,
        strokeWidth: 3,
      },
    ],
    texts: [
      {
        id: 't-1',
        annotationType: 'text',
        x: clampToScreenNorm(50),
        y: clampToScreenNorm(15),
        content: 'Half space',
        fontSize: 16,
        color: '#ffffff',
        bold: false,
        italic: false,
      },
    ],
    ball: { x: clampToScreenNorm(50), y: clampToScreenNorm(50), visible: true },
    transitionDurationMs: 1000,
    pauseMs: 500,
    easing: 'ease-in-out',
  };
}
```

② テストケース（同ファイル末尾へ追記）:
```ts
describe('domain clipboard and INSERT_ENTITIES', () => {
  it('extractSelectedObjects + cloneAndOffsetClipboard preserves unions, strips pitch attachments, remaps player arrows, and inserts cleanly', () => {
    const slide = createClipboardSlide();
    const clipboard = extractSelectedObjects(slide, [
      { id: 'p-pitch', kind: 'player' },
      { id: 'p-bench', kind: 'player' },
      { id: 'a-1', kind: 'arrow' },
      { id: 'z-rect', kind: 'zone' },
      { id: 'z-poly', kind: 'zone' },
      { id: 't-1', kind: 'text' },
    ]);

    const cloned = cloneAndOffsetClipboard(clipboard, 3, 3);
    expect(cloned.players).toHaveLength(2);
    const clonedPitch = cloned.players.find((p) => p.area === 'pitch')!;
    const clonedBench = cloned.players.find((p) => p.area === 'bench')!;
    expect(clonedPitch.x).toBe(33);
    expect(clonedPitch.visionCone).toBeUndefined();
    expect(clonedPitch.connectLines).toEqual([]);
    expect(clonedPitch.badges).toEqual([]);
    expect('badges' in clonedBench).toBe(false);
    expect(clonedBench.y).toBe(98);

    expect(cloned.arrows[0].sourcePlayerId).toBe(clonedPitch.id);

    const clonedRect = cloned.zones.find((z) => z.shapeType === 'rect')!;
    const clonedPoly = cloned.zones.find((z) => z.shapeType === 'polygon')!;
    if (clonedRect.shapeType !== 'rect') throw new Error('expected rect');
    if (clonedPoly.shapeType !== 'polygon') throw new Error('expected polygon');
    expect(clonedRect.x).toBe(23);
    expect('points' in clonedRect).toBe(false);
    expect(clonedPoly.points[0]).toEqual({ x: 13, y: 13 });
    expect('x' in clonedPoly).toBe(false);

    const nextSlide = applySlideCommand(slide, {
      type: 'INSERT_ENTITIES',
      players: cloned.players,
      arrows: cloned.arrows,
      zones: cloned.zones,
      texts: cloned.texts,
    });
    expect(nextSlide.players).toHaveLength(4);
    expect(nextSlide.arrows).toHaveLength(2);
    expect(nextSlide.zones).toHaveLength(4);
    expect(nextSlide.texts).toHaveLength(2);
    expect(() => DomainSlideSchema.parse(nextSlide)).not.toThrow();
  });
});
```

---

### Phase 2: SessionStore へのクリップボード統合と結合テスト
- **Worker Model**: `flash`
- **Target Files**:
  - `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts`
  - `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts`
  - `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`

#### Task 2.1: `[MODIFY]` `src/features/tactical-unified/stores/session-ui-state.ts`
**Before (L1-L4)**
```ts
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical/project';

export type { DrawingTool, ExportTarget };
```
**After**
```ts
import type { DomainTacticalClipboard } from '@/lib/tactical/domain/clipboard';
import type { DrawingTool, ExportTarget } from '@/lib/types/tactical/project';

export type { DomainTacticalClipboard, DrawingTool, ExportTarget };
```

**Before (L73-L106)**
```ts
  readonly teamVisibility: TeamVisibility;
  readonly panels: PanelState;
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
  activeTool: 'select',
  continuousDrawing: false,
  selectedObjects: [],
  connectingPlayerId: null,
  activeMarkerOptionTab: null,
  isDragging: false,
  isHudOpen: true,
  color: '#ffffff',
  strokeWidth: 2,
  fontSize: 14,
  customColor: '#ffffff',
  markerMode: 'all',
  teamVisibility: 'both',
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
};
```
**After**
```ts
  readonly teamVisibility: TeamVisibility;
  readonly clipboard: DomainTacticalClipboard | null;
  readonly panels: PanelState;
  readonly workspaceMode: WorkspaceMode;
  readonly savedPanelStateBeforeDirector: SavedPanelState | null;
  readonly pendingExport: ExportTarget | null;
}

export const DEFAULT_SESSION_UI_STATE: SessionUiState = {
  activeTool: 'select',
  continuousDrawing: false,
  selectedObjects: [],
  connectingPlayerId: null,
  activeMarkerOptionTab: null,
  isDragging: false,
  isHudOpen: true,
  color: '#ffffff',
  strokeWidth: 2,
  fontSize: 14,
  customColor: '#ffffff',
  markerMode: 'all',
  teamVisibility: 'both',
  clipboard: null,
  panels: {
    sidebarOpen: false,
    inspectorOpen: true,
    rightPanelTab: 'formation',
    isRightPanelOpen: false,
    splitPreviewOpen: false,
    exportModalOpen: false,
    projectManagerModalOpen: false,
  },
  workspaceMode: 'board',
  savedPanelStateBeforeDirector: null,
  pendingExport: null,
};
```

#### Task 2.2: `[MODIFY]` `src/features/tactical-unified/stores/session-store.ts`
**Before (L6-L18)**
```ts
import {
  DEFAULT_SESSION_UI_STATE,
  type DrawingTool,
  type ExportTarget,
  type MarkerMode,
  type MarkerOptionTab,
  type RightPanelTab,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
```
**After**
```ts
import {
  DEFAULT_SESSION_UI_STATE,
  type DomainTacticalClipboard,
  type DrawingTool,
  type ExportTarget,
  type MarkerMode,
  type MarkerOptionTab,
  type RightPanelTab,
  type SelectedObject,
  type SessionUiState,
  type TeamVisibility,
  type WorkspaceMode,
} from './session-ui-state';
```

**Before (L50-L55)**
```ts
  readonly setConnectingPlayerId: (id: string | null) => void;
  readonly setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  readonly setTeamVisibility: (visibility: TeamVisibility) => void;
```
**After**
```ts
  readonly setConnectingPlayerId: (id: string | null) => void;
  readonly setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  readonly setTeamVisibility: (visibility: TeamVisibility) => void;
  readonly setClipboard: (clipboard: DomainTacticalClipboard | null) => void;
```

**Before (L137-L141)**
```ts
    setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),
    setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),
```
**After**
```ts
    setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),
    setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),
    setClipboard: (clipboard) => set({ clipboard }),
```

#### Task 2.3: `[MODIFY]` `src/features/tactical-unified/stores/__tests__/three-frequency-stores.test.ts`
**Before (L483-L520)**
```ts
      const { result } = renderHook(
        () => ({
          title: useDocumentStore((s) => s.project.title),
          activeTool: useSessionStore((s) => s.activeTool),
          isPlaying: usePlaybackStore((s) => s.isPlaying),
          context: useTacticalStoresContext(),
        }),
        { wrapper },
      );

      expect(result.current.title).toBe('Initial Project');
      expect(result.current.activeTool).toBe('select');
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.context.documentStore).toBe(docStore);

      // Session のみ更新
      act(() => {
        sessStore.getState().setActiveTool('pan');
      });
      expect(result.current.activeTool).toBe('pan');

      // Playback のみ更新
      act(() => {
        playStore.getState().startPlayback();
      });
      expect(result.current.isPlaying).toBe(true);

      // Document のみ更新
      act(() => {
        docStore.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: 'Provider Updated' },
        });
      });
      expect(result.current.title).toBe('Provider Updated');
    });
  });
});
```
**After**
```ts
      const { result } = renderHook(
        () => ({
          title: useDocumentStore((s) => s.project.title),
          activeTool: useSessionStore((s) => s.activeTool),
          clipboard: useSessionStore((s) => s.clipboard),
          isPlaying: usePlaybackStore((s) => s.isPlaying),
          context: useTacticalStoresContext(),
        }),
        { wrapper },
      );

      expect(result.current.title).toBe('Initial Project');
      expect(result.current.activeTool).toBe('select');
      expect(result.current.clipboard).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.context.documentStore).toBe(docStore);

      // Session のみ更新（clipboard 更新で DocumentStore.isDirty / past は増えない）
      act(() => {
        sessStore.getState().setActiveTool('pan');
        sessStore.getState().setClipboard({
          players: [],
          arrows: [],
          zones: [],
          texts: [
            {
              id: 't-copy',
              annotationType: 'text',
              x: clampToScreenNorm(20),
              y: clampToScreenNorm(30),
              content: 'Press',
              fontSize: 16,
              color: '#ffffff',
              bold: false,
              italic: false,
            },
          ],
        });
      });
      expect(result.current.activeTool).toBe('pan');
      expect(result.current.clipboard?.texts).toHaveLength(1);
      expect(docStore.getState().isDirty).toBe(false);
      expect(docStore.getState().past).toHaveLength(0);

      // Playback のみ更新
      act(() => {
        playStore.getState().startPlayback();
      });
      expect(result.current.isPlaying).toBe(true);

      // Document のみ更新
      act(() => {
        docStore.getState().dispatch({
          type: 'UPDATE_PROJECT_META',
          patch: { title: 'Provider Updated' },
        });
      });
      expect(result.current.title).toBe('Provider Updated');
    });
  });
});
```
