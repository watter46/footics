/**
 * tactical-unified-store.ts
 * Zustand Store — Unified Tactical Canvas
 *
 * Responsibilities:
 *   - スライド CRUD (追加・削除・複製・並べ替え)
 *   - 選手・アノテーション CRUD
 *   - Undo/Redo 履歴管理 (temporal stack 最大50)
 *   - アスペクト比切替 (座標変換を自動適用)
 *   - 選択状態管理
 *   - ドラフト状態 (未保存フラグ)
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  type FormationMode,
  type FormationType,
  getFormationActualPos,
} from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import type {
  ArrowAnnotation,
  AspectRatio,
  BoundaryBox,
  ConnectLine,
  DrawingTool,
  ExportTarget,
  FormationPreset,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  Slide,
  TacticalProject,
  TextAnnotation,
  VisionCone,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  createDefaultProject,
  createDefaultSlide,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  transformCoord,
  transformPoints,
} from '@/lib/types/tactical-unified';

// ─────────────────────────────────────────
// § 1. 選択オブジェクト型
// ─────────────────────────────────────────

export type SelectedObjectKind =
  | 'player'
  | 'arrow'
  | 'zone'
  | 'text'
  | 'ball'
  | 'vision-cone'
  | 'connect-line'
  | 'badge'
  | 'focus';

export type MarkerOptionTab =
  | 'vision'
  | 'connect'
  | 'arrow_solid'
  | 'arrow_dash'
  | 'badge'
  | 'focus'
  | 'basic';

function isPointInPolygon(
  point: { x: number; y: number },
  vs: Array<{ x: number; y: number }>,
) {
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i].x;
    const yi = vs[i].y;
    const xj = vs[j].x;
    const yj = vs[j].y;
    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  /** 親選手ID (ネストアノテーションの場合) */
  parentPlayerId?: string;
}

export interface TacticalClipboard {
  players: Player[];
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
}

// ─────────────────────────────────────────
// § 2. パネル表示状態
// ─────────────────────────────────────────

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  rightPanelTab: 'formation_sub' | 'inspector';
  exportModalOpen: boolean;
}

// ─────────────────────────────────────────
// § 3. Store State 型
// ─────────────────────────────────────────

interface TacticalUnifiedState {
  // ── データ
  project: TacticalProject;
  isDirty: boolean;

  // ── 履歴 (Undo / Redo スタック: 最大50件)
  past: Slide[][];
  future: Slide[][];

  // ── クリップボード
  clipboard: TacticalClipboard | null;

  // ── 選択
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  activeTool: DrawingTool;
  connectingPlayerId: string | null;
  activeMarkerOptionTab: MarkerOptionTab | null;
  setActiveMarkerOptionTab: (tab: MarkerOptionTab | null) => void;
  continuousDrawing: boolean;
  setContinuousDrawing: (val: boolean) => void;
  toggleContinuousDrawing: () => void;
  autoFitBoundaryBox: (slideId?: string) => void;
  resetSlideObjects: (slideId?: string) => void;

  // ── パネル
  panels: PanelState;

  // ── 再生制御 (Playback)
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;

  // ── チーム表示制御 (Visibility)
  teamVisibility: 'both' | 'home' | 'away';
  setTeamVisibility: (visibility: 'both' | 'home' | 'away') => void;

  // ── エクスポート
  pendingExport: ExportTarget | null;
  isExporting: boolean;

  // ══════════════════════════════════════
  // ACTIONS
  // ══════════════════════════════════════

  // ─ プロジェクト
  loadProject: (project: TacticalProject) => void;
  resetProject: () => void;
  setTitle: (title: string) => void;
  setBackgroundType: (type: TacticalProject['backgroundType']) => void;
  setBackgroundImageUrl: (url: string | undefined) => void;
  restoreDefaultPitch: () => void;
  setImageBackground: (url: string) => void;
  setTeamColor: (
    team: 'home' | 'away',
    primary: string,
    secondary?: string,
  ) => void;

  // ─ アスペクト比
  setAspectRatio: (ratio: AspectRatio) => void;

  // ─ ピッチ左右チーム入れ替え
  swapTeamSides: (slideId: string) => void;

  // ─ エクスポート境界線 (BoundaryBox)
  setBoundaryBox: (slideId: string, box: BoundaryBox | undefined) => void;

  // ─ スライド CRUD
  addSlide: (
    sourceSlideId?: string,
    mode?: 'object-free' | 'full' | 'blank',
  ) => string;
  duplicateSlide: (slideId: string) => string;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (orderedIds: string[]) => void;
  setActiveSlide: (slideId: string) => void;
  updateSlideLabel: (slideId: string, label: string) => void;
  updateSlideTransition: (
    slideId: string,
    params: Partial<Pick<Slide, 'transitionDurationMs' | 'pauseMs' | 'easing'>>,
  ) => void;

  // ─ 選手 & サブメンバー CRUD
  addPlayer: (player: Player) => void;
  addPlayerFromPalette: (
    team: 'home' | 'away' | 'neutral',
    x: number,
    y: number,
  ) => string;
  addCustomPlayer: (
    slideId: string,
    team: 'home' | 'away' | 'neutral',
    name?: string,
    shirtNo?: string,
    position?: string,
    area?: 'pitch' | 'bench',
  ) => string;
  updatePlayer: (
    slideId: string,
    playerId: string,
    patch: Partial<Player>,
  ) => void;
  updatePlayerTrajectory: (
    slideId: string,
    playerId: string,
    trajectory: PlayerTrajectory | undefined,
  ) => void;
  movePlayer: (slideId: string, playerId: string, x: number, y: number) => void;
  moveMultiplePlayersByDelta: (
    slideId: string,
    playerIds: string[],
    deltaX: number,
    deltaY: number,
  ) => void;
  movePlayerToBench: (slideId: string, playerId: string) => void;
  movePlayerToPitch: (
    slideId: string,
    playerId: string,
    x?: number,
    y?: number,
  ) => void;
  swapPlayers: (slideId: string, playerAId: string, playerBId: string) => void;
  removePlayer: (slideId: string, playerId: string) => void;
  applyFormationPreset: (preset: FormationPreset, slideId: string) => void;
  applyFormation: (
    slideId: string,
    formationName: FormationType,
    mode: FormationMode,
    team: 'home' | 'away',
  ) => void;
  applySingleTeamFormation: (
    slideId: string,
    formationName: FormationType,
    mode: FormationMode,
    team: 'home' | 'away',
  ) => void;

  // ─ 選手ネスト: VisionCone
  setVisionCone: (
    slideId: string,
    playerId: string,
    cone: VisionCone | undefined,
  ) => void;

  // ─ コネクタ選択モード
  setConnectingPlayerId: (id: string | null) => void;

  // ─ 選手ネスト: ConnectLine
  addConnectLine: (
    slideId: string,
    playerId: string,
    line: ConnectLine,
  ) => void;
  updateConnectLine: (
    slideId: string,
    playerId: string,
    lineId: string,
    patch: Partial<ConnectLine>,
  ) => void;
  removeConnectLine: (
    slideId: string,
    playerId: string,
    lineId: string,
  ) => void;

