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
  ConnectLine,
  DrawingTool,
  ExportTarget,
  FormationPreset,
  Player,
  PlayerBadge,
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
  | 'badge';

export interface SelectedObject {
  id: string;
  kind: SelectedObjectKind;
  /** 親選手ID (ネストアノテーションの場合) */
  parentPlayerId?: string;
}

// ─────────────────────────────────────────
// § 2. パネル表示状態
// ─────────────────────────────────────────

export interface PanelState {
  sidebarOpen: boolean;
  inspectorOpen: boolean;
  exportModalOpen: boolean;
}

// ─────────────────────────────────────────
// § 3. Store State 型
// ─────────────────────────────────────────

interface TacticalUnifiedState {
  // ── データ
  project: TacticalProject;
  isDirty: boolean;

  // ── 選択
  activeSlideId: string;
  selectedObjects: SelectedObject[];
  activeTool: DrawingTool;
  connectingPlayerId: string | null;

  // ── パネル
  panels: PanelState;

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
  setTeamColor: (
    team: 'home' | 'away',
    primary: string,
    secondary?: string,
  ) => void;

  // ─ アスペクト比
  setAspectRatio: (ratio: AspectRatio) => void;

  // ─ スライド CRUD
  addSlide: () => string;
  duplicateSlide: (slideId: string) => string;
  deleteSlide: (slideId: string) => void;
  reorderSlides: (orderedIds: string[]) => void;
  setActiveSlide: (slideId: string) => void;
  updateSlideLabel: (slideId: string, label: string) => void;
  updateSlideTransition: (
    slideId: string,
    params: Partial<Pick<Slide, 'transitionDurationMs' | 'pauseMs' | 'easing'>>,
  ) => void;

  // ─ 選手 CRUD
  addPlayer: (player: Player) => void;
  addPlayerFromPalette: (
    team: 'home' | 'away' | 'neutral',
    x: number,
    y: number,
  ) => string;
  updatePlayer: (
    slideId: string,
    playerId: string,
    patch: Partial<Player>,
  ) => void;
  movePlayer: (slideId: string, playerId: string, x: number, y: number) => void;
  removePlayer: (slideId: string, playerId: string) => void;
  applyFormationPreset: (preset: FormationPreset, slideId: string) => void;

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

  // ─ 選択
  selectObject: (obj: SelectedObject | null, multi?: boolean) => void;
  clearSelection: () => void;
  setActiveTool: (tool: DrawingTool) => void;

  // ─ パネル
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  openExportModal: (target?: ExportTarget) => void;
  closeExportModal: () => void;

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

// ─────────────────────────────────────────
// § 5. Store 実装
// ─────────────────────────────────────────

const INITIAL_PROJECT = createDefaultProject(crypto.randomUUID());

export const useTacticalUnifiedStore = create<TacticalUnifiedState>()(
  subscribeWithSelector((set, get) => ({
    project: INITIAL_PROJECT,
    isDirty: false,
    activeSlideId: INITIAL_PROJECT.activeSlideId,
    selectedObjects: [],
    activeTool: 'select',
    connectingPlayerId: null,
    panels: {
      sidebarOpen: false,
      inspectorOpen: true,
      exportModalOpen: false,
    },
    pendingExport: null,
    isExporting: false,

    // ══ プロジェクト ══════════════════════

    loadProject: (project) =>
      set({
        project,
        isDirty: false,
        activeSlideId: project.activeSlideId,
        selectedObjects: [],
      }),

    resetProject: () => {
      const p = createDefaultProject(crypto.randomUUID());
      set({
        project: p,
        isDirty: false,
        activeSlideId: p.activeSlideId,
        selectedObjects: [],
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

    setTeamColor: (team, primary, secondary) =>
      set((s) => ({
        project: {
          ...s.project,
          updatedAt: new Date().toISOString(),
          ...(team === 'home'
            ? { homeColor: { primary, secondary } }
            : { awayColor: { primary, secondary } }),
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
            })),
            arrows: slide.arrows.map((a) => ({
              ...a,
              points: transformPoints(a.points, from, ratio),
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

    addSlide: () => {
      const p = get().project;
      const newSlide = createDefaultSlide(
        p.slides.length,
        undefined,
        p.homeColor.primary,
        p.awayColor.primary,
      );
      set((s) => ({
        project: {
          ...s.project,
          slides: [...s.project.slides, newSlide].map((sl, i) => ({
            ...sl,
            index: i,
          })),
          activeSlideId: newSlide.id,
          updatedAt: new Date().toISOString(),
        },
        activeSlideId: newSlide.id,
        isDirty: true,
      }));
      return newSlide.id;
    },

    duplicateSlide: (slideId) => {
      const src = getSlide(get().project, slideId);
      if (!src) return slideId;
      const newSlide: Slide = {
        ...(JSON.parse(JSON.stringify(src)) as Slide),
        id: crypto.randomUUID(),
        label: `${src.label ?? 'Scene'} (copy)`,
      };
      set((s) => {
        const idx = s.project.slides.findIndex((sl) => sl.id === slideId);
        const next = [...s.project.slides];
        next.splice(idx + 1, 0, newSlide);
        return {
          project: {
            ...s.project,
            slides: next.map((sl, i) => ({ ...sl, index: i })),
            activeSlideId: newSlide.id,
            updatedAt: new Date().toISOString(),
          },
          activeSlideId: newSlide.id,
          isDirty: true,
        };
      });
      return newSlide.id;
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
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          label,
        })),
        isDirty: true,
      })),

    updateSlideTransition: (slideId, params) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ...params,
        })),
        isDirty: true,
      })),

