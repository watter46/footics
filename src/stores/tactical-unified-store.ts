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
import type {
  ArrowAnnotation,
  AspectRatio,
  BoundaryBox,
  ExportTarget,
  Player,
  Slide,
  TacticalProject,
  TextAnnotation,
  ZoneAnnotation,
} from '@/lib/types/tactical-unified';
import {
  createDefaultProject,
  DEFAULT_442_HOME,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  DEFAULT_BOUNDARY_BOX_SCREENSHOT,
  transformCoord,
  transformPoints,
} from '@/lib/types/tactical-unified';
import {
  type AnnotationSlice,
  createAnnotationSlice,
} from './slices/annotation-slice';
import {
  type ClipboardSlice,
  createClipboardSlice,
} from './slices/clipboard-slice';
import { createHistorySlice, type HistorySlice } from './slices/history-slice';
import { createSlideSlice, type SlideSlice } from './slices/slide-slice';
import {
  createToolSlice,
  type MarkerOptionTab,
  type PanelState,
  type SelectedObject,
  type SelectedObjectKind,
  type ToolSlice,
} from './slices/tool-slice';

// ─────────────────────────────────────────
// § 1. 選択オブジェクト & ツール型 (Re-export for 100% backward compatibility)
// ─────────────────────────────────────────

export type {
  AnnotationSlice,
  MarkerOptionTab,
  PanelState,
  SelectedObject,
  SelectedObjectKind,
  ToolSlice,
};