  // ─ 選手ネスト: Badge
  addPlayerBadge: (
    slideId: string,
    playerId: string,
    badge: PlayerBadge,
  ) => void;
  removePlayerBadge: (
    slideId: string,
    playerId: string,
    badgeId: string,
  ) => void;
  setPlayerFocus: (
    slideId: string,
    playerId: string,
    focus: PlayerFocus | undefined,
  ) => void;

  // ─ ボール
  setBallPosition: (slideId: string, x: number, y: number) => void;
  setBallVisible: (slideId: string, visible: boolean) => void;

  // ─ アノテーション CRUD
  addArrow: (slideId: string, arrow: ArrowAnnotation) => void;
  updateArrow: (
    slideId: string,
    arrowId: string,
    patch: Partial<ArrowAnnotation>,
  ) => void;
  removeArrow: (slideId: string, arrowId: string) => void;

  addZone: (slideId: string, zone: ZoneAnnotation) => void;
  updateZone: (
    slideId: string,
    zoneId: string,
    patch: Partial<ZoneAnnotation>,
  ) => void;
  removeZone: (slideId: string, zoneId: string) => void;

  addText: (slideId: string, text: TextAnnotation) => void;
  updateText: (
    slideId: string,
    textId: string,
    patch: Partial<TextAnnotation>,
  ) => void;
  removeText: (slideId: string, textId: string) => void;
  clearAnnotations: (slideId: string) => void;
  eraseAtPoint: (
    slideId: string,
    point: { x: number; y: number },
    radius?: number,
  ) => void;

  // ─ 選択 & クリップボード
  selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  selectObjects: (objects: SelectedObject[], multi?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: DrawingTool) => void;
  copySelectedObjects: (slideId?: string) => void;
  pasteObjects: (slideId?: string) => void;
  duplicateSelectedObjects: (slideId?: string) => void;

  // ─ パネル
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setRightPanelTab: (tab: 'formation_sub' | 'inspector') => void;
  openExportModal: (target?: ExportTarget) => void;
  closeExportModal: () => void;

  // ─ 履歴 (Undo / Redo)
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // ─ エクスポート
  setIsExporting: (val: boolean) => void;
}

// ─────────────────────────────────────────
// § 4. ヘルパー
// ─────────────────────────────────────────

function getSlide(
  project: TacticalProject,
  slideId: string,
): Slide | undefined {
  return project.slides.find((s) => s.id === slideId);
}

function updateSlideInProject(
  project: TacticalProject,
  slideId: string,
  updater: (slide: Slide) => Slide,
): TacticalProject {
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    slides: project.slides.map((s) => (s.id === slideId ? updater(s) : s)),
  };
}

function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number },
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(
    p.x - (v.x + t * (w.x - v.x)),
    p.y - (v.y + t * (w.y - v.y)),
  );
}

const MAX_HISTORY = 50;

function recordHistory(s: TacticalUnifiedState): {
  past: Slide[][];
  future: Slide[][];
} {
  const snapshot = structuredClone(s.project.slides);
  const nextPast = [...s.past, snapshot];
  if (nextPast.length > MAX_HISTORY) {
    nextPast.splice(0, nextPast.length - MAX_HISTORY);
  }
  return {
    past: nextPast,
    future: [],
  };
}

function extractSelectedObjects(
  slide: Slide,
  selectedObjects: SelectedObject[],
): {
  players: Player[];
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
} {
  const selectedSet = new Map<string, SelectedObjectKind>();
  for (const obj of selectedObjects) {
    selectedSet.set(obj.id, obj.kind);
  }

  const players: Player[] = [];
  const arrows: ArrowAnnotation[] = [];
  const zones: ZoneAnnotation[] = [];
  const texts: TextAnnotation[] = [];

  for (const player of slide.players) {
    if (selectedSet.get(player.id) === 'player') {
      players.push(structuredClone(player));
    }
  }

  for (const arrow of slide.arrows) {
    if (selectedSet.get(arrow.id) === 'arrow') {
      arrows.push(structuredClone(arrow));
    }
  }

  for (const zone of slide.zones) {
    if (selectedSet.get(zone.id) === 'zone') {
      zones.push(structuredClone(zone));
    }
  }

  for (const text of slide.texts) {
    if (selectedSet.get(text.id) === 'text') {
      texts.push(structuredClone(text));
    }
  }

  return { players, arrows, zones, texts };
}

function cloneAndOffsetObjects(
  items: {
    players: Player[];
    arrows: ArrowAnnotation[];
    zones: ZoneAnnotation[];
    texts: TextAnnotation[];
  },
  offsetX = 3,
  offsetY = 3,
): {
  newPlayers: Player[];
  newArrows: ArrowAnnotation[];
  newZones: ZoneAnnotation[];
  newTexts: TextAnnotation[];
  newSelectedObjects: SelectedObject[];
} {
  const { players, arrows, zones, texts } = items;
  const playerIdMap = new Map<string, string>();
  const newSelectedObjects: SelectedObject[] = [];

  // 1. Players
  const newPlayers: Player[] = players.map((orig) => {
    const newId = crypto.randomUUID();
    playerIdMap.set(orig.id, newId);
    newSelectedObjects.push({ id: newId, kind: 'player' });

    return {
      ...structuredClone(orig),
      id: newId,
      x: Math.min(98, Math.max(2, orig.x + offsetX)),
      y: Math.min(98, Math.max(2, orig.y + offsetY)),
      badges: (orig.badges || []).map((b) => ({
        ...structuredClone(b),
        id: crypto.randomUUID(),
      })),
      connectLines: (orig.connectLines || []).map((cl) => ({
        ...structuredClone(cl),
        id: crypto.randomUUID(),
      })),
    };
  });

  // Update connect lines if target player was also copied
  for (const np of newPlayers) {
    np.connectLines = np.connectLines.map((cl) => {
      const mappedToId = playerIdMap.get(cl.toPlayerId);
      if (mappedToId) {
        return { ...cl, toPlayerId: mappedToId };
      }
      return cl;
    });
  }

  // 2. Arrows
  const newArrows: ArrowAnnotation[] = arrows.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'arrow' });

    const cloned = structuredClone(orig);
    const points = (cloned.points || []).map((pt) => ({
      x: Math.min(99, Math.max(1, pt.x + offsetX)),
      y: Math.min(99, Math.max(1, pt.y + offsetY)),
    }));

    let controlPoint = cloned.controlPoint;
    if (controlPoint) {
      controlPoint = {
        x: Math.min(99, Math.max(1, controlPoint.x + offsetX)),
        y: Math.min(99, Math.max(1, controlPoint.y + offsetY)),
      };
    }

    let sourcePlayerId = cloned.sourcePlayerId;
    if (sourcePlayerId && playerIdMap.has(sourcePlayerId)) {
      sourcePlayerId = playerIdMap.get(sourcePlayerId);
    }
    let targetPlayerId = cloned.targetPlayerId;
    if (targetPlayerId && playerIdMap.has(targetPlayerId)) {
      targetPlayerId = playerIdMap.get(targetPlayerId);
    }

    return {
      ...cloned,
      id: newId,
      points,
      controlPoint,
      sourcePlayerId,
      targetPlayerId,
    };
  });

  // 3. Zones
  const newZones: ZoneAnnotation[] = zones.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'zone' });

    const cloned = structuredClone(orig);
    const points = (cloned.points || []).map((pt) => ({
      x: Math.min(99, Math.max(1, pt.x + offsetX)),
      y: Math.min(99, Math.max(1, pt.y + offsetY)),
    }));

    const x =
      cloned.x !== undefined
        ? Math.min(98, Math.max(0, cloned.x + offsetX))
        : undefined;
    const y =
      cloned.y !== undefined
        ? Math.min(98, Math.max(0, cloned.y + offsetY))
        : undefined;

    return {
      ...cloned,
      id: newId,
      x,
      y,
      points,
    };
  });

  // 4. Texts
  const newTexts: TextAnnotation[] = texts.map((orig) => {
    const newId = crypto.randomUUID();
    newSelectedObjects.push({ id: newId, kind: 'text' });

    const cloned = structuredClone(orig);
    return {
      ...cloned,
      id: newId,
      x: Math.min(98, Math.max(0, cloned.x + offsetX)),
      y: Math.min(98, Math.max(0, cloned.y + offsetY)),
    };
  });

  return {
    newPlayers,
    newArrows,
    newZones,
    newTexts,
    newSelectedObjects,
  };
}