    // ══ 選手 CRUD ════════════════════════

    addPlayer: (player) =>
      set((s) => ({
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
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, ...patch } : p,
          ),
        })),
        isDirty: true,
      })),

    movePlayer: (slideId, playerId, x, y) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => {
          const targetPlayer = sl.players.find((p) => p.id === playerId);
          if (!targetPlayer) return sl;

          const dx = x - targetPlayer.x;
          const dy = y - targetPlayer.y;

          if (dx === 0 && dy === 0) return sl;

          // 1. 選手位置更新
          const updatedPlayers = sl.players.map((p) =>
            p.id === playerId ? { ...p, x, y } : p,
          );

          // 2. 矢印（明示的に sourcePlayerId / targetPlayerId で選手に紐づく矢印）の追従
          const updatedArrows = sl.arrows.map((arrow) => {
            const p0 = arrow.points[0];
            const p1 = arrow.points[1];
            const isStartAttached = arrow.sourcePlayerId === playerId;
            const isEndAttached = arrow.targetPlayerId === playerId;

            if (!isStartAttached && !isEndAttached) return arrow;

            // 始点も終点も同じ選手に紐づいている場合
            if (isStartAttached && isEndAttached) {
              const newPoints = arrow.points.map((pt) => ({
                x: Math.max(0, Math.min(100, pt.x + dx)),
                y: Math.max(0, Math.min(100, pt.y + dy)),
              }));
              const newCp = arrow.controlPoint
                ? {
                    x: Math.max(0, Math.min(100, arrow.controlPoint.x + dx)),
                    y: Math.max(0, Math.min(100, arrow.controlPoint.y + dy)),
                  }
                : undefined;
              return {
                ...arrow,
                points: newPoints,
                controlPoint: newCp,
              };
            }

            if (isStartAttached) {
              // 終点が別の選手に接続されているかチェック
              const otherPlayerNearEnd = sl.players.find(
                (p) =>
                  p.id !== playerId &&
                  p.area === 'pitch' &&
                  arrow.targetPlayerId === p.id,
              );

              if (otherPlayerNearEnd && p0 && p1) {
                // 終点は相手選手に固定し、始点のみ移動
                const newP0 = {
                  x: Math.max(0, Math.min(100, p0.x + dx)),
                  y: Math.max(0, Math.min(100, p0.y + dy)),
                };
                return {
                  ...arrow,
                  points: [newP0, p1],
                };
              } else {
                // 単独矢印: 矢印全体を平行移動
                const newPoints = arrow.points.map((pt) => ({
                  x: Math.max(0, Math.min(100, pt.x + dx)),
                  y: Math.max(0, Math.min(100, pt.y + dy)),
                }));
                const newCp = arrow.controlPoint
                  ? {
                      x: Math.max(0, Math.min(100, arrow.controlPoint.x + dx)),
                      y: Math.max(0, Math.min(100, arrow.controlPoint.y + dy)),
                    }
                  : undefined;
                return {
                  ...arrow,
                  points: newPoints,
                  controlPoint: newCp,
                };
              }
            }

            if (isEndAttached && p0 && p1) {
              // 終点のみ移動
              const newP1 = {
                x: Math.max(0, Math.min(100, p1.x + dx)),
                y: Math.max(0, Math.min(100, p1.y + dy)),
              };
              return {
                ...arrow,
                points: [p0, newP1],
              };
            }

            return arrow;
          });

          // 3. テキスト注釈（選手近傍にあるテキスト）の追従
          const updatedTexts = sl.texts.map((text) => {
            const isNear =
              Math.hypot(text.x - targetPlayer.x, text.y - targetPlayer.y) <= 8;
            if (isNear) {
              return {
                ...text,
                x: Math.max(0, Math.min(100, text.x + dx)),
                y: Math.max(0, Math.min(100, text.y + dy)),
              };
            }
            return text;
          });

          // 4. ボール（ボールが選手近傍にある場合）の追従
          let updatedBall = sl.ball;
          if (
            sl.ball?.visible &&
            Math.hypot(
              sl.ball.x - targetPlayer.x,
              sl.ball.y - targetPlayer.y,
            ) <= 7
          ) {
            updatedBall = {
              ...sl.ball,
              x: Math.max(0, Math.min(100, sl.ball.x + dx)),
              y: Math.max(0, Math.min(100, sl.ball.y + dy)),
            };
          }

          // 5. ゾーン（ゾーン重心が選手近傍にある場合）の追従
          const updatedZones = sl.zones.map((zone) => {
            if (zone.points.length === 0) return zone;
            const cx =
              zone.points.reduce((sum, pt) => sum + pt.x, 0) /
              zone.points.length;
            const cy =
              zone.points.reduce((sum, pt) => sum + pt.y, 0) /
              zone.points.length;
            const isNear =
              Math.hypot(cx - targetPlayer.x, cy - targetPlayer.y) <= 8;
            if (isNear) {
              return {
                ...zone,
                points: zone.points.map((pt) => ({
                  x: Math.max(0, Math.min(100, pt.x + dx)),
                  y: Math.max(0, Math.min(100, pt.y + dy)),
                })),
              };
            }
            return zone;
          });

          return {
            ...sl,
            players: updatedPlayers,
            arrows: updatedArrows,
            texts: updatedTexts,
            zones: updatedZones,
            ball: updatedBall,
          };
        }),
        isDirty: true,
      })),

    removePlayer: (slideId, playerId) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.filter((p) => p.id !== playerId),
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
          project: updateSlideInProject(s.project, slideId, (sl) => ({
            ...sl,
            // 同チームの選手を置き換え、他チームはそのまま
            players: [
              ...sl.players.filter((p) => p.team !== preset.team),
              ...newPlayers,
            ],
          })),
          isDirty: true,
        };
      }),

    // ══ ネストアノテーション ══════════════

    setVisionCone: (slideId, playerId, cone) =>
      set((s) => ({
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

    // ══ ボール ════════════════════════════

    setBallPosition: (slideId, x, y) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, x, y },
        })),
        isDirty: true,
      })),

    setBallVisible: (slideId, visible) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, visible },
        })),
        isDirty: true,
      })),

    // ══ アノテーション CRUD ═══════════════

    addArrow: (slideId, arrow) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: [...sl.arrows, arrow],
        })),
        isDirty: true,
      })),

    updateArrow: (slideId, arrowId, patch) =>
      set((s) => ({
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
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          arrows: sl.arrows.filter((a) => a.id !== arrowId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== arrowId),
      })),

    addZone: (slideId, zone) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: [...sl.zones, zone],
        })),
        isDirty: true,
      })),

    updateZone: (slideId, zoneId, patch) =>
      set((s) => ({
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
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          zones: sl.zones.filter((z) => z.id !== zoneId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== zoneId),
      })),

    addText: (slideId, text) =>
      set((s) => ({
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: [...sl.texts, text],
        })),
        isDirty: true,
      })),

    updateText: (slideId, textId, patch) =>
      set((s) => ({
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
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          texts: sl.texts.filter((t) => t.id !== textId),
        })),
        isDirty: true,
        selectedObjects: s.selectedObjects.filter((o) => o.id !== textId),
      })),

    clearAnnotations: (slideId) =>
      set((s) => ({
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

    // ══ 選択 ═════════════════════════════

    selectObject: (obj, multi = false) =>
      set((s) => {
        if (!obj)
          return {
            selectedObjects: [],
          };
        if (multi) {
          const already = s.selectedObjects.find((o) => o.id === obj.id);
          return {
            selectedObjects: already
              ? s.selectedObjects.filter((o) => o.id !== obj.id)
              : [...s.selectedObjects, obj],
            panels: { ...s.panels, inspectorOpen: true },
          };
        }
        return {
          selectedObjects: [obj],
          panels: { ...s.panels, inspectorOpen: true },
        };
      }),

    clearSelection: () =>
      set({
        selectedObjects: [],
      }),

    setActiveTool: (tool) => set({ activeTool: tool }),

    // ══ パネル ════════════════════════════

    toggleSidebar: () =>
      set((s) => ({
        panels: { ...s.panels, sidebarOpen: !s.panels.sidebarOpen },
      })),

    setSidebarOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, sidebarOpen: open } })),

    setInspectorOpen: (open) =>
      set((s) => ({ panels: { ...s.panels, inspectorOpen: open } })),

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

/** 選択中の単一オブジェクトID */
export const selectSingleSelectedId = (
  s: TacticalUnifiedState,
): string | null =>
  s.selectedObjects.length === 1 ? (s.selectedObjects[0]?.id ?? null) : null;

/** スライドが複数あるか */
export const selectIsMultiSlide = (s: TacticalUnifiedState): boolean =>
  s.project.slides.length > 1;