export function isPointInPolygon(
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

export interface TacticalClipboard {
  players: Player[];
  arrows: ArrowAnnotation[];
  zones: ZoneAnnotation[];
  texts: TextAnnotation[];
}

// ─────────────────────────────────────────
// § 2. Store State 型
// ─────────────────────────────────────────

export interface TacticalUnifiedState
  extends HistorySlice,
    ClipboardSlice,
    SlideSlice,
    AnnotationSlice,
    ToolSlice {
  // ── データ
  project: TacticalProject;
  isDirty: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedAt: number | null;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  setLastSavedAt: (timestamp: number | null) => void;

  // ── 履歴 (Undo / Redo スタック: 最大50件)
  // ── スライド選択
  activeSlideId: string;
  autoFitBoundaryBox: (slideId?: string) => void;
  resetSlideObjects: (slideId?: string) => void;

  // ── 再生制御 (Playback)
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
  togglePlayback: () => void;
  stopPlayback: () => void;

  // ── エクスポート
  pendingExport: ExportTarget | null;
  isExporting: boolean;
  setIsExporting: (val: boolean) => void;

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
  swapTeamSides: (slideId?: string) => void;

  // ─ エクスポート境界線 (BoundaryBox)
  setBoundaryBox: (slideId: string, box: BoundaryBox | undefined) => void;
}

// ─────────────────────────────────────────
// § 4. ヘルパー
// ─────────────────────────────────────────

export function getSlide(
  project: TacticalProject,
  slideId: string,
): Slide | undefined {
  return project.slides.find((s) => s.id === slideId);
}

export function updateSlideInProject(
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

export function distToSegment(
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

export const MAX_HISTORY = 50;

export function recordHistory(s: TacticalUnifiedState): {
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

export function extractSelectedObjects(
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

export function cloneAndOffsetObjects(
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
  subscribeWithSelector((set, get, store) => ({
    ...createHistorySlice(set, get, store),
    ...createClipboardSlice(set, get, store),
    ...createSlideSlice(set, get, store),
    ...createAnnotationSlice(set, get, store),
    ...createToolSlice(set, get, store),

    project: INITIAL_PROJECT,
    isDirty: false,
    saveStatus: 'idle',
    lastSavedAt: null,
    setSaveStatus: (status) => set({ saveStatus: status }),
    setLastSavedAt: (timestamp) => set({ lastSavedAt: timestamp }),
    activeSlideId: INITIAL_PROJECT.activeSlideId,
    isPlaying: false,
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    togglePlayback: () => set((s) => ({ isPlaying: !s.isPlaying })),
    stopPlayback: () => set({ isPlaying: false }),
    pendingExport: null,
    isExporting: false,

    // ══ 履歴 (Undo / Redo) ═════════════════

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
      set((s) => {
        const targetSlideId = s.activeSlideId;
        const currentSlide = s.project.slides.find(
          (sl) => sl.id === targetSlideId,
        );
        const screenshotBox: BoundaryBox = {
          ...DEFAULT_BOUNDARY_BOX_SCREENSHOT,
        };

        // 現在のスライドが一度でも編集されているか（画像背景がある、アノテーションがある、選手が移動/追加/削除/カスタムされている等）を判定
        const isDefault442 =
          currentSlide &&
          currentSlide.backgroundType === 'pitch' &&
          !currentSlide.backgroundImageUrl &&
          (!currentSlide.arrows || currentSlide.arrows.length === 0) &&
          (!currentSlide.zones || currentSlide.zones.length === 0) &&
          (!currentSlide.texts || currentSlide.texts.length === 0) &&
          currentSlide.ball.x === 50 &&
          currentSlide.ball.y === 50 &&
          currentSlide.ball.visible &&
          currentSlide.players.length === 22 &&
          currentSlide.players.every((p) => {
            if (
              p.area !== 'pitch' ||
              p.focus ||
              p.visionCone ||
              p.badges.length > 0 ||
              p.connectLines.length > 0 ||
              p.style.markerType !== 'circle'
            ) {
              return false;
            }
            const expectedPos = DEFAULT_442_HOME.find(
              (def) => def.shirtNo === p.shirtNo,
            );
            if (!expectedPos) return false;
            const expectedX =
              p.team === 'home' ? expectedPos.x : 100 - expectedPos.x;
            const expectedY = expectedPos.y;
            return (
              Math.abs(p.x - expectedX) < 0.01 &&
              Math.abs(p.y - expectedY) < 0.01
            );
          });

        const isCurrentSlideEdited = currentSlide && !isDefault442;

        if (isCurrentSlideEdited) {
          // すでに編集中の場合は、現在のスライドをそのまま保持し、新しいスライドを追加してキャプチャ画像を適用
          const newSlideId = crypto.randomUUID();
          const newSlide: Slide = {
            id: newSlideId,
            index: s.project.slides.length,
            label: `Scene ${s.project.slides.length + 1}`,
            players: currentSlide.players.map((p) => ({
              ...p,
              area: 'bench' as const,
              visionCone: undefined,
              badges: [],
              connectLines: [],
              focus: undefined,
            })),
            arrows: [],
            zones: [],
            texts: [],
            ball: { x: 50, y: 50, visible: false },
            boundaryBox: screenshotBox,
            transitionDurationMs: 1000,
            pauseMs: 500,
            easing: 'ease-in-out',
            backgroundType: 'image',
            backgroundImageUrl: url,
          };

          const currentIdx = s.project.slides.findIndex(
            (sl) => sl.id === targetSlideId,
          );
          const nextSlides = [...s.project.slides];
          if (currentIdx !== -1) {
            nextSlides.splice(currentIdx + 1, 0, newSlide);
          } else {
            nextSlides.push(newSlide);
          }
          const indexedSlides = nextSlides.map((sl, i) => ({
            ...sl,
            index: i,
          }));

          return {
            ...recordHistory(s),
            project: {
              ...s.project,
              backgroundType: 'image',
              backgroundImageUrl: url,
              updatedAt: new Date().toISOString(),
              slides: indexedSlides,
              activeSlideId: newSlideId,
            },
            panels: {
              ...s.panels,
              rightPanelTab: 'inspector',
              isRightPanelOpen: false,
            },
            activeSlideId: newSlideId,
            selectedObjects: [],
            isDirty: true,
          };
        }

        // まだ未編集（初期スライドなど）の場合は現在のアクティブスライドに適用
        return {
          ...recordHistory(s),
          project: {
            ...s.project,
            backgroundType: 'image',
            backgroundImageUrl: url,
            updatedAt: new Date().toISOString(),
            slides: s.project.slides.map((sl) => {
              if (sl.id !== targetSlideId) return sl;
              return {
                ...sl,
                backgroundType: 'image',
                backgroundImageUrl: url,
                boundaryBox: screenshotBox,
                ball: { ...sl.ball, visible: false },
                players: sl.players.map((p) => ({
                  ...p,
                  area: 'bench' as const,
                  visionCone: undefined,
                  badges: [],
                  connectLines: [],
                  focus: undefined,
                })),
                arrows: sl.arrows.filter(
                  (a) => !a.sourcePlayerId && !a.targetPlayerId,
                ),
              };
            }),
          },
          panels: {
            ...s.panels,
            rightPanelTab: 'inspector',
            isRightPanelOpen: false,
          },
          selectedObjects: [],
          isDirty: true,
        };
      }),

    swapTeamSides: (slideId) =>
      set((s) => {
        const targetSlideId = slideId ?? s.activeSlideId;
        const isVertical = s.project.aspectRatio === '9:16';

        return {
          ...recordHistory(s),
          project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
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
              trajectory: sl.ball.trajectory
                ? {
                    ...sl.ball.trajectory,
                    controlPoint: sl.ball.trajectory.controlPoint
                      ? {
                          x: isVertical
                            ? sl.ball.trajectory.controlPoint.x
                            : 100 - sl.ball.trajectory.controlPoint.x,
                          y: isVertical
                            ? 100 - sl.ball.trajectory.controlPoint.y
                            : sl.ball.trajectory.controlPoint.y,
                        }
                      : undefined,
                  }
                : undefined,
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
        const slide = s.project.slides.find((sl) => sl.id === targetSlideId);
        const isPitchBg =
          (slide?.backgroundType ?? s.project.backgroundType ?? 'pitch') ===
          'pitch';
        const isVertical = s.project.aspectRatio === '9:16';

        // ピッチ外枠線（105m x 68m）またはスクリーンショット（余白2%）に合わせた境界線
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
          // スクリーンショット / 画像背景モードのときは画像境界に合わせたフィット
          box = {
            ...DEFAULT_BOUNDARY_BOX_SCREENSHOT,
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
            players: sl.players
              .filter((p) => p.style.markerType !== 'ring')
              .map((p) => ({
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
              trajectory: slide.ball.trajectory
                ? {
                    ...slide.ball.trajectory,
                    controlPoint: slide.ball.trajectory.controlPoint
                      ? transformCoord(
                          slide.ball.trajectory.controlPoint,
                          from,
                          ratio,
                        )
                      : undefined,
                  }
                : undefined,
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

    // ══ 選手 CRUD ════════════════════════

    // ══ ネストアノテーション ══════════════

    // ══ ボール ════════════════════════════

    // ══ アノテーション CRUD ═══════════════

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