// ─────────────────────────────────────────
// § 5. Store 実装
// ─────────────────────────────────────────

const INITIAL_PROJECT = createDefaultProject(crypto.randomUUID());

export const useTacticalUnifiedStore = create<TacticalUnifiedState>()(
  subscribeWithSelector((set, get) => ({
    project: INITIAL_PROJECT,
    isDirty: false,
    past: [],
    future: [],
    clipboard: null,
    activeSlideId: INITIAL_PROJECT.activeSlideId,
    selectedObjects: [],
    activeTool: 'select',
    connectingPlayerId: null,
    activeMarkerOptionTab: null,
    continuousDrawing: false,
    panels: {
      sidebarOpen: false,
      inspectorOpen: true,
      rightPanelTab: 'formation_sub',
      exportModalOpen: false,
    },
    isPlaying: false,
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
    stopPlayback: () => set({ isPlaying: false }),
    teamVisibility: 'both',
    setTeamVisibility: (visibility) => set({ teamVisibility: visibility }),
    pendingExport: null,
    isExporting: false,

    // ══ 履歴 (Undo / Redo) ═════════════════

    undo: () =>
      set((s) => {
        if (s.past.length === 0) return s;
        const nextPast = [...s.past];
        const previousSlides = nextPast.pop();
        if (!previousSlides) return s;

        const currentSlides = structuredClone(s.project.slides);
        const nextFuture = [currentSlides, ...s.future].slice(0, MAX_HISTORY);

        let nextActiveSlideId = s.activeSlideId;
        if (!previousSlides.some((sl) => sl.id === nextActiveSlideId)) {
          nextActiveSlideId = previousSlides[0]?.id ?? '';
        }

        return {
          past: nextPast,
          future: nextFuture,
          project: {
            ...s.project,
            slides: previousSlides,
            activeSlideId: nextActiveSlideId,
            updatedAt: new Date().toISOString(),
          },
          activeSlideId: nextActiveSlideId,
          selectedObjects: [],
          isDirty: true,
        };
      }),

    redo: () =>
      set((s) => {
        if (s.future.length === 0) return s;
        const nextFuture = [...s.future];
        const nextSlides = nextFuture.shift();
        if (!nextSlides) return s;

        const currentSlides = structuredClone(s.project.slides);
        const nextPast = [...s.past, currentSlides];
        if (nextPast.length > MAX_HISTORY) {
          nextPast.shift();
        }

        let nextActiveSlideId = s.activeSlideId;
        if (!nextSlides.some((sl) => sl.id === nextActiveSlideId)) {
          nextActiveSlideId = nextSlides[0]?.id ?? '';
        }

        return {
          past: nextPast,
          future: nextFuture,
          project: {
            ...s.project,
            slides: nextSlides,
            activeSlideId: nextActiveSlideId,
            updatedAt: new Date().toISOString(),
          },
          activeSlideId: nextActiveSlideId,
          selectedObjects: [],
          isDirty: true,
        };
      }),

    pushHistory: () =>
      set((s) => ({
        ...recordHistory(s),
      })),

    // ══ プロジェクト ══════════════════════

    loadProject: (project) =>
      set({
        project,
        isDirty: false,
        past: [],
        future: [],
        clipboard: null,
        activeSlideId: project.activeSlideId,
        selectedObjects: [],
        teamVisibility: 'both',
      }),

    resetProject: () => {
      const p = createDefaultProject(crypto.randomUUID());
      set({
        project: p,
        isDirty: false,
        past: [],
        future: [],
        clipboard: null,
        activeSlideId: p.activeSlideId,
        selectedObjects: [],
        teamVisibility: 'both',
      });
    },

    setTitle: (title) =>
      set((s) => ({
        project: { ...s.project, title, updatedAt: new Date().toISOString() },
        isDirty: true,
      })),

    setBackgroundType: (type) =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundType: type,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    setBackgroundImageUrl: (url) =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundImageUrl: url,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    restoreDefaultPitch: () =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundType: 'pitch',
          backgroundImageUrl: undefined,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    setImageBackground: (url) =>
      set((s) => ({
        project: {
          ...s.project,
          backgroundType: 'image',
          backgroundImageUrl: url,
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      })),

    swapTeamSides: (slideId) =>
      set((s) => {
        const isVertical = s.project.aspectRatio === '9:16';

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, slideId, (sl) => ({
            ...sl,
            players: sl.players.map((p) => ({
              ...p,
              x: isVertical ? p.x : Math.max(0, Math.min(100, 100 - p.x)),
              y: isVertical ? Math.max(0, Math.min(100, 100 - p.y)) : p.y,
              trajectory: p.trajectory
                ? {
                    ...p.trajectory,
                    controlPoint: p.trajectory.controlPoint
                      ? {
                          x: isVertical
                            ? p.trajectory.controlPoint.x
                            : 100 - p.trajectory.controlPoint.x,
                          y: isVertical
                            ? 100 - p.trajectory.controlPoint.y
                            : p.trajectory.controlPoint.y,
                        }
                      : undefined,
                  }
                : undefined,
            })),
            arrows: sl.arrows.map((a) => ({
              ...a,
              points: a.points.map((pt) => ({
                x: isVertical ? pt.x : 100 - pt.x,
                y: isVertical ? 100 - pt.y : pt.y,
              })),
              controlPoint: a.controlPoint
                ? {
                    x: isVertical ? a.controlPoint.x : 100 - a.controlPoint.x,
                    y: isVertical ? 100 - a.controlPoint.y : a.controlPoint.y,
                  }
                : undefined,
            })),
            zones: sl.zones.map((z) => {
              const flippedPoints = z.points.map((pt) => ({
                x: isVertical ? pt.x : 100 - pt.x,
                y: isVertical ? 100 - pt.y : pt.y,
              }));
              const flippedX =
                !isVertical && z.x !== undefined && z.width !== undefined
                  ? 100 - (z.x + z.width)
                  : z.x;
              const flippedY =
                isVertical && z.y !== undefined && z.height !== undefined
                  ? 100 - (z.y + z.height)
                  : z.y;
              return {
                ...z,
                points: flippedPoints,
                x: flippedX,
                y: flippedY,
              };
            }),
            texts: sl.texts.map((t) => ({
              ...t,
              x: isVertical ? t.x : 100 - t.x,
              y: isVertical ? 100 - t.y : t.y,
            })),
            ball: {
              ...sl.ball,
              x: isVertical ? sl.ball.x : 100 - sl.ball.x,
              y: isVertical ? 100 - sl.ball.y : sl.ball.y,
            },
          })),
          isDirty: true,
        };
      }),

    setBoundaryBox: (slideId, box) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          boundaryBox: box,
        })),
        isDirty: true,
      })),

    autoFitBoundaryBox: (slideId) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const isPitchBg =
          s.project.backgroundType === 'pitch' || !s.project.backgroundType;
        const isVertical = s.project.aspectRatio === '9:16';

        // ピッチ外枠線（105m x 68m）の周囲に均等な余白（ピクセル換算で上下左右同一）を持たせた境界線
        let box: BoundaryBox;
        if (isPitchBg) {
          if (isVertical) {
            box = {
              x: 0.43,
              y: 7.25,
              width: 99.14,
              height: 85.5,
              enabled: true,
            };
          } else {
            box = {
              x: 7.25,
              y: 0.43,
              width: 85.5,
              height: 99.14,
              enabled: true,
            };
          }
        } else {
          // 画像背景などの場合は全体に対して均等パディング
          box = {
            x: 2.0,
            y: 2.0,
            width: 96.0,
            height: 96.0,
            enabled: true,
          };
        }

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            boundaryBox: box,
          })),
          isDirty: true,
        };
      }),

    resetSlideObjects: (slideId) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const isVertical = s.project.aspectRatio === '9:16';
        const defaultBox = isVertical
          ? DEFAULT_BOUNDARY_BOX_9_16
          : DEFAULT_BOUNDARY_BOX_16_9;
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
            ...sl,
            arrows: [],
            zones: [],
            texts: [],
            players: sl.players.map((p) => ({
              ...p,
              visionCone: undefined,
              connectLines: [],
              badges: [],
              focus: undefined,
              trajectory: undefined,
            })),
            boundaryBox: { ...defaultBox },
          })),
          selectedObjects: [],
          activeMarkerOptionTab: null,
          isDirty: true,
        };
      }),

    setTeamColor: (team, primary, secondary) =>
      set((s) => ({
        ...recordHistory(s),
        project: {
          ...s.project,
          updatedAt: new Date().toISOString(),
          ...(team === 'home'
            ? { homeColor: { primary, secondary } }
            : { awayColor: { primary, secondary } }),
          slides: s.project.slides.map((sl) => ({
            ...sl,
            players: sl.players.map((p) =>
              p.team === team
                ? {
                    ...p,
                    style: { ...p.style, color: primary },
                  }
                : p,
            ),
          })),
        },
        isDirty: true,
      })),

    // ══ アスペクト比 ══════════════════════

    setAspectRatio: (ratio) =>
      set((s) => {
        const from = s.project.aspectRatio;
        if (from === ratio) return s;

        const transformedSlides = s.project.slides.map(
          (slide): Slide => ({
            ...slide,
            players: slide.players.map((p) => ({
              ...p,
              ...transformCoord({ x: p.x, y: p.y }, from, ratio),
              trajectory: p.trajectory
                ? {
                    ...p.trajectory,
                    controlPoint: p.trajectory.controlPoint
                      ? transformCoord(p.trajectory.controlPoint, from, ratio)
                      : undefined,
                  }
                : undefined,
            })),
            arrows: slide.arrows.map((a) => ({
              ...a,
              points: transformPoints(a.points, from, ratio),
              controlPoint: a.controlPoint
                ? transformCoord(a.controlPoint, from, ratio)
                : undefined,
            })),
            zones: slide.zones.map((z) => ({
              ...z,
              points: transformPoints(z.points, from, ratio),
            })),
            texts: slide.texts.map((t) => ({
              ...t,
              ...transformCoord({ x: t.x, y: t.y }, from, ratio),
            })),
            ball: {
              ...slide.ball,
              ...transformCoord(
                { x: slide.ball.x, y: slide.ball.y },
                from,
                ratio,
              ),
            },
          }),
        );

        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            aspectRatio: ratio,
            slides: transformedSlides,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }),

    // ══ スライド CRUD ════════════════════

    addSlide: (sourceSlideId, mode = 'object-free') => {
      const p = get().project;
      const targetId = sourceSlideId ?? get().activeSlideId;
      const currentSlide = p.slides.find((sl) => sl.id === targetId);

      let newSlide: Slide;

      if (!currentSlide || mode === 'blank') {
        const defaultBox =
          p.aspectRatio === '9:16'
            ? DEFAULT_BOUNDARY_BOX_9_16
            : DEFAULT_BOUNDARY_BOX_16_9;
        newSlide = createDefaultSlide(
          p.slides.length,
          undefined,
          p.homeColor.primary,
          p.awayColor.primary,
          defaultBox,
        );
      } else if (mode === 'full') {
        newSlide = {
          ...(JSON.parse(JSON.stringify(currentSlide)) as Slide),
          id: crypto.randomUUID(),
          label: `${currentSlide.label ?? 'Scene'} (copy)`,
        };
      } else {
        // 'object-free': 選手とボール座標・スタイルを維持し、矢印・ゾーン・テキストなどのアノテーションをクリア
        const clonedPlayers: Player[] = currentSlide.players.map((pl) => ({
          ...JSON.parse(JSON.stringify(pl)),
          connectLines: [],
          visionCone: undefined,
          badge: undefined,
          focus: undefined,
        }));

        const defaultBox =
          p.aspectRatio === '9:16'
            ? DEFAULT_BOUNDARY_BOX_9_16
            : DEFAULT_BOUNDARY_BOX_16_9;

        newSlide = {
          id: crypto.randomUUID(),
          index: p.slides.length,
          label: `Scene ${p.slides.length + 1}`,
          players: clonedPlayers,
          arrows: [],
          zones: [],
          texts: [],
          ball: currentSlide.ball
            ? { ...currentSlide.ball }
            : { x: 50, y: 50, visible: true },
          boundaryBox: currentSlide.boundaryBox
            ? { ...currentSlide.boundaryBox }
            : { ...defaultBox },
          transitionDurationMs: currentSlide.transitionDurationMs ?? 1000,
          pauseMs: currentSlide.pauseMs ?? 500,
          easing: currentSlide.easing ?? 'ease-in-out',
          backgroundImageUrl: currentSlide.backgroundImageUrl,
          backgroundType: currentSlide.backgroundType,
        };
      }

      set((s) => {
        const currentIdx = s.project.slides.findIndex(
          (sl) => sl.id === targetId,
        );
        const nextSlides = [...s.project.slides];
        if (currentIdx !== -1) {
          nextSlides.splice(currentIdx + 1, 0, newSlide);
        } else {
          nextSlides.push(newSlide);
        }
        const indexedSlides = nextSlides.map((sl, i) => ({ ...sl, index: i }));

        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            slides: indexedSlides,
            activeSlideId: newSlide.id,
            updatedAt: new Date().toISOString(),
          },
          activeSlideId: newSlide.id,
          selectedObjects: [],
          isDirty: true,
        };
      });

      return newSlide.id;
    },

    duplicateSlide: (slideId) => {
      return get().addSlide(slideId, 'full');
    },

    deleteSlide: (slideId) =>
      set((s) => {
        if (s.project.slides.length <= 1) return s;
        const remaining = s.project.slides
          .filter((sl) => sl.id !== slideId)
          .map((sl, i) => ({ ...sl, index: i }));
        const newActive =
          s.activeSlideId === slideId
            ? (remaining[0]?.id ?? remaining[remaining.length - 1]?.id ?? '')
            : s.activeSlideId;
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            slides: remaining,
            activeSlideId: newActive,
            updatedAt: new Date().toISOString(),
          },
          activeSlideId: newActive,
          isDirty: true,
        };
      }),

    reorderSlides: (orderedIds) =>
      set((s) => {
        const idToSlide = Object.fromEntries(
          s.project.slides.map((sl) => [sl.id, sl]),
        );
        const slides = orderedIds
          .map((id, i) => {
            const sl = idToSlide[id];
            if (!sl) return null;
            return { ...sl, index: i };
          })
          .filter((sl): sl is NonNullable<typeof sl> => sl !== null);
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            slides,
            updatedAt: new Date().toISOString(),
          },
          isDirty: true,
        };
      }),

    setActiveSlide: (slideId) =>
      set({ activeSlideId: slideId, selectedObjects: [] }),

    updateSlideLabel: (slideId, label) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          label,
        })),
        isDirty: true,
      })),

    updateSlideTransition: (slideId, params) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ...params,
        })),
        isDirty: true,
      })),

    // ══ 選手 CRUD ════════════════════════

    addPlayer: (player) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, s.activeSlideId, (sl) => ({
          ...sl,
          players: [...sl.players, player],
        })),
        isDirty: true,
      })),

    addPlayerFromPalette: (team, x, y) => {
      const primary =
        team === 'home'
          ? get().project.homeColor.primary
          : team === 'away'
            ? get().project.awayColor.primary
            : '#6b7280';
      const player = createDefaultPlayer(team, x, y, primary);
      get().addPlayer(player);
      return player.id;
    },

    updatePlayer: (slideId, playerId, patch) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, ...patch } : p,
          ),
        })),
        isDirty: true,
      })),

    movePlayer: (slideId, playerId, x, y) => {
      const slide = get().project.slides.find((s) => s.id === slideId);
      const targetPlayer = slide?.players.find((p) => p.id === playerId);
      if (!targetPlayer) return;
      const dx = x - targetPlayer.x;
      const dy = y - targetPlayer.y;
      get().moveMultiplePlayersByDelta(slideId, [playerId], dx, dy);
    },

    moveMultiplePlayersByDelta: (slideId, playerIds, deltaX, deltaY) =>
      set((s) => {
        if (playerIds.length === 0 || (deltaX === 0 && deltaY === 0)) {
          return s;
        }
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, slideId, (sl) => {
            const playerIdSet = new Set(playerIds);
            const targetPlayers = sl.players.filter((p) =>
              playerIdSet.has(p.id),
            );
            if (targetPlayers.length === 0) return sl;

            // 1. 選手位置更新 (クランプ [0, 100])
            const updatedPlayers = sl.players.map((p) => {
              if (!playerIdSet.has(p.id)) return p;
              return {
                ...p,
                x: Math.max(0, Math.min(100, p.x + deltaX)),
                y: Math.max(0, Math.min(100, p.y + deltaY)),
              };
            });

            // 2. 矢印追従
            const updatedArrows = sl.arrows.map((arrow) => {
              const p0 = arrow.points[0];
              const p1 = arrow.points[1];
              const isStartAttached = Boolean(
                arrow.sourcePlayerId && playerIdSet.has(arrow.sourcePlayerId),
              );
              const isEndAttached = Boolean(
                arrow.targetPlayerId && playerIdSet.has(arrow.targetPlayerId),
              );

              if (!isStartAttached && !isEndAttached) return arrow;

              // 始点・終点ともに移動対象選手
              if (isStartAttached && isEndAttached) {
                const newPoints = arrow.points.map((pt) => ({
                  x: pt.x + deltaX,
                  y: pt.y + deltaY,
                }));
                const newCp = arrow.controlPoint
                  ? {
                      x: arrow.controlPoint.x + deltaX,
                      y: arrow.controlPoint.y + deltaY,
                    }
                  : undefined;
                return {
                  ...arrow,
                  points: newPoints,
                  controlPoint: newCp,
                };
              }

              if (isStartAttached && p0 && p1) {
                // 始点のみ追従
                const newP0 = {
                  x: p0.x + deltaX,
                  y: p0.y + deltaY,
                };
                const newCp = arrow.controlPoint
                  ? {
                      x: arrow.controlPoint.x + deltaX / 2,
                      y: arrow.controlPoint.y + deltaY / 2,
                    }
                  : undefined;
                return {
                  ...arrow,
                  points: [newP0, p1],
                  controlPoint: newCp,
                };
              }

              if (isEndAttached && p0 && p1) {
                // 終点のみ追従
                const newP1 = {
                  x: p1.x + deltaX,
                  y: p1.y + deltaY,
                };
                const newCp = arrow.controlPoint
                  ? {
                      x: arrow.controlPoint.x + deltaX / 2,
                      y: arrow.controlPoint.y + deltaY / 2,
                    }
                  : undefined;
                return {
                  ...arrow,
                  points: [p0, newP1],
                  controlPoint: newCp,
                };
              }

              return arrow;
            });

            return {
              ...sl,
              players: updatedPlayers,
              arrows: updatedArrows,
              texts: sl.texts,
              zones: sl.zones,
              ball: sl.ball,
            };
          }),
          isDirty: true,
        };
      }),

    addCustomPlayer: (
      slideId,
      team,
      name,
      shirtNo,
      position,
      area = 'bench',
    ) => {
      const primary =
        team === 'home'
          ? get().project.homeColor.primary
          : team === 'away'
            ? get().project.awayColor.primary
            : '#6b7280';
      const player = createDefaultPlayer(team, 50, 50, primary);
      player.name = name ?? (team === 'home' ? 'Home Player' : 'Away Player');
      player.shirtNo = shirtNo ?? '0';
      player.position = position ?? 'SUB';
      player.area = area;

      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: [...sl.players, player],
        })),
        isDirty: true,
      }));
      return player.id;
    },

    movePlayerToBench: (slideId, playerId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          // サブに入ったらマーカーオブジェクト(visionCone, badges, connectLines)を削除する
          players: sl.players.map((p) => {
            if (p.id === playerId) {
              return {
                ...p,
                area: 'bench',
                visionCone: undefined,
                badges: [],
                connectLines: [],
                focus: undefined,
              };
            }
            return {
              ...p,
              connectLines: p.connectLines.filter(
                (cl) => cl.toPlayerId !== playerId,
              ),
            };
          }),
          // 選手に紐づく矢印もクリーンアップ
          arrows: sl.arrows.filter(
            (a) =>
              a.sourcePlayerId !== playerId && a.targetPlayerId !== playerId,
          ),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== playerId),
      })),

    movePlayerToPitch: (slideId, playerId, x = 50, y = 50) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, area: 'pitch', x, y } : p,
          ),
        })),
        isDirty: true,
      })),

    swapPlayers: (slideId, playerAId, playerBId) =>
      set((s) => {
        const slide = s.project.slides.find((sl) => sl.id === slideId);
        if (!slide) return s;

        const playerA = slide.players.find((p) => p.id === playerAId);
        const playerB = slide.players.find((p) => p.id === playerBId);
        if (!playerA || !playerB) return s;

        const benchedId =
          playerA.area === 'pitch' && playerB.area === 'bench'
            ? playerAId
            : playerA.area === 'bench' && playerB.area === 'pitch'
              ? playerBId
              : null;

        const newPlayers = slide.players.map((p) => {
          if (p.id === playerAId) {
            if (playerA.area === 'pitch' && playerB.area === 'bench') {
              // A moves to bench
              return {
                ...p,
                area: 'bench' as const,
                visionCone: undefined,
                badges: [],
                connectLines: [],
                focus: undefined,
              };
            }
            if (playerA.area === 'bench' && playerB.area === 'pitch') {
              // A moves to pitch at B's position
              return {
                ...p,
                area: 'pitch' as const,
                x: playerB.x,
                y: playerB.y,
              };
            }
            if (playerA.area === 'pitch' && playerB.area === 'pitch') {
              // Swap positions
              return {
                ...p,
                x: playerB.x,
                y: playerB.y,
              };
            }
            return p;
          }
          if (p.id === playerBId) {
            if (playerA.area === 'pitch' && playerB.area === 'bench') {
              // B moves to pitch at A's position
              return {
                ...p,
                area: 'pitch' as const,
                x: playerA.x,
                y: playerA.y,
              };
            }
            if (playerA.area === 'bench' && playerB.area === 'pitch') {
              // B moves to bench
              return {
                ...p,
                area: 'bench' as const,
                visionCone: undefined,
                badges: [],
                connectLines: [],
                focus: undefined,
              };
            }
            if (playerA.area === 'pitch' && playerB.area === 'pitch') {
              // Swap positions
              return {
                ...p,
                x: playerA.x,
                y: playerA.y,
              };
            }
            return p;
          }

          // Clean up connect lines if targeting the newly benched player
          if (
            benchedId &&
            p.connectLines.some((cl) => cl.toPlayerId === benchedId)
          ) {
            return {
              ...p,
              connectLines: p.connectLines.filter(
                (cl) => cl.toPlayerId !== benchedId,
              ),
            };
          }
          return p;
        });

        const newArrows = benchedId
          ? slide.arrows.filter(
              (a) =>
                a.sourcePlayerId !== benchedId &&
                a.targetPlayerId !== benchedId,
            )
          : slide.arrows;

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, slideId, (sl) => ({
            ...sl,
            players: newPlayers,
            arrows: newArrows,
          })),
          isDirty: true,
          selectedObjects: benchedId
            ? s.selectedObjects.filter((o) => o.id !== benchedId)
            : s.selectedObjects,
        };
      }),

    removePlayer: (slideId, playerId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players
            .filter((p) => p.id !== playerId)
            .map((p) => ({
              ...p,
              connectLines: p.connectLines.filter(
                (cl) => cl.toPlayerId !== playerId,
              ),
            })),
          arrows: sl.arrows.filter(
            (a) =>
              a.sourcePlayerId !== playerId && a.targetPlayerId !== playerId,
          ),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== playerId),
      })),

    applyFormationPreset: (preset, slideId) =>
      set((s) => {
        const primaryColor =
          preset.team === 'home'
            ? s.project.homeColor.primary
            : preset.team === 'away'
              ? s.project.awayColor.primary
              : '#6b7280';
        const newPlayers: Player[] = preset.players.map((pp) => ({
          ...createDefaultPlayer(preset.team, pp.x, pp.y, primaryColor),
          shirtNo: pp.shirtNo,
          position: pp.position,
        }));
        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, slideId, (sl) => ({
            ...sl,
            players: [
              ...sl.players.filter((p) => p.team !== preset.team),
              ...newPlayers,
            ],
          })),
          isDirty: true,
        };
      }),

    applyFormation: (slideId, formationName, mode, team) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => {
          const positions = FORMATION_POSITIONS[formationName];
          if (!positions) return sl;

          const teamPitchPlayers = sl.players.filter(
            (p) => p.team === team && p.area === 'pitch',
          );
          const teamBenchPlayers = sl.players.filter(
            (p) => p.team === team && p.area === 'bench',
          );
          const otherPlayers = sl.players.filter((p) => p.team !== team);

          const existingPool = [...teamPitchPlayers, ...teamBenchPlayers];
          const newTeamPitchPlayers: Player[] = [];
          const primaryColor =
            team === 'home'
              ? s.project.homeColor.primary
              : s.project.awayColor.primary;

          positions.forEach((pos, idx) => {
            const actualPos = getFormationActualPos(pos, team, mode);
            let player = existingPool[idx];
            if (player) {
              player = {
                ...player,
                area: 'pitch',
                x: Math.max(0, Math.min(100, actualPos.x)),
                y: Math.max(0, Math.min(100, actualPos.y)),
                position: pos.position,
              };
            } else {
              player = createDefaultPlayer(
                team,
                Math.max(0, Math.min(100, actualPos.x)),
                Math.max(0, Math.min(100, actualPos.y)),
                primaryColor,
              );
              player.shirtNo = String(pos.id);
              player.position = pos.position;
            }
            newTeamPitchPlayers.push(player);
          });

          // 残りの選手はサブ(ベンチ)に回す
          const remainingBench = existingPool
            .slice(positions.length)
            .map((p) => ({
              ...p,
              area: 'bench' as const,
              visionCone: undefined,
              badges: [],
              connectLines: [],
            }));

          return {
            ...sl,
            players: [
              ...otherPlayers,
              ...newTeamPitchPlayers,
              ...remainingBench,
            ],
          };
        }),
        isDirty: true,
      })),

    applySingleTeamFormation: (slideId, formationName, mode, team) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => {
          const positions = FORMATION_POSITIONS[formationName];
          if (!positions) return sl;

          const otherTeam = team === 'home' ? 'away' : 'home';

          // 相手チームの選手は全選手ピッチからベンチへ一括退避
          const updatedOtherPlayers = sl.players
            .filter((p) => p.team === otherTeam)
            .map((p) => ({
              ...p,
              area: 'bench' as const,
              visionCone: undefined,
              badges: [],
              connectLines: [],
            }));

          // neutral 選手はそのまま保持
          const neutralPlayers = sl.players.filter((p) => p.team === 'neutral');

          // 指定チームの既存選手
          const teamPitchPlayers = sl.players.filter(
            (p) => p.team === team && p.area === 'pitch',
          );
          const teamBenchPlayers = sl.players.filter(
            (p) => p.team === team && p.area === 'bench',
          );
          const existingPool = [...teamPitchPlayers, ...teamBenchPlayers];

          const newTeamPitchPlayers: Player[] = [];
          const primaryColor =
            team === 'home'
              ? s.project.homeColor.primary
              : s.project.awayColor.primary;

          positions.forEach((pos, idx) => {
            const actualPos = getFormationActualPos(pos, team, mode);
            let player = existingPool[idx];
            if (player) {
              player = {
                ...player,
                area: 'pitch',
                x: Math.max(0, Math.min(100, actualPos.x)),
                y: Math.max(0, Math.min(100, actualPos.y)),
                position: pos.position,
              };
            } else {
              player = createDefaultPlayer(
                team,
                Math.max(0, Math.min(100, actualPos.x)),
                Math.max(0, Math.min(100, actualPos.y)),
                primaryColor,
              );
              player.shirtNo = String(pos.id);
              player.position = pos.position;
            }
            newTeamPitchPlayers.push(player);
          });

          // 指定チームの残りの選手はサブ(ベンチ)に回す
          const remainingBench = existingPool
            .slice(positions.length)
            .map((p) => ({
              ...p,
              area: 'bench' as const,
              visionCone: undefined,
              badges: [],
              connectLines: [],
            }));

          return {
            ...sl,
            players: [
              ...neutralPlayers,
              ...updatedOtherPlayers,
              ...newTeamPitchPlayers,
              ...remainingBench,
            ],
          };
        }),
        isDirty: true,
      })),

    updatePlayerTrajectory: (slideId, playerId, trajectory) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, trajectory } : p,
          ),
        })),
        isDirty: true,
      })),

    // ══ ネストアノテーション ══════════════

    setVisionCone: (slideId, playerId, cone) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, visionCone: cone } : p,
          ),
        })),
        isDirty: true,
      })),

    setConnectingPlayerId: (id) => set({ connectingPlayerId: id }),

    addConnectLine: (slideId, playerId, line) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId
              ? { ...p, connectLines: [...p.connectLines, line] }
              : p,
          ),
        })),
        isDirty: true,
      })),

    updateConnectLine: (slideId, playerId, lineId, patch) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  connectLines: p.connectLines.map((l) =>
                    l.id === lineId ? { ...l, ...patch } : l,
                  ),
                }
              : p,
          ),
        })),
        isDirty: true,
      })),

    removeConnectLine: (slideId, playerId, lineId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  connectLines: p.connectLines.filter((l) => l.id !== lineId),
                }
              : p,
          ),
        })),
        isDirty: true,
      })),

    addPlayerBadge: (slideId, playerId, badge) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, badges: [...p.badges, badge] } : p,
          ),
        })),
        isDirty: true,
      })),

    removePlayerBadge: (slideId, playerId, badgeId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId
              ? { ...p, badges: p.badges.filter((b) => b.id !== badgeId) }
              : p,
          ),
        })),
        isDirty: true,
      })),

    setPlayerFocus: (slideId, playerId, focus) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, focus } : p,
          ),
        })),
        isDirty: true,
      })),

    // ══ ボール ════════════════════════════

    setBallPosition: (slideId, x, y) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, x, y },
        })),
        isDirty: true,
      })),

    setBallVisible: (slideId, visible) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, visible },
        })),
        isDirty: true,
      })),

    // ══ アノテーション CRUD ═══════════════

    addArrow: (slideId, arrow) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: [...sl.arrows, arrow],
        })),
        isDirty: true,
      })),

    updateArrow: (slideId, arrowId, patch) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.map((a) =>
            a.id === arrowId ? { ...a, ...patch } : a,
          ),
        })),
        isDirty: true,
      })),

    removeArrow: (slideId, arrowId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.filter((a) => a.id !== arrowId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== arrowId),
      })),

    addZone: (slideId, zone) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: [...sl.zones, zone],
        })),
        isDirty: true,
      })),

    updateZone: (slideId, zoneId, patch) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.map((z) =>
            z.id === zoneId ? { ...z, ...patch } : z,
          ),
        })),
        isDirty: true,
      })),

    removeZone: (slideId, zoneId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.filter((z) => z.id !== zoneId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== zoneId),
      })),

    addText: (slideId, text) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: [...sl.texts, text],
        })),
        isDirty: true,
      })),

    updateText: (slideId, textId, patch) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.map((t) =>
            t.id === textId ? { ...t, ...patch } : t,
          ),
        })),
        isDirty: true,
      })),

    removeText: (slideId, textId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.filter((t) => t.id !== textId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== textId),
      })),

    clearAnnotations: (slideId) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: [],
          zones: [],
          texts: [],
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter(
          (o) => o.kind === 'player' || o.kind === 'ball',
        ),
      })),

    eraseAtPoint: (slideId, point, radius = 4.0) =>
      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => {
          // 1. 矢印・線の消去（プレイヤーは絶対に削除しない）
          const remainingArrows = sl.arrows.filter((arrow) => {
            const pts = arrow.points;
            for (let i = 0; i < pts.length; i++) {
              const pt = pts[i];
              if (pt && Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
                return false;
              }
            }
            if (pts.length >= 2) {
              for (let i = 0; i < pts.length - 1; i++) {
                const p1 = pts[i];
                const p2 = pts[i + 1];
                if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
                  return false;
                }
              }
            }
            return true;
          });

          // 2. ゾーンの消去 (矩形・楕円・多角形フリーゾーンすべてに対応)
          const remainingZones = sl.zones.filter((zone) => {
            const pts = zone.points;
            if (pts && pts.length >= 2) {
              // 頂点チェック
              for (const pt of pts) {
                if (Math.hypot(pt.x - point.x, pt.y - point.y) <= radius) {
                  return false;
                }
              }
              // エッジ線分チェック
              for (let i = 0; i < pts.length; i++) {
                const p1 = pts[i];
                const p2 = pts[(i + 1) % pts.length];
                if (p1 && p2 && distToSegment(point, p1, p2) <= radius) {
                  return false;
                }
              }
              // 内部チェック（3点以上の多角形）
              if (pts.length >= 3 && isPointInPolygon(point, pts)) {
                return false;
              }
            }
            if (
              zone.x !== undefined &&
              zone.y !== undefined &&
              zone.width !== undefined &&
              zone.height !== undefined
            ) {
              if (
                point.x >= zone.x - radius &&
                point.x <= zone.x + zone.width + radius &&
                point.y >= zone.y - radius &&
                point.y <= zone.y + zone.height + radius
              ) {
                return false;
              }
            }
            return true;
          });

          // 3. テキストの消去
          const remainingTexts = sl.texts.filter(
            (t) => Math.hypot(t.x - point.x, t.y - point.y) > radius,
          );

          // 4. 選手単体は消さないが、マーカーオプション（視野コーン・バッジ・コネクト線）は個別消去可能
          const updatedPlayers = sl.players.map((player) => {
            let visionCone = player.visionCone;
            if (visionCone) {
              const dist = Math.hypot(player.x - point.x, player.y - point.y);
              if (dist <= radius + visionCone.radius && dist >= 3.0) {
                visionCone = undefined;
              }
            }

            const badges = player.badges.filter((b) => {
              const bx = player.x + (b.offsetX || 0) * 0.1;
              const by = player.y + (b.offsetY || 0) * 0.1;
              return Math.hypot(bx - point.x, by - point.y) > radius;
            });

            const connectLines = player.connectLines.filter((cl) => {
              const target = sl.players.find((p) => p.id === cl.toPlayerId);
              if (!target) return false;
              const dist = distToSegment(
                point,
                { x: player.x, y: player.y },
                { x: target.x, y: target.y },
              );
              return dist > radius;
            });

            return {
              ...player,
              visionCone,
              badges,
              connectLines,
            };
          });

          return {
            ...sl,
            arrows: remainingArrows,
            zones: remainingZones,
            texts: remainingTexts,
            players: updatedPlayers,
          };
        }),
        isDirty: true,
      })),

    // ══ 選択 ═════════════════════════════

    setActiveMarkerOptionTab: (tab) => set({ activeMarkerOptionTab: tab }),

    selectObject: (obj, multi = false) =>
      set((s) => {
        if (!obj)
          return {
            selectedObjects: [],
            activeMarkerOptionTab: null,
          };
        if (multi) {
          const already = s.selectedObjects.find((o) => o.id === obj.id);
          return {
            selectedObjects: already
              ? s.selectedObjects.filter((o) => o.id !== obj.id)
              : [...s.selectedObjects, obj],
            panels: {
              ...s.panels,
              inspectorOpen: true,
              rightPanelTab: 'inspector',
            },
          };
        }
        return {
          selectedObjects: [obj],
          panels: {
            ...s.panels,
            inspectorOpen: true,
            rightPanelTab: 'inspector',
          },
        };
      }),

    selectObjects: (objects, multi = false) =>
      set((s) => {
        if (objects.length === 0 && !multi) {
          return {
            selectedObjects: [],
            activeMarkerOptionTab: null,
          };
        }
        if (multi) {
          const existingIds = new Set(s.selectedObjects.map((o) => o.id));
          const newItems = objects.filter((o) => !existingIds.has(o.id));
          return {
            selectedObjects: [...s.selectedObjects, ...newItems],
            panels: {
              ...s.panels,
              inspectorOpen: objects.length > 0 || s.selectedObjects.length > 0,
              rightPanelTab: 'inspector',
            },
          };
        }
        return {
          selectedObjects: objects,
          activeMarkerOptionTab:
            objects.length === 1 && objects[0].kind === 'player'
              ? 'vision'
              : null,
          panels: {
            ...s.panels,
            inspectorOpen: objects.length > 0,
            rightPanelTab: 'inspector',
          },
        };
      }),

    clearSelection: () =>
      set({
        selectedObjects: [],
        activeMarkerOptionTab: null,
      }),

    setActiveTool: (tool) => set({ activeTool: tool }),

    setContinuousDrawing: (val) => set({ continuousDrawing: val }),

    toggleContinuousDrawing: () =>
      set((s) => ({ continuousDrawing: !s.continuousDrawing })),

    // ══ クリップボード ════════════════════

    copySelectedObjects: (slideId) => {
      const state = get();
      const targetSlideId = slideId ?? state.activeSlideId;
      const slide = getSlide(state.project, targetSlideId);
      if (!slide || state.selectedObjects.length === 0) return;

      const { players, arrows, zones, texts } = extractSelectedObjects(
        slide,
        state.selectedObjects,
      );

      if (
        players.length === 0 &&
        arrows.length === 0 &&
        zones.length === 0 &&
        texts.length === 0
      ) {
        return;
      }

      set({
        clipboard: {
          players,
          arrows,
          zones,
          texts,
        },
      });
    },

    pasteObjects: (slideId) => {
      const state = get();
      const clipboard = state.clipboard;
      if (!clipboard) return;

      const { players, arrows, zones, texts } = clipboard;
      if (
        players.length === 0 &&
        arrows.length === 0 &&
        zones.length === 0 &&
        texts.length === 0
      ) {
        return;
      }

      const targetSlideId = slideId ?? state.activeSlideId;
      const slide = getSlide(state.project, targetSlideId);
      if (!slide) return;

      const { newPlayers, newArrows, newZones, newTexts, newSelectedObjects } =
        cloneAndOffsetObjects({ players, arrows, zones, texts });

      set((s) => ({
        ...recordHistory(s),
        project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
          ...sl,
          players: [...sl.players, ...newPlayers],
          arrows: [...sl.arrows, ...newArrows],
          zones: [...sl.zones, ...newZones],
          texts: [...sl.texts, ...newTexts],
        })),
        isDirty: true,
        selectedObjects: newSelectedObjects,
        panels: {
          ...s.panels,
          inspectorOpen: true,
          rightPanelTab: 'inspector',
        },
      }));
    },

    duplicateSelectedObjects: (slideId) => {
      const state = get();
      const targetSlideId = slideId ?? state.activeSlideId;
      const slide = getSlide(state.project, targetSlideId);
      if (!slide || state.selectedObjects.length === 0) return;

      const { players, arrows, zones, texts } = extractSelectedObjects(
        slide,
        state.selectedObjects,
      );

      if (
        players.length === 0 &&
        arrows.length === 0 &&
        zones.length === 0 &&
        texts.length === 0
      ) {
        return;
      }

      const { newPlayers, newArrows, newZones, newTexts, newSelectedObjects } =
        cloneAndOffsetObjects({ players, arrows, zones, texts });

      set((s) => ({
        ...recordHistory(s),
        clipboard: {
          players,
          arrows,
          zones,
          texts,
        },
        project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
          ...sl,
          players: [...sl.players, ...newPlayers],
          arrows: [...sl.arrows, ...newArrows],
          zones: [...sl.zones, ...newZones],
          texts: [...sl.texts, ...newTexts],
        })),
        isDirty: true,
        selectedObjects: newSelectedObjects,
        panels: {
          ...s.panels,
          inspectorOpen: true,
          rightPanelTab: 'inspector',
        },
      }));
    },

    // ══ パネル ════════════════════════════

    toggleSidebar: () =>
      set((s) => ({
        panels: { ...s.panels, sidebarOpen: !s.panels.sidebarOpen },
      })),

    setSidebarOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, sidebarOpen: open } })),

    setInspectorOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, inspectorOpen: open } })),

    setRightPanelTab: (tab) =>
      set((s) => ({
        panels: { ...s.panels, rightPanelTab: tab, inspectorOpen: true },
      })),

    openExportModal: (target) =>
      set((s) => ({
        pendingExport: target ?? null,
        panels: { ...s.panels, exportModalOpen: true },
      })),

    closeExportModal: () =>
      set((s) => ({
        panels: { ...s.panels, exportModalOpen: false },
        pendingExport: null,
      })),

    // ══ エクスポート ══════════════════════

    setIsExporting: (val) => set({ isExporting: val }),
  })),
);

