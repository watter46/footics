import type { StateCreator } from 'zustand';
import type { FormationMode, FormationType } from '@/lib/data/formations';
import { getFormationActualPos } from '@/lib/data/formations';
import { FORMATION_POSITIONS } from '@/lib/data/formations-data';
import type {
  ConnectLine,
  FormationPreset,
  Player,
  PlayerBadge,
  PlayerFocus,
  PlayerTrajectory,
  Slide,
  VisionCone,
} from '@/lib/types/tactical-unified';
import {
  createDefaultPlayer,
  createDefaultSlide,
  DEFAULT_BOUNDARY_BOX_9_16,
  DEFAULT_BOUNDARY_BOX_16_9,
  getDefaultBoundaryBoxForAspect,
} from '@/lib/types/tactical-unified';
import type { TacticalUnifiedState } from '../tactical-unified-store';
import {
  getSlide,
  recordHistory,
  updateSlideInProject,
} from '../tactical-unified-store';

export interface SlideSlice {
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
  addPlayer: (player: Player) => void;
  addPlayerFromPalette: (
    team: 'home' | 'away' | 'neutral',
    x: number,
    y: number,
    markerType?: 'circle' | 'ring',
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
  clearPitchPlayers: (slideId?: string) => void;
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
  setVisionCone: (
    slideId: string,
    playerId: string,
    cone: VisionCone | undefined,
  ) => void;
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
  setBallPosition: (slideId: string, x: number, y: number) => void;
  setBallVisible: (slideId: string, visible: boolean) => void;
  updateBallTrajectory: (
    slideId: string,
    trajectory: PlayerTrajectory | undefined,
  ) => void;
}

export const createSlideSlice: StateCreator<
  TacticalUnifiedState,
  [['zustand/subscribeWithSelector', never]],
  [],
  SlideSlice
> = (set, get, _store) => ({
  addSlide: (sourceSlideId, mode = 'object-free') => {
    const p = get().project;
    const targetId = sourceSlideId ?? get().activeSlideId;
    const currentSlide = p.slides.find((sl) => sl.id === targetId);

    let newSlide: Slide;

    if (!currentSlide || mode === 'blank') {
      const defaultBox = getDefaultBoundaryBoxForAspect(p.aspectRatio);
      newSlide = createDefaultSlide(
        p.slides.length,
        undefined,
        p.homeColor.primary,
        p.awayColor.primary,
        defaultBox,
        p.aspectRatio,
      );
    } else if (mode === 'full') {
      newSlide = {
        ...(JSON.parse(JSON.stringify(currentSlide)) as Slide),
        id: crypto.randomUUID(),
        label: `${currentSlide.label ?? 'Scene'} (copy)`,
        aspectRatio: currentSlide.aspectRatio ?? p.aspectRatio,
        backgroundImageUrl:
          currentSlide.backgroundImageUrl ?? p.backgroundImageUrl,
        backgroundType:
          currentSlide.backgroundType ?? p.backgroundType ?? 'pitch',
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

      const defaultBox = getDefaultBoundaryBoxForAspect(p.aspectRatio);

      newSlide = {
        id: crypto.randomUUID(),
        index: p.slides.length,
        label: `Scene ${p.slides.length + 1}`,
        aspectRatio: currentSlide.aspectRatio ?? p.aspectRatio,
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
        backgroundImageUrl:
          currentSlide.backgroundImageUrl ?? p.backgroundImageUrl,
        backgroundType:
          currentSlide.backgroundType ?? p.backgroundType ?? 'pitch',
      };
    }

    set((s) => {
      const currentIdx = s.project.slides.findIndex((sl) => sl.id === targetId);
      const nextSlides = [...s.project.slides];
      if (currentIdx !== -1) {
        nextSlides.splice(currentIdx + 1, 0, newSlide);
      } else {
        nextSlides.push(newSlide);
      }
      const indexedSlides = nextSlides.map((sl, i) => ({ ...sl, index: i }));
      const isImageBg = newSlide.backgroundType === 'image';

      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: newSlide.backgroundType ?? 'pitch',
          backgroundImageUrl: newSlide.backgroundImageUrl,
          slides: indexedSlides,
          activeSlideId: newSlide.id,
          updatedAt: new Date().toISOString(),
        },
        panels: {
          ...s.panels,
          rightPanelTab: isImageBg
            ? 'inspector'
            : mode === 'blank'
              ? 'formation'
              : s.panels.rightPanelTab,
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
      const activeSlideObj = remaining.find((sl) => sl.id === newActive);
      const isImageBg = activeSlideObj?.backgroundType === 'image';
      return {
        ...recordHistory(s),
        project: {
          ...s.project,
          backgroundType: activeSlideObj?.backgroundType ?? 'pitch',
          backgroundImageUrl: activeSlideObj?.backgroundImageUrl,
          slides: remaining,
          activeSlideId: newActive,
          updatedAt: new Date().toISOString(),
        },
        panels: {
          ...s.panels,
          rightPanelTab: isImageBg
            ? 'inspector'
            : s.panels.rightPanelTab === 'inspector'
              ? 'formation'
              : s.panels.rightPanelTab,
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
    set((s) => {
      const targetSlide = s.project.slides.find((sl) => sl.id === slideId);
      const isImageBg = targetSlide?.backgroundType === 'image';
      return {
        activeSlideId: slideId,
        selectedObjects: [],
        project: {
          ...s.project,
          backgroundType: targetSlide?.backgroundType ?? 'pitch',
          backgroundImageUrl: targetSlide?.backgroundImageUrl,
        },
        panels: {
          ...s.panels,
          rightPanelTab: isImageBg
            ? 'inspector'
            : s.panels.rightPanelTab === 'inspector'
              ? 'formation'
              : s.panels.rightPanelTab,
        },
      };
    }),
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
  addPlayer: (player) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, s.activeSlideId, (sl) => ({
        ...sl,
        players: [...sl.players, player],
      })),
      isDirty: true,
    })),
  addPlayerFromPalette: (team, x, y, markerType = 'circle') => {
    const primary =
      team === 'home'
        ? get().project.homeColor.primary
        : team === 'away'
          ? get().project.awayColor.primary
          : '#6b7280';
    const player = createDefaultPlayer(team, x, y, primary);
    player.style.markerType = markerType;
    if (markerType === 'ring') {
      player.style.sizeScale = 1.5;
    }
    get().addPlayer(player);
    return player.id;
  },
  updatePlayer: (slideId, playerId, patch) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const existingPlayer = slide?.players.find((p) => p.id === playerId);
      if (existingPlayer?.locked && !('locked' in patch)) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          players: sl.players.map((p) =>
            p.id === playerId ? { ...p, ...patch } : p,
          ),
        })),
        isDirty: true,
      };
    }),
  movePlayer: (slideId, playerId, x, y) => {
    const slide = get().project.slides.find((s) => s.id === slideId);
    const targetPlayer = slide?.players.find((p) => p.id === playerId);
    if (!targetPlayer || targetPlayer.locked) return;
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
          const targetPlayers = sl.players.filter(
            (p) => playerIdSet.has(p.id) && !p.locked,
          );
          if (targetPlayers.length === 0) return sl;

          // 1. 選手位置更新 (クランプ [0, 100])
          const updatedPlayers = sl.players.map((p) => {
            if (!playerIdSet.has(p.id) || p.locked) return p;
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
  addCustomPlayer: (slideId, team, name, shirtNo, position, area = 'bench') => {
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
          (a) => a.sourcePlayerId !== playerId && a.targetPlayerId !== playerId,
        ),
      })),
      isDirty: true,
      selectedObjects: s.selectedObjects.filter((o) => o.id !== playerId),
    })),
  clearPitchPlayers: (slideId) =>
    set((s) => {
      const targetSlideId = slideId ?? s.activeSlideId;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, targetSlideId, (sl) => ({
          ...sl,
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
        })),
        isDirty: true,
        selectedObjects: [],
      };
    }),
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
              a.sourcePlayerId !== benchedId && a.targetPlayerId !== benchedId,
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
    set((s) => {
      const slide = getSlide(s.project, slideId);
      const targetPlayer = slide?.players.find((p) => p.id === playerId);
      if (targetPlayer?.locked) return s;
      return {
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
      };
    }),
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
          players: [...otherPlayers, ...newTeamPitchPlayers, ...remainingBench],
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
  setBallPosition: (slideId, x, y) =>
    set((s) => {
      const slide = getSlide(s.project, slideId);
      if (slide?.ball.locked) return s;
      return {
        ...recordHistory(s),
        project: updateSlideInProject(s.project, slideId, (sl) => ({
          ...sl,
          ball: { ...sl.ball, x, y },
        })),
        isDirty: true,
      };
    }),
  setBallVisible: (slideId, visible) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ball: { ...sl.ball, visible },
      })),
      isDirty: true,
    })),
  updateBallTrajectory: (slideId, trajectory) =>
    set((s) => ({
      ...recordHistory(s),
      project: updateSlideInProject(s.project, slideId, (sl) => ({
        ...sl,
        ball: { ...sl.ball, trajectory },
      })),
      isDirty: true,
    })),
});
