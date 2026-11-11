import {
  clampToScreenNorm,
  type ScreenNormCoord,
  type ScreenNormPoint,
  toScreenNormPoint,
} from '@/lib/types/tactical/branded';
import type {
  DomainPlayer,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { SlideCommand } from './commands';
import { enforceSlideInvariants, toBenchPlayer } from './invariants';

const flipCoord = (c: ScreenNormCoord | number) => clampToScreenNorm(100 - c);
const flipPt = (pt: ScreenNormPoint) =>
  toScreenNormPoint(100 - pt.x, 100 - pt.y);

function flipZone(z: DomainZoneAnnotation): DomainZoneAnnotation {
  if (z.shapeType === 'polygon') {
    return {
      ...z,
      points: z.points.map(flipPt),
    };
  }
  return {
    ...z,
    x: flipCoord(z.x + z.width),
    y: flipCoord(z.y + z.height),
  };
}

function flipSlideCandidate(slide: DomainSlide): DomainSlide {
  const players = slide.players.map((p) => {
    if (p.area === 'bench') return p;
    const cp = p.trajectory?.controlPoint;
    return {
      ...p,
      x: flipCoord(p.x),
      y: flipCoord(p.y),
      trajectory: p.trajectory
        ? { ...p.trajectory, controlPoint: cp ? flipPt(cp) : undefined }
        : undefined,
    };
  });

  const arrows = slide.arrows.map((a) => ({
    ...a,
    points: a.points.map(flipPt),
    controlPoint: a.controlPoint ? flipPt(a.controlPoint) : undefined,
  }));

  const zones = slide.zones.map(flipZone);

  const texts = slide.texts.map((t) => ({
    ...t,
    x: flipCoord(t.x),
    y: flipCoord(t.y),
  }));

  const ballCp = slide.ball.trajectory?.controlPoint;
  const ball = {
    ...slide.ball,
    x: flipCoord(slide.ball.x),
    y: flipCoord(slide.ball.y),
    trajectory: slide.ball.trajectory
      ? {
          ...slide.ball.trajectory,
          controlPoint: ballCp ? flipPt(ballCp) : undefined,
        }
      : undefined,
  };

  return {
    ...slide,
    players,
    arrows,
    zones,
    texts,
    ball,
    isSidesSwapped: !slide.isSidesSwapped,
  };
}

const toggleLock = <T extends { id: string; locked?: boolean }>(
  list: readonly T[],
  id: string,
): T[] =>
  list.map((item) =>
    item.id === id ? { ...item, locked: !item.locked } : item,
  );

function reduceSlideCandidate(
  prevSlide: DomainSlide,
  command: SlideCommand,
): DomainSlide {
  switch (command.type) {
    case 'ADD_PLAYER':
      return { ...prevSlide, players: [...prevSlide.players, command.player] };

    case 'MOVE_PLAYERS': {
      const moveMap = new Map(command.moves.map((m) => [m.id, m]));
      return {
        ...prevSlide,
        players: prevSlide.players.map((p) => {
          const m = moveMap.get(p.id);
          return m ? { ...p, x: m.x, y: m.y } : p;
        }),
      };
    }

    case 'UPDATE_PLAYER':
      return {
        ...prevSlide,
        players: prevSlide.players.map((p) =>
          p.id === command.id
            ? ({ ...p, ...command.patch } as DomainPlayer)
            : p,
        ),
      };

    case 'MOVE_PLAYER_TO_BENCH':
      return {
        ...prevSlide,
        players: prevSlide.players.map((p) =>
          p.id === command.id
            ? toBenchPlayer(p, command.benchX, command.benchY)
            : p,
        ),
      };

    case 'MOVE_PLAYER_TO_PITCH':
      return {
        ...prevSlide,
        players: prevSlide.players.map((p): DomainPlayer => {
          if (p.id !== command.id) return p;
          const basePitch = p as Partial<PitchPlayer>;
          return {
            ...p,
            area: 'pitch',
            x: command.x,
            y: command.y,
            connectLines: basePitch.connectLines ?? [],
            badges: basePitch.badges ?? [],
          };
        }),
      };

    case 'REMOVE_PLAYER':
      return {
        ...prevSlide,
        players: prevSlide.players.filter((p) => p.id !== command.id),
      };

    case 'ADD_ARROW':
      return { ...prevSlide, arrows: [...prevSlide.arrows, command.arrow] };

    case 'UPDATE_ARROW':
      return {
        ...prevSlide,
        arrows: prevSlide.arrows.map((a) =>
          a.id === command.id ? { ...a, ...command.patch } : a,
        ),
      };

    case 'REMOVE_ARROW':
      return {
        ...prevSlide,
        arrows: prevSlide.arrows.filter((a) => a.id !== command.id),
      };

    case 'ADD_ZONE':
      return { ...prevSlide, zones: [...prevSlide.zones, command.zone] };

    case 'UPDATE_ZONE':
      return {
        ...prevSlide,
        zones: prevSlide.zones.map((z) =>
          z.id === command.id
            ? ({ ...z, ...command.patch } as DomainZoneAnnotation)
            : z,
        ),
      };

    case 'REMOVE_ZONE':
      return {
        ...prevSlide,
        zones: prevSlide.zones.filter((z) => z.id !== command.id),
      };

    case 'ADD_TEXT':
      return { ...prevSlide, texts: [...prevSlide.texts, command.text] };

    case 'UPDATE_TEXT':
      return {
        ...prevSlide,
        texts: prevSlide.texts.map((t) =>
          t.id === command.id ? { ...t, ...command.patch } : t,
        ),
      };

    case 'REMOVE_TEXT':
      return {
        ...prevSlide,
        texts: prevSlide.texts.filter((t) => t.id !== command.id),
      };

    case 'UPDATE_BALL':
      return { ...prevSlide, ball: { ...prevSlide.ball, ...command.patch } };

    case 'TOGGLE_ENTITY_LOCK': {
      if (command.kind === 'player')
        return {
          ...prevSlide,
          players: toggleLock(prevSlide.players, command.id),
        };
      if (command.kind === 'arrow')
        return {
          ...prevSlide,
          arrows: toggleLock(prevSlide.arrows, command.id),
        };
      if (command.kind === 'zone')
        return {
          ...prevSlide,
          zones: toggleLock(prevSlide.zones, command.id),
        };
      return {
        ...prevSlide,
        texts: toggleLock(prevSlide.texts, command.id),
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

    case 'SWAP_TEAM_SIDES':
      return flipSlideCandidate(prevSlide);

    case 'RESET_SLIDE_OBJECTS': {
      const players = command.keepSquad
        ? prevSlide.players.map((p) => {
            if (p.area === 'bench') return p;
            return {
              ...p,
              connectLines: [],
              badges: [],
              visionCone: undefined,
              focus: undefined,
              trajectory: undefined,
            };
          })
        : [];

      return {
        ...prevSlide,
        players,
        arrows: [],
        zones: [],
        texts: [],
        ball: { ...prevSlide.ball, trajectory: undefined },
      };
    }

    case 'UPDATE_SLIDE_META':
      return { ...prevSlide, ...command.patch };
  }
}

/**
 * SlideCommand をスライドに適用し、必ず単一不変条件ゲート (enforceSlideInvariants) を通過させる。
 */
export function applySlideCommand(
  prevSlide: DomainSlide,
  command: SlideCommand,
): DomainSlide {
  const candidate = reduceSlideCandidate(prevSlide, command);
  return enforceSlideInvariants(prevSlide, candidate, command);
}
