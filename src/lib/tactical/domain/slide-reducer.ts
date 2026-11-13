import type {
  DomainPlayer,
  DomainZoneAnnotation,
  PitchPlayer,
} from '@/lib/types/tactical/domain-entities';
import type { DomainSlide } from '@/lib/types/tactical/domain-hierarchy';
import type { SlideCommand } from './commands';
import { enforceSlideInvariants, toBenchPlayer } from './invariants';
import { flipSlideCandidate } from './slide-flip';

const toggleLock = <T extends { id: string; locked?: boolean }>(
  list: readonly T[],
  id: string,
): T[] =>
  list.map((item) =>
    item.id === id ? { ...item, locked: !item.locked } : item,
  );

/** ピッチ上の選手 1 名だけに updater を適用する（ベンチ・不在 ID は無変更）。 */
function updatePitchPlayer(
  slide: DomainSlide,
  playerId: string,
  updater: (p: PitchPlayer) => PitchPlayer,
): DomainSlide {
  return {
    ...slide,
    players: slide.players.map((p) =>
      p.id === playerId && p.area === 'pitch' ? updater(p) : p,
    ),
  };
}

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

    case 'TOGGLE_BALL_LOCK':
      return {
        ...prevSlide,
        ball: { ...prevSlide.ball, locked: !prevSlide.ball.locked },
      };

    case 'SET_PLAYER_TRAJECTORY':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        trajectory: command.trajectory,
      }));

    case 'SET_PLAYER_VISION_CONE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        visionCone: command.cone,
      }));

    case 'ADD_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: [...p.connectLines, command.line],
      }));

    case 'UPDATE_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.map((l) =>
          l.id === command.lineId ? { ...l, ...command.patch } : l,
        ),
      }));

    case 'REMOVE_CONNECT_LINE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        connectLines: p.connectLines.filter((l) => l.id !== command.lineId),
      }));

    case 'ADD_PLAYER_BADGE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        badges: [...p.badges, command.badge],
      }));

    case 'REMOVE_PLAYER_BADGE':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        badges: p.badges.filter((b) => b.id !== command.badgeId),
      }));

    case 'SET_PLAYER_FOCUS':
      return updatePitchPlayer(prevSlide, command.playerId, (p) => ({
        ...p,
        focus: command.focus,
      }));

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