// ─────────────────────────────────────────
// § 6. Selector ヘルパー
// ─────────────────────────────────────────

/** アクティブスライドを取得 */
export const selectActiveSlide = (s: TacticalUnifiedState): Slide | undefined =>
  s.project.slides.find((sl) => sl.id === s.activeSlideId);

/** 直前のスライドを取得 (先頭スライドの場合は null) */
export const selectPreviousSlide = (s: TacticalUnifiedState): Slide | null => {
  const idx = s.project.slides.findIndex((sl) => sl.id === s.activeSlideId);
  return idx > 0 ? (s.project.slides[idx - 1] ?? null) : null;
};

/** 選択中の単一オブジェクトID */
export const selectSingleSelectedId = (
  s: TacticalUnifiedState,
): string | null =>
  s.selectedObjects.length === 1 ? (s.selectedObjects[0]?.id ?? null) : null;

/** スライドが複数あるか */
export const selectIsMultiSlide = (s: TacticalUnifiedState): boolean =>
  s.project.slides.length > 1;

/** Undo 可能か */
export const selectCanUndo = (s: TacticalUnifiedState): boolean =>
  s.past.length > 0;

/** Redo 可能か */
export const selectCanRedo = (s: TacticalUnifiedState): boolean =>
  s.future.length > 0;
